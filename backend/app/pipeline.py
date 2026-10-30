"""
Orquestrador Oficial da Esteira de Conferência Documental (9 Repositórios Integrados):
  1. OCRmyPDF                  -> Normalização e pré-processamento documental
  2. DIRD + OpenCV 5.x         -> Alinhamento geométrico e retificação de página (ORB + Homografia)
  3. diff-pdf                  -> Diferenciação estrutural global da página
  4. Docling + deepdoctection  -> Mapeamento de layout (isola corpo de texto para não virar item na lista)
  5. Stamp-Signature-Segregate -> Localização exclusiva de Carimbos e Assinaturas (YOLOv12 + Morfologia)
  6. DocTamper + OpenCV        -> Verificação de integridade/adulteração e similaridade dos recortes
  7. RapidFuzz                 -> Fiscalização de conformidade textual (números, nomes e parágrafos em segundo plano)
"""
from __future__ import annotations

import cv2
import numpy as np
import pymupdf as fitz  # PyMuPDF

from .adapters import (
    adulteracao,
    alinhamento,
    diff_visual,
    layout_doc,
    ocr,
    segregacao,
    texto_fuzz,
)
from .comparacao import comparar_recortes


def carregar_paginas(conteudo: bytes, nome: str, dpi: int = 150) -> list[np.ndarray]:
    if nome.lower().endswith(".pdf"):
        doc = fitz.open(stream=conteudo, filetype="pdf")
        paginas = []
        for p in doc:
            pix = p.get_pixmap(dpi=dpi)
            img = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)
            paginas.append(cv2.cvtColor(img, cv2.COLOR_RGBA2BGR if pix.n == 4 else cv2.COLOR_RGB2BGR))
        return paginas
    img = cv2.imdecode(np.frombuffer(conteudo, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Arquivo de imagem inválido: {nome}")
    return [img]


def processar_em_massa(
    arca: list[np.ndarray],
    fisico: list[np.ndarray],
    nomes_arca: list[str] | None = None,
    nomes_fisico: list[str] | None = None,
) -> dict:
    """
    Conferência em massa: localiza, na pasta inteira do físico, o documento equivalente a cada
    página da ARCA (ordem das pastas é irrelevante) e só então executa a esteira por par.
    Páginas da ARCA sem equivalente recebem uma folha em branco (-> itens Divergentes) e
    páginas físicas sem equivalente na ARCA são anexadas ao final para revisão.
    """
    from .pareamento import parear

    nomes_arca = nomes_arca or [f"ARCA pág. {i + 1}" for i in range(len(arca))]
    nomes_fisico = nomes_fisico or [f"Físico pág. {j + 1}" for j in range(len(fisico))]

    res = parear(arca, fisico)
    por_arca = {i: (j, s) for i, j, s in res["pares"]}

    arca_final: list[np.ndarray] = []
    fisico_final: list[np.ndarray] = []
    pareamento: list[dict] = []

    for i, pagina_arca in enumerate(arca):
        arca_final.append(pagina_arca)
        if i in por_arca:
            j, s = por_arca[i]
            fisico_final.append(fisico[j])
            pareamento.append({
                "pagina": len(arca_final), "arca": nomes_arca[i], "fisico": nomes_fisico[j],
                "similaridade": round(s * 100), "situacao": "pareado",
                "mesmaPosicao": i == j,
            })
        else:
            fisico_final.append(np.full_like(pagina_arca, 255))
            pareamento.append({
                "pagina": len(arca_final), "arca": nomes_arca[i], "fisico": None,
                "similaridade": 0, "situacao": "sem_correspondente_fisico", "mesmaPosicao": False,
            })

    for j in res["fisico_sem_par"]:
        arca_final.append(np.full_like(fisico[j], 255))
        fisico_final.append(fisico[j])
        pareamento.append({
            "pagina": len(arca_final), "arca": None, "fisico": nomes_fisico[j],
            "similaridade": 0, "situacao": "sem_correspondente_arca", "mesmaPosicao": False,
        })

    r = processar(arca_final, fisico_final)
    r["pareamento"] = pareamento
    r["paginas_arca"] = arca_final
    r["paginas_fisico"] = fisico_final
    return r


def processar(arca: list[np.ndarray], fisico: list[np.ndarray]) -> dict:
    n = min(len(arca), len(fisico))
    marcas: list[dict] = []
    relatorio_paginas: list[dict] = []

    for i in range(n):
        # Etapa 1: OCRmyPDF (Pré-processamento e normalização)
        ref_norm, m_ocr = ocr.preprocessar_pagina(arca[i])
        fis_norm, _ = ocr.preprocessar_pagina(fisico[i])

        # Etapa 2: DIRD + OpenCV (Alinhamento geométrico)
        alin, m_alin = alinhamento.alinhar(fis_norm, ref_norm)

        # Etapa 3: diff-pdf (Comparação estrutural da página inteira)
        info_diff = diff_visual.comparar_paginas(ref_norm, alin)

        # Etapa 4: Docling + deepdoctection (Mapeamento das zonas de texto vs zonas de assinatura/carimbo)
        info_layout = layout_doc.mapear_zonas_documento(ref_norm)

        # Etapa 5: Stamp-Signature-Segregate (Detecção EXCLUSIVA de carimbos e assinaturas)
        caixas, m_seg = segregacao.detectar(ref_norm)

        # Etapa 7: RapidFuzz (Fiscalização de números, nomes e texto em segundo plano)
        info_fuzz = texto_fuzz.fiscalizar_texto(ref_norm, alin)

        relatorio_paginas.append({
            "pagina": i + 1,
            "preprocessamento": m_ocr,
            "alinhamento": m_alin,
            "diff_pdf": info_diff,
            "layout": info_layout,
            "fiscalizacao_textual_rapidfuzz": info_fuzz,
        })

        # Etapa 6: DocTamper + OpenCV (Comparação individual de cada Carimbo e Assinatura na mesma posição)
        H, W = ref_norm.shape[:2]
        for c in sorted(caixas, key=lambda c: (c["y"], c["x"])):
            pad = int(0.12 * min(c["w"], c["h"]))
            x0, y0 = max(0, c["x"] - pad), max(0, c["y"] - pad)
            x1, y1 = min(W, c["x"] + c["w"] + pad), min(H, c["y"] + c["h"] + pad)
            r_arca, r_fis = ref_norm[y0:y1, x0:x1], alin[y0:y1, x0:x1]
            status, conf = comparar_recortes(r_arca, r_fis)
            tamper = adulteracao.pontuacao_adulteracao(r_fis) if status != "Não localizado" else None
            rotulo = "Assinatura" if c["tipo"] == "assinatura" else "Carimbo"
            desc = f"{rotulo} {sum(1 for x in marcas if x['pagina'] == i + 1 and x['tipo'] == c['tipo']) + 1}"
            if tamper is not None:
                desc += f" · indício DocTamper {tamper * 100:.0f}%"
            marcas.append({
                "id": f"m{len(marcas) + 1}",
                "tipo": c["tipo"],
                "pagina": i + 1,
                "regiao": {
                    "x": round(x0 / W * 100, 2),
                    "y": round(y0 / H * 100, 2),
                    "w": round((x1 - x0) / W * 100, 2),
                    "h": round((y1 - y0) / H * 100, 2),
                },
                "status": status,
                "confianca": conf,
                "descricao": desc,
                "seed": 0,
            })

    return {
        "paginas": n,
        "marcas": marcas,
        "relatorio_esteira": relatorio_paginas,
        "metodos": {
            "etapa_1_preprocessamento_ocr": "OCRmyPDF",
            "etapa_2_alinhamento": "DIRD + OpenCV 5.x (ORB + Homografia RANSAC)",
            "etapa_3_comparacao_pagina": "diff-pdf",
            "etapa_4_layout_estrutura": ["Docling", "deepdoctection"],
            "etapa_5_segregacao_marcas": "Stamp-Signature-Segregate (YOLOv12 best.pt + Filtro de Traços)",
            "etapa_6_integridade_recorte": "DocTamper + OpenCV NCC",
            "etapa_7_fiscalizacao_texto": "RapidFuzz (Levenshtein C++)",
        },
    }
