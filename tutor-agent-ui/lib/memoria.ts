// What Manu remembers between lessons lives only in this browser's localStorage.
// It is sent to the agent at the start of the next lesson and never stored on a server.

export type Memoria = { nome: string; etapa: string; resumo: string };

const CHAVE_MEMORIA = "manu.memoria";
const CHAVE_CONSENTIMENTO = "manu.consentimento";

const curto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Accepts anything and returns a size-limited Memoria, or null if there is no name. */
export function limparMemoria(valor: unknown): Memoria | null {
  if (!valor || typeof valor !== "object") return null;
  const m = valor as Record<string, unknown>;
  const nome = curto(m.nome, 40);
  if (!nome) return null;
  return { nome, etapa: curto(m.etapa, 80), resumo: curto(m.resumo, 300) };
}

export function lerMemoria(): Memoria | null {
  try {
    return limparMemoria(JSON.parse(localStorage.getItem(CHAVE_MEMORIA) ?? "null"));
  } catch {
    return null;
  }
}

const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());

/** Subscribes to changes made through salvarMemoria and esquecerTudo. */
export function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => void ouvintes.delete(ouvinte);
}

export function lerBruto(): string | null {
  try {
    return localStorage.getItem(CHAVE_MEMORIA);
  } catch {
    return null;
  }
}

export function salvarMemoria(memoria: Memoria) {
  try {
    localStorage.setItem(CHAVE_MEMORIA, JSON.stringify(memoria));
    avisar();
  } catch {
    // Private mode or storage disabled: the lesson works, it just won't be remembered.
  }
}

export function consentiu(): boolean {
  try {
    return localStorage.getItem(CHAVE_CONSENTIMENTO) === "sim";
  } catch {
    return false;
  }
}

export function registrarConsentimento() {
  try {
    localStorage.setItem(CHAVE_CONSENTIMENTO, "sim");
  } catch {}
}

/** Erases everything this site keeps on the device. */
export function esquecerTudo() {
  try {
    localStorage.removeItem(CHAVE_MEMORIA);
    localStorage.removeItem(CHAVE_CONSENTIMENTO);
    avisar();
  } catch {}
}
