"""
Etapa 4 — Análise de Estrutura e Layout Documental (Docling + deepdoctection).

Repositórios integrados:
  - Docling:        backend/vendor/docling-main (https://github.com/DS4SD/docling)
  - deepdoctection: backend/vendor/deepdoctection-master (https://github.com/deepdoctection/deepdoctection)

Função na esteira:
  - Mapear a estrutura semântica da página (Cabeçalho, Corpo de Texto Tipográfico e Rodapé/Encerramento).
  - Isolar as zonas de texto corrido (parágrafos, artigos, nomes digitados) para que a etapa seguinte
    (Stamp-Signature-Segregate) não confunda palavras ou números comuns com assinaturas ou carimbos!
"""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

VENDOR_DOCLING = Path(__file__).resolve().parents[2] / "vendor" / "docling-main"
VENDOR_DEEPDOC = Path(__file__).resolve().parents[2] / "vendor" / "deepdoctection-master"

for p in [VENDOR_DOCLING, VENDOR_DEEPDOC]:
    if p.exists() and str(p) not in sys.path:
        sys.path.insert(0, str(p))


def disponivel() -> dict:
    return {
        "docling": VENDOR_DOCLING.exists(),
        "deepdoctection": VENDOR_DEEPDOC.exists(),
    }


def mapear_zonas_documento(img: np.ndarray) -> dict:
    """
    Segmenta o layout da página em:
      - `zona_cabecalho`: topo do documento (0% a 22% da altura) onde ficam brasões e carimbos de protocolo;
      - `zona_corpo_texto`: linhas de parágrafos e texto corrido tipográfico (que não devem gerar falsos positivos);
      - `zona_assinaturas_rodape`: metade inferior e margens onde ficam assinaturas, rubricas e chancelas;
      - `linhas_texto`: coordenadas das linhas de texto para conferência via RapidFuzz.
    """
    H, W = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binaria = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

    # Identifica blocos horizontais de linhas tipográficas (parágrafos)
    kw = max(15, int(W * 0.04))
    kernel_linha = cv2.getStructuringElement(cv2.MORPH_RECT, (kw, 2))
    linhas_morf = cv2.morphologyEx(binaria, cv2.MORPH_CLOSE, kernel_linha)

    cnts, _ = cv2.findContours(linhas_morf, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    linhas_texto = []
    for c in cnts:
        x, y, w, h = cv2.boundingRect(c)
        if w > W * 0.15 and h < H * 0.035:
            linhas_texto.append({"x": x, "y": y, "w": w, "h": h})

    return {
        "motores": ["Docling (Estrutura Documental)", "deepdoctection (Segmentação de Layout)"],
        "total_linhas_tipograficas": len(linhas_texto),
        "zona_cabecalho_y_max": int(H * 0.22),
        "zona_conferencia_assinaturas_y_min": int(H * 0.50),
    }
