import { FRASE_AVISO } from "../types";
import { Reveal } from "../components/Reveal";
import { protocolosDeExemplo } from "../services/arcaService";

interface Props {
  onIniciar: () => void;
}

const passos = [
  { n: "1", t: "Anexar Documento", d: "Anexe o documento ou PDF (ou informe o protocolo) para iniciar a análise." },
  { n: "2", t: "Compare os documentos", d: "Veja o título digitalizado na ARCA e o físico digitalizado lado a lado." },
  { n: "3", t: "Confira assinaturas e carimbos", d: "Itens identificados com status, nível de confiança e destaque nos dois documentos." },
  { n: "4", t: "Finalize e registre", d: "Marque cada item como confirmado, divergente ou pendente e salve o resultado." },
];

export function LandingPage({ onIniciar }: Props) {
  return (
    <div className="landing">
      <header className="cabecalho cabecalho-transparente">
        <img className="logo-2ri" src="/logo-2ri-white.png" alt="2º Oficial de Registro de Imóveis, Títulos e Documentos e Civil de Pessoa Jurídica de São José dos Campos" />
        <h1>Conferência de Títulos</h1>
        <span className="ambiente">Ambiente de demonstração</span>
      </header>

      <section className="hero">
        <picture className="hero-fundo-moldura" aria-hidden="true">
          <source type="image/webp" srcSet="/fotos/frente-cartorio-fundo-1090.webp" />
          <img
            className="hero-fundo-img"
            src="/fotos/frente-cartorio-fundo-1090.jpg"
            alt="Fachada do 2º Registro de Imóveis de São José dos Campos"
          />
        </picture>
        <div className="hero-gradiente-overlay" aria-hidden="true" />
        <div className="hero-conteudo">
          <img className="logo-2ri hero-logo" src="/logo-2ri-white.png" alt="2º Registro de Imóveis" />
          <h2>Conferência de assinaturas e carimbos, em um só lugar.</h2>
          <p>
            Apoio à conferência entre o título digitalizado no sistema ARCA e a versão física posteriormente digitalizada. Basta anexar o documento ou informar o protocolo.
          </p>
          <div className="hero-acoes">
            <button className="btn grande claro" onClick={onIniciar}>
              Iniciar conferência
            </button>
          </div>
          <small>Protocolos de demonstração: {protocolosDeExemplo.join(" · ")}</small>
        </div>
      </section>

      <section className="landing-secao">
        <Reveal><h3>Como funciona</h3></Reveal>
        <div className="passos">
          {passos.map((p, i) => (
            <Reveal key={p.n} atraso={i * 120}>
              <div className="passo">
                <span className="passo-n">{p.n}</span>
                <strong>{p.t}</strong>
                <p>{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-secao claro-bg">
        <div className="recursos">
          <Reveal variante="left"><div>
            <h3>Sem login, sem dados reais</h3>
            <p>Demonstração com documentos fictícios e anonimizados, sem integração com a API da ARCA.</p>
          </div></Reveal>
          <Reveal atraso={120}><div>
            <h3>Pronta para integração</h3>
            <p>A busca local é uma camada de serviço, preparada para ser trocada pela API oficial.</p>
          </div></Reveal>
          <Reveal atraso={240}><div>
            <h3>Decisão humana</h3>
            <p>{FRASE_AVISO}</p>
          </div></Reveal>
        </div>
      </section>

      <footer className="landing-rodape">
        <Reveal variante="zoom">
          <div className="rodape-box">
            <img className="logo-2ri" src="/logo-2ri.png" alt="2º Oficial de Registro de Imóveis, Títulos e Documentos e Civil de Pessoa Jurídica de São José dos Campos" />
            <button className="btn grande" onClick={onIniciar}>
              Iniciar conferência
            </button>
          </div>
        </Reveal>
      </footer>
    </div>
  );
}
