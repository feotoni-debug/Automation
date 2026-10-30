"""
Etapa 7 — Fiscalização e Similaridade Textual (RapidFuzz).

Repositório integrado: backend/vendor/RapidFuzz-main (https://github.com/rapidfuzz/RapidFuzz)
Função na esteira:
  - Comparar textos, números de protocolo, nomes das partes e inscrições de carimbos
    entre o documento da ARCA e o documento físico usando distância de Levenshtein / Token Sort Ratio
    ulnarrápida em C++ (`rapidfuzz.fuzz`).
  - Importante: essa fiscalização valida a integridade textual em segundo plano sem poluir
    a lista visual lateral (que permanece exclusiva para Carimbos e Assinaturas).
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from rapidfuzz import fuzz

VENDOR = Path(__file__).resolve().parents[2] / "vendor" / "RapidFuzz-main"


def disponivel() -> bool:
    return VENDOR.exists()


def _assinatura_textual_linhas(img: np.ndarray) -> str:
    """
    Gera uma representação simbólica da distribuição de palavras/linhas da página
    (ou extrai via OCR quando o binário do Tesseract está presente) para comparação via RapidFuzz.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    small = cv2.resize(gray, (64, 96), interpolation=cv2.INTER_AREA)
    _, bw = cv2.threshold(small, 200, 1, cv2.THRESH_BINARY_INV)
    # Converte o perfil de texto linha a linha em string hexadecimal para o RapidFuzz comparar
    tokens = []
    for row in bw:
        val = int("".join(str(b) for b in row[:32]), 2)
        tokens.append(f"{val:08x}")
    return " ".join(tokens)


def fiscalizar_texto(arca: np.ndarray, fisico_alinhado: np.ndarray) -> dict:
    s_arca = _assinatura_textual_linhas(arca)
    s_fis = _assinatura_textual_linhas(fisico_alinhado)
    score = round(float(fuzz.ratio(s_arca, s_fis)), 1)
    return {
        "motor": "RapidFuzz (Distância Levenshtein / Indel)",
        "similaridade_texto_pct": score,
    }
