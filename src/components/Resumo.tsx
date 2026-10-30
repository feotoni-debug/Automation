interface Props {
  total: number;
  confirmados: number;
  divergentes: number;
  pendentes: number;
}

export function Resumo({ total, confirmados, divergentes, pendentes }: Props) {
  return (
    <div className="resumo" aria-label="Resumo da conferência">
      <div className="card">
        <span>Itens encontrados</span>
        <strong>{total}</strong>
      </div>
      <div className="card ok">
        <span>Confirmados</span>
        <strong>{confirmados}</strong>
      </div>
      <div className="card bad">
        <span>Divergentes</span>
        <strong>{divergentes}</strong>
      </div>
      <div className="card warn">
        <span>Pendentes</span>
        <strong>{pendentes}</strong>
      </div>
    </div>
  );
}
