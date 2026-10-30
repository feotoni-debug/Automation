import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { gerarPreviaArquivo, ordenarArquivosNatural, protocolosDeExemplo } from "../services/arcaService";
import { IconeArquivo, IconeLixeira, IconeMais, IconePasta } from "./IconesAnimados";

interface Props {
  carregando: boolean;
  erro: string | null;
  arquivosIniciaisFisico?: File[];
  protocoloInicial?: string;
  onBuscar: (protocolo: string, arquivosFisico?: File[] | null, arquivosArca?: File[] | null) => void;
}

interface CampoAnexoProps {
  titulo: string;
  subtitulo: string;
  arquivos: File[];
  desabilitado: boolean;
  onSelecionar: (arquivos: File[]) => void;
  onAdicionar: (arquivos: File[]) => void;
  onRemover: () => void;
}

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function IconeUploadSvg() {
  return (
    <svg className="icone-upload-svg" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="8" y="6" width="26" height="34" rx="3" stroke="#565a4b" strokeWidth="2.2" fill="#ffffff" />
      <path d="M14 15h14M14 21h14M14 27h9" stroke="#a9c188" strokeWidth="2" strokeLinecap="round" />
      <circle cx="34" cy="34" r="9" fill="#3d5c2a" />
      <path d="M34 38v-8M30.5 33.5L34 30l3.5 3.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SeloConfirmadoAnimado() {
  return (
    <div className="selo-confirmado" aria-hidden="true">
      <span className="selo-pulso" />
      <svg className="selo-svg" viewBox="0 0 52 52">
        <circle className="selo-circulo-fundo" cx="26" cy="26" r="23" />
        <circle className="selo-circulo" cx="26" cy="26" r="23" fill="none" />
        <path className="selo-check" fill="none" d="M15 26.5l7.2 7.2 15-15.2" />
      </svg>
    </div>
  );
}

/** Lê arquivos arrastados, inclusive explorando recursivamente pastas soltas no navegador. */
async function extrairArquivosDeDrop(e: DragEvent<HTMLDivElement>): Promise<File[]> {
  const itens = e.dataTransfer.items;
  if (!itens || itens.length === 0) {
    return Array.from(e.dataTransfer.files || []);
  }

  const coletados: File[] = [];

  async function lerEntrada(entry: any) {
    if (!entry) return;
    if (entry.isFile) {
      const f: File = await new Promise((resolve, reject) => entry.file(resolve, reject));
      coletados.push(f);
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const lerLote = (): Promise<any[]> =>
        new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      let entradas = await lerLote();
      while (entradas.length > 0) {
        for (const sub of entradas) {
          await lerEntrada(sub);
        }
        entradas = await lerLote();
      }
    }
  }

  const promessas: Promise<void>[] = [];
  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    if (item.webkitGetAsEntry) {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        promessas.push(lerEntrada(entry));
        continue;
      }
    }
    const f = item.getAsFile();
    if (f) coletados.push(f);
  }

  await Promise.all(promessas);
  return coletados.length > 0 ? coletados : Array.from(e.dataTransfer.files || []);
}

function CampoAnexo({
  titulo,
  subtitulo,
  arquivos,
  desabilitado,
  onSelecionar,
  onAdicionar,
  onRemover,
}: CampoAnexoProps) {
  const [arrastando, setArrastando] = useState(false);
  const [previaUrl, setPreviaUrl] = useState<string | null>(null);
  const [carregandoPrevia, setCarregandoPrevia] = useState(false);

  const inputFileRef = useRef<HTMLInputElement>(null);
  const inputFolderRef = useRef<HTMLInputElement>(null);
  const inputAddRef = useRef<HTMLInputElement>(null);

  const temArquivos = arquivos.length > 0;
  const totalBytes = arquivos.reduce((acc, f) => acc + f.size, 0);

  useEffect(() => {
    let cancelado = false;
    if (!temArquivos) {
      setPreviaUrl(null);
      setCarregandoPrevia(false);
      return;
    }
    setCarregandoPrevia(true);
    gerarPreviaArquivo(arquivos)
      .then((url) => {
        if (!cancelado) setPreviaUrl(url);
      })
      .finally(() => {
        if (!cancelado) setCarregandoPrevia(false);
      });
    return () => {
      cancelado = true;
    };
  }, [arquivos, temArquivos]);

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastando(false);
    if (desabilitado) return;
    const novos = await extrairArquivosDeDrop(e);
    if (novos.length > 0) {
      onSelecionar(novos);
    }
  };

  const handleInputFiles = (e: React.ChangeEvent<HTMLInputElement>, adicionar = false) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      if (adicionar) {
        onAdicionar(files);
      } else {
        onSelecionar(files);
      }
    }
  };

  return (
    <div className="anexo-bloco">
      <label>{titulo}</label>
      <div
        className={`dropzone ${arrastando ? "arrastando" : ""} ${temArquivos ? "com-arquivo" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => !desabilitado && !temArquivos && inputFileRef.current?.click()}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && !temArquivos && (e.preventDefault(), inputFileRef.current?.click())
        }
        onDragOver={(e) => {
          e.preventDefault();
          if (!desabilitado) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={onDrop}
      >
        {/* Input para múltiplos arquivos */}
        <input
          ref={inputFileRef}
          type="file"
          accept=".pdf,.tif,.tiff,image/*"
          multiple
          className="sr-only"
          disabled={desabilitado}
          onChange={(e) => handleInputFiles(e, false)}
        />

        {/* Input para pasta inteira */}
        <input
          ref={inputFolderRef}
          type="file"
          {...({ webkitdirectory: "", directory: "" } as any)}
          multiple
          className="sr-only"
          disabled={desabilitado}
          onChange={(e) => handleInputFiles(e, false)}
        />

        {/* Input para adicionar mais arquivos à seleção atual */}
        <input
          ref={inputAddRef}
          type="file"
          accept=".pdf,.tif,.tiff,image/*"
          multiple
          className="sr-only"
          disabled={desabilitado}
          onChange={(e) => handleInputFiles(e, true)}
        />

        {!temArquivos ? (
          <>
            <IconeUploadSvg />
            <strong>Arraste uma pasta inteira ou arquivos aqui</strong>
            <span className="muted">{subtitulo}</span>
            <div className="dropzone-botoes-topo" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="btn secundario pequeno btn-com-icone"
                disabled={desabilitado}
                onClick={() => inputFileRef.current?.click()}
              >
                <IconeArquivo className="btn-ico" /> Selecionar arquivo(s)
              </button>
              <button
                type="button"
                className="btn pequeno btn-pasta btn-com-icone"
                disabled={desabilitado}
                onClick={() => inputFolderRef.current?.click()}
              >
                <IconePasta className="btn-ico" /> Selecionar pasta inteira
              </button>
            </div>
          </>
        ) : (
          <div className="arquivo-card" key={arquivos.length + "_" + totalBytes} onClick={(e) => e.stopPropagation()}>
            <div
              className="previa-moldura"
              onClick={() => !desabilitado && inputFileRef.current?.click()}
              title="Clique para trocar os arquivos"
            >
              {carregandoPrevia || !previaUrl ? (
                <div className="previa-skeleton">
                  <span className="spinner" />
                </div>
              ) : (
                <img
                  src={previaUrl}
                  alt={`Prévia de ${arquivos[0]?.name}`}
                  className="previa-miniatura"
                />
              )}
              <span className="previa-scanline" aria-hidden="true" />
              <SeloConfirmadoAnimado />
            </div>

            <div className="arquivo-detalhes">
              <div className="status-confirmado-pill">
                <span className="status-ponto" />
                {arquivos.length > 1 ? `Lote com ${arquivos.length} páginas` : "Documento verificado"}
              </div>
              <strong title={arquivos.map((f) => f.name).join(", ")}>
                {arquivos.length === 1
                  ? arquivos[0].name
                  : `${arquivos.length} páginas digitalizadas`}
              </strong>
              <span className="muted">
                {arquivos.length === 1
                  ? `${formatarTamanho(totalBytes)} · Pronto para análise`
                  : `${arquivos.length} fotos ordenadas (${formatarTamanho(totalBytes)})`}
              </span>
              {arquivos.length > 1 && (
                <span className="tag-primeira-pag">
                  Pág. 1: {arquivos[0]?.name}
                </span>
              )}
              <div className="arquivo-acoes">
                <button
                  type="button"
                  className="btn secundario pequeno btn-com-icone"
                  disabled={desabilitado}
                  onClick={() => inputFolderRef.current?.click()}
                  title="Substituir por outra pasta de fotos"
                >
                  <IconePasta className="btn-ico" /> Trocar pasta
                </button>
                <button
                  type="button"
                  className="btn secundario pequeno btn-com-icone"
                  disabled={desabilitado}
                  onClick={() => inputAddRef.current?.click()}
                  title="Adicionar mais fotos a este lote"
                >
                  <IconeMais className="btn-ico" /> Mais fotos
                </button>
                <button
                  type="button"
                  className="btn secundario pequeno btn-remover btn-com-icone"
                  disabled={desabilitado}
                  onClick={() => {
                    onRemover();
                    if (inputFileRef.current) inputFileRef.current.value = "";
                    if (inputFolderRef.current) inputFolderRef.current.value = "";
                    if (inputAddRef.current) inputAddRef.current.value = "";
                  }}
                >
                  <IconeLixeira className="btn-ico" /> Remover
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function BuscaProtocolo({
  carregando,
  erro,
  arquivosIniciaisFisico,
  protocoloInicial,
  onBuscar,
}: Props) {
  const [valor, setValor] = useState(protocoloInicial ?? "");
  const [arquivosArca, setArquivosArca] = useState<File[]>([]);
  const [arquivosFisico, setArquivosFisico] = useState<File[]>(arquivosIniciaisFisico ?? []);

  useEffect(() => {
    if (arquivosIniciaisFisico && arquivosIniciaisFisico.length > 0) {
      setArquivosFisico(ordenarArquivosNatural(arquivosIniciaisFisico));
    }
  }, [arquivosIniciaisFisico]);

  useEffect(() => {
    if (protocoloInicial) {
      setValor(protocoloInicial);
    }
  }, [protocoloInicial]);

  const podeEnviar =
    (valor.trim().length > 0 || arquivosFisico.length > 0 || arquivosArca.length > 0) && !carregando;

  const preencherProtocoloSeVazio = (lista: File[]) => {
    if (!lista.length || valor.trim()) return;
    for (const f of lista) {
      const match = f.name.match(/2026-\d{6}/);
      if (match) {
        setValor(match[0]);
        return;
      }
    }
    setValor("2026-000123");
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (podeEnviar) {
      onBuscar(
        valor,
        arquivosFisico.length > 0 ? arquivosFisico : null,
        arquivosArca.length > 0 ? arquivosArca : null,
      );
    }
  };

  return (
    <div className="busca busca-larga">
      <h2>Nova conferência</h2>
      <p className="muted">
        Anexe os documentos para análise (você pode selecionar ou arrastar <strong>uma pasta inteira com fotos digitalizadas</strong>, múltiplos arquivos ou PDFs).
      </p>

      <form onSubmit={enviar} className="form-conferencia">
        <div className="anexos-grid">
          <CampoAnexo
            titulo="1. Anexo — Digitalizado na ARCA (opcional)"
            subtitulo="Pasta com fotos, PDF ou imagens (se vazio, carrega da ARCA pelo protocolo)"
            arquivos={arquivosArca}
            desabilitado={carregando}
            onSelecionar={(lista) => {
              const ordenados = ordenarArquivosNatural(lista);
              setArquivosArca(ordenados);
              preencherProtocoloSeVazio(ordenados);
            }}
            onAdicionar={(mais) => {
              const unidos = ordenarArquivosNatural([...arquivosArca, ...mais]);
              setArquivosArca(unidos);
            }}
            onRemover={() => setArquivosArca([])}
          />

          <CampoAnexo
            titulo="2. Anexo — Físico digitalizado"
            subtitulo="Pasta com fotos escaneadas, PDF ou imagens para a coluna do Físico"
            arquivos={arquivosFisico}
            desabilitado={carregando}
            onSelecionar={(lista) => {
              const ordenados = ordenarArquivosNatural(lista);
              setArquivosFisico(ordenados);
              preencherProtocoloSeVazio(ordenados);
            }}
            onAdicionar={(mais) => {
              const unidos = ordenarArquivosNatural([...arquivosFisico, ...mais]);
              setArquivosFisico(unidos);
            }}
            onRemover={() => setArquivosFisico([])}
          />
        </div>

        <label htmlFor="protocolo">Número do protocolo</label>
        <div className="busca-linha">
          <input
            id="protocolo"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Ex.: 2026-000123"
            disabled={carregando}
            autoComplete="off"
          />
          <button className="btn" type="submit" disabled={!podeEnviar}>
            {carregando ? "Analisando…" : "Comparar documentos"}
          </button>
        </div>
      </form>

      {carregando && (
        <div className="carregando" role="status" aria-live="polite">
          <span className="spinner" />
          Analisando páginas e marcas com a esteira documental, aguarde…
        </div>
      )}

      {erro && !carregando && (
        <div className="alerta erro" role="alert">
          <strong>Protocolo não encontrado.</strong>
          <span>{erro}</span>
        </div>
      )}

      <p className="muted dica">
        Protocolos de demonstração:{" "}
        {protocolosDeExemplo.map((p) => (
          <button key={p} type="button" className="link" disabled={carregando} onClick={() => setValor(p)}>
            {p}
          </button>
        ))}
      </p>
    </div>
  );
}
