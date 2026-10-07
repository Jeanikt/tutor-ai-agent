"use client";

// Development-only preview of the lesson screen with canned data, so the layout can be
// worked on without a LiveKit room (and without spending inference). Not served in production.
import { notFound } from "next/navigation";
import { useState } from "react";
import { type Fala, SalaView } from "@/components/SalaView";

const FALAS: Fala[] = [
  { id: "1", quem: "manu", texto: "Oi, eu sou a Manu, professora de matemática. Como você se chama?" },
  { id: "2", quem: "aluno", texto: "Ana. Tô no sétimo ano." },
  { id: "3", quem: "manu", texto: "Prazer, Ana. O que você quer estudar hoje?" },
  { id: "4", quem: "aluno", texto: "Soma de fração, tenho prova quinta." },
  { id: "5", quem: "manu", texto: "Beleza. Olha na lousa: quanto dá três quartos mais um sexto?" },
  { id: "6", quem: "aluno", texto: "Acho que dá quatro décimos." },
];

export default function Demo() {
  const [microfone, setMicrofone] = useState(true);
  const [passo, setPasso] = useState(0);
  if (process.env.NODE_ENV === "production") notFound();

  const resultado = ([undefined, "errado", "certo"] as const)[passo % 3];
  return (
    <SalaView
      estado={passo % 3 === 0 ? "ouvindo" : "falando"}
      volumes={[0.3, 0.8, 0.5, 0.9, 0.4]}
      segundosRestantes={passo % 3 === 2 ? 48 : 754}
      lousa={{ latex: "\\frac{3}{4} + \\frac{1}{6}", resultado, gabarito: "\\frac{11}{12}" }}
      falas={FALAS}
      microfoneLigado={microfone}
      onMicrofone={() => setMicrofone((v) => !v)}
      onEncerrar={() => setPasso((p) => p + 1)}
    />
  );
}
