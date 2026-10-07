import { describe, expect, it } from 'vitest';
import {
  type Nivel,
  TOPICOS,
  calcular,
  conferir,
  formatar,
  fracao,
  gerarExercicio,
  lerResposta,
} from './math.ts';

/** Deterministic generator, so a failing case can be reproduced. */
function sorteioFixo(semente: number) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('calcular', () => {
  it.each([
    ['2 + 3 * 4', '14'],
    ['(2 + 3) * 4', '20'],
    ['1/3 + 1/6', '1/2'],
    ['3/4 - 1/6', '7/12'],
    ['0,1 + 0,2', '3/10'],
    ['-3^2', '-9'],
    ['(-3)^2', '9'],
    ['2^-2', '1/4'],
    ['2^3^2', '512'],
    ['7 × 8', '56'],
    ['12 ÷ 5', '12/5'],
    ['15 * 240 / 100', '36'],
  ])('%s = %s', (expressao, esperado) => {
    expect(formatar(calcular(expressao))).toBe(esperado);
  });

  it.each(['2 +', '4 / 0', 'raiz(9)', '2 + y', '(1 + 2'])('recusa "%s"', (expressao) => {
    expect(() => calcular(expressao)).toThrow();
  });
});

describe('lerResposta e conferir', () => {
  it('aceita fração, decimal e inteiro equivalentes', () => {
    const meio = [fracao(1, 2)];
    expect(conferir(lerResposta('1/2'), meio)).toBe(true);
    expect(conferir(lerResposta('0,5'), meio)).toBe(true);
    expect(conferir(lerResposta('2/4'), meio)).toBe(true);
    expect(conferir(lerResposta('0.6'), meio)).toBe(false);
  });

  it('aceita as duas raízes em qualquer ordem e recusa só uma', () => {
    const raizes = [fracao(2), fracao(-3)];
    expect(conferir(lerResposta('x = -3 e x = 2'), raizes)).toBe(true);
    expect(conferir(lerResposta('2; -3'), raizes)).toBe(true);
    expect(conferir(lerResposta('2'), raizes)).toBe(false);
    expect(conferir(lerResposta('2, -3 e 5'), raizes)).toBe(false);
  });

  it('não confunde resposta vazia com acerto', () => {
    expect(conferir(lerResposta('não sei'), [fracao(0)])).toBe(false);
  });
});

describe('gerarExercicio', () => {
  const niveis: Nivel[] = [1, 2, 3, 4];

  it('a resposta guardada confere com a conta, em todo tópico e nível', () => {
    for (const topico of TOPICOS) {
      for (const nivel of niveis) {
        for (let semente = 1; semente <= 200; semente++) {
          const ex = gerarExercicio(topico, nivel, sorteioFixo(semente));
          const caso = `${topico} nível ${nivel}: ${ex.expressao}`;

          if (topico === 'equacao_1_grau' || topico === 'equacao_2_grau') {
            // Substitute each root back into the left side: it has to give zero.
            const [esquerda, direita] = ex.expressao.split('=');
            for (const raiz of ex.respostas) {
              const x = `(${formatar(raiz)})`;
              const lado = (t: string) => calcular(t.replace(/(\d)x/g, `$1*${x}`).replace(/x/g, x));
              expect(formatar(lado(esquerda!)), caso).toBe(formatar(lado(direita!)));
            }
          } else if (topico === 'porcentagem') {
            const [taxa, total] = ex.expressao.split('% de ');
            expect(formatar(ex.respostas[0]!), caso).toBe(
              formatar(calcular(`${taxa} * ${total} / 100`)),
            );
          } else {
            expect(formatar(ex.respostas[0]!), caso).toBe(formatar(calcular(ex.expressao)));
          }
        }
      }
    }
  });

  it('no primeiro nível não dá resultado negativo nem fração com denominadores diferentes', () => {
    for (let semente = 1; semente <= 200; semente++) {
      expect(
        gerarExercicio('subtracao', 1, sorteioFixo(semente)).respostas[0]!.n,
      ).toBeGreaterThanOrEqual(0);
      const [a, b] = gerarExercicio('fracoes', 1, sorteioFixo(semente)).expressao.split(' + ');
      expect(a!.split('/')[1]).toBe(b!.split('/')[1]);
    }
  });

  it('equação do segundo grau tem sempre duas raízes diferentes', () => {
    for (let semente = 1; semente <= 200; semente++) {
      const [r1, r2] = gerarExercicio('equacao_2_grau', 3, sorteioFixo(semente)).respostas;
      expect(formatar(r1!)).not.toBe(formatar(r2!));
    }
  });
});
