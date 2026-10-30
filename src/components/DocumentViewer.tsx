import { useEffect, useRef } from "react";
import type { Marca } from "../types";

interface Props {
  titulo: string;
  nomeAnexo?: string;
  imagens: string[];
  pagina: number;
  marcas: Marca[];
  marcaAtivaId: string | null;
  /** Se verdadeiro, a marca "Não localizado" é mostrada tracejada (posição esperada). */
  fisico?: boolean;
  onSelecionar: (id: string) => void;
  onTrocarAnexo?: (arquivo: File) => void;
}

export function DocumentViewer({
  titulo,
  nomeAnexo,
  imagens,
  pagina,
  marcas,
  marcaAtivaId,
  fisico,
  onSelecionar,
  onTrocarAnexo,
}: Props) {
  const ativaRef = useRef<HTMLButtonElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const daPagina = marcas.filter((m) => m.pagina === pagina);

  useEffect(() => {
    ativaRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [marcaAtivaId, pagina]);

  return (
    <section className="viewer" aria-label={titulo}>
      <div className="viewer-topo">
        <div className="viewer-titulo">
          <h3>{titulo}</h3>
          {nomeAnexo && (
            <span className="anexo-tag" title={`Anexado na etapa anterior: ${nomeAnexo}`}>
              {nomeAnexo}
            </span>
          )}
        </div>
        {onTrocarAnexo && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.tif,.tiff,image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onTrocarAnexo(f);
                e.target.value = "";
              }}
            />
            <button type="button" className="btn secundario pequeno" onClick={() => fileRef.current?.click()}>
              {nomeAnexo ? "Trocar anexo" : "Anexar documento"}
            </button>
          </>
        )}
      </div>
      <div className="viewer-scroll">
        <div className="pagina">
          <img src={imagens[pagina - 1]} alt={`${titulo} — página ${pagina}`} draggable={false} />
          {daPagina.map((m) => {
            const ativa = m.id === marcaAtivaId;
            const ausente = fisico && m.status === "Não localizado";
            return (
              <button
                key={m.id}
                ref={ativa ? ativaRef : undefined}
                type="button"
                className={`regiao ${ativa ? "ativa" : ""} ${ausente ? "ausente" : ""}`}
                style={{ left: `${m.regiao.x}%`, top: `${m.regiao.y}%`, width: `${m.regiao.w}%`, height: `${m.regiao.h}%` }}
                onClick={() => onSelecionar(m.id)}
                aria-label={`${m.tipo === "assinatura" ? "Assinatura" : "Carimbo"}: ${m.descricao}`}
                title={ausente ? `${m.descricao} (não localizado neste documento)` : m.descricao}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
