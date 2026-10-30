import type { Titulo } from "../types";

export function formatarData(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function TituloInfo({ titulo }: { titulo: Titulo }) {
  const campos: [string, string][] = [
    ["Protocolo", titulo.protocolo],
    ["Tipo de título", titulo.tipoTitulo],
    ["Data de apresentação", formatarData(titulo.dataApresentacao)],
    ["Apresentante", titulo.apresentante],
    ["Quantidade de páginas", String(titulo.paginas)],
  ];
  return (
    <dl className="titulo-info">
      {campos.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
