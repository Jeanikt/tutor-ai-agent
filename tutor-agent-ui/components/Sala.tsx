"use client";

import {
  RoomAudioRenderer,
  useLocalParticipant,
  useMultibandTrackVolume,
  useRoomContext,
  useTextStream,
  useTranscriptions,
  useVoiceAssistant,
} from "@livekit/components-react";
import { useEffect, useMemo, useState } from "react";
import { limparMemoria, salvarMemoria } from "@/lib/memoria";
import type { EstadoLousa } from "./Lousa";
import { type EstadoManu, type Fala, SalaView } from "./SalaView";

// Text-stream topics published by the agent (tutor-agent/src/tools.ts).
const TOPICO_LOUSA = "manu.lousa";
const TOPICO_MEMORIA = "manu.memoria";

type MensagemLousa =
  | { tipo: "exercicio" | "quadro"; latex: string; titulo?: string }
  | { tipo: "resultado"; correta: boolean; latex?: string };

function lerJson<T>(texto: string): T | null {
  try {
    return JSON.parse(texto) as T;
  } catch {
    return null;
  }
}

/** The board shows the last thing written on it, plus the result of the last checked answer. */
function montarLousa(mensagens: string[]): EstadoLousa {
  let lousa: EstadoLousa = {};
  for (const texto of mensagens) {
    const m = lerJson<MensagemLousa>(texto);
    if (!m) continue;
    if (m.tipo === "resultado") {
      lousa = { ...lousa, resultado: m.correta ? "certo" : "errado", gabarito: m.latex };
    } else if (typeof m.latex === "string") {
      lousa = { latex: m.latex, titulo: m.titulo };
    }
  }
  return lousa;
}

export function Sala({ fimEm }: { fimEm: number }) {
  const room = useRoomContext();
  const { state, audioTrack } = useVoiceAssistant();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const transcricoes = useTranscriptions();
  const { textStreams: lousaStreams } = useTextStream(TOPICO_LOUSA);
  const { textStreams: memoriaStreams } = useTextStream(TOPICO_MEMORIA);
  const volumes = useMultibandTrackVolume(audioTrack, { bands: 5 });

  const [segundosRestantes, setSegundosRestantes] = useState(() => Math.round((fimEm - Date.now()) / 1000));
  useEffect(() => {
    const relogio = setInterval(() => {
      const restam = Math.round((fimEm - Date.now()) / 1000);
      setSegundosRestantes(restam);
      // The agent closes the room at the limit; this is the fallback if that message is lost.
      if (restam <= -5) room.disconnect();
    }, 1000);
    return () => clearInterval(relogio);
  }, [fimEm, room]);

  // Manu asks the browser to remember name, school stage and where the lesson stopped.
  const ultimaMemoria = memoriaStreams.at(-1)?.text;
  useEffect(() => {
    const memoria = ultimaMemoria ? limparMemoria(lerJson(ultimaMemoria)) : null;
    if (memoria) salvarMemoria(memoria);
  }, [ultimaMemoria]);

  const lousa = useMemo(() => montarLousa(lousaStreams.map((s) => s.text)), [lousaStreams]);

  const falas = useMemo<Fala[]>(
    () =>
      transcricoes
        .filter((t) => t.text.trim())
        .map((t) => ({
          id: t.streamInfo.id,
          quem: t.participantInfo.identity === localParticipant.identity ? "aluno" : "manu",
          texto: t.text,
        })),
    [transcricoes, localParticipant.identity],
  );

  const estado: EstadoManu =
    state === "speaking" ? "falando" : state === "thinking" ? "pensando" : state === "listening" ? "ouvindo" : "chegando";

  return (
    <>
      <RoomAudioRenderer />
      <SalaView
        estado={estado}
        volumes={volumes}
        segundosRestantes={segundosRestantes}
        lousa={lousa}
        falas={falas}
        microfoneLigado={isMicrophoneEnabled}
        onMicrofone={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        onEncerrar={() => room.disconnect()}
      />
    </>
  );
}
