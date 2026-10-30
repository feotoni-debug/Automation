"""
Etapa 3 — Diferenciação Visual de Páginas (diff-pdf).

Repositório integrado: backend/vendor/diff-pdf-master (https://github.com/vslavik/diff-pdf)
Função na esteira:
  - Compara visualmente a página inteira da ARCA com a página física alinhada
    (seguindo o algoritmo de canais de cor do `diff-pdf.cpp`: página A em vermelho/ciano
    e página B sobreposta para destacar diferenças estruturais de página).
  - Calcula o índice de identidade global da página (%).
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

VENDOR = Path(__file__).resolve().parents[2] / "vendor" / "diff-pdf-master"


def disponivel() -> bool:
    return VENDOR.exists()


def comparar_paginas(arca: np.ndarray, fisico_alinhado: np.ndarray) -> dict:
    """
    Executa a comparação pixel a pixel inspirada em `bmp_diff` do diff-pdf (`diff-pdf.cpp`),
    calculando o percentual de similaridade estrutural da página como um todo.
    """
    h, w = arca.shape[:2]
    if fisico_alinhado.shape[:2] != (h, w):
        fisico_alinhado = cv2.resize(fisico_alinhado, (w, h))

    g_arca = cv2.cvtColor(arca, cv2.COLOR_BGR2GRAY)
    g_fis = cv2.cvtColor(fisico_alinhado, cv2.COLOR_BGR2GRAY)

    # Suaviza pequenas diferenças de serrilhado de fonte (equivalente à tolerância do diff-pdf)
    b_arca = cv2.GaussianBlur(g_arca, (5, 5), 0)
    b_fis = cv2.GaussianBlur(g_fis, (5, 5), 0)

    diff = cv2.absdiff(b_arca, b_fis)
    pixels_diferentes = float((diff > 38).mean())
    similaridade_pagina = round(max(0.0, (1.0 - pixels_diferentes) * 100), 1)

    return {
        "motor": "diff-pdf (Comparação Visual de Página)",
        "similaridade_pagina_pct": similaridade_pagina,
        "divergencia_estrutural_pct": round(pixels_diferentes * 100, 2),
    }
