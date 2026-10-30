import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  variante?: "up" | "left" | "zoom";
  atraso?: number;
  className?: string;
}

/** Anima o elemento ao entrar na área visível durante o scroll. */
export function Reveal({ children, variante = "up", atraso = 0, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${variante === "up" ? "" : variante} ${visivel ? "visivel" : ""} ${className}`}
      style={{ ["--delay" as string]: `${atraso}ms` }}
    >
      {children}
    </div>
  );
}
