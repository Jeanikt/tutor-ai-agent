import katex from "katex";

export type EstadoLousa = {
  /** What is written on the board, in LaTeX. Empty board when undefined. */
  latex?: string;
  /** A short line in words above the math. */
  titulo?: string;
  /** Result of the last checked answer to what is on the board. */
  resultado?: "certo" | "errado";
  /** The checked answer, shown once the student gets it right. */
  gabarito?: string;
};

function Formula({ latex, className }: { latex: string; className?: string }) {
  // KaTeX escapes its input and `trust` stays off, so the generated HTML is safe to inject.
  const html = katex.renderToString(latex, { displayMode: true, throwOnError: false, strict: false });
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Lousa({ latex, titulo, resultado, gabarito, vazia }: EstadoLousa & { vazia?: string }) {
  return (
    <figure
      className="lousa rounded-lousa bg-moldura shadow-lousa p-2"
      aria-label="Lousa da aula"
    >
      <div
        className="rounded-[6px] bg-lousa text-giz relative flex min-h-56 flex-col items-center justify-center gap-4 px-4 py-8 sm:min-h-72"
        style={{
          // Faint eraser smudges, so the board doesn't read as a flat green rectangle.
          backgroundImage:
            "radial-gradient(60% 40% at 25% 30%, rgb(243 240 230 / 0.07), transparent 70%), radial-gradient(50% 35% at 75% 70%, rgb(243 240 230 / 0.05), transparent 70%)",
        }}
        aria-live="polite"
      >
        {latex ? (
          // The key restarts the chalk animation whenever the content changes.
          <div key={latex} className="giz-entra flex w-full flex-col items-center gap-4">
            {titulo && <p className="font-giz text-giz/85 text-center text-xl">{titulo}</p>}
            <Formula latex={latex} className="w-full text-[1.75rem] sm:text-[2.25rem]" />
          </div>
        ) : (
          <p className="font-giz text-giz/70 max-w-xs text-center text-xl">{vazia}</p>
        )}

        {resultado === "certo" && (
          <div className="giz-entra text-giz-amarelo flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <path d="M5 15.5 11 21 23 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-giz text-2xl">Certo</span>
            {gabarito && <Formula latex={`= ${gabarito}`} className="text-xl [&_.katex-display]:!m-0" />}
          </div>
        )}
        {resultado === "errado" && (
          <p className="giz-entra font-giz text-giz-rosa text-2xl">Ainda não. Tenta de novo.</p>
        )}
      </div>
      {/* Chalk tray */}
      <div className="bg-moldura relative h-3" aria-hidden="true">
        <span className="bg-giz absolute -top-1 left-6 h-2 w-8 rounded-sm" />
        <span className="bg-giz-amarelo absolute -top-1 left-16 h-2 w-5 rounded-sm" />
      </div>
    </figure>
  );
}
