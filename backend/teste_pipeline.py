"""Teste de fumaça do pipeline com imagens sintéticas. Execute dentro de backend/: python teste_pipeline.py"""
import cv2
import numpy as np

from app import pipeline


def doc(deslocar=False, remover_carimbo=False, alterar_assinatura=False):
    img = np.full((1100, 800, 3), 255, np.uint8)
    for i in range(18):
        cv2.line(img, (60, 180 + i * 30), (700 - (i % 3) * 40, 180 + i * 30), (170, 170, 170), 4)
    cv2.putText(img, "TITULO FICTICIO", (200, 90), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (60, 60, 60), 3)
    if not remover_carimbo:
        cv2.circle(img, (620, 130), 70, (30, 30, 190), 4)
        cv2.putText(img, "CARTORIO", (565, 135), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (30, 30, 190), 2)
    pts = np.array([[100, 900], [160, 850], [200, 930], [260, 840], [320, 920], [380, 860]], np.int32)
    if alterar_assinatura:
        pts = np.array([[100, 880], [140, 940], [210, 850], [250, 925], [330, 850], [390, 930]], np.int32)
    cv2.polylines(img, [pts], False, (160, 40, 20), 3)
    if deslocar:
        M = cv2.getRotationMatrix2D((400, 550), 1.5, 1.0)
        M[:, 2] += (6, 9)
        img = cv2.warpAffine(img, M, (800, 1100), borderValue=(255, 255, 255))
    return img


def enc(img):
    return cv2.imencode(".png", img)[1].tobytes()


def run(nome, fisico):
    r = pipeline.processar(pipeline.carregar_paginas(enc(doc()), "a.png"), pipeline.carregar_paginas(enc(fisico), "f.png"))
    print(f"\n== {nome} | {r['metodos']}")
    for m in r["marcas"]:
        print(f"  {m['tipo']:10} {m['status']:22} {m['confianca']:3}%  {m['regiao']}")


run("físico igual, levemente girado/deslocado", doc(deslocar=True))
run("carimbo ausente no físico", doc(deslocar=True, remover_carimbo=True))
run("assinatura diferente no físico", doc(deslocar=True, alterar_assinatura=True))
