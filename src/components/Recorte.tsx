import type { Regiao } from "../types";
import { PAGINA_ALTURA, PAGINA_LARGURA } from "../utils/documentoFicticio";

interface Props {
  imagem: string;
  regiao: Regiao;
  rotulo: string;
}

/** Miniatura que recorta a região da página usando background CSS. */
export function Recorte({ imagem, regiao, rotulo }: Props) {
  const proporcao = (regiao.w * PAGINA_LARGURA) / (regiao.h * PAGINA_ALTURA);
  const posX = regiao.w >= 100 ? 0 : (regiao.x / (100 - regiao.w)) * 100;
  const posY = regiao.h >= 100 ? 0 : (regiao.y / (100 - regiao.h)) * 100;
  return (
    <figure className="recorte">
      <div
        className="recorte-img"
        role="img"
        aria-label={rotulo}
        style={{
          aspectRatio: `${proporcao}`,
          backgroundImage: `url("${imagem}")`,
          backgroundSize: `${(100 / regiao.w) * 100}% ${(100 / regiao.h) * 100}%`,
          backgroundPosition: `${posX}% ${posY}%`,
        }}
      />
      <figcaption>{rotulo}</figcaption>
    </figure>
  );
}
