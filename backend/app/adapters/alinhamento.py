"""
Etapa 1 — ALINHAMENTO DE PÁGINAS (DIRD).

Repositório: https://github.com/hanquansanren/DIRD  (ICDAR 2024)
ESTADO: o repositório publicado contém apenas o README; o código de inferência
ainda NÃO foi liberado pelos autores. Por isso este adaptador:

  1. Tenta usar o DIRD se um módulo de inferência existir em
     backend/vendor/DIRD-master/ (função `register(src, ref)`);
  2. Caso contrário usa um alinhamento clássico com OpenCV (ORB + homografia),
     que corrige rotação/escala/translação (não corrige dobras de papel).

Quando o DIRD liberar o código, só `_dird_disponivel` e `_alinhar_dird`
precisam ser ajustados — o restante do pipeline não muda.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import cv2
import numpy as np

VENDOR = Path(__file__).resolve().parents[2] / "vendor" / "DIRD-master"


def _dird_disponivel() -> bool:
    return (VENDOR / "inference.py").exists()


def _alinhar_dird(img: np.ndarray, ref: np.ndarray) -> np.ndarray:
    # PONTO DE INTEGRAÇÃO DIRD: ajuste conforme a API do código liberado.
    sys.path.insert(0, str(VENDOR))
    spec = importlib.util.spec_from_file_location("dird_inference", VENDOR / "inference.py")
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod.register(img, ref)


def _alinhar_opencv(img: np.ndarray, ref: np.ndarray) -> np.ndarray:
    h, w = ref.shape[:2]
    img = cv2.resize(img, (w, h)) if img.shape[:2] != (h, w) else img
    g1 = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    g2 = cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY)
    orb = cv2.ORB_create(4000)
    k1, d1 = orb.detectAndCompute(g1, None)
    k2, d2 = orb.detectAndCompute(g2, None)
    if d1 is None or d2 is None or len(k1) < 12 or len(k2) < 12:
        return img
    matches = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(d1, d2)
    matches = sorted(matches, key=lambda m: m.distance)[:300]
    if len(matches) < 12:
        return img
    p1 = np.float32([k1[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
    p2 = np.float32([k2[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)
    H, mask = cv2.findHomography(p1, p2, cv2.RANSAC, 5.0)
    if H is None or mask is None or int(mask.sum()) < 10:
        return img
    return cv2.warpPerspective(img, H, (w, h), borderValue=(255, 255, 255))


def alinhar(img: np.ndarray, ref: np.ndarray) -> tuple[np.ndarray, str]:
    """Retorna (imagem alinhada à referência, nome do método usado)."""
    if _dird_disponivel():
        try:
            return _alinhar_dird(img, ref), "DIRD"
        except Exception:  # noqa: BLE001 - cai para o método clássico
            pass
    return _alinhar_opencv(img, ref), "OpenCV (ORB + homografia)"
