"""Comparação visual estrita de um par de recortes (ARCA x físico na exata mesma posição)."""
from __future__ import annotations

import cv2
import numpy as np

LIMIAR_CONFIRMADO = 90  # 90% a 100% -> Correspondente (Confirmado)


def _tinta(img: np.ndarray) -> np.ndarray:
    """Máscara (0/255) de pixels de tinta: escuros ou coloridos."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return (((gray < 170) | (hsv[..., 1] > 70)).astype(np.uint8)) * 255


def comparar_recortes(arca: np.ndarray, fisico: np.ndarray) -> tuple[str, int]:
    """
    Retorna (status, confiança 0-100) comparando estritamente a mesma posição (sem tolerância de deslocamento).
    Se a assinatura estiver alocada em posição diferente, a confiança cai e o item fica Divergente.
    """
    if arca is None or fisico is None or arca.size == 0 or fisico.size == 0:
        return "Não localizado", 0

    t_arca, t_fis = _tinta(arca), _tinta(fisico)
    fr_arca = float((t_arca > 0).mean())
    fr_fis = float((t_fis > 0).mean())
    if fr_fis < 0.002 or (fr_arca > 0 and fr_fis < 0.2 * fr_arca):
        return "Não localizado", int(min(25, fr_fis * 1000))

    h, w = t_arca.shape[:2]
    if h < 4 or w < 4 or t_fis.shape[:2] != (h, w):
        return "Não localizado", 0

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    a = cv2.dilate(t_arca, kernel).astype(np.float32)
    f = cv2.dilate(t_fis, kernel).astype(np.float32)

    # Comparação direta na exata mesma coordenada (sem busca de deslocamento)
    res = cv2.matchTemplate(f, a, cv2.TM_CCOEFF_NORMED)
    ncc = float(np.clip(res[0, 0], 0.0, 1.0))
    confianca = int(round(ncc * 100))
    status = "Correspondente" if confianca >= LIMIAR_CONFIRMADO else "Possível divergência"
    return status, confianca
