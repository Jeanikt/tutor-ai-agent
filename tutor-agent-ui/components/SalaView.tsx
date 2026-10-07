"use client";

import { useState } from "react";
import { type EstadoLousa, Lousa } from "./Lousa";

export type Fala = { id: string; quem: "manu" | "aluno"; texto: string };
export type EstadoManu = "chegando" | "ouvindo" | "pensando" | "falando";

const ROTULO: Record<EstadoManu, string> = {
  chegando: "A Manu está chegando",
  ouvindo: "A Manu está ouvindo",
  pensando: "A Manu está pensando",
  falando: "A Manu está falando",
};

function relogio(segundos: number) {
  const s = Math.max(0, segundos);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type Props = {
  estado: EstadoManu;
  /** Five values from 0 to 1, the volume of Manu's voice by frequency band. */
  volumes: number[];
  segundosRestantes: number;
  lousa: EstadoLousa;
  falas: Fala[];
  microfoneLigado: boolean;
  onMicrofone: () => void;
  onEncerrar: () => void;
};

export function SalaView({
  estado,
  volumes,
  segundosRestantes,
  lousa,
  falas,
  microfoneLigado,
  onMicrofone,
  onEncerrar,
}: Props) {
  const [conversaAberta, setConversaAberta] = useState(false);
  const acabando = segundosRestantes <= 60;
  // By default only the last thing each side said is on screen; the rest is one tap away.
  const visiveis = conversaAberta ? falas : falas.slice(-2);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-4 pb-32 sm:px-6 sm:pt-8">
      <header className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-3 font-semibold" role="status">
          <span className="onda flex h-6 items-center gap-[3px]" aria-hidden="true">
            {volumes.map((v, i) => (
              <span
                key={i}
                className={`w-1 rounded-full ${estado === "falando" ? "bg-tinta" : "bg-borda"}`}
                style={{ height: `${estado === "falando" ? 20 + v * 80 : 20}%` }}
              />
            ))}
          </span>
          {microfoneLigado ? ROTULO[estado] : "Seu microfone está desligado"}
        </p>
        <p
          className={`tabular-nums ${acabando ? "text-atencao font-semibold" : "text-texto-2"}`}
          aria-label={`Tempo restante: ${relogio(segundosRestantes)}`}
        >
          {relogio(segundosRestantes)}
        </p>
      </header>

      <Lousa {...lousa} vazia="A conta aparece aqui quando a Manu passar um exercício." />

      <section aria-label="Conversa" className="flex flex-col gap-3">
        {falas.length === 0 && (
          <p className="text-texto-2">Pode falar. O que você disser e o que a Manu responder aparece aqui.</p>
        )}
        <ol className="flex flex-col gap-3" aria-live="polite">
          {visiveis.map((fala) => (
            <li
              key={fala.id}
              className={
                fala.quem === "manu"
                  ? "rounded-folha bg-folha shadow-folha border-borda max-w-[88%] self-start border px-4 py-3 text-lg leading-snug"
                  : "rounded-folha bg-tinta/8 text-tinta-forte max-w-[88%] self-end px-4 py-3 leading-snug"
              }
            >
              <span className="sr-only">{fala.quem === "manu" ? "Manu: " : "Você: "}</span>
              {fala.texto}
            </li>
          ))}
        </ol>
        {falas.length > 2 && (
          <button
            type="button"
            onClick={() => setConversaAberta((v) => !v)}
            aria-expanded={conversaAberta}
            className="text-tinta min-h-11 self-start font-semibold underline underline-offset-4"
          >
            {conversaAberta ? "Mostrar só o final" : `Ver a conversa inteira (${falas.length} falas)`}
          </button>
        )}
      </section>

      <div className="border-borda bg-folha/95 fixed inset-x-0 bottom-0 border-t backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onMicrofone}
                        className={`rounded-controle flex min-h-14 flex-1 items-center justify-center gap-2 px-3 font-semibold whitespace-nowrap sm:gap-3 sm:text-lg ${
              microfoneLigado ? "bg-tinta text-white" : "bg-atencao/12 text-atencao border-atencao border"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              {!microfoneLigado && <path d="M4 4l16 16" />}
            </svg>
            {microfoneLigado ? "Silenciar" : "Ligar microfone"}
          </button>
          <button
            type="button"
            onClick={onEncerrar}
            className="rounded-controle text-errado border-errado/40 min-h-14 border px-4 font-semibold whitespace-nowrap"
          >
            Encerrar aula
          </button>
        </div>
      </div>
    </div>
  );
}
