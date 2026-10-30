import { useState, type ReactNode } from "react";
import {
  IconeConfiguracoes,
  IconeHistorico,
  IconeInicio,
  IconeNovaConferencia,
  IconeScanner,
} from "./IconesAnimados";

export type Rota = "nova" | "scanner" | "historico" | "config";

interface ItemMenu {
  rota: Rota;
  rotulo: string;
  renderIcone: () => ReactNode;
}

const itens: ItemMenu[] = [
  {
    rota: "nova",
    rotulo: "Nova conferência",
    renderIcone: () => <IconeNovaConferencia />,
  },
  {
    rota: "scanner",
    rotulo: "Digitalizadora",
    renderIcone: () => <IconeScanner />,
  },
  {
    rota: "historico",
    rotulo: "Histórico",
    renderIcone: () => <IconeHistorico />,
  },
  {
    rota: "config",
    rotulo: "Configurações",
    renderIcone: () => <IconeConfiguracoes />,
  },
];

interface Props {
  rota: Rota;
  onNavegar: (r: Rota) => void;
  onInicio?: () => void;
  badgeScanner?: number;
  children: ReactNode;
}

export function Layout({ rota, onNavegar, onInicio, badgeScanner = 0, children }: Props) {
  const [menuAberto, setMenuAberto] = useState(false);
  return (
    <div className="app">
      <header className="cabecalho">
        <button
          className="menu-toggle"
          aria-label="Abrir menu"
          onClick={() => setMenuAberto((v) => !v)}
        >
          ☰
        </button>
        <img className="logo-2ri" src="/logo-2ri-white.png" alt="2º Oficial de Registro de Imóveis" />
        <h1>Conferência de Títulos</h1>
        <span className="ambiente">Ambiente de demonstração</span>
      </header>
      <div className="corpo">
        <nav className={`lateral ${menuAberto ? "aberto" : ""}`} aria-label="Menu principal">
          {itens.map((i) => (
            <button
              key={i.rota}
              className={`nav-item ${rota === i.rota ? "ativo" : ""}`}
              aria-current={rota === i.rota ? "page" : undefined}
              onClick={() => {
                onNavegar(i.rota);
                setMenuAberto(false);
              }}
            >
              <span className="nav-icone" aria-hidden="true">
                {i.renderIcone()}
              </span>
              <span className="nav-texto">{i.rotulo}</span>
              {i.rota === "scanner" && badgeScanner > 0 && (
                <span className="nav-badge" title={`${badgeScanner} documento(s) na fila da digitalizadora`}>
                  {badgeScanner}
                </span>
              )}
            </button>
          ))}
          {onInicio && (
            <button className="nav-item nav-item-inicio" onClick={onInicio}>
              <span className="nav-icone" aria-hidden="true">
                <IconeInicio />
              </span>
              <span className="nav-texto">Página inicial</span>
            </button>
          )}
        </nav>
        <main className="conteudo">{children}</main>
      </div>
    </div>
  );
}
