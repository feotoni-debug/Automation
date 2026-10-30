interface Props {
  atraso: number;
  onAtraso: (ms: number) => void;
  onLimpar: () => void;
}

export function ConfiguracoesPage({ atraso, onAtraso, onLimpar }: Props) {
  return (
    <div className="busca">
      <h2>Configurações</h2>
      <p className="muted">Opções da demonstração.</p>
      <label htmlFor="atraso">Tempo simulado de busca</label>
      <select id="atraso" value={atraso} onChange={(e) => onAtraso(Number(e.target.value))}>
        <option value={300}>Rápido (0,3 s)</option>
        <option value={1400}>Normal (1,4 s)</option>
        <option value={3000}>Lento (3 s)</option>
      </select>
      <div className="cfg-bloco">
        <p className="muted">Fonte de dados: <strong>dados locais simulados</strong>. A integração com a API oficial da ARCA será feita em <code>src/services/arcaService.ts</code>.</p>
        <button className="btn secundario" onClick={onLimpar}>
          Limpar histórico da demonstração
        </button>
      </div>
    </div>
  );
}
