import type { RegistroHistorico } from "../types";
import { FRASE_AVISO } from "../types";

interface Props {
  registros: RegistroHistorico[];
  onLimpar: () => void;
}

export function HistoricoPage({ registros, onLimpar }: Props) {
  return (
    <div>
      <div className="conf-topo">
        <h2>Histórico de conferências</h2>
        {registros.length > 0 && (
          <button className="btn secundario" onClick={onLimpar}>
            Limpar histórico
          </button>
        )}
      </div>
      <p className="aviso">{FRASE_AVISO}</p>
      {registros.length === 0 ? (
        <p className="muted">Nenhuma conferência realizada nesta demonstração ainda.</p>
      ) : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Data/hora</th>
                <th>Protocolo</th>
                <th>Tipo de título</th>
                <th>Itens</th>
                <th>Confirmados</th>
                <th>Divergentes</th>
                <th>Pendentes</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.dataHora).toLocaleString("pt-BR")}</td>
                  <td>{r.protocolo}</td>
                  <td>{r.tipoTitulo}</td>
                  <td>{r.total}</td>
                  <td className="t-ok">{r.confirmados}</td>
                  <td className="t-bad">{r.divergentes}</td>
                  <td className="t-warn">{r.pendentes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
