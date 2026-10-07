import { type RunContext, dedent, getJobContext, tool } from '@livekit/agents';
import { z } from 'zod';
import {
  type Exercicio,
  type Nivel,
  TOPICOS,
  calcular,
  conferir,
  formatar,
  formatarLatex,
  gerarExercicio,
  lerResposta,
} from './math.ts';

/** Per-session state shared by the tools. */
export type ManuUserData = {
  /** The exercise currently on the whiteboard, waiting for an answer. */
  exercicio?: Exercicio | undefined;
  /** Wrong answers given to the current exercise. */
  erros: number;
};

export const novoUserData = (): ManuUserData => ({ erros: 0 });

// Text-stream topics the web front end listens to.
export const TOPICO_LOUSA = 'manu.lousa';
export const TOPICO_MEMORIA = 'manu.memoria';

export type MensagemLousa =
  | { tipo: 'exercicio' | 'quadro'; latex: string; titulo?: string | undefined }
  | { tipo: 'resultado'; correta: boolean; latex?: string | undefined };

/** What the browser keeps between lessons. Never stored on a server. */
export type Memoria = { nome: string; etapa: string; resumo: string };

/** Sends a JSON message to the student's browser. A no-op outside a room (tests, console). */
async function enviar(topico: string, mensagem: MensagemLousa | Memoria) {
  try {
    const sala = getJobContext(false)?.room;
    await sala?.localParticipant?.sendText(JSON.stringify(mensagem), { topic: topico });
  } catch {
    // The whiteboard is a visual aid: the lesson goes on by voice if it can't be reached.
  }
}

type Ctx = { ctx: RunContext<ManuUserData> };

export const tools = [
  tool({
    name: 'gerarExercicio',
    description: dedent`
      Cria um exercício de conta ou equação com a resposta já calculada em código e mostra na lousa do aluno.
      Use sempre que for propor um exercício de um dos tópicos disponíveis. Depois leia o enunciado em voz alta,
      por extenso, e espere a resposta. Nunca diga a resposta que vem no resultado, a não ser ao resolver junto
      depois de dois erros.
    `,
    parameters: z.object({
      topico: z.enum(TOPICOS).describe('Assunto do exercício.'),
      nivel: z
        .number()
        .int()
        .min(1)
        .max(4)
        .describe(
          '1: primeiro ao quinto ano. 2: sexto ao nono ano. 3: ensino médio. 4: faculdade.',
        ),
    }),
    execute: async ({ topico, nivel }, { ctx }: Ctx) => {
      const exercicio = gerarExercicio(topico, nivel as Nivel);
      ctx.userData.exercicio = exercicio;
      ctx.userData.erros = 0;
      await enviar(TOPICO_LOUSA, { tipo: 'exercicio', latex: exercicio.latex });
      return {
        enunciado: exercicio.expressao,
        resposta: exercicio.respostas.map(formatar).join(' e '),
      };
    },
  }),

  tool({
    name: 'verificarResposta',
    description: dedent`
      Confere em código a resposta do aluno para o exercício que está na lousa. Chame sempre antes de dizer se
      está certo ou errado: nunca decida isso de cabeça. Passe a resposta em algarismos, não por extenso.
    `,
    parameters: z.object({
      resposta: z
        .string()
        .describe(
          'Resposta do aluno em algarismos. Exemplos: "12", "7/12", "3,5", "-2", "2 e -3".',
        ),
    }),
    execute: async ({ resposta }, { ctx }: Ctx) => {
      const { exercicio } = ctx.userData;
      if (!exercicio) {
        return { erro: 'Não há exercício na lousa. Use calcular para conferir a conta.' };
      }
      const correta = conferir(lerResposta(resposta), exercicio.respostas);
      if (!correta) ctx.userData.erros++;
      const gabarito = exercicio.respostas.map(formatarLatex).join('\\ \\text{e}\\ ');
      await enviar(TOPICO_LOUSA, {
        tipo: 'resultado',
        correta,
        latex: correta ? gabarito : undefined,
      });
      const erros = ctx.userData.erros;
      if (correta) ctx.userData.exercicio = undefined;
      return {
        correta,
        erros,
        respostaCorreta: exercicio.respostas.map(formatar).join(' e '),
        proximoPasso: correta
          ? 'Reconheça o acerto de forma curta e específica.'
          : erros >= 2
            ? 'Resolva junto, passo a passo, e depois proponha um exercício mais fácil.'
            : 'Não diga a resposta. Mostre onde o raciocínio desviou, dê uma dica e deixe tentar de novo.',
      };
    },
  }),

  tool({
    name: 'calcular',
    description: dedent`
      Calcula uma expressão numérica de forma exata, em código. Use para conferir qualquer conta que você for
      afirmar e que não tenha vindo de gerarExercicio: probleminhas com história, passos de uma resolução, a
      resposta de um exercício da lição do aluno. Aceita + - * / ^ e parênteses, com inteiros, decimais e frações.
    `,
    parameters: z.object({
      expressao: z
        .string()
        .describe('Expressão só com números. Exemplos: "3/4 + 1/6", "15 * 240 / 100".'),
    }),
    execute: async ({ expressao }) => {
      try {
        const r = calcular(expressao);
        return { resultado: formatar(r), decimal: r.n / r.d };
      } catch (e) {
        return {
          erro: `Não consegui calcular: ${(e as Error).message}. Refaça a conta com cuidado.`,
        };
      }
    },
  }),

  tool({
    name: 'mostrarNaLousa',
    description: dedent`
      Escreve na lousa do aluno uma conta, equação ou passo de resolução que você está explicando por voz.
      Use quando a conta for difícil de acompanhar só de ouvido. A lousa mostra uma coisa por vez.
    `,
    parameters: z.object({
      latex: z.string().describe('Conteúdo em LaTeX, sem cifrões. Exemplo: "2x + 6 = 14".'),
      titulo: z
        .string()
        .optional()
        .describe('Frase curta em português, sem fórmula. Exemplo: "Isolando o xis".'),
    }),
    execute: async ({ latex, titulo }, { ctx }: Ctx) => {
      // A hand-written board replaces the generated exercise, so there is nothing left to auto-check.
      ctx.userData.exercicio = undefined;
      await enviar(TOPICO_LOUSA, { tipo: 'quadro', latex, titulo });
      return 'Está na lousa.';
    },
  }),

  tool({
    name: 'salvarProgresso',
    description: dedent`
      Guarda no aparelho do aluno o nome, a etapa e onde a aula parou, para a próxima aula continuar dali.
      Chame quando souber o nome e a etapa, e de novo quando a aula terminar ou mudar de assunto.
    `,
    parameters: z.object({
      nome: z.string().describe('Só o primeiro nome.'),
      etapa: z
        .string()
        .describe('Exemplos: "3º ano do fundamental", "2º ano do médio", "engenharia".'),
      resumo: z
        .string()
        .describe('Uma frase sobre o que foi estudado e onde parou. Sem dados pessoais.'),
    }),
    execute: async (memoria) => {
      await enviar(TOPICO_MEMORIA, memoria);
      return 'Guardado.';
    },
  }),
];
