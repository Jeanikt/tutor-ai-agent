// Exact math for Manu: exercises are generated and answers are checked here, in code,
// so the LLM never has to do (or get wrong) the arithmetic itself.
// Everything is kept as fractions of integers, so 1/3 + 1/6 is exactly 1/2.

export type Fracao = { n: number; d: number };

export const TOPICOS = [
  'adicao',
  'subtracao',
  'multiplicacao',
  'divisao',
  'fracoes',
  'porcentagem',
  'potenciacao',
  'equacao_1_grau',
  'equacao_2_grau',
] as const;
export type Topico = (typeof TOPICOS)[number];

/** 1 = 1º ao 5º ano, 2 = 6º ao 9º ano, 3 = ensino médio, 4 = faculdade. */
export type Nivel = 1 | 2 | 3 | 4;

export type Exercicio = {
  topico: Topico;
  nivel: Nivel;
  /** Plain-text expression or equation, for the LLM to read out loud in words. */
  expressao: string;
  /** Same content in LaTeX, for the whiteboard. */
  latex: string;
  /** Every value the student has to say. Equations of 2nd degree have two. */
  respostas: Fracao[];
};

function mdc(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function fracao(n: number, d = 1): Fracao {
  if (d === 0) throw new Error('divisão por zero');
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) throw new Error('número grande demais');
  const g = mdc(n, d) * (d < 0 ? -1 : 1);
  return { n: n / g, d: d / g };
}

const somar = (a: Fracao, b: Fracao) => fracao(a.n * b.d + b.n * a.d, a.d * b.d);
const subtrair = (a: Fracao, b: Fracao) => fracao(a.n * b.d - b.n * a.d, a.d * b.d);
const multiplicar = (a: Fracao, b: Fracao) => fracao(a.n * b.n, a.d * b.d);
const dividir = (a: Fracao, b: Fracao) => fracao(a.n * b.d, a.d * b.n);

function potencia(base: Fracao, expoente: Fracao): Fracao {
  if (expoente.d !== 1) throw new Error('só sei calcular expoente inteiro');
  if (Math.abs(expoente.n) > 64) throw new Error('expoente grande demais');
  let r = fracao(1);
  for (let i = 0; i < Math.abs(expoente.n); i++) r = multiplicar(r, base);
  return expoente.n < 0 ? dividir(fracao(1), r) : r;
}

export const iguais = (a: Fracao, b: Fracao) => a.n === b.n && a.d === b.d;

/** "7/12", "3", "-5/2" */
export function formatar(f: Fracao): string {
  return f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`;
}

/** "\frac{7}{12}", "3", "-\frac{5}{2}" */
export function formatarLatex(f: Fracao): string {
  if (f.d === 1) return `${f.n}`;
  return `${f.n < 0 ? '-' : ''}\\frac{${Math.abs(f.n)}}{${f.d}}`;
}

/** Turns "3,5", "0.25" or "12" into an exact fraction. */
function decimalParaFracao(texto: string): Fracao {
  const [inteiro, decimais = ''] = texto.replace(',', '.').split('.');
  if (decimais.length > 9) throw new Error('casas decimais demais');
  return fracao(Number(`${inteiro}${decimais}`), 10 ** decimais.length);
}

type Token = { tipo: 'num'; valor: Fracao } | { tipo: 'op'; valor: string };

function tokenizar(expressao: string): Token[] {
  const tokens: Token[] = [];
  const texto = expressao
    .replace(/\s+/g, '')
    .replace(/[×x·]/gi, '*')
    .replace(/[÷:]/g, '/')
    .replace(/−/g, '-')
    .replace(/\*\*/g, '^');
  const padrao = /(\d+(?:[.,]\d+)?)|([-+*/^()])/y;
  while (padrao.lastIndex < texto.length) {
    const inicio = padrao.lastIndex;
    const m = padrao.exec(texto);
    if (!m) throw new Error(`não entendi "${texto.slice(inicio, inicio + 8)}"`);
    if (m[1]) tokens.push({ tipo: 'num', valor: decimalParaFracao(m[1]) });
    else tokens.push({ tipo: 'op', valor: m[2]! });
  }
  return tokens;
}

/**
 * Evaluates an arithmetic expression exactly: + - * / ^ and parentheses, with integers,
 * decimals and fractions. Throws on anything else (roots, variables, functions).
 */
export function calcular(expressao: string): Fracao {
  const tokens = tokenizar(expressao);
  let i = 0;
  const op = (valor: string) => tokens[i]?.tipo === 'op' && tokens[i]!.valor === valor;

  const soma = (): Fracao => {
    let r = produto();
    while (op('+') || op('-'))
      r = tokens[i++]!.valor === '+' ? somar(r, produto()) : subtrair(r, produto());
    return r;
  };
  const produto = (): Fracao => {
    let r = sinal();
    while (op('*') || op('/'))
      r = tokens[i++]!.valor === '*' ? multiplicar(r, sinal()) : dividir(r, sinal());
    return r;
  };
  // Unary minus binds looser than ^, so -3^2 is -9, as in school.
  const sinal = (): Fracao => {
    if (op('-')) {
      i++;
      return multiplicar(fracao(-1), sinal());
    }
    if (op('+')) i++;
    return elevado();
  };
  const elevado = (): Fracao => {
    const base = atomo();
    if (!op('^')) return base;
    i++;
    return potencia(base, sinal());
  };
  const atomo = (): Fracao => {
    const t = tokens[i++];
    if (t?.tipo === 'num') return t.valor;
    if (t?.tipo === 'op' && t.valor === '(') {
      const r = soma();
      if (!op(')')) throw new Error('faltou fechar parênteses');
      i++;
      return r;
    }
    throw new Error('expressão incompleta');
  };

  const resultado = soma();
  if (i < tokens.length) throw new Error('expressão com sobra no final');
  return resultado;
}

/**
 * Reads what the student answered, as transcribed by the LLM into digits:
 * "7/12", "3,5", "-2", "x = 2 e x = 3", "2; 3". Returns every number found.
 */
export function lerResposta(texto: string): Fracao[] {
  const limpo = texto.replace(/−/g, '-').replace(/\s*\/\s*/g, '/');
  const achados = limpo.match(/-?\d+(?:[.,]\d+)?(?:\/-?\d+(?:[.,]\d+)?)?/g) ?? [];
  return achados.map((trecho) => {
    const [cima, baixo] = trecho.split('/');
    return baixo === undefined
      ? decimalParaFracao(cima!)
      : dividir(decimalParaFracao(cima!), decimalParaFracao(baixo));
  });
}

/** True when the student gave exactly the expected values, in any order. */
export function conferir(respostas: Fracao[], esperadas: Fracao[]): boolean {
  const unicas = respostas.filter((r, idx) => respostas.findIndex((o) => iguais(o, r)) === idx);
  return (
    unicas.length === esperadas.length && esperadas.every((e) => unicas.some((r) => iguais(r, e)))
  );
}

type Sorteio = () => number;
const inteiro = (rng: Sorteio, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));
const naoZero = (rng: Sorteio, min: number, max: number) => {
  let v = 0;
  while (v === 0) v = inteiro(rng, min, max);
  return v;
};
/** Renders "+ 3" / "- 3" for the second term of a sum. */
const comSinal = (v: number) => (v < 0 ? `- ${-v}` : `+ ${v}`);

/** Largest operand per level, for each kind of operation. */
const TETO = {
  soma: [20, 200, 2000, 20000],
  tabuada: [10, 12, 25, 60],
  denominador: [6, 10, 12, 20],
  raiz: [5, 9, 12, 15],
} as const;

export function gerarExercicio(
  topico: Topico,
  nivel: Nivel,
  rng: Sorteio = Math.random,
): Exercicio {
  const k = nivel - 1;
  const base = { topico, nivel };

  switch (topico) {
    case 'adicao': {
      const a = inteiro(rng, 1, TETO.soma[k]!);
      const b = inteiro(rng, 1, TETO.soma[k]!);
      return {
        ...base,
        expressao: `${a} + ${b}`,
        latex: `${a} + ${b}`,
        respostas: [fracao(a + b)],
      };
    }
    case 'subtracao': {
      const b = inteiro(rng, 1, TETO.soma[k]!);
      // Negative results only from 7th grade on.
      const a = nivel === 1 ? inteiro(rng, b, b + TETO.soma[k]!) : inteiro(rng, 1, TETO.soma[k]!);
      return {
        ...base,
        expressao: `${a} - ${b}`,
        latex: `${a} - ${b}`,
        respostas: [fracao(a - b)],
      };
    }
    case 'multiplicacao': {
      const a = inteiro(rng, 2, TETO.tabuada[k]!);
      const b = inteiro(rng, 2, TETO.tabuada[k]!);
      return {
        ...base,
        expressao: `${a} * ${b}`,
        latex: `${a} \\times ${b}`,
        respostas: [fracao(a * b)],
      };
    }
    case 'divisao': {
      const divisor = inteiro(rng, 2, TETO.tabuada[k]!);
      const quociente = inteiro(rng, 2, TETO.tabuada[k]!);
      const dividendo = divisor * quociente;
      return {
        ...base,
        expressao: `${dividendo} / ${divisor}`,
        latex: `${dividendo} \\div ${divisor}`,
        respostas: [fracao(quociente)],
      };
    }
    case 'fracoes': {
      const d1 = inteiro(rng, 2, TETO.denominador[k]!);
      // Level 1 keeps the same denominator; from level 2 on they differ.
      const d2 = nivel === 1 ? d1 : inteiro(rng, 2, TETO.denominador[k]!);
      const n1 = inteiro(rng, 1, d1 - 1);
      const n2 = inteiro(rng, 1, d2 - 1);
      const a = fracao(n1, d1);
      const b = fracao(n2, d2);
      const menos = nivel > 1 && rng() < 0.4 && a.n * b.d > b.n * a.d;
      return {
        ...base,
        expressao: `${n1}/${d1} ${menos ? '-' : '+'} ${n2}/${d2}`,
        latex: `\\frac{${n1}}{${d1}} ${menos ? '-' : '+'} \\frac{${n2}}{${d2}}`,
        respostas: [menos ? subtrair(a, b) : somar(a, b)],
      };
    }
    case 'porcentagem': {
      const taxas = [
        [10, 50],
        [10, 20, 25, 50],
        [5, 12, 15, 30, 75],
        [2.5, 7.5, 12.5, 17.5],
      ][k]!;
      const taxa = taxas[inteiro(rng, 0, taxas.length - 1)]!;
      const total = inteiro(rng, 1, 20) * [10, 20, 40, 80][k]!;
      const texto = `${taxa}`.replace('.', ',');
      return {
        ...base,
        expressao: `${texto}% de ${total}`,
        latex: `${texto}\\%\\ \\text{de}\\ ${total}`,
        respostas: [dividir(multiplicar(decimalParaFracao(`${taxa}`), fracao(total)), fracao(100))],
      };
    }
    case 'potenciacao': {
      const b = nivel >= 3 ? naoZero(rng, -6, 9) : inteiro(rng, 2, [5, 10, 9, 9][k]!);
      const e = inteiro(rng, 2, [2, 3, 4, 5][k]!);
      const escrita = b < 0 ? `(${b})` : `${b}`;
      return {
        ...base,
        expressao: `${escrita}^${e}`,
        latex: `${escrita}^{${e}}`,
        respostas: [potencia(fracao(b), fracao(e))],
      };
    }
    case 'equacao_1_grau': {
      const x = nivel <= 2 ? inteiro(rng, 1, 12) : naoZero(rng, -15, 15);
      const a = nivel <= 2 ? inteiro(rng, 2, 9) : naoZero(rng, -9, 9);
      const b = naoZero(rng, -20, 20);
      const c = a * x + b;
      const ax = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
      return {
        ...base,
        expressao: `${ax} ${comSinal(b)} = ${c}`,
        latex: `${ax} ${comSinal(b)} = ${c}`,
        respostas: [fracao(x)],
      };
    }
    case 'equacao_2_grau': {
      const r1 = naoZero(rng, -TETO.raiz[k]!, TETO.raiz[k]!);
      let r2 = naoZero(rng, -TETO.raiz[k]!, TETO.raiz[k]!);
      if (r2 === r1) r2 = -r1;
      const soma = -(r1 + r2);
      const produto = r1 * r2;
      const meio =
        soma === 0 ? '' : ` ${soma === 1 ? '+ ' : soma === -1 ? '- ' : `${comSinal(soma)}`}x`;
      return {
        ...base,
        expressao: `x^2${meio} ${comSinal(produto)} = 0`,
        latex: `x^{2}${meio} ${comSinal(produto)} = 0`,
        respostas: [fracao(r1), fracao(r2)],
      };
    }
  }
}
