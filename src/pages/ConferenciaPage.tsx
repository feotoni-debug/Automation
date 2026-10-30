import { useMemo, useState } from "react";
import type { RegistroHistorico, ResultadoBusca, StatusConferencia } from "../types";
import { FRASE_AVISO } from "../types";
import { TituloInfo } from "../components/TituloInfo";
import { DocumentViewer } from "../components/DocumentViewer";
import { MarcaItem } from "../components/MarcaItem";
import { Resumo } from "../components/Resumo";
import { VereditoDocumento } from "../components/VereditoDocumento";
import { ConfirmModal } from "../components/ConfirmModal";
import { obterPaginasDeArquivo } from "../services/arcaService";

interface Props {
  resultado: ResultadoBusca;
  onFinalizar: (r: RegistroHistorico) => void;
  onCancelar: () => void;
}

function decisaoAutomaticaPorConfianca(confianca: number): StatusConferencia {
  if (confianca >= 90) return "Confirmado";
  if (confianca > 50) return "Pendente";
  return "Divergente";
}

export function ConferenciaPage({ resultado, onFinalizar, onCancelar }: Props) {
  const { titulo } = resultado;
  const [docArca, setDocArca] = useState<string[]>(resultado.documentoArca);
  const [docFisico, setDocFisico] = useState<string[]>(resultado.documentoFisico);
  const [nomeArca, setNomeArca] = useState<string | undefined>(resultado.nomeAnexoArca);
  const [nomeFisico, setNomeFisico] = useState<string | undefined>(resultado.nomeAnexoFisico);

  const [pagina, setPagina] = useState(1);
  const [ativaId, setAtivaId] = useState<string | null>(titulo.marcas[0]?.id ?? null);
  const [decisoes] = useState<Record<string, StatusConferencia>>(() =>
    Object.fromEntries(titulo.marcas.map((m) => [m.id, decisaoAutomaticaPorConfianca(m.confianca)])),
  );
  const [confirmando, setConfirmando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const contagem = useMemo(() => {
    const v = Object.values(decisoes);
    return {
      total: titulo.marcas.length,
      confirmados: v.filter((d) => d === "Confirmado").length,
      divergentes: v.filter((d) => d === "Divergente").length,
      pendentes: v.filter((d) => d === "Pendente").length,
    };
  }, [decisoes, titulo.marcas.length]);

  const semPar = useMemo(
    () => (resultado.pareamento ?? []).filter((p) => p.situacao !== "pareado").length,
    [resultado.pareamento],
  );

  const selecionar = (id: string) => {
    const m = titulo.marcas.find((x) => x.id === id);
    if (!m) return;
    setAtivaId(id);
    setPagina(m.pagina);
  };

  const salvar = () => {
    onFinalizar({
      id: crypto.randomUUID(),
      protocolo: titulo.protocolo,
      tipoTitulo: titulo.tipoTitulo,
      dataHora: new Date().toISOString(),
      ...contagem,
    });
    setConfirmando(false);
    setSalvo(true);
  };

  if (salvo) {
    return (
      <div className="busca">
        <div className="alerta sucesso" role="status">
          <strong>Conferência salva (simulação).</strong>
          <span>O resultado do protocolo {titulo.protocolo} foi registrado no histórico desta demonstração.</span>
        </div>
        <p className="aviso">{FRASE_AVISO}</p>
        <button className="btn" onClick={onCancelar}>
          Nova conferência
        </button>
      </div>
    );
  }

  return (
    <div className="conferencia">
      <div className="conf-topo">
        <h2>Conferência — protocolo {titulo.protocolo}</h2>
        <button className="btn secundario" onClick={onCancelar}>
          ← Nova busca
        </button>
      </div>
      <TituloInfo titulo={titulo} />
      <VereditoDocumento contagem={contagem} semPar={semPar} />
      <p className="aviso">{FRASE_AVISO}</p>

      <div className="paginacao" role="group" aria-label="Página">
        <button className="btn secundario" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
          ‹
        </button>
        <span>
          Página {pagina} de {titulo.paginas}
        </span>
        <button className="btn secundario" disabled={pagina >= titulo.paginas} onClick={() => setPagina((p) => p + 1)}>
          ›
        </button>
      </div>

      {resultado.pareamento && resultado.pareamento.length > 1 && (
        <details className="pareamento" open>
          <summary>
            Pareamento em massa — {resultado.pareamento.filter((p) => p.situacao === "pareado").length} de{" "}
            {resultado.pareamento.length} páginas casadas por conteúdo (independente da ordem das pastas)
          </summary>
          <ul>
            {resultado.pareamento.map((p) => (
              <li
                key={p.pagina}
                className={`par ${p.situacao} ${p.pagina === pagina ? "atual" : ""}`}
                onClick={() => setPagina(p.pagina)}
              >
                <span className="par-n">{p.pagina}</span>
                <span className="par-arca" title={p.arca ?? ""}>{p.arca ?? "— sem página na ARCA —"}</span>
                <span className="par-seta">⇄</span>
                <span className="par-fisico" title={p.fisico ?? ""}>{p.fisico ?? "— sem documento físico equivalente —"}</span>
                <span className="par-sim">
                  {p.situacao === "pareado" ? `${p.similaridade}%${p.mesmaPosicao ? "" : " · ordem diferente"}` : "sem par"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="layout-conf">
        <div className="docs">
          <DocumentViewer
            titulo="Digitalizado na ARCA"
            nomeAnexo={nomeArca}
            imagens={docArca}
            pagina={pagina}
            marcas={titulo.marcas}
            marcaAtivaId={ativaId}
            onSelecionar={selecionar}
            onTrocarAnexo={async (f) => {
              setNomeArca(f.name);
              setDocArca(await obterPaginasDeArquivo(f, titulo.paginas));
            }}
          />
          <DocumentViewer
            titulo="Físico digitalizado"
            nomeAnexo={nomeFisico}
            imagens={docFisico}
            pagina={pagina}
            marcas={titulo.marcas}
            marcaAtivaId={ativaId}
            fisico
            onSelecionar={selecionar}
            onTrocarAnexo={async (f) => {
              setNomeFisico(f.name);
              setDocFisico(await obterPaginasDeArquivo(f, titulo.paginas));
            }}
          />
        </div>
        <aside className="lista">
          <h3>Assinaturas e carimbos identificados</h3>
          <ul>
            {titulo.marcas.map((m) => (
              <MarcaItem
                key={m.id}
                marca={m}
                imagemArca={docArca[m.pagina - 1]}
                imagemFisico={docFisico[m.pagina - 1]}
                ativa={m.id === ativaId}
                decisao={decisoes[m.id]}
                onSelecionar={() => selecionar(m.id)}
              />
            ))}
          </ul>
        </aside>
      </div>

      <h3>Resumo da conferência</h3>
      <Resumo {...contagem} />
      <p className="aviso">{FRASE_AVISO}</p>
      <div className="finalizar">
        <button className="btn grande" onClick={() => setConfirmando(true)}>
          Finalizar conferência
        </button>
      </div>

      {confirmando && (
        <ConfirmModal titulo="Finalizar conferência?" confirmarRotulo="Confirmar e salvar" onConfirmar={salvar} onCancelar={() => setConfirmando(false)}>
          <p>
            Protocolo <strong>{titulo.protocolo}</strong>: {contagem.confirmados} confirmado(s), {contagem.divergentes} divergente(s) e {contagem.pendentes} pendente(s)
            de {contagem.total} itens.
          </p>
          {contagem.pendentes > 0 && <p className="alerta aviso-pend">Ainda há itens pendentes. Você pode finalizar mesmo assim.</p>}
          <p className="muted">{FRASE_AVISO}</p>
          <p className="muted">O salvamento é simulado nesta demonstração.</p>
        </ConfirmModal>
      )}
    </div>
  );
}
