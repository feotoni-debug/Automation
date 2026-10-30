"""
Pareamento em massa: casa cada página da ARCA com a página física equivalente,
independentemente da ordem em que as pastas foram digitalizadas.

Estratégia (sem depender da ordem dos arquivos):
  1. Para cada página calcula uma assinatura visual (miniatura + descritores ORB).
  2. Monta a matriz de similaridade ARCA x Físico (todas contra todas).
  3. Atribuição gulosa pelo maior score, cada página física é usada no máximo 1 vez.
  4. Páginas sem par acima do limiar ficam como "sem correspondente".
"""
from __future__ import annotations

import cv2
import numpy as np

LIMIAR_PAREAMENTO = 0.30  # score mínimo (0-1) para considerar que são o mesmo documento
_THUMB_W = 192


def _assinatura(img: np.ndarray) -> dict:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    esc = 900 / max(h, w)
    g = cv2.resize(gray, (int(w * esc), int(h * esc)), interpolation=cv2.INTER_AREA) if esc < 1 else gray
    orb = cv2.ORB_create(nfeatures=900)
    kp, des = orb.detectAndCompute(g, None)
    t = cv2.resize(gray, (_THUMB_W, 256), interpolation=cv2.INTER_AREA)
    t = cv2.GaussianBlur(t, (5, 5), 0)
    t = (t.astype(np.float32) - t.mean()) / (t.std() + 1e-6)
    return {"des": des, "n": len(kp) if kp else 0, "thumb": t}


def _score(a: dict, b: dict) -> float:
    # componente 1: correlação normalizada das miniaturas (tolera pequenos deslocamentos)
    ta, tb = a["thumb"], b["thumb"]
    ncc = float((ta * tb).mean())
    s_thumb = max(0.0, ncc)

    # componente 2: correspondência de descritores ORB (robusta a rotação/escala)
    s_orb = 0.0
    if a["des"] is not None and b["des"] is not None and a["n"] > 10 and b["n"] > 10:
        bf = cv2.BFMatcher(cv2.NORM_HAMMING)
        pares = bf.knnMatch(a["des"], b["des"], k=2)
        bons = [m for m, n in (p for p in pares if len(p) == 2) if m.distance < 0.75 * n.distance]
        s_orb = min(1.0, len(bons) / max(30.0, 0.25 * min(a["n"], b["n"])))
    return max(s_thumb, s_orb)


def parear(arca: list[np.ndarray], fisico: list[np.ndarray]) -> dict:
    """
    Retorna:
      pares: lista de (i_arca, j_fisico, score) — ordenada pela ordem da ARCA
      arca_sem_par: índices da ARCA sem página física equivalente
      fisico_sem_par: índices do físico sem página equivalente na ARCA
    """
    na, nf = len(arca), len(fisico)
    if na == 1 and nf == 1:
        sa, sf = _assinatura(arca[0]), _assinatura(fisico[0])
        return {"pares": [(0, 0, round(_score(sa, sf), 3))], "arca_sem_par": [], "fisico_sem_par": []}

    sig_a = [_assinatura(p) for p in arca]
    sig_f = [_assinatura(p) for p in fisico]
    matriz = np.zeros((na, nf), dtype=np.float32)
    for i in range(na):
        for j in range(nf):
            matriz[i, j] = _score(sig_a[i], sig_f[j])

    pares: list[tuple[int, int, float]] = []
    usados_a: set[int] = set()
    usados_f: set[int] = set()
    candidatos = sorted(
        ((float(matriz[i, j]), i, j) for i in range(na) for j in range(nf)),
        reverse=True,
    )
    for s, i, j in candidatos:
        if s < LIMIAR_PAREAMENTO:
            break
        if i in usados_a or j in usados_f:
            continue
        pares.append((i, j, round(s, 3)))
        usados_a.add(i)
        usados_f.add(j)

    pares.sort(key=lambda p: p[0])
    return {
        "pares": pares,
        "arca_sem_par": [i for i in range(na) if i not in usados_a],
        "fisico_sem_par": [j for j in range(nf) if j not in usados_f],
    }
