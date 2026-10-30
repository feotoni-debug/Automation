interface Props {
  contagem: { total: number; confirmados: number; divergentes: number; pendentes: number };
  /** Páginas sem correspondente (ARCA ou físico) no pareamento em massa. */
  semPar: number;
}

type Veredito = "igual" | "diferente" | "analise";

function calcular({ contagem, semPar }: Props): { tipo: Veredito; titulo: string; detalhe: string } {
  const { total, confirmados, divergentes, pendentes } = contagem;
  if (divergentes > 0 || semPar > 0) {
    const motivos: string[] = [];
    if (divergentes > 0) motivos.push(`${divergentes} item(ns) divergente(s)`);
    if (semPar > 0) motivos.push(`${semPar} página(s) sem correspondente`);
    return { tipo: "diferente", titulo: "Documento DIFERENTE", detalhe: motivos.join(" · ") };
  }
  if (pendentes > 0) {
    return {
      tipo: "analise",
      titulo: "Requer análise humana",
      detalhe: `${pendentes} item(ns) pendente(s) entre 51% e 89% de semelhança`,
    };
  }
  if (total === 0) {
    return { tipo: "analise", titulo: "Requer análise humana", detalhe: "Nenhuma assinatura ou carimbo identificado" };
  }
  return { tipo: "igual", titulo: "Documento IGUAL", detalhe: `${confirmados} de ${total} item(ns) confirmado(s)` };
}

function Icone({ tipo }: { tipo: Veredito }) {
  if (tipo === "igual")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle className="vd-circ" cx="12" cy="12" r="10" />
        <path className="vd-traco" d="M7 12.5l3.2 3.2L17 8.8" />
      </svg>
    );
  if (tipo === "diferente")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle className="vd-circ" cx="12" cy="12" r="10" />
        <path className="vd-traco" d="M8 8l8 8M16 8l-8 8" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle className="vd-circ" cx="12" cy="12" r="10" />
      <path className="vd-traco" d="M12 7v6M12 16.8v.2" />
    </svg>
  );
}

export function VereditoDocumento(props: Props) {
  const v = calcular(props);
  const { contagem, semPar } = props;
  return (
    <section className={`veredito ${v.tipo}`} role="status" aria-live="polite" aria-label="Resultado da comparação do documento">
      <span className="veredito-icone">
        <Icone tipo={v.tipo} />
      </span>
      <div className="veredito-texto">
        <strong>{v.titulo}</strong>
        <span>{v.detalhe}</span>
      </div>
      <ul className="veredito-numeros" aria-label="Resumo numérico">
        <li className="ok"><b>{contagem.confirmados}</b> confirmados</li>
        <li className="warn"><b>{contagem.pendentes}</b> pendentes</li>
        <li className="bad"><b>{contagem.divergentes + semPar}</b> divergentes</li>
      </ul>
    </section>
  );
}
