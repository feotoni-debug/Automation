import type { Marca, StatusConferencia } from "../types";
import { StatusConferenciaBadge, StatusDeteccaoBadge } from "./Badges";
import { Recorte } from "./Recorte";

interface Props {
  marca: Marca;
  imagemArca: string;
  imagemFisico: string;
  ativa: boolean;
  decisao: StatusConferencia;
  onSelecionar: () => void;
}

const opcoes: StatusConferencia[] = ["Confirmado", "Divergente", "Pendente"];

export function MarcaItem({ marca, imagemArca, imagemFisico, ativa, decisao, onSelecionar }: Props) {
  return (
    <li className={`marca-item ${ativa ? "ativa" : ""}`}>
      <div
        className="marca-topo"
        role="button"
        tabIndex={0}
        onClick={onSelecionar}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelecionar())}
        aria-pressed={ativa}
      >
        <div className="marca-recortes">
          <Recorte imagem={imagemArca} regiao={marca.regiao} rotulo="ARCA" />
          <Recorte imagem={imagemFisico} regiao={marca.regiao} rotulo="Físico" />
        </div>
        <div className="marca-info">
          <strong>
            {marca.tipo === "assinatura" ? "Assinatura" : "Carimbo"} · pág. {marca.pagina}
          </strong>
          <span className="muted">{marca.descricao}</span>
          <div className="linha">
            <StatusDeteccaoBadge status={marca.status} />
            <span className="confianca" title="Nível de confiança">
              {marca.confianca}%
            </span>
          </div>
          <div className="barra" aria-hidden>
            <div style={{ width: `${marca.confianca}%` }} />
          </div>
        </div>
      </div>
      <div
        className="decisao bloqueada"
        role="group"
        aria-label="Classificação automática bloqueada por faixa de confiança"
        title="Classificação definida automaticamente pelo percentual de confiança (90%–100%: Confirmado | >50%: Pendente | ≤50%: Divergente)"
      >
        {opcoes.map((o) => {
          const selecionado = decisao === o;
          return (
            <button
              key={o}
              type="button"
              disabled
              className={`op ${o.toLowerCase()} ${selecionado ? "sel" : "inativo-bloq"}`}
              aria-pressed={selecionado}
            >
              {selecionado ? `✓ ${o}` : o}
            </button>
          );
        })}
      </div>
      <div className="sr-only">
        <StatusConferenciaBadge status={decisao} />
      </div>
    </li>
  );
}
