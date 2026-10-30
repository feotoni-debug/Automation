import type { SVGProps } from "react";

export function IconeNovaConferencia(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="icone-animado icone-conferencia"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect className="folha-fundo" x="8" y="2" width="13" height="17" rx="2" strokeWidth="1.7" opacity="0.6" />
      <path className="folha-frente" d="M3 6a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
      <path className="linha-doc linha-1" d="M7 13h6" />
      <path className="linha-doc linha-2" d="M7 17h4" />
      <circle className="selo-ponto" cx="15.5" cy="16.5" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconeHistorico(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="icone-animado icone-historico"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle className="relogio-circulo" cx="12" cy="12" r="9" />
      <path className="ponteiro-hora" d="M12 7v5" />
      <path className="ponteiro-minuto" d="M12 12l3.5 2" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconeConfiguracoes(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="icone-animado icone-config"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <g className="engrenagem-giratoria">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </g>
    </svg>
  );
}

export function IconeInicio(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="icone-animado icone-inicio"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path className="teto-casa" d="M3 10.5L12 3l9 7.5" />
      <path className="corpo-casa" d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path className="porta-casa" d="M10 21v-6h4v6" />
    </svg>
  );
}

export function IconePasta(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="icone-animado icone-pasta"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path className="pasta-aba" d="M4 4h4l2 2h10a2 2 0 0 1 2 2v1" />
      <path className="pasta-corpo" d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h10a2 2 0 0 1 2 2v10z" />
      <path className="pasta-linha" d="M7 14h10" />
    </svg>
  );
}

export function IconeArquivo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="icone-animado icone-arquivo"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

export function IconeMais(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="icone-animado icone-mais"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

export function IconeLixeira(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="icone-animado icone-lixeira"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <polyline className="lixeira-tampa" points="3 6 5 6 21 6" />
      <path className="lixeira-corpo" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function IconeScanner(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="icone-animado icone-scanner"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Folha entrando na digitalizadora */}
      <path className="scanner-folha" d="M7 3h10v7H7z" />
      {/* Corpo da digitalizadora */}
      <rect className="scanner-corpo" x="3" y="10" width="18" height="9" rx="2" />
      {/* Feixe de leitura óptico */}
      <line className="scanner-feixe" x1="6" y1="14.5" x2="18" y2="14.5" />
      {/* Bandeja de saída */}
      <path d="M8 19v2h8v-2" />
      {/* LED de status */}
      <circle cx="17.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
