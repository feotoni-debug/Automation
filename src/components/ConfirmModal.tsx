import { useEffect, type ReactNode } from "react";

interface Props {
  titulo: string;
  children: ReactNode;
  confirmarRotulo: string;
  cancelarRotulo?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmModal({ titulo, children, confirmarRotulo, cancelarRotulo = "Cancelar", onConfirmar, onCancelar }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onCancelar();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancelar]);

  return (
    <div className="modal-fundo" onClick={onCancelar}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        <div className="modal-corpo">{children}</div>
        <div className="modal-acoes">
          <button className="btn secundario" onClick={onCancelar}>
            {cancelarRotulo}
          </button>
          <button className="btn" onClick={onConfirmar} autoFocus>
            {confirmarRotulo}
          </button>
        </div>
      </div>
    </div>
  );
}
