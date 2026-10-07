"use client";

import { RoomContext } from "@livekit/components-react";
import { Room, RoomEvent } from "livekit-client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  consentiu,
  esquecerTudo,
  lerMemoria,
  registrarConsentimento,
} from "@/lib/memoria";
import { useMemoria } from "@/lib/useMemoria";
import { Lousa } from "./Lousa";
import { Sala } from "./Sala";

type Fase = "inicio" | "conectando" | "aula" | "fim";

const botaoPrincipal =
  "rounded-controle bg-tinta hover:bg-tinta-forte inline-flex min-h-14 items-center justify-center gap-3 px-6 text-lg font-semibold text-white disabled:opacity-50";

function IconeMicrofone() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export function Aula() {
  const [fase, setFase] = useState<Fase>("inicio");
  const [erro, setErro] = useState<string | null>(null);
  const memoria = useMemoria();
  const [room, setRoom] = useState<Room | null>(null);
  const [fimEm, setFimEm] = useState(0);
  const [aceito, setAceito] = useState(false);
  const avisoRef = useRef<HTMLDialogElement>(null);

  useEffect(() => () => void room?.disconnect(), [room]);

  async function conectar() {
    setErro(null);
    setFase("conectando");
    try {
      // Ask for the microphone before asking the server for a lesson, so a refused
      // permission doesn't use up one of the lessons allowed per hour.
      const teste = await navigator.mediaDevices.getUserMedia({ audio: true });
      teste.getTracks().forEach((t) => t.stop());
    } catch {
      setErro("O navegador não liberou o microfone. Permita o microfone para este site e tente de novo.");
      setFase("inicio");
      return;
    }

    try {
      const resposta = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoria: lerMemoria() }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro);

      const nova = new Room();
      nova.on(RoomEvent.Disconnected, () => {
        setRoom(null);
        setFase("fim");
      });
      await nova.connect(dados.url, dados.token);
      await nova.localParticipant.setMicrophoneEnabled(true);
      setFimEm(Date.now() + dados.duracaoMin * 60_000);
      setRoom(nova);
      setFase("aula");
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : "Não deu para começar a aula. Tente de novo.");
      setFase("inicio");
    }
  }

  function pedirParaComecar() {
    if (consentiu()) void conectar();
    else avisoRef.current?.showModal();
  }

  if (fase === "aula" && room) {
    return (
      <RoomContext.Provider value={room}>
        <Sala fimEm={fimEm} />
      </RoomContext.Provider>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-4">
        <p className="text-tinta text-2xl font-extrabold tracking-tight">Manu</p>
        <a
          href="https://github.com/Jeanikt/tutor-ai-agent"
          className="text-texto-2 flex min-h-11 items-center underline underline-offset-4"
        >
          Código no GitHub
        </a>
      </header>

      <main className="grid flex-1 items-center gap-8 py-6 lg:grid-cols-[5fr_6fr] lg:gap-16 lg:py-12">
        <div className="flex flex-col items-start gap-6">
          {fase === "fim" ? (
            <>
              <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl">Aula encerrada.</h1>
              <p className="text-texto-2 max-w-md text-lg leading-relaxed">
                {memoria
                  ? `A Manu anotou neste aparelho onde vocês pararam, ${memoria.nome}: ${memoria.resumo || "o começo da conversa"}`
                  : "Nada desta aula foi guardado."}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Aula particular de matemática, por voz.
              </h1>
              <p className="text-texto-2 max-w-md text-lg leading-relaxed">
                Você fala, a Manu explica, passa exercício e corrige. Do primeiro ano da escola à faculdade.
              </p>
            </>
          )}

          {memoria && fase !== "fim" && (
            <p className="rounded-controle border-borda bg-folha w-full max-w-md border px-4 py-3 leading-snug">
              <span className="font-semibold">Oi de novo, {memoria.nome}.</span>{" "}
              {memoria.resumo ? `Da última vez: ${memoria.resumo}` : "A Manu lembra de você."}
            </p>
          )}

          {erro && (
            <p role="alert" className="rounded-controle border-errado/40 bg-errado/8 text-errado w-full max-w-md border px-4 py-3 font-medium">
              {erro}
            </p>
          )}

          <div className="flex w-full flex-col items-start gap-3">
            <button type="button" onClick={pedirParaComecar} disabled={fase === "conectando"} className={`${botaoPrincipal} w-full sm:w-auto`}>
              <IconeMicrofone />
              {fase === "conectando" ? "Chamando a Manu…" : fase === "fim" ? "Começar outra aula" : memoria ? "Continuar com a Manu" : "Falar com a Manu"}
            </button>
            <p className="text-texto-2">Aula de até 15 minutos. Precisa de microfone.</p>
          </div>
        </div>

        <Lousa titulo="Quanto dá?" latex="\frac{3}{4} + \frac{1}{6}" />
      </main>

      <footer className="text-texto-2 flex flex-wrap items-center gap-x-6 gap-y-1 py-6">
        <Link href="/privacidade" className="flex min-h-11 items-center underline underline-offset-4">
          Privacidade
        </Link>
        {memoria && (
          <button
            type="button"
            onClick={esquecerTudo}
            className="flex min-h-11 items-center underline underline-offset-4"
          >
            Apagar o que a Manu lembra de mim
          </button>
        )}
      </footer>

      <dialog
        ref={avisoRef}
        aria-labelledby="aviso-titulo"
        className="rounded-folha bg-folha text-texto shadow-folha m-auto w-[min(92vw,30rem)] p-6"
        onClose={() => setAceito(false)}
      >
        <h2 id="aviso-titulo" className="text-2xl font-extrabold tracking-tight">
          Antes de começar
        </h2>
        <ul className="text-texto-2 mt-4 flex list-disc flex-col gap-3 pl-5 leading-relaxed">
          <li>A aula usa o seu microfone. A sua voz vira texto para a Manu entender e responder.</li>
          <li>Este site não grava o áudio nem guarda a conversa.</li>
          <li>O nome, a série e onde a aula parou ficam só neste aparelho, e dá para apagar quando quiser.</li>
        </ul>
        <Link href="/privacidade" className="text-tinta mt-3 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
          Ler o aviso de privacidade completo
        </Link>
        <label className="mt-2 flex min-h-11 cursor-pointer items-start gap-3 leading-snug">
          <input
            type="checkbox"
            checked={aceito}
            onChange={(e) => setAceito(e.target.checked)}
            className="accent-tinta mt-0.5 size-5 shrink-0"
          />
          Tenho 18 anos ou mais, ou estou com um responsável que leu este aviso e autorizou a aula.
        </label>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => avisoRef.current?.close()} className="rounded-controle border-borda min-h-12 border px-5 font-semibold">
            Agora não
          </button>
          <button
            type="button"
            disabled={!aceito}
            onClick={() => {
              registrarConsentimento();
              avisoRef.current?.close();
              void conectar();
            }}
            className={`${botaoPrincipal} min-h-12`}
          >
            Começar a aula
          </button>
        </div>
      </dialog>
    </div>
  );
}
