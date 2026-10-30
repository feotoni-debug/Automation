"""
Servidor Unificado — Conferência de Títulos (Frontend React + Esteira de 9 Repositórios).
Entrega tanto a API (/api/*) quanto a interface web compilada (/dist) em um único endereço.
"""
import base64
from datetime import date
from pathlib import Path
import re

import cv2
from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import pipeline, scanner_monitor

app = FastAPI(title="Conferência de Títulos — Aplicação Unificada")
scanner_monitor.iniciar_monitoramento()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DIST_DIR = Path(__file__).resolve().parents[2] / "dist"
VENDOR_DIR = Path(__file__).resolve().parents[1] / "vendor"


def _ordenacao_natural(nome: str):
    """Ordenação alfanumérica natural para páginas (ex: pag1, pag2, pag10)."""
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", nome)]


def _para_data_url(img) -> str:
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise ValueError("Não foi possível converter a imagem.")
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")
    return f"data:image/png;base64,{b64}"


@app.get("/api/saude")
def saude():
    from .adapters import (
        adulteracao,
        alinhamento,
        diff_visual,
        layout_doc,
        ocr,
        segregacao,
        texto_fuzz,
    )

    return {
        "repositorios_na_esteira": {
            "1_ocrmypdf": ocr.disponivel(),
            "2_dird": (VENDOR_DIR / "DIRD-master").exists(),
            "3_opencv_5x": (VENDOR_DIR / "opencv-5.x").exists(),
            "4_diff_pdf": diff_visual.disponivel(),
            "5_docling": layout_doc.disponivel()["docling"],
            "6_deepdoctection": layout_doc.disponivel()["deepdoctection"],
            "7_stamp_signature_segregate": segregacao._repo_disponivel(),
            "8_doctamper": (VENDOR_DIR / "DocTamper-main").exists(),
            "9_rapidfuzz": texto_fuzz.disponivel(),
        },
        "modelos_ativos": {
            "yolo_best_pt": segregacao._repo_disponivel(),
            "doctamper_pesos_gpu": adulteracao.disponivel(),
            "dird_inferencia": alinhamento._dird_disponivel(),
        },
    }


@app.post("/api/previa")
async def previa(
    arquivo: UploadFile | None = File(default=None),
    arquivos: list[UploadFile] = File(default=[]),
):
    todos = [f for f in ([arquivo] if arquivo else []) + arquivos if f and f.filename]
    if not todos:
        raise HTTPException(status_code=422, detail="Nenhum arquivo enviado para prévia.")
    todos.sort(key=lambda f: _ordenacao_natural(f.filename or ""))
    primeiro = todos[0]
    try:
        paginas = pipeline.carregar_paginas(await primeiro.read(), primeiro.filename or "doc.png", dpi=110)
        return {
            "paginas": [_para_data_url(p) for p in paginas],
            "totalArquivos": len(todos),
            "primeiroNome": primeiro.filename,
        }
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=str(e)) from e


@app.post("/api/comparar")
async def comparar(
    protocolo: str = Form(""),
    arquivo_arca: UploadFile | None = File(default=None),
    arquivo_fisico: UploadFile | None = File(default=None),
    arquivos_arca: list[UploadFile] = File(default=[]),
    arquivos_fisico: list[UploadFile] = File(default=[]),
):
    try:
        # Coletar e ordenar naturalmente arquivos da ARCA
        lista_arca: list[UploadFile] = [f for f in arquivos_arca if f and f.filename]
        if arquivo_arca and arquivo_arca.filename and arquivo_arca not in lista_arca:
            lista_arca.append(arquivo_arca)

        # Coletar e ordenar naturalmente arquivos do Físico
        lista_fisico: list[UploadFile] = [f for f in arquivos_fisico if f and f.filename]
        if arquivo_fisico and arquivo_fisico.filename and arquivo_fisico not in lista_fisico:
            lista_fisico.append(arquivo_fisico)

        if not lista_arca:
            raise ValueError("Nenhum arquivo fornecido para o documento ARCA.")
        if not lista_fisico:
            raise ValueError("Nenhum arquivo fornecido para o documento Físico.")

        lista_arca.sort(key=lambda f: _ordenacao_natural(f.filename or ""))
        lista_fisico.sort(key=lambda f: _ordenacao_natural(f.filename or ""))

        arca: list = []
        nomes_arca: list[str] = []
        for f in lista_arca:
            conteudo = await f.read()
            pags = pipeline.carregar_paginas(conteudo, f.filename or "arca.png")
            arca.extend(pags)
            nomes_arca.extend(
                [f.filename or "arca" if len(pags) == 1 else f"{f.filename} (pág. {k + 1})" for k in range(len(pags))]
            )

        fisico: list = []
        nomes_fisico: list[str] = []
        for f in lista_fisico:
            conteudo = await f.read()
            pags = pipeline.carregar_paginas(conteudo, f.filename or "fisico.png")
            fisico.extend(pags)
            nomes_fisico.extend(
                [f.filename or "fisico" if len(pags) == 1 else f"{f.filename} (pág. {k + 1})" for k in range(len(pags))]
            )

        if not arca:
            raise ValueError("Não foi possível extrair páginas do documento ARCA.")
        if not fisico:
            raise ValueError("Não foi possível extrair páginas do documento Físico.")

        r = pipeline.processar_em_massa(arca, fisico, nomes_arca, nomes_fisico)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    return {
        "titulo": {
            "protocolo": protocolo or "(não informado)",
            "tipoTitulo": "Documento enviado para análise",
            "dataApresentacao": date.today().isoformat(),
            "apresentante": "Não informado",
            "paginas": r["paginas"],
            "marcas": r["marcas"],
        },
        "paginasArca": [_para_data_url(p) for p in r["paginas_arca"]],
        "paginasFisico": [_para_data_url(p) for p in r["paginas_fisico"]],
        "pareamento": r["pareamento"],
        "relatorioEsteira": r["relatorio_esteira"],
        "metodos": r["metodos"],
    }


# --- MONITORAMENTO EM TEMPO REAL DA DIGITALIZADORA (PaperStream / SMB) ---
@app.get("/api/scanner/arquivos")
def scanner_listar():
    return scanner_monitor.listar_arquivos()


@app.get("/api/scanner/config")
def scanner_obter_config():
    return scanner_monitor.obter_config()


@app.post("/api/scanner/config")
def scanner_alterar_config(dados: dict = Body(...)):
    pasta = str(dados.get("pastaScanner", "")).strip()
    try:
        return scanner_monitor.alterar_pasta(pasta)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Não foi possível acessar ou criar a pasta: {e}") from e


@app.get("/api/scanner/arquivos/{nome}/paginas")
def scanner_paginas_arquivo(nome: str):
    try:
        paginas = scanner_monitor.obter_paginas_arquivo(nome)
        return {"nome": nome, "paginas": paginas}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=str(e)) from e


@app.get("/api/scanner/arquivos/{nome}/download")
def scanner_download_arquivo(nome: str):
    try:
        caminho = scanner_monitor.obter_caminho_seguro(nome)
        return FileResponse(str(caminho), filename=caminho.name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@app.delete("/api/scanner/arquivos/{nome}")
def scanner_excluir_arquivo(nome: str):
    try:
        scanner_monitor.remover_arquivo(nome)
        return {"ok": True}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@app.delete("/api/scanner/limpar")
def scanner_limpar():
    removidos = scanner_monitor.limpar_todos_arquivos()
    return {"ok": True, "removidos": removidos}


@app.post("/api/scanner/simular")
def scanner_simular(dados: dict = Body(default={})):
    protocolo = str(dados.get("protocolo", "2026-000123")).strip() or "2026-000123"
    criado = scanner_monitor.simular_digitalizacao(protocolo)
    return {"ok": True, "arquivo": criado}


# --- ENTREGA DO FRONTEND COMPILADO (dist/) ---
if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
    fotos_dir = DIST_DIR / "fotos"
    if fotos_dir.exists():
        app.mount("/fotos", StaticFiles(directory=str(fotos_dir)), name="fotos")

    @app.get("/{caminho:path}")
    async def servir_frontend(caminho: str):
        alvo = (DIST_DIR / caminho).resolve()
        if caminho and alvo.is_file() and str(alvo).startswith(str(DIST_DIR.resolve())):
            return FileResponse(str(alvo))
        return FileResponse(str(DIST_DIR / "index.html"))
