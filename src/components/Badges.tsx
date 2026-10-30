import type { StatusConferencia, StatusDeteccao } from "../types";

const classeDeteccao: Record<StatusDeteccao, string> = {
  Correspondente: "ok",
  "Possível divergência": "warn",
  "Não localizado": "bad",
};

export function StatusDeteccaoBadge({ status }: { status: StatusDeteccao }) {
  return <span className={`badge ${classeDeteccao[status]}`}>{status}</span>;
}

const classeConferencia: Record<StatusConferencia, string> = {
  Confirmado: "ok",
  Divergente: "bad",
  Pendente: "warn",
};

export function StatusConferenciaBadge({ status }: { status: StatusConferencia }) {
  return <span className={`badge solid ${classeConferencia[status]}`}>{status}</span>;
}
