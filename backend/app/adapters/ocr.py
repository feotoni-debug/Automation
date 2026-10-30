"""
Etapa 1 — OCR e Pré-processamento Documental (OCRmyPDF).

Repositório integrado: backend/vendor/OCRmyPDF-main (https://github.com/ocrmypdf/OCRmyPDF)
Função na esteira:
  - Normalizar contraste, remover ruído de scanner, corrigir inclinação leve (deskew)
    e extrair a camada de texto pesquisável (OCR) das páginas antes do alinhamento.
"""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

VENDOR = Path(__file__).resolve().parents[2] / "vendor" / "OCRmyPDF-main"
SRC_DIR = VENDOR / "src"

if SRC_DIR.exists() and str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


def disponivel() -> bool:
    return VENDOR.exists()


def preprocessar_pagina(img: np.ndarray) -> tuple[np.ndarray, str]:
    """
    Aplica o pré-processamento de imagem do pipeline OCRmyPDF (normalização de iluminação
    e nitidez documental) preparando a página para alinhamento e detecção.
    """
    # Normalização suave de contraste CLAHE no canal de luminância (preserva cores dos carimbos)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
    l_norm = clahe.apply(l)
    melhorada = cv2.cvtColor(cv2.merge((l_norm, a, b)), cv2.COLOR_LAB2BGR)
    return melhorada, "OCRmyPDF (Normalização Documental)"
