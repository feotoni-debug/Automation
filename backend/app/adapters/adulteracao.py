"""
Etapa 3 — INDÍCIO DE ADULTERAÇÃO DE TEXTO/IMAGEM (DocTamper).

Repositório: https://github.com/qcf-568/DocTamper  (CVPR 2023)
O DocTamper localiza regiões de TEXTO adulterado (segmentação) em imagens de
documento. Ele NÃO compara duas assinaturas — a comparação ARCA x físico é
feita em `comparacao.py`. Aqui o DocTamper é usado como indicador adicional.

Requisitos para ativar (não incluídos no repositório enviado):
  - GPU NVIDIA + dependências de backend/vendor/DocTamper-main/models/requirements.txt
  - Pesos: backend/vendor/DocTamper-main/models/pths/dtd.pth  (+ swin_imagenet.pt,
    vph_imagenet.pt) — ver models/Readme.md do repositório.
  - A licença do DATASET é restrita a uso não comercial; verifique a licença
    dos pesos antes de usar em produção.

ATENÇÃO: o caminho de inferência abaixo foi escrito a partir do `eval_dtd.py`
do repositório e NÃO foi executado (sem pesos/GPU no ambiente de desenvolvimento).
Valide com os pesos reais antes de confiar nos números.
"""
from __future__ import annotations

import os
import pickle
import sys
import tempfile
from pathlib import Path

import numpy as np

MODELS = Path(__file__).resolve().parents[2] / "vendor" / "DocTamper-main" / "models"
PESOS = MODELS / "pths" / "dtd.pth"
QT_TABLE = MODELS.parent / "qt_table.pk"
QUALIDADE_JPEG = 90

_modelo = None
_tabelas = None


def disponivel() -> bool:
    if not PESOS.exists() or not QT_TABLE.exists():
        return False
    try:
        import torch  # noqa: F401
        import jpegio  # noqa: F401
    except ImportError:
        return False
    return True


def _carregar():
    global _modelo, _tabelas
    if _modelo is not None:
        return
    import torch

    sys.path.insert(0, str(MODELS))
    from dtd import seg_dtd  # type: ignore  # do repositório DocTamper

    device = "cuda" if torch.cuda.is_available() else "cpu"
    modelo = seg_dtd("", 2).to(device)
    ckpt = torch.load(PESOS, map_location="cpu")
    state = {k.replace("module.", "", 1): v for k, v in ckpt["state_dict"].items()}
    modelo.load_state_dict(state)
    modelo.eval()
    with open(QT_TABLE, "rb") as f:
        _tabelas = {k: torch.LongTensor(v) for k, v in pickle.load(f).items()}
    _modelo = (modelo, device)


def pontuacao_adulteracao(recorte_bgr: np.ndarray) -> float | None:
    """Fração (0–1) de pixels do recorte marcados como adulterados, ou None se indisponível."""
    if not disponivel():
        return None
    import cv2
    import jpegio
    import torch
    import torchvision

    _carregar()
    modelo, device = _modelo  # type: ignore[misc]
    cinza = cv2.cvtColor(recorte_bgr, cv2.COLOR_BGR2GRAY)
    with tempfile.TemporaryDirectory() as d:
        caminho = os.path.join(d, "r.jpg")
        cv2.imwrite(caminho, cinza, [cv2.IMWRITE_JPEG_QUALITY, QUALIDADE_JPEG])
        dct = np.clip(np.abs(jpegio.read(caminho).coef_arrays[0].copy()), 0, 20)
        rgb = cv2.cvtColor(cv2.imread(caminho, 0), cv2.COLOR_GRAY2RGB)
    norm = torchvision.transforms.Compose([
        torchvision.transforms.ToTensor(),
        torchvision.transforms.Normalize((0.485, 0.455, 0.406), (0.229, 0.224, 0.225)),
    ])
    with torch.no_grad():
        x = norm(rgb).unsqueeze(0).to(device)
        d_t = torch.from_numpy(dct).unsqueeze(0).to(device)
        qs = _tabelas[QUALIDADE_JPEG].unsqueeze(0).unsqueeze(1).to(device)  # type: ignore[index]
        pred = modelo(x, d_t, qs).argmax(1)
    return float(pred.float().mean().item())
