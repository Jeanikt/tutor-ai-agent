import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  AccessToken,
  RoomAgentDispatch,
  RoomConfiguration,
  RoomServiceClient,
} from "livekit-server-sdk";
import { limparMemoria } from "@/lib/memoria";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Has to match agentName in tutor-agent/src/main.ts.
const AGENTE = "manu";
const PREFIXO_SALA = "manu-";

// A public link spends the owner's inference quota, so a lesson is limited three ways:
// how long it lasts (also enforced by the agent), how many run at once, and how many one
// address can start per hour.
const DURACAO_MIN = Number(process.env.MANU_MAX_SESSION_MINUTES) || 15;
const MAX_SIMULTANEAS = Number(process.env.MANU_MAX_CONCURRENT_SESSIONS) || 3;
const MAX_POR_HORA = Number(process.env.MANU_MAX_SESSIONS_PER_HOUR) || 4;

// Best effort: this lives in one server instance's memory, so on serverless hosting it
// resets on cold start and is not shared between instances. The limit on simultaneous
// lessons below is checked against LiveKit itself and is the one that really holds.
const iniciosPorIp = new Map<string, number[]>();

function passouDoLimitePorHora(ip: string): boolean {
  const agora = Date.now();
  const recentes = (iniciosPorIp.get(ip) ?? []).filter((t) => agora - t < 3_600_000);
  if (recentes.length >= MAX_POR_HORA) {
    iniciosPorIp.set(ip, recentes);
    return true;
  }
  iniciosPorIp.set(ip, [...recentes, agora]);
  if (iniciosPorIp.size > 5000) iniciosPorIp.clear();
  return false;
}

const recusar = (erro: string, status: number) => NextResponse.json({ erro }, { status });

export async function POST(request: Request) {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    return recusar("O servidor ainda não foi configurado com as chaves do LiveKit.", 500);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido";
  if (passouDoLimitePorHora(ip)) {
    return recusar("Você já fez várias aulas na última hora. Volte daqui a pouco.", 429);
  }

  try {
    const salas = await new RoomServiceClient(url.replace(/^ws/, "http"), apiKey, apiSecret).listRooms();
    if (salas.filter((s) => s.name.startsWith(PREFIXO_SALA)).length >= MAX_SIMULTANEAS) {
      return recusar("A Manu está em aula com outras pessoas agora. Tente de novo em alguns minutos.", 429);
    }
  } catch {
    return recusar("Não deu para falar com o servidor de voz. Tente de novo.", 503);
  }

  const corpo = await request.json().catch(() => null);
  const memoria = limparMemoria(corpo?.memoria);

  const sala = `${PREFIXO_SALA}${randomUUID()}`;
  const token = new AccessToken(apiKey, apiSecret, {
    identity: `aluno-${randomUUID().slice(0, 8)}`,
    // A little longer than the lesson, so a reconnection in the last minute still works.
    ttl: `${DURACAO_MIN + 2}m`,
    attributes: memoria ? { "manu.memoria": JSON.stringify(memoria) } : {},
  });
  token.addGrant({
    room: sala,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
  });
  token.roomConfig = new RoomConfiguration({
    agents: [new RoomAgentDispatch({ agentName: AGENTE })],
    maxParticipants: 2,
    emptyTimeout: 30,
    departureTimeout: 10,
  });

  return NextResponse.json(
    { url, token: await token.toJwt(), duracaoMin: DURACAO_MIN },
    { headers: { "Cache-Control": "no-store" } },
  );
}
