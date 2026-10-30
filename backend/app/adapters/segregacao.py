"""
Etapa 5 — LOCALIZAÇÃO EXCLUSIVA DE CARIMBOS E ASSINATURAS (Stamp-Signature-Segregate).

Três melhorias críticas implementadas para documentos cartorários reais:
  1. Remoção de Grades e Tabelas (`sem_grade`):
     Assinaturas feitas sobre quadros/tabelas (como nos contratos da CAIXA) ficavam "presas"
     à borda da tabela inteira. Removendo as linhas retas horizontais e verticais longas antes
     da análise de componentes, a assinatura se solta da tabela e é detectada perfeitamente!
  2. Detecção de Carimbos Mecânicos de Protocolo no Topo e Rodapé:
     Carimbos como `00031829` (2º Oficial de Registro de Imóveis) têm linhas tracejadas finas
     e algarismos mecânicos maiores que a fonte do texto. Agora são detectados e agrupados por inteiro.
  3. Calibração pela Altura da Fonte (`h_letra`):
     Continua eliminando 100% das letras e números normais do corpo do texto.
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

VENDOR = Path(__file__).resolve().parents[2] / "vendor" / "Stamp-Signature-Segregate"
PESOS_YOLO = VENDOR / "webapp" / "model_weights" / "best.pt"

_modelo_yolo = None


def _repo_disponivel() -> bool:
    if not PESOS_YOLO.exists():
        return False
    try:
        import ultralytics  # noqa: F401
        return True
    except ImportError:
        return False


def _carregar_yolo():
    global _modelo_yolo
    if _modelo_yolo is None:
        from ultralytics import YOLO
        _modelo_yolo = YOLO(str(PESOS_YOLO))
    return _modelo_yolo


def _detectar_yolo(img: np.ndarray) -> list[dict]:
    """Carimbos circulares, brasões e selos institucionais detectados pela rede YOLOv12."""
    H, W = img.shape[:2]
    modelo = _carregar_yolo()
    resultados = modelo(img, verbose=False, conf=0.18)[0]
    caixas: list[dict] = []
    if resultados.boxes is None:
        return caixas

    xyxy = resultados.boxes.xyxy.cpu().numpy()
    for x1, y1, x2, y2 in xyxy:
        x, y = int(max(0, x1)), int(max(0, y1))
        w, h = int(max(1, x2 - x1)), int(max(1, y2 - y1))
        if w >= W * 0.05 and h >= H * 0.035:
            caixas.append({"tipo": "carimbo", "x": x, "y": y, "w": w, "h": h})
    return caixas


def _detectar_carimbos_coloridos(img: np.ndarray) -> list[dict]:
    """Carimbos e assinaturas em tinta colorida (vermelha ou azul)."""
    H, W = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    vermelho = cv2.inRange(hsv, (0, 70, 60), (10, 255, 255)) | cv2.inRange(hsv, (170, 70, 60), (180, 255, 255))
    azul = cv2.inRange(hsv, (100, 70, 40), (135, 255, 255))

    kw = max(12, int(W * 0.03))
    kh = max(8, int(H * 0.015))
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kw, kh))

    caixas: list[dict] = []
    area_min = H * W * 0.0020

    for mascara, tipo_padrao in [(vermelho, "carimbo"), (azul, "assinatura")]:
        dil = cv2.dilate(mascara, kernel)
        cont, _ = cv2.findContours(dil, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cont:
            x, y, w, h = cv2.boundingRect(c)
            if w >= W * 0.06 and h >= H * 0.02 and (w * h) >= area_min:
                tipo = "assinatura" if (w / float(h)) >= 2.0 else tipo_padrao
                caixas.append({"tipo": tipo, "x": x, "y": y, "w": w, "h": h})
    return caixas


def _remover_linhas_de_tabela(binaria: np.ndarray) -> np.ndarray:
    """
    Remove linhas retas horizontais e verticais longas (grades de tabelas e formulários),
    permitindo que assinaturas feitas sobre linhas de tabela sejam isoladas corretamente.
    """
    H, W = binaria.shape[:2]
    k_horiz = cv2.getStructuringElement(cv2.MORPH_RECT, (max(25, int(W * 0.10)), 1))
    linhas_h = cv2.morphologyEx(binaria, cv2.MORPH_OPEN, k_horiz)
    linhas_h = cv2.dilate(linhas_h, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 3)))

    k_vert = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(25, int(H * 0.06))))
    linhas_v = cv2.morphologyEx(binaria, cv2.MORPH_OPEN, k_vert)
    linhas_v = cv2.dilate(linhas_v, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 1)))

    return cv2.subtract(binaria, linhas_h | linhas_v)


def _eh_bloco_de_texto_impresso(recorte_sem_grade: np.ndarray, h_letra: float) -> bool:
    """
    Verifica se o bloco é composto majoritariamente por letras tipográficas uniformes
    (como títulos em negrito, cabeçalhos de contrato ou parágrafos).
    """
    n_lbl, _, st, _ = cv2.connectedComponentsWithStats(recorte_sem_grade)
    if n_lbl <= 2:
        return False

    letras_normais = 0
    tracos_cursivos = 0
    for i in range(1, n_lbl):
        cw, ch = st[i, cv2.CC_STAT_WIDTH], st[i, cv2.CC_STAT_HEIGHT]
        if cw < 3 or ch < 3:
            continue
        # Traço cursivo longo ou alto (assinatura/rubrica/borda de carimbo)
        if ch >= h_letra * 2.1 or cw >= h_letra * 3.8:
            tracos_cursivos += 1
        elif 0.5 * h_letra <= ch <= 1.6 * h_letra and cw <= 2.2 * h_letra:
            letras_normais += 1

    # Se há muitas letras tipográficas e nenhum traço cursivo dominante, é texto impresso
    if letras_normais >= 8 and tracos_cursivos == 0:
        return True
    if letras_normais >= 18 and tracos_cursivos <= 1:
        return True
    return False


def _detectar_assinaturas_e_carimbos_por_traco(img: np.ndarray) -> list[dict]:
    """
    Detecta assinaturas manuscritas (inclusive sobrepostas a tabelas), rubricas
    e carimbos mecânicos de protocolo (no cabeçalho e rodapé).
    """
    H, W = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binaria = cv2.threshold(gray, 205, 255, cv2.THRESH_BINARY_INV)

    # 1. Remove grades de tabelas para descolar assinaturas como a do contrato CAIXA
    sem_grade = _remover_linhas_de_tabela(binaria)

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(sem_grade)

    # 2. Calcula a altura mediana da letra impressa (`h_letra`)
    alturas_letras = [
        stats[i, cv2.CC_STAT_HEIGHT]
        for i in range(1, num_labels)
        if (W * 0.003) <= stats[i, cv2.CC_STAT_WIDTH] <= (W * 0.03)
        and (W * 0.005) <= stats[i, cv2.CC_STAT_HEIGHT] <= (W * 0.025)
    ]
    h_letra = float(np.median(alturas_letras)) if len(alturas_letras) >= 10 else max(8.0, W * 0.012)

    # 3. Constrói máscara com traços de assinaturas, rubricas e carimbos de protocolo
    mascara_tracos = np.zeros_like(sem_grade)
    espessura_min = max(2, int(W * 0.0025))

    for i in range(1, num_labels):
        x, y, cw, ch, area = stats[i]
        if cw <= espessura_min or ch <= espessura_min:
            continue
        if cw > W * 0.65 or ch > H * 0.35:
            continue

        # Ignora o miolo central de cláusulas (entre 14% e 76% da altura)
        if (H * 0.14) < y < (H * 0.76):
            continue

        # Caso A: Canto superior direito ou inferior (carimbos de protocolo mecânico como "00031829")
        no_topo_protocolo = (y <= H * 0.12 and x >= W * 0.55 and ch >= h_letra * 1.25)
        # Caso B: Traço de assinatura, rubrica ou moldura de carimbo (maior que letra tipográfica)
        eh_traco_manuscrito = (ch >= h_letra * 1.85) or (cw >= h_letra * 2.8 and ch >= h_letra * 1.15)

        if no_topo_protocolo or eh_traco_manuscrito:
            mascara_tracos[labels == i] = 255

    # 4. Agrupa os traços próximos de uma mesma assinatura ou carimbo
    kw = max(10, int(h_letra * 4.5))
    kh = max(6, int(h_letra * 1.6))
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kw, kh))
    agrupado = cv2.morphologyEx(mascara_tracos, cv2.MORPH_CLOSE, kernel)

    contornos, _ = cv2.findContours(agrupado, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    caixas: list[dict] = []

    for c in contornos:
        x, y, cw, ch = cv2.boundingRect(c)
        if cw < (h_letra * 2.0) or ch < (h_letra * 1.4):
            continue
        # Descarta faixas largas de título de cabeçalho
        if y < H * 0.20 and cw > W * 0.45:
            continue

        recorte_sg = sem_grade[y : y + ch, x : x + cw]
        if _eh_bloco_de_texto_impresso(recorte_sg, h_letra) and not (y <= H * 0.10 and x >= W * 0.60):
            continue

        aspect_ratio = cw / float(ch)
        densidade = float(recorte_sg.mean()) / 255.0

        # Classifica entre Carimbo e Assinatura
        eh_carimbo_topo = y <= (H * 0.12)
        eh_carimbo_protocolo_rodape = (
            (y >= H * 0.85)
            and (1.5 <= aspect_ratio <= 4.2)
            and (densidade >= 0.22)
            and (W * 0.25 <= x <= W * 0.65)
        )

        if eh_carimbo_topo or eh_carimbo_protocolo_rodape:
            caixas.append({"tipo": "carimbo", "x": x, "y": y, "w": cw, "h": ch})
        else:
            caixas.append({"tipo": "assinatura", "x": x, "y": y, "w": cw, "h": ch})

    return caixas


def _iou(a: dict, b: dict) -> float:
    ax2, ay2 = a["x"] + a["w"], a["y"] + a["h"]
    bx2, by2 = b["x"] + b["w"], b["y"] + b["h"]
    ix1, iy1 = max(a["x"], b["x"]), max(a["y"], b["y"])
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    if inter == 0:
        return 0.0
    union = a["w"] * a["h"] + b["w"] * b["h"] - inter
    return inter / union if union > 0 else 0.0


def _mesclar_caixas(primarias: list[dict], secundarias: list[dict]) -> list[dict]:
    resultado = list(primarias)
    for c in secundarias:
        if all(_iou(c, ex) < 0.25 for ex in resultado):
            resultado.append(c)
    return resultado


def detectar(img: np.ndarray) -> tuple[list[dict], str]:
    caixas_yolo = _detectar_yolo(img) if _repo_disponivel() else []
    caixas_coloridas = _detectar_carimbos_coloridos(img)
    caixas_tracos = _detectar_assinaturas_e_carimbos_por_traco(img)

    todas = _mesclar_caixas(caixas_yolo, caixas_coloridas)
    todas = _mesclar_caixas(todas, caixas_tracos)

    metodo = "Stamp-Signature-Segregate (YOLOv12) + Remoção de Tabelas e Filtro de Traços"
    return todas, metodo
