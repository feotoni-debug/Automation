import type { Marca, OrigemDocumento, Titulo } from "../types";

const W = 600;
const H = 800;

/** Gerador pseudoaleatório determinístico. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function assinaturaSvg(m: Marca, variante: "igual" | "alterada"): string {
  const r = rng(variante === "igual" ? m.seed : m.seed * 7 + 3);
  const x0 = (m.regiao.x / 100) * W;
  const y0 = (m.regiao.y / 100) * H;
  const w = (m.regiao.w / 100) * W;
  const h = (m.regiao.h / 100) * H;
  const base = rng(m.seed);
  const pontos = 7;
  let d = `M ${x0 + 4} ${y0 + h * 0.7}`;
  for (let i = 1; i <= pontos; i++) {
    const bx = base();
    const by = base();
    // Na variante alterada, o traçado muda de forma perceptível.
    const jx = variante === "igual" ? bx : r();
    const jy = variante === "igual" ? by : r();
    const px = x0 + (i / pontos) * (w - 8) + 4;
    const cx = px - w / (pontos * 2) + (jx - 0.5) * 10;
    const cy = y0 + jy * h;
    d += ` Q ${cx} ${cy} ${px} ${y0 + h * (0.25 + 0.5 * (variante === "igual" ? by : jy))}`;
  }
  const linha = `<line x1="${x0}" y1="${y0 + h + 2}" x2="${x0 + w}" y2="${y0 + h + 2}" stroke="#999" stroke-width="0.8"/>`;
  return `${linha}<path d="${d}" fill="none" stroke="#1b2a6b" stroke-width="1.8" stroke-linecap="round"/>`;
}

function carimboSvg(m: Marca, rotacao: number): string {
  const cx = ((m.regiao.x + m.regiao.w / 2) / 100) * W;
  const cy = ((m.regiao.y + m.regiao.h / 2) / 100) * H;
  const rx = ((m.regiao.w / 2) / 100) * W - 3;
  const ry = ((m.regiao.h / 2) / 100) * H - 3;
  return `<g transform="rotate(${rotacao} ${cx} ${cy})" fill="none" stroke="#a02828" opacity="0.8">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke-width="2"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 5}" ry="${ry - 5}" stroke-width="0.8"/>
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="9" font-family="Arial" font-weight="bold" fill="#a02828" stroke="none">CARTÓRIO DEMO</text>
    <text x="${cx}" y="${cy + 9}" text-anchor="middle" font-size="8" font-family="Arial" fill="#a02828" stroke="none">Nº ${m.seed.toString().padStart(4, "0")}</text>
  </g>`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function paginaSvg(titulo: Titulo, pagina: number, origem: OrigemDocumento): string {
  const r = rng(pagina * 97 + titulo.protocolo.length);
  const fisico = origem === "fisico";
  let linhas = "";
  for (let i = 0; i < 22; i++) {
    const y = 150 + i * 22;
    const larg = 380 + r() * 140;
    linhas += `<rect x="50" y="${y}" width="${larg}" height="6" rx="3" fill="#c9c9c9"/>`;
  }
  const marcas = titulo.marcas
    .filter((m) => m.pagina === pagina)
    .map((m) => {
      if (m.tipo === "assinatura") {
        if (!fisico) return assinaturaSvg(m, "igual");
        if (m.status === "Não localizado") return "";
        return assinaturaSvg(m, m.status === "Possível divergência" ? "alterada" : "igual");
      }
      if (!fisico) return carimboSvg(m, -8);
      if (m.status === "Não localizado") return "";
      return carimboSvg(m, m.status === "Possível divergência" ? 14 : 5);
    })
    .join("");

  // O documento físico digitalizado recebe leve tom e ruído de papel.
  const fundo = fisico ? "#f4f1e8" : "#ffffff";
  const sombra = fisico
    ? `<rect width="${W}" height="${H}" fill="url(#g)"/><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="0.07"/><stop offset="0.12" stop-color="#000" stop-opacity="0"/></linearGradient></defs>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${fundo}"/>
  <text x="300" y="60" text-anchor="middle" font-family="Georgia,serif" font-size="20" font-weight="bold" fill="#333">${esc(titulo.tipoTitulo.toUpperCase())}</text>
  <text x="300" y="86" text-anchor="middle" font-family="Arial" font-size="11" fill="#666">Documento fictício para demonstração</text>
  <text x="50" y="125" font-family="Arial" font-size="11" fill="#555">Protocolo ${titulo.protocolo}  ·  Página ${pagina} de ${titulo.paginas}</text>
  ${linhas}
  ${marcas}
  ${sombra}
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="#bbb"/>
</svg>`;
}

/** Retorna uma imagem (data URL SVG) por página. */
export function gerarDocumento(titulo: Titulo, origem: OrigemDocumento): string[] {
  return Array.from({ length: titulo.paginas }, (_, i) => {
    const svg = paginaSvg(titulo, i + 1, origem);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export const PAGINA_LARGURA = W;
export const PAGINA_ALTURA = H;
