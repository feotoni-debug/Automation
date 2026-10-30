import { titulosMock } from "../data/titulosMock";
import { gerarDocumento, PAGINA_ALTURA, PAGINA_LARGURA } from "../utils/documentoFicticio";
import type { ResultadoBusca } from "../types";

/** Atraso simulado (ms) para demonstrar o indicador de carregamento. */
let atrasoSimulado = 1400;
export function definirAtrasoSimulado(ms: number) {
  atrasoSimulado = ms;
}

export class ProtocoloNaoEncontradoError extends Error {
  constructor(public protocolo: string) {
    super(`Protocolo ${protocolo} não encontrado.`);
  }
}

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

/** Gera uma imagem SVG representando o arquivo PDF anexado pelo usuário (fallback offline). */
function imagemDePdf(arquivo: File, pagina: number, total: number): string {
  const nome = arquivo.name.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const kb = (arquivo.size / 1024).toFixed(1);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGINA_LARGURA} ${PAGINA_ALTURA}" width="${PAGINA_LARGURA}" height="${PAGINA_ALTURA}">
  <rect width="${PAGINA_LARGURA}" height="${PAGINA_ALTURA}" fill="#f9f8f3"/>
  <rect x="40" y="40" width="${PAGINA_LARGURA - 80}" height="${PAGINA_ALTURA - 80}" rx="8" fill="#ffffff" stroke="#ccdcb6" stroke-width="2"/>
  <text x="300" y="95" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="#2e4620">DOCUMENTO ANEXADO</text>
  <text x="300" y="122" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#4a6b2f">${nome} (${kb} KB)</text>
  <text x="300" y="144" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="#6c705f">Página ${pagina} de ${total}</text>
  <rect x="70" y="180" width="460" height="8" rx="4" fill="#e2e4dc"/>
  <rect x="70" y="204" width="410" height="8" rx="4" fill="#e2e4dc"/>
  <rect x="70" y="228" width="440" height="8" rx="4" fill="#e2e4dc"/>
  <rect x="70" y="252" width="380" height="8" rx="4" fill="#e2e4dc"/>
  <rect x="70" y="290" width="450" height="8" rx="4" fill="#e2e4dc"/>
  <rect x="70" y="314" width="420" height="8" rx="4" fill="#e2e4dc"/>
  <rect x="70" y="338" width="390" height="8" rx="4" fill="#e2e4dc"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function ordenarArquivosNatural(arquivos: File[]): File[] {
  return [...arquivos].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
  );
}

/**
 * Converte qualquer arquivo (PNG, JPG, TIF, TIFF, PDF, BMP) em imagens PNG renderizáveis no navegador,
 * usando a API Python quando necessário (para TIF/PDF) ou URL direta.
 */
export async function obterPaginasDeArquivo(arquivo: File, totalPaginasFallback = 1): Promise<string[]> {
  const nome = arquivo.name.toLowerCase();
  const precisaBackend =
    nome.endsWith(".tif") ||
    nome.endsWith(".tiff") ||
    nome.endsWith(".pdf") ||
    arquivo.type === "image/tiff" ||
    arquivo.type === "application/pdf";

  if (!precisaBackend && arquivo.type.startsWith("image/")) {
    const url = URL.createObjectURL(arquivo);
    return Array.from({ length: totalPaginasFallback }, () => url);
  }

  try {
    const form = new FormData();
    form.append("arquivo", arquivo);
    const r = await fetch(`${API_URL}/api/previa`, { method: "POST", body: form });
    if (r.ok) {
      const dados = (await r.json()) as { paginas: string[] };
      if (dados.paginas?.length) {
        if (dados.paginas.length >= totalPaginasFallback) return dados.paginas;
        return Array.from({ length: totalPaginasFallback }, (_, i) => dados.paginas[i % dados.paginas.length]);
      }
    }
  } catch {
    // Fallback offline se o backend não estiver acessível
  }

  if (nome.endsWith(".pdf") || arquivo.type === "application/pdf") {
    return Array.from({ length: totalPaginasFallback }, (_, i) => imagemDePdf(arquivo, i + 1, totalPaginasFallback));
  }
  const url = URL.createObjectURL(arquivo);
  return Array.from({ length: totalPaginasFallback }, () => url);
}

/** Converte uma lista de arquivos (ex: fotos de uma pasta) em páginas sequenciais. */
export async function obterPaginasDeArquivos(arquivos: File[]): Promise<string[]> {
  if (!arquivos.length) return [];
  const ordenados = ordenarArquivosNatural(arquivos);
  const todasPaginas: string[] = [];
  for (const arq of ordenados) {
    const pags = await obterPaginasDeArquivo(arq, 1);
    todasPaginas.push(...pags);
  }
  return todasPaginas;
}

/** Gerador rápido da 1ª página para prévia no card de upload. */
export async function gerarPreviaArquivo(alvo: File | File[]): Promise<string> {
  const arquivos = Array.isArray(alvo) ? alvo : [alvo];
  if (!arquivos.length) return "";
  const ordenados = ordenarArquivosNatural(arquivos);
  const pags = await obterPaginasDeArquivo(ordenados[0], 1);
  return pags[0];
}

export function converterArquivoEmPaginas(arquivo: File, totalPaginas: number): string[] {
  if (arquivo.type.startsWith("image/") && !arquivo.name.toLowerCase().endsWith(".tif") && !arquivo.name.toLowerCase().endsWith(".tiff")) {
    const url = URL.createObjectURL(arquivo);
    return Array.from({ length: totalPaginas }, () => url);
  }
  return Array.from({ length: totalPaginas }, (_, i) => imagemDePdf(arquivo, i + 1, totalPaginas));
}

function normalizarLista(f?: File[] | File | null): File[] {
  if (!f) return [];
  if (Array.isArray(f)) return f.filter(Boolean);
  return [f];
}

function nomeParaExibicao(lista: File[]): string {
  if (!lista.length) return "";
  if (lista.length === 1) return lista[0].name;
  return `Pasta com ${lista.length} fotos (${lista[0].name} … ${lista[lista.length - 1].name})`;
}

export async function getTituloPorProtocolo(
  protocolo: string,
  arquivoFisico?: File[] | File | null,
  arquivoArca?: File[] | File | null,
): Promise<ResultadoBusca> {
  const chave = protocolo.trim();
  const arcaLista = ordenarArquivosNatural(normalizarLista(arquivoArca));
  const fisicoLista = ordenarArquivosNatural(normalizarLista(arquivoFisico));

  // --- ANÁLISE REAL (backend Python em /backend) ---
  // Ativa quando os DOIS documentos foram anexados (arquivos individuais ou pastas de imagens)
  if (arcaLista.length > 0 && fisicoLista.length > 0) {
    const form = new FormData();
    form.append("protocolo", chave);
    for (const f of arcaLista) {
      form.append("arquivos_arca", f);
    }
    for (const f of fisicoLista) {
      form.append("arquivos_fisico", f);
    }
    try {
      const resp = await fetch(`${API_URL}/api/comparar`, { method: "POST", body: form });
      if (resp.ok) {
        const dados = await resp.json();
        const docArca: string[] =
          dados.paginasArca?.length ? dados.paginasArca : await obterPaginasDeArquivos(arcaLista);
        const docFisico: string[] =
          dados.paginasFisico?.length ? dados.paginasFisico : await obterPaginasDeArquivos(fisicoLista);

        return {
          titulo: dados.titulo,
          documentoArca: docArca,
          documentoFisico: docFisico,
          nomeAnexoArca: nomeParaExibicao(arcaLista),
          nomeAnexoFisico: nomeParaExibicao(fisicoLista),
          pareamento: dados.pareamento,
        };
      }
    } catch {
      // Fallback para modo demonstração se o backend Python não estiver nesta URL
    }
  }

  // --- INÍCIO DA IMPLEMENTAÇÃO LOCAL (SIMULADA) ---
  await new Promise((r) => setTimeout(r, atrasoSimulado));

  let protocoloAlvo = chave;
  if (!protocoloAlvo) {
    const nomeRef = fisicoLista[0]?.name || arcaLista[0]?.name || "";
    const match = nomeRef.match(/2026-\d{6}/);
    protocoloAlvo = match ? match[0] : "2026-000123";
  }

  const tituloBase = titulosMock[protocoloAlvo];
  if (!tituloBase) throw new ProtocoloNaoEncontradoError(chave || protocoloAlvo);

  const documentoArca = arcaLista.length > 0
    ? await obterPaginasDeArquivos(arcaLista)
    : gerarDocumento(tituloBase, "arca");

  const documentoFisico = fisicoLista.length > 0
    ? await obterPaginasDeArquivos(fisicoLista)
    : gerarDocumento(tituloBase, "fisico");

  return {
    titulo: tituloBase,
    documentoArca,
    documentoFisico,
    nomeAnexoArca: nomeParaExibicao(arcaLista) || undefined,
    nomeAnexoFisico: nomeParaExibicao(fisicoLista) || undefined,
  };
  // --- FIM DA IMPLEMENTAÇÃO LOCAL ---
}

export const protocolosDeExemplo = Object.keys(titulosMock);

// --- INTEGRAÇÃO COM A DIGITALIZADORA (PaperStream Capture / Watchdog) ---

export interface ArquivoScanner {
  nome: string;
  tamanho: number;
  modificadoEm: string;
  mtimeMs: number;
  paginas: number;
  previa: string;
  protocoloSugerido?: string | null;
}

export interface EstadoScanner {
  pastaScanner: string;
  watchdogAtivo: boolean;
  ultimoEventoTs: number;
  arquivos: ArquivoScanner[];
}

// Estado de fallback em memória caso apenas o Vite frontend esteja aberto sem a API Python
let _pastaScannerFallback = "D:\\ARCAri Automation\\entrada_scanner";
let _arquivosFallback: Array<ArquivoScanner & { paginasImgs: string[] }> = [];

export async function listarArquivosScanner(): Promise<EstadoScanner> {
  try {
    const r = await fetch(`${API_URL}/api/scanner/arquivos`);
    if (r.ok && r.headers.get("content-type")?.includes("application/json")) {
      return (await r.json()) as EstadoScanner;
    }
  } catch {
    // Fallback local
  }
  return {
    pastaScanner: _pastaScannerFallback,
    watchdogAtivo: true,
    ultimoEventoTs: Date.now() / 1000,
    arquivos: _arquivosFallback.map(({ paginasImgs: _, ...item }) => item),
  };
}

export async function obterPaginasScanner(nome: string): Promise<string[]> {
  try {
    const r = await fetch(`${API_URL}/api/scanner/arquivos/${encodeURIComponent(nome)}/paginas`);
    if (r.ok && r.headers.get("content-type")?.includes("application/json")) {
      const dados = (await r.json()) as { paginas: string[] };
      if (dados.paginas?.length) return dados.paginas;
    }
  } catch {
    // Fallback local
  }
  const local = _arquivosFallback.find((a) => a.nome === nome);
  if (local) return local.paginasImgs;
  const titulo = titulosMock["2026-000123"];
  return gerarDocumento(titulo, "fisico");
}

export async function baixarArquivoScannerComoFile(item: ArquivoScanner): Promise<File> {
  try {
    const r = await fetch(`${API_URL}/api/scanner/arquivos/${encodeURIComponent(item.nome)}/download`);
    if (r.ok && !r.headers.get("content-type")?.includes("text/html")) {
      const blob = await r.blob();
      return new File([blob], item.nome, {
        type: blob.type || "application/pdf",
        lastModified: item.mtimeMs,
      });
    }
  } catch {
    // Fallback local
  }
  // Converte a prévia SVG/PNG em File para usar no fluxo normal
  const resp = await fetch(item.previa);
  const blob = await resp.blob();
  const nomePng = item.nome.endsWith(".pdf") ? item.nome.replace(/\.pdf$/i, ".png") : item.nome;
  return new File([blob], nomePng, {
    type: blob.type || "image/svg+xml",
    lastModified: item.mtimeMs,
  });
}

export async function simularDigitalizacaoScanner(protocolo = "2026-000123"): Promise<ArquivoScanner> {
  try {
    const r = await fetch(`${API_URL}/api/scanner/simular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ protocolo }),
    });
    if (r.ok) {
      const dados = (await r.json()) as { arquivo: ArquivoScanner };
      return dados.arquivo;
    }
  } catch {
    // Fallback local
  }
  const prot = protocolo.trim() || "2026-000123";
  const titulo = titulosMock[prot] || titulosMock["2026-000123"];
  const paginasImgs = gerarDocumento(titulo, "fisico");
  const agora = new Date();
  const hhmmss = agora.toTimeString().slice(0, 8).replace(/:/g, "");
  const novo: ArquivoScanner & { paginasImgs: string[] } = {
    nome: `Scan_PaperStream_${prot}_${hhmmss}.pdf`,
    tamanho: 184320,
    modificadoEm: agora.toISOString(),
    mtimeMs: agora.getTime(),
    paginas: paginasImgs.length,
    previa: paginasImgs[0],
    protocoloSugerido: prot,
    paginasImgs,
  };
  _arquivosFallback = [novo, ..._arquivosFallback];
  const { paginasImgs: _, ...resumo } = novo;
  return resumo;
}

export async function excluirArquivoScanner(nome: string): Promise<void> {
  try {
    await fetch(`${API_URL}/api/scanner/arquivos/${encodeURIComponent(nome)}`, { method: "DELETE" });
  } catch {
    // Fallback local
  }
  _arquivosFallback = _arquivosFallback.filter((a) => a.nome !== nome);
}

export async function limparFilaScanner(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/scanner/limpar`, { method: "DELETE" });
  } catch {
    // Fallback local
  }
  _arquivosFallback = [];
}

export async function alterarPastaScanner(pastaScanner: string): Promise<{ pastaScanner: string; watchdogAtivo: boolean }> {
  try {
    const r = await fetch(`${API_URL}/api/scanner/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pastaScanner }),
    });
    if (r.ok) {
      return (await r.json()) as { pastaScanner: string; watchdogAtivo: boolean };
    }
  } catch {
    // Fallback local
  }
  _pastaScannerFallback = pastaScanner.trim() || _pastaScannerFallback;
  return { pastaScanner: _pastaScannerFallback, watchdogAtivo: true };
}
