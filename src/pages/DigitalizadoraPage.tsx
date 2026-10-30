import { useCallback, useEffect, useRef, useState } from "react";
import {
  alterarPastaScanner,
  baixarArquivoScannerComoFile,
  excluirArquivoScanner,
  limparFilaScanner,
  listarArquivosScanner,
  obterPaginasScanner,
  protocolosDeExemplo,
  simularDigitalizacaoScanner,
  type ArquivoScanner,
} from "../services/arcaService";
import { IconeArquivo, IconeLixeira, IconePasta, IconeScanner } from "../components/IconesAnimados";

interface Props {
  onEnviarParaConferencia: (arquivosFisico: File[], protocoloSugerido?: string) => void;
  onCompararDireto: (protocolo: string, arquivosFisico: File[]) => void;
  onAtualizarTotalFila?: (total: number) => void;
}

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatarHorario(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function DigitalizadoraPage({
  onEnviarParaConferencia,
  onCompararDireto,
  onAtualizarTotalFila,
}: Props) {
  const [pastaScanner, setPastaScanner] = useState("D:\\ARCAri Automation\\entrada_scanner");
  const [editandoPasta, setEditandoPasta] = useState(false);
  const [novaPastaInput, setNovaPastaInput] = useState("");
  const [copiado, setCopiado] = useState(false);

  const [watchdogAtivo, setWatchdogAtivo] = useState(true);
  const [arquivos, setArquivos] = useState<ArquivoScanner[]>([]);
  const [selecionadoNome, setSelecionadoNome] = useState<string | null>(null);
  const [paginasPrevia, setPaginasPrevia] = useState<string[]>([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [carregandoPaginas, setCarregandoPaginas] = useState(false);

  const [protocolo, setProtocolo] = useState("2026-000123");
  const [processandoAcao, setProcessandoAcao] = useState(false);
  const [avisoNovoScan, setAvisoNovoScan] = useState<string | null>(null);

  const nomesConhecidosRef = useRef<Set<string>>(new Set());
  const primeiraCargaRef = useRef(true);

  const carregarFila = useCallback(async () => {
    const estado = await listarArquivosScanner();
    setPastaScanner(estado.pastaScanner);
    setWatchdogAtivo(estado.watchdogAtivo);
    setArquivos(estado.arquivos);
    onAtualizarTotalFila?.(estado.arquivos.length);

    // Verifica se caiu documento novo na pasta
    const conhecidos = nomesConhecidosRef.current;
    if (!primeiraCargaRef.current) {
      const recemChegado = estado.arquivos.find((a) => !conhecidos.has(a.nome));
      if (recemChegado) {
        setSelecionadoNome(recemChegado.nome);
        if (recemChegado.protocoloSugerido) {
          setProtocolo(recemChegado.protocoloSugerido);
        }
        setAvisoNovoScan(`Novo documento recebido da digitalizadora: ${recemChegado.nome}`);
        setTimeout(() => setAvisoNovoScan(null), 5000);
      }
    }
    primeiraCargaRef.current = false;
    nomesConhecidosRef.current = new Set(estado.arquivos.map((a) => a.nome));

    setSelecionadoNome((atual) => {
      if (atual && estado.arquivos.some((a) => a.nome === atual)) return atual;
      return estado.arquivos[0]?.nome ?? null;
    });
  }, [onAtualizarTotalFila]);

  useEffect(() => {
    carregarFila();
    const timer = setInterval(carregarFila, 2000);
    return () => clearInterval(timer);
  }, [carregarFila]);

  const itemSelecionado = arquivos.find((a) => a.nome === selecionadoNome) ?? null;

  useEffect(() => {
    let cancelado = false;
    if (!itemSelecionado) {
      setPaginasPrevia([]);
      setPaginaAtual(1);
      return;
    }
    if (itemSelecionado.protocoloSugerido) {
      setProtocolo(itemSelecionado.protocoloSugerido);
    }
    setCarregandoPaginas(true);
    setPaginaAtual(1);
    obterPaginasScanner(itemSelecionado.nome)
      .then((pags) => {
        if (!cancelado) {
          setPaginasPrevia(pags.length > 0 ? pags : [itemSelecionado.previa]);
        }
      })
      .finally(() => {
        if (!cancelado) setCarregandoPaginas(false);
      });
    return () => {
      cancelado = true;
    };
  }, [itemSelecionado?.nome, itemSelecionado?.mtimeMs]);

  const handleSimularScan = async () => {
    setProcessandoAcao(true);
    try {
      const criado = await simularDigitalizacaoScanner(protocolo || "2026-000123");
      await carregarFila();
      setSelecionadoNome(criado.nome);
      setAvisoNovoScan(`Digitalização recebida na pasta: ${criado.nome}`);
      setTimeout(() => setAvisoNovoScan(null), 5000);
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleCopiarPasta = async () => {
    try {
      await navigator.clipboard.writeText(pastaScanner);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleSalvarPasta = async () => {
    if (!novaPastaInput.trim()) return;
    const res = await alterarPastaScanner(novaPastaInput);
    setPastaScanner(res.pastaScanner);
    setWatchdogAtivo(res.watchdogAtivo);
    setEditandoPasta(false);
    await carregarFila();
  };

  const handleExcluir = async (nome: string) => {
    await excluirArquivoScanner(nome);
    await carregarFila();
  };

  const handleLimparTodos = async () => {
    await limparFilaScanner();
    await carregarFila();
  };

  const handleUsarSelecionadoNaConferencia = async () => {
    if (!itemSelecionado) return;
    setProcessandoAcao(true);
    try {
      const file = await baixarArquivoScannerComoFile(itemSelecionado);
      onEnviarParaConferencia([file], protocolo);
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleUsarTodosNaConferencia = async () => {
    if (!arquivos.length) return;
    setProcessandoAcao(true);
    try {
      const files = await Promise.all(arquivos.map((a) => baixarArquivoScannerComoFile(a)));
      onEnviarParaConferencia(files, protocolo);
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleCompararDireto = async () => {
    if (!itemSelecionado) return;
    setProcessandoAcao(true);
    try {
      const file = await baixarArquivoScannerComoFile(itemSelecionado);
      onCompararDireto(protocolo || "2026-000123", [file]);
    } finally {
      setProcessandoAcao(false);
    }
  };

  return (
    <div className="scanner-page">
      {/* Cabeçalho da Aba Digitalizadora */}
      <div className="scanner-cabecalho">
        <div className="scanner-titulo-bloco">
          <div className="scanner-titulo-linha">
            <h2>Entrada da Digitalizadora (PaperStream)</h2>
            <span className={`scanner-status-pill ${watchdogAtivo ? "ativo" : ""}`}>
              <span className="status-ponto" />
              {watchdogAtivo
                ? "Monitorando em tempo real (Watchdog ativo)"
                : "Monitoramento em espera"}
            </span>
          </div>
          <p className="muted">
            Sempre que você apertar o botão físico na <strong>fi-8170</strong> ou <strong>fi-7140</strong>, o PDF salvo pelo PaperStream Capture aparece automaticamente aqui com prévia instantânea.
          </p>
        </div>

        <div className="scanner-acoes-topo">
          <button
            type="button"
            className="btn btn-com-icone"
            disabled={processandoAcao}
            onClick={handleSimularScan}
            title="Cria um documento de teste na pasta vigiada para demonstrar a chegada automática"
          >
            <IconeScanner className="btn-ico" /> Simular digitalização
          </button>
          {arquivos.length > 1 && (
            <button
              type="button"
              className="btn btn-pasta btn-com-icone"
              disabled={processandoAcao}
              onClick={handleUsarTodosNaConferencia}
            >
              <IconePasta className="btn-ico" /> Usar todos ({arquivos.length}) na conferência
            </button>
          )}
          {arquivos.length > 0 && (
            <button
              type="button"
              className="btn secundario btn-remover btn-com-icone"
              disabled={processandoAcao}
              onClick={handleLimparTodos}
            >
              <IconeLixeira className="btn-ico" /> Limpar fila
            </button>
          )}
        </div>
      </div>

      {/* Barra da pasta configurada no PaperStream Capture */}
      <div className="scanner-pasta-bar">
        <div className="scanner-pasta-info">
          <IconePasta className="scanner-pasta-ico" />
          <div>
            <span className="scanner-pasta-label">Pasta de destino configurada no PaperStream Capture:</span>
            {!editandoPasta ? (
              <code className="scanner-pasta-code">{pastaScanner}</code>
            ) : (
              <div className="scanner-pasta-edit">
                <input
                  value={novaPastaInput}
                  onChange={(e) => setNovaPastaInput(e.target.value)}
                  placeholder="Ex.: D:\ARCAri Automation\entrada_scanner"
                />
                <button type="button" className="btn pequeno" onClick={handleSalvarPasta}>
                  Salvar pasta
                </button>
                <button
                  type="button"
                  className="btn secundario pequeno"
                  onClick={() => setEditandoPasta(false)}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
        {!editandoPasta && (
          <div className="scanner-pasta-botoes">
            <button type="button" className="btn secundario pequeno" onClick={handleCopiarPasta}>
              {copiado ? "✓ Caminho copiado!" : "Copiar caminho"}
            </button>
            <button
              type="button"
              className="btn secundario pequeno"
              onClick={() => {
                setNovaPastaInput(pastaScanner);
                setEditandoPasta(true);
              }}
            >
              Trocar pasta
            </button>
          </div>
        )}
      </div>

      {avisoNovoScan && (
        <div className="alerta sucesso scanner-alerta-novo" role="status">
          <strong>📄 Documento recebido da digitalizadora!</strong>
          <span>{avisoNovoScan}</span>
        </div>
      )}

      {/* Área Principal: Fila à esquerda + Prévia ampla à direita */}
      {arquivos.length === 0 ? (
        <div className="scanner-vazio">
          <div className="scanner-vazio-icone">
            <IconeScanner />
            <span className="scanner-radar-onda" />
          </div>
          <h3>Aguardando documentos da digitalizadora…</h3>
          <p className="muted">
            Coloque as folhas na bandeja da sua <strong>fi-8170</strong> ou <strong>fi-7140</strong> e pressione o botão físico <strong>Scan</strong>, ou clique abaixo para testar agora mesmo.
          </p>
          <div className="scanner-vazio-passos">
            <span>1. Abra o <b>PaperStream Capture</b></span>
            <span>2. Defina a pasta de saída como <code>{pastaScanner}</code></span>
            <span>3. Aperte o botão no scanner — o documento cairá aqui na hora!</span>
          </div>
          <button
            type="button"
            className="btn grande btn-com-icone"
            disabled={processandoAcao}
            onClick={handleSimularScan}
          >
            <IconeScanner className="btn-ico" /> Testar chegada de documento agora
          </button>
        </div>
      ) : (
        <div className="scanner-grid">
          {/* Coluna Esquerda: Lista de documentos que caíram na pasta */}
          <aside className="scanner-fila">
            <div className="scanner-fila-topo">
              <h3>Documentos recebidos ({arquivos.length})</h3>
              <span className="muted">Clique para ver a prévia</span>
            </div>

            <ul className="scanner-lista">
              {arquivos.map((arq) => {
                const ativo = arq.nome === itemSelecionado?.nome;
                return (
                  <li
                    key={arq.nome}
                    className={`scanner-card ${ativo ? "ativo" : ""}`}
                    onClick={() => setSelecionadoNome(arq.nome)}
                  >
                    <div className="scanner-card-thumb">
                      <img src={arq.previa} alt={`Miniatura de ${arq.nome}`} />
                      <span className="previa-scanline" aria-hidden="true" />
                      <span className="scanner-badge-pags">{arq.paginas} pág.</span>
                    </div>

                    <div className="scanner-card-corpo">
                      <strong title={arq.nome}>{arq.nome}</strong>
                      <span className="muted">
                        {formatarTamanho(arq.tamanho)} · Recebido às {formatarHorario(arq.modificadoEm)}
                      </span>
                      {arq.protocoloSugerido && (
                        <span className="tag-primeira-pag">Protocolo: {arq.protocoloSugerido}</span>
                      )}
                      <div className="scanner-card-acoes" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn pequeno"
                          disabled={processandoAcao}
                          onClick={async () => {
                            setSelecionadoNome(arq.nome);
                            const file = await baixarArquivoScannerComoFile(arq);
                            onEnviarParaConferencia([file], arq.protocoloSugerido || protocolo);
                          }}
                        >
                          Enviar p/ conferência
                        </button>
                        <button
                          type="button"
                          className="btn secundario pequeno btn-remover"
                          onClick={() => handleExcluir(arq.nome)}
                          title="Remover da pasta"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Coluna Direita: Visualizador de Prévia das Páginas + Envio Rápido */}
          {itemSelecionado && (
            <section className="scanner-previa-painel">
              <div className="scanner-previa-cabecalho">
                <div>
                  <h3>Prévia do Documento Digitalizado</h3>
                  <span className="muted">
                    <strong>{itemSelecionado.nome}</strong> ({itemSelecionado.paginas}{" "}
                    {itemSelecionado.paginas === 1 ? "página" : "páginas"} ·{" "}
                    {formatarTamanho(itemSelecionado.tamanho)})
                  </span>
                </div>

                {paginasPrevia.length > 1 && (
                  <div className="paginacao">
                    <button
                      type="button"
                      className="btn secundario pequeno"
                      disabled={paginaAtual <= 1}
                      onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    >
                      ← Anterior
                    </button>
                    <span>
                      Página <strong>{paginaAtual}</strong> de <strong>{paginasPrevia.length}</strong>
                    </span>
                    <button
                      type="button"
                      className="btn secundario pequeno"
                      disabled={paginaAtual >= paginasPrevia.length}
                      onClick={() => setPaginaAtual((p) => Math.min(paginasPrevia.length, p + 1))}
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </div>

              {/* Barra de Ação Direta para Conferência */}
              <div className="scanner-acao-conferencia">
                <div className="scanner-prot-campo">
                  <label htmlFor="scanner-prot">Protocolo para conferência:</label>
                  <div className="scanner-prot-input-row">
                    <input
                      id="scanner-prot"
                      value={protocolo}
                      onChange={(e) => setProtocolo(e.target.value)}
                      placeholder="Ex.: 2026-000123"
                    />
                    <div className="scanner-prot-sugestoes">
                      {protocolosDeExemplo.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className="link"
                          onClick={() => setProtocolo(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="scanner-acao-botoes">
                  <button
                    type="button"
                    className="btn secundario btn-com-icone"
                    disabled={processandoAcao}
                    onClick={handleUsarSelecionadoNaConferencia}
                    title="Preenche o anexo Físico na aba Nova Conferência com este documento"
                  >
                    <IconeArquivo className="btn-ico" /> Carregar no Anexo Físico
                  </button>
                  <button
                    type="button"
                    className="btn btn-com-icone"
                    disabled={processandoAcao}
                    onClick={handleCompararDireto}
                    title="Executa imediatamente a comparação com a ARCA usando este documento físico"
                  >
                    Comparar direto com a ARCA →
                  </button>
                </div>
              </div>

              {/* Tira de miniaturas das páginas quando multipágina */}
              {paginasPrevia.length > 1 && (
                <div className="scanner-tira-paginas">
                  {paginasPrevia.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`scanner-miniatura-pag ${paginaAtual === idx + 1 ? "ativa" : ""}`}
                      onClick={() => setPaginaAtual(idx + 1)}
                    >
                      <img src={imgUrl} alt={`Página ${idx + 1}`} />
                      <span>Pág. {idx + 1}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Palco da página escaneada */}
              <div className="scanner-palco-doc">
                {carregandoPaginas ? (
                  <div className="carregando">
                    <span className="spinner" /> Renderizando páginas digitalizadas…
                  </div>
                ) : (
                  <div className="scanner-folha-moldura">
                    <img
                      src={paginasPrevia[paginaAtual - 1] || itemSelecionado.previa}
                      alt={`${itemSelecionado.nome} — Página ${paginaAtual}`}
                    />
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
