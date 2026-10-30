"""
Monitoramento em tempo real da pasta de saída da digitalizadora (PaperStream Capture / SMB)
usando Watchdog + cache inteligente de miniaturas e páginas.
"""
from __future__ import annotations

import base64
from datetime import datetime
import json
from pathlib import Path
import threading
import time
from typing import Any

import cv2
import numpy as np
import pymupdf as fitz

try:
    from watchdog.events import FileSystemEvent, FileSystemEventHandler
    from watchdog.observers import Observer

    WATCHDOG_DISPONIVEL = True
except Exception:  # noqa: BLE001
    WATCHDOG_DISPONIVEL = False
    FileSystemEventHandler = object  # type: ignore[misc,assignment]
    Observer = None  # type: ignore[assignment]

ROOT_DIR = Path(__file__).resolve().parents[2]
CONFIG_FILE = Path(__file__).resolve().parents[1] / "scanner_config.json"
DEFAULT_SCANNER_DIR = ROOT_DIR / "entrada_scanner"

EXTENSOES_ACEITAS = {".pdf", ".tif", ".tiff", ".png", ".jpg", ".jpeg", ".bmp", ".webp"}

_LOCK = threading.Lock()
_CACHE_PREVIA: dict[tuple[str, int, int], dict[str, Any]] = {}
_ULTIMO_EVENTO_TS: float = time.time()
_OBSERVER: Any = None
_PASTA_ATUAL: Path = DEFAULT_SCANNER_DIR


def _carregar_pasta_configurada() -> Path:
    if CONFIG_FILE.exists():
        try:
            dados = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
            caminho = dados.get("pasta_scanner", "").strip()
            if caminho:
                p = Path(caminho)
                p.mkdir(parents=True, exist_ok=True)
                return p
        except Exception:  # noqa: BLE001
            pass
    DEFAULT_SCANNER_DIR.mkdir(parents=True, exist_ok=True)
    return DEFAULT_SCANNER_DIR


def _salvar_pasta_configurada(pasta: Path) -> None:
    CONFIG_FILE.write_text(
        json.dumps({"pasta_scanner": str(pasta.resolve())}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _eh_arquivo_valido(caminho: Path) -> bool:
    if not caminho.is_file():
        return False
    nome = caminho.name
    if nome.startswith(".") or nome.startswith("~$"):
        return False
    return caminho.suffix.lower() in EXTENSOES_ACEITAS


def _img_para_data_url(img: np.ndarray, max_largura: int | None = None) -> str:
    if max_largura and img.shape[1] > max_largura:
        escala = max_largura / float(img.shape[1])
        nova_altura = max(1, int(img.shape[0] * escala))
        img = cv2.resize(img, (max_largura, nova_altura), interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise ValueError("Falha ao codificar miniatura PNG.")
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")
    return f"data:image/png;base64,{b64}"


def _extrair_resumo_arquivo(caminho: Path) -> dict[str, Any] | None:
    """
    Lê contagem de páginas e gera miniatura da 1ª página.
    Se o arquivo ainda estiver sendo gravado pelo PaperStream Capture, retorna None.
    """
    try:
        stat = caminho.stat()
    except OSError:
        return None

    if stat.st_size == 0:
        return None

    chave = (str(caminho.resolve()), stat.st_mtime_ns, stat.st_size)
    with _LOCK:
        if chave in _CACHE_PREVIA:
            return _CACHE_PREVIA[chave]

    try:
        conteudo = caminho.read_bytes()
        sufixo = caminho.suffix.lower()
        if sufixo == ".pdf":
            doc = fitz.open(stream=conteudo, filetype="pdf")
            total_paginas = len(doc)
            if total_paginas == 0:
                return None
            pix = doc[0].get_pixmap(dpi=100)
            img = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)
            bgr = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR if pix.n == 4 else cv2.COLOR_RGB2BGR)
            doc.close()
        elif sufixo in {".tif", ".tiff"}:
            # Tenta ler multipágina via PyMuPDF ou OpenCV
            try:
                doc = fitz.open(stream=conteudo, filetype="tiff")
                total_paginas = max(1, len(doc))
                pix = doc[0].get_pixmap(dpi=100)
                img = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)
                bgr = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR if pix.n == 4 else cv2.COLOR_RGB2BGR)
                doc.close()
            except Exception:  # noqa: BLE001
                ok, imgs = cv2.imdecodemulti(np.frombuffer(conteudo, np.uint8), cv2.IMREAD_COLOR)
                if not ok or not imgs:
                    return None
                total_paginas = len(imgs)
                bgr = imgs[0]
        else:
            bgr = cv2.imdecode(np.frombuffer(conteudo, np.uint8), cv2.IMREAD_COLOR)
            if bgr is None:
                return None
            total_paginas = 1

        previa_url = _img_para_data_url(bgr, max_largura=420)
        resumo = {
            "paginas": total_paginas,
            "previa": previa_url,
        }
        with _LOCK:
            _CACHE_PREVIA[chave] = resumo
        return resumo
    except Exception:  # noqa: BLE001
        return None


class _HandlerScanner(FileSystemEventHandler):
    def on_any_event(self, event: FileSystemEvent) -> None:
        global _ULTIMO_EVENTO_TS
        if getattr(event, "is_directory", False):
            return
        _ULTIMO_EVENTO_TS = time.time()


def iniciar_monitoramento(pasta: Path | None = None) -> Path:
    global _OBSERVER, _PASTA_ATUAL, _ULTIMO_EVENTO_TS
    alvo = (pasta or _carregar_pasta_configurada()).resolve()
    alvo.mkdir(parents=True, exist_ok=True)
    _PASTA_ATUAL = alvo
    _ULTIMO_EVENTO_TS = time.time()

    if WATCHDOG_DISPONIVEL and Observer is not None:
        if _OBSERVER is not None:
            try:
                _OBSERVER.stop()
                _OBSERVER.join(timeout=2)
            except Exception:  # noqa: BLE001
                pass
        obs = Observer()
        obs.schedule(_HandlerScanner(), str(alvo), recursive=False)
        obs.daemon = True
        obs.start()
        _OBSERVER = obs

    return alvo


def obter_config() -> dict[str, Any]:
    pasta = _PASTA_ATUAL
    pasta.mkdir(parents=True, exist_ok=True)
    return {
        "pastaScanner": str(pasta.resolve()),
        "watchdogAtivo": bool(WATCHDOG_DISPONIVEL and _OBSERVER is not None and _OBSERVER.is_alive()),
        "ultimoEventoTs": _ULTIMO_EVENTO_TS,
    }


def alterar_pasta(novo_caminho: str) -> dict[str, Any]:
    caminho_limpo = novo_caminho.strip().strip('"').strip("'")
    if not caminho_limpo:
        raise ValueError("Informe um caminho de pasta válido.")
    p = Path(caminho_limpo).expanduser().resolve()
    p.mkdir(parents=True, exist_ok=True)
    _salvar_pasta_configurada(p)
    iniciar_monitoramento(p)
    return obter_config()


def listar_arquivos() -> dict[str, Any]:
    pasta = _PASTA_ATUAL
    pasta.mkdir(parents=True, exist_ok=True)

    itens: list[dict[str, Any]] = []
    for arq in pasta.iterdir():
        if not _eh_arquivo_valido(arq):
            continue
        resumo = _extrair_resumo_arquivo(arq)
        if resumo is None:
            # Arquivo ainda sendo escrito pela digitalizadora
            continue
        stat = arq.stat()
        match_prot = None
        for token in arq.stem.split("_"):
            if token.startswith("2026-") and len(token) == 11:
                match_prot = token
                break
        itens.append(
            {
                "nome": arq.name,
                "tamanho": stat.st_size,
                "modificadoEm": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "mtimeMs": int(stat.st_mtime * 1000),
                "paginas": resumo["paginas"],
                "previa": resumo["previa"],
                "protocoloSugerido": match_prot,
            }
        )

    # Mais recentes primeiro
    itens.sort(key=lambda x: x["mtimeMs"], reverse=True)
    return {
        "pastaScanner": str(pasta.resolve()),
        "watchdogAtivo": bool(WATCHDOG_DISPONIVEL and _OBSERVER is not None and _OBSERVER.is_alive()),
        "ultimoEventoTs": _ULTIMO_EVENTO_TS,
        "arquivos": itens,
    }


def obter_caminho_seguro(nome: str) -> Path:
    pasta = _PASTA_ATUAL.resolve()
    alvo = (pasta / Path(nome).name).resolve()
    if alvo.parent != pasta or not alvo.is_file():
        raise FileNotFoundError(f"Arquivo não encontrado na pasta da digitalizadora: {nome}")
    return alvo


def obter_paginas_arquivo(nome: str, dpi: int = 135) -> list[str]:
    from . import pipeline

    alvo = obter_caminho_seguro(nome)
    conteudo = alvo.read_bytes()
    paginas_bgr = pipeline.carregar_paginas(conteudo, alvo.name, dpi=dpi)
    return [_img_para_data_url(p, max_largura=960) for p in paginas_bgr]


def remover_arquivo(nome: str) -> None:
    global _ULTIMO_EVENTO_TS
    alvo = obter_caminho_seguro(nome)
    alvo.unlink(missing_ok=True)
    _ULTIMO_EVENTO_TS = time.time()


def limpar_todos_arquivos() -> int:
    global _ULTIMO_EVENTO_TS
    pasta = _PASTA_ATUAL.resolve()
    removidos = 0
    if pasta.exists():
        for arq in pasta.iterdir():
            if _eh_arquivo_valido(arq):
                try:
                    arq.unlink()
                    removidos += 1
                except OSError:
                    pass
    _ULTIMO_EVENTO_TS = time.time()
    return removidos


def simular_digitalizacao(protocolo: str = "2026-000123") -> dict[str, Any]:
    """
    Gera um PDF multipágina simulando um documento físico recém-digitalizado
    pela Ricoh fi-8170 / Fujitsu fi-7140 na pasta monitorada.
    """
    global _ULTIMO_EVENTO_TS
    pasta = _PASTA_ATUAL.resolve()
    pasta.mkdir(parents=True, exist_ok=True)

    agora = datetime.now()
    prot_limpo = protocolo.strip() or "2026-000123"
    nome_arq = f"Scan_PaperStream_{prot_limpo}_{agora.strftime('%H%M%S')}.pdf"
    destino = pasta / nome_arq

    doc = fitz.open()
    for num_pag in range(1, 3):
        page = doc.new_page(width=595, height=842)  # A4
        # Moldura do papel escaneado
        page.draw_rect(fitz.Rect(28, 28, 567, 814), color=(0.18, 0.27, 0.12), width=1.5)
        page.insert_text(
            (48, 65),
            "2º OFICIAL DE REGISTRO DE IMÓVEIS — VIA FÍSICA DIGITALIZADA",
            fontsize=12,
            color=(0.18, 0.27, 0.12),
        )
        page.insert_text(
            (48, 88),
            f"Protocolo: {prot_limpo}   |   Data/Hora Captura: {agora.strftime('%d/%m/%Y %H:%M:%S')}   |   Página {num_pag}/2",
            fontsize=9.5,
            color=(0.35, 0.37, 0.30),
        )
        page.draw_line((48, 100), (547, 100), color=(0.75, 0.82, 0.68), width=1)

        # Corpo de texto simulado
        linhas = [
            "INSTRUMENTO PARTICULAR DE COMPRA E VENDA COM ALIENAÇÃO FIDUCIÁRIA",
            "",
            f"Pelo presente instrumento, referente ao protocolo {prot_limpo}, as partes qualificadas",
            "declaram ter ajustado a transferência do imóvel matriculado nesta serventia,",
            "observadas as cláusulas e condições legais vigentes.",
            "",
            "1. DO OBJETO E DESCRIÇÃO DO IMÓVEL:",
            "Lote urbano situado na circunscrição imobiliária competente, livre e desembaraçado",
            "de quaisquer ônus reais, fiscais ou extrajudiciais.",
            "",
            "2. DO VALOR E FORMA DE PAGAMENTO:",
            "O preço certo e ajustado foi integralmente quitado mediante recursos próprios",
            "e financiamento habitacional, conforme demonstrativo anexo.",
        ]
        y = 135
        for linha in linhas:
            page.insert_text((52, y), linha, fontsize=10.5, color=(0.12, 0.14, 0.10))
            y += 22

        # Carimbo simulado do cartório
        carimbo_rect = fitz.Rect(350, 610, 535, 695)
        page.draw_rect(carimbo_rect, color=(0.18, 0.38, 0.22), width=2)
        page.insert_text((365, 635), "SELO DIGITAL DE FISCALIZAÇÃO", fontsize=8.5, color=(0.18, 0.38, 0.22))
        page.insert_text((365, 653), f"PROTOCOLO Nº {prot_limpo}", fontsize=9.5, color=(0.18, 0.38, 0.22))
        page.insert_text((365, 671), "CONFERIDO NO SCANNER FI-SERIES", fontsize=8, color=(0.18, 0.38, 0.22))

        # Assinatura simulada
        page.draw_line((70, 720), (280, 720), color=(0.2, 0.2, 0.2), width=1)
        page.draw_bezier((95, 712), (140, 675), (195, 730), (255, 695), color=(0.08, 0.15, 0.45), width=1.8)
        page.insert_text((115, 736), "Assinatura do Apresentante / Outorgante", fontsize=8.5, color=(0.35, 0.37, 0.30))

    doc.save(str(destino))
    doc.close()
    _ULTIMO_EVENTO_TS = time.time()

    resumo = _extrair_resumo_arquivo(destino) or {"paginas": 2, "previa": ""}
    stat = destino.stat()
    return {
        "nome": destino.name,
        "tamanho": stat.st_size,
        "modificadoEm": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "mtimeMs": int(stat.st_mtime * 1000),
        "paginas": resumo["paginas"],
        "previa": resumo["previa"],
        "protocoloSugerido": prot_limpo,
    }
