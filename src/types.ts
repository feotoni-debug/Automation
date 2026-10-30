export type TipoMarca = "assinatura" | "carimbo";
export type StatusDeteccao = "Correspondente" | "Possível divergência" | "Não localizado";
export type StatusConferencia = "Confirmado" | "Divergente" | "Pendente";

/** Região em percentual (0-100) da página. */
export interface Regiao {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Marca {
  id: string;
  tipo: TipoMarca;
  pagina: number;
  regiao: Regiao;
  status: StatusDeteccao;
  /** Percentual 0-100 */
  confianca: number;
  descricao: string;
  /** Semente usada apenas para gerar o desenho fictício. */
  seed: number;
}

export interface Titulo {
  protocolo: string;
  tipoTitulo: string;
  dataApresentacao: string; // ISO yyyy-mm-dd
  apresentante: string;
  paginas: number;
  marcas: Marca[];
}

export type OrigemDocumento = "arca" | "fisico";

/** Resultado do pareamento em massa de uma página (ARCA x Físico), independente da ordem das pastas. */
export interface ParPagina {
  pagina: number;
  arca: string | null;
  fisico: string | null;
  similaridade: number;
  situacao: "pareado" | "sem_correspondente_fisico" | "sem_correspondente_arca";
  mesmaPosicao: boolean;
}

/** Resultado da busca: dados do título + as duas versões do documento (uma imagem por página). */
export interface ResultadoBusca {
  titulo: Titulo;
  documentoArca: string[];
  documentoFisico: string[];
  nomeAnexoArca?: string;
  nomeAnexoFisico?: string;
  pareamento?: ParPagina[];
}

export interface RegistroHistorico {
  id: string;
  protocolo: string;
  tipoTitulo: string;
  dataHora: string; // ISO
  total: number;
  confirmados: number;
  divergentes: number;
  pendentes: number;
}

export const FRASE_AVISO =
  "Resultado destinado à conferência humana; não representa validação de autenticidade.";
