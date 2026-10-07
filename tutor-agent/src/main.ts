import { ServerOptions, cli, defineAgent, inference, voice } from '@livekit/agents';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createAgent } from './agent.ts';
import { type ManuUserData, type Memoria, TOPICO_MEMORIA, novoUserData } from './tools.ts';

// Load environment variables from a local file.
// Make sure to set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET
// when running locally or self-hosting your agent server.
dotenv.config({ path: '.env.local' });

// Every minute of a lesson spends inference, so a lesson has a hard ceiling. The web front
// end reads the same variable to show the countdown; the agent is the one that enforces it.
const LIMITE_MIN = Number(process.env.MANU_MAX_SESSION_MINUTES) || 15;
const AVISO_ANTES_MS = 60_000;

/** What the browser remembered from the last lesson, sent as a participant attribute. */
function lerMemoria(atributos: Record<string, string> | undefined): Memoria | undefined {
  try {
    const m = JSON.parse(atributos?.[TOPICO_MEMORIA] ?? 'null') as Partial<Memoria> | null;
    if (!m || typeof m.nome !== 'string' || !m.nome.trim()) return undefined;
    const curto = (v: unknown, max: number) => (typeof v === 'string' ? v : '').slice(0, max);
    return { nome: curto(m.nome, 40), etapa: curto(m.etapa, 80), resumo: curto(m.resumo, 300) };
  } catch {
    return undefined;
  }
}

export default defineAgent({
  entry: async (ctx) => {
    const session = new voice.AgentSession<ManuUserData>({
      userData: novoUserData(),

      // Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
      // See all available models at https://docs.livekit.io/agents/models/stt/
      stt: new inference.STT({
        model: 'assemblyai/universal-3-5-pro',
        language: 'pt',
      }),

      // Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
      // See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
      tts: new inference.TTS({
        // Luna: xAI's "gentle, patient" multilingual voice, spoken in pt-BR.
        // Alternatives tested: xAI 'ara' / 'carina' / 'eve'; Cartesia sonic-3.6 Alice
        // ('9904416a-0831-44ea-b8ee-5f145e8f9bbf'); Inworld 'Maitê' (sounded robotic).
        model: 'xai/tts-1',
        voice: 'luna',
        language: 'pt-BR',
      }),

      turnHandling: {
        // 'stt' lets AssemblyAI detect end of turn server-side, so no local audio model
        // competes for CPU (the audio model stuttered on a 4-core dev PC). Switch back to
        // new inference.TurnDetector() + interruption 'adaptive' when running on a stronger host.
        // See more at https://docs.livekit.io/agents/logic/turns/turn-detector/
        turnDetection: 'stt',
        interruption: { mode: 'vad' },
        // Allow the LLM to generate a response while waiting for the end of turn
        preemptiveGeneration: { enabled: true },
      },

      // Expressive mode injects the TTS provider's markup guide into the LLM prompt, so the model
      // emits inline delivery tags (emotion, pacing, non-verbal sounds) that the TTS renders and
      // the transcript never shows. Requires a TTS model that supports markup, such as the xAI
      // model above.
      expressive: true,
    });

    await session.start({
      agent: createAgent(),
      room: ctx.room,
      // Many students are children: no audio, transcript or trace of the lesson is uploaded
      // to LiveKit Cloud. The privacy notice in the web front end depends on this.
      record: false,
    });

    // Join the room and connect to the user
    await ctx.connect();

    // The browser sends what it remembers from the last lesson. Don't hold the greeting for it.
    const aluno = await Promise.race([
      ctx.waitForParticipant(),
      new Promise<undefined>((resolve) => setTimeout(resolve, 3000)),
    ]);
    const memoria = lerMemoria(aluno?.attributes);

    session.generateReply({
      instructions: memoria
        ? `Você já deu aula para esta pessoa. Nome: ${memoria.nome}. Etapa: ${memoria.etapa}. Última aula: ${memoria.resumo}. Cumprimente pelo nome de forma leve, sem se apresentar de novo e sem perguntar a etapa, e pergunte se quer continuar de onde parou ou ver outra coisa hoje.`
        : 'Cumprimente de forma leve e natural, se apresente como Manu, professora de matemática, e pergunte o nome da pessoa.',
    });

    const aviso = setTimeout(
      () => {
        session.generateReply({
          instructions:
            'Falta um minuto para a aula acabar. Avise com gentileza, faça um resumo de uma frase do que foi visto, use salvarProgresso e se despeça. Não proponha exercício novo.',
        });
      },
      LIMITE_MIN * 60_000 - AVISO_ANTES_MS,
    );
    const fim = setTimeout(() => {
      // Deleting the room disconnects the student and ends this job.
      ctx.deleteRoom().catch(() => ctx.shutdown('limite de tempo'));
    }, LIMITE_MIN * 60_000);
    ctx.addShutdownCallback(async () => {
      clearTimeout(aviso);
      clearTimeout(fim);
    });
  },
});

// Run the agent server
cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    // A named agent uses explicit dispatch: it only joins rooms that ask for "manu",
    // which the web front end does in its token route.
    agentName: 'manu',
  }),
);
