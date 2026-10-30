import { useEffect, useState } from "react";
import { Layout, type Rota } from "./components/Layout";
import { LandingPage } from "./pages/LandingPage";
import { NovaConferenciaPage } from "./pages/NovaConferenciaPage";
import { DigitalizadoraPage } from "./pages/DigitalizadoraPage";
import { HistoricoPage } from "./pages/HistoricoPage";
import { ConfiguracoesPage } from "./pages/ConfiguracoesPage";
import {
  definirAtrasoSimulado,
  getTituloPorProtocolo,
  listarArquivosScanner,
  ProtocoloNaoEncontradoError,
} from "./services/arcaService";
import { useLocalStorage } from "./hooks/useLocalStorage";
import type { RegistroHistorico, ResultadoBusca } from "./types";

export default function App() {
  const [entrou, setEntrou] = useState(false);
  const [rota, setRota] = useState<Rota>("nova");
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [historico, setHistorico] = useLocalStorage<RegistroHistorico[]>("ct-historico", []);
  const [atraso, setAtraso] = useLocalStorage<number>("ct-atraso", 1400);

  // Estado compartilhado com a aba Digitalizadora
  const [totalFilaScanner, setTotalFilaScanner] = useState(0);
  const [arquivosDoScanner, setArquivosDoScanner] = useState<File[]>([]);
  const [protocoloDoScanner, setProtocoloDoScanner] = useState<string>("");

  useEffect(() => definirAtrasoSimulado(atraso), [atraso]);

  useEffect(() => {
    if (!entrou) return;
    const atualizarBadge = () => {
      listarArquivosScanner()
        .then((est) => setTotalFilaScanner(est.arquivos.length))
        .catch(() => {});
    };
    atualizarBadge();
    const t = setInterval(atualizarBadge, 3000);
    return () => clearInterval(t);
  }, [entrou]);

  const buscar = async (
    protocolo: string,
    arquivoFisico?: File[] | File | null,
    arquivoArca?: File[] | File | null,
  ) => {
    setCarregando(true);
    setErro(null);
    try {
      setResultado(await getTituloPorProtocolo(protocolo, arquivoFisico, arquivoArca));
    } catch (e) {
      setErro(
        e instanceof ProtocoloNaoEncontradoError
          ? `Nenhum título foi localizado para "${e.protocolo}". Verifique o número digitado e tente novamente.`
          : "Não foi possível consultar o protocolo agora. Tente novamente.",
      );
    } finally {
      setCarregando(false);
    }
  };

  if (!entrou) return <LandingPage onIniciar={() => setEntrou(true)} />;

  return (
    <Layout
      rota={rota}
      onNavegar={setRota}
      onInicio={() => setEntrou(false)}
      badgeScanner={totalFilaScanner}
    >
      {rota === "nova" && (
        <NovaConferenciaPage
          resultado={resultado}
          carregando={carregando}
          erro={erro}
          arquivosIniciaisFisico={arquivosDoScanner}
          protocoloInicial={protocoloDoScanner}
          onBuscar={buscar}
          onFinalizar={(r) => setHistorico((h) => [r, ...h])}
          onReiniciar={() => {
            setResultado(null);
            setErro(null);
            setArquivosDoScanner([]);
          }}
        />
      )}
      {rota === "scanner" && (
        <DigitalizadoraPage
          onAtualizarTotalFila={setTotalFilaScanner}
          onEnviarParaConferencia={(files, prot) => {
            setResultado(null);
            setErro(null);
            setArquivosDoScanner(files);
            if (prot) setProtocoloDoScanner(prot);
            setRota("nova");
          }}
          onCompararDireto={(prot, files) => {
            setResultado(null);
            setErro(null);
            setArquivosDoScanner(files);
            setProtocoloDoScanner(prot);
            setRota("nova");
            buscar(prot, files, null);
          }}
        />
      )}
      {rota === "historico" && <HistoricoPage registros={historico} onLimpar={() => setHistorico([])} />}
      {rota === "config" && <ConfiguracoesPage atraso={atraso} onAtraso={setAtraso} onLimpar={() => setHistorico([])} />}
    </Layout>
  );
}
