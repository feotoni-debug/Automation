import type { Titulo } from "../types";

/**
 * Dados FICTÍCIOS e anonimizados, organizados por protocolo.
 * Nenhum nome, documento ou dado pessoal real é utilizado.
 */
export const titulosMock: Record<string, Titulo> = {
  "2026-000123": {
    protocolo: "2026-000123",
    tipoTitulo: "Duplicata de Prestação de Serviços",
    dataApresentacao: "2026-03-12",
    apresentante: "Empresa Exemplo Alfa Ltda. (fictícia)",
    paginas: 2,
    marcas: [
      { id: "m1", tipo: "assinatura", pagina: 1, regiao: { x: 10, y: 68, w: 36, h: 9 }, status: "Correspondente", confianca: 96, descricao: "Assinatura do sacador", seed: 11 },
      { id: "m2", tipo: "carimbo", pagina: 1, regiao: { x: 62, y: 8, w: 28, h: 18 }, status: "Correspondente", confianca: 93, descricao: "Carimbo de recebimento", seed: 12 },
      { id: "m3", tipo: "assinatura", pagina: 1, regiao: { x: 54, y: 80, w: 36, h: 9 }, status: "Possível divergência", confianca: 61, descricao: "Assinatura do sacado", seed: 13 },
      { id: "m4", tipo: "carimbo", pagina: 2, regiao: { x: 12, y: 60, w: 28, h: 18 }, status: "Correspondente", confianca: 89, descricao: "Carimbo de apontamento", seed: 14 },
      { id: "m5", tipo: "assinatura", pagina: 2, regiao: { x: 52, y: 78, w: 36, h: 9 }, status: "Correspondente", confianca: 91, descricao: "Assinatura da testemunha", seed: 15 },
    ],
  },
  "2026-000124": {
    protocolo: "2026-000124",
    tipoTitulo: "Cédula de Crédito Bancário",
    dataApresentacao: "2026-03-14",
    apresentante: "Instituição Modelo Beta S.A. (fictícia)",
    paginas: 3,
    marcas: [
      { id: "m1", tipo: "assinatura", pagina: 1, regiao: { x: 10, y: 74, w: 36, h: 9 }, status: "Correspondente", confianca: 94, descricao: "Assinatura do emitente", seed: 21 },
      { id: "m2", tipo: "carimbo", pagina: 1, regiao: { x: 64, y: 10, w: 26, h: 17 }, status: "Correspondente", confianca: 90, descricao: "Carimbo de protocolo", seed: 22 },
      { id: "m3", tipo: "assinatura", pagina: 2, regiao: { x: 12, y: 70, w: 36, h: 9 }, status: "Possível divergência", confianca: 54, descricao: "Assinatura do avalista", seed: 23 },
      { id: "m4", tipo: "carimbo", pagina: 2, regiao: { x: 60, y: 62, w: 28, h: 18 }, status: "Não localizado", confianca: 18, descricao: "Carimbo de conferência", seed: 24 },
      { id: "m5", tipo: "assinatura", pagina: 3, regiao: { x: 10, y: 52, w: 36, h: 9 }, status: "Correspondente", confianca: 88, descricao: "Assinatura do credor", seed: 25 },
      { id: "m6", tipo: "carimbo", pagina: 3, regiao: { x: 58, y: 72, w: 28, h: 18 }, status: "Correspondente", confianca: 92, descricao: "Carimbo de encerramento", seed: 26 },
    ],
  },
  "2026-000125": {
    protocolo: "2026-000125",
    tipoTitulo: "Nota Promissória",
    dataApresentacao: "2026-03-17",
    apresentante: "Pessoa Exemplo Gama (fictícia)",
    paginas: 1,
    marcas: [
      { id: "m1", tipo: "assinatura", pagina: 1, regiao: { x: 30, y: 70, w: 40, h: 10 }, status: "Possível divergência", confianca: 47, descricao: "Assinatura do emitente", seed: 31 },
      { id: "m2", tipo: "carimbo", pagina: 1, regiao: { x: 8, y: 8, w: 28, h: 18 }, status: "Correspondente", confianca: 95, descricao: "Carimbo de recebimento", seed: 32 },
      { id: "m3", tipo: "assinatura", pagina: 1, regiao: { x: 30, y: 84, w: 40, h: 9 }, status: "Não localizado", confianca: 12, descricao: "Assinatura do avalista", seed: 33 },
    ],
  },
};
