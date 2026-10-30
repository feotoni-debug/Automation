import { BuscaProtocolo } from "../components/BuscaProtocolo";
import { ConferenciaPage } from "./ConferenciaPage";
import type { RegistroHistorico, ResultadoBusca } from "../types";

interface Props {
  resultado: ResultadoBusca | null;
  carregando: boolean;
  erro: string | null;
  arquivosIniciaisFisico?: File[];
  protocoloInicial?: string;
  onBuscar: (p: string, arquivoFisico?: File[] | File | null, arquivoArca?: File[] | File | null) => void;
  onFinalizar: (r: RegistroHistorico) => void;
  onReiniciar: () => void;
}

export function NovaConferenciaPage({
  resultado,
  carregando,
  erro,
  arquivosIniciaisFisico,
  protocoloInicial,
  onBuscar,
  onFinalizar,
  onReiniciar,
}: Props) {
  if (resultado) {
    // key garante estado limpo a cada novo protocolo
    return <ConferenciaPage key={resultado.titulo.protocolo + resultado.documentoArca.length} resultado={resultado} onFinalizar={onFinalizar} onCancelar={onReiniciar} />;
  }
  return (
    <BuscaProtocolo
      carregando={carregando}
      erro={erro}
      arquivosIniciaisFisico={arquivosIniciaisFisico}
      protocoloInicial={protocoloInicial}
      onBuscar={onBuscar}
    />
  );
}
