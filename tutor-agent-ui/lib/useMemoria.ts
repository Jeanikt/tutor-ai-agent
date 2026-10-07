"use client";

import { useMemo, useSyncExternalStore } from "react";
import { type Memoria, assinar, lerBruto, limparMemoria } from "./memoria";

/** The saved lesson, kept in sync with localStorage. Null on the server and when nothing is saved. */
export function useMemoria(): Memoria | null {
  const bruto = useSyncExternalStore(assinar, lerBruto, () => null);
  return useMemo(() => {
    try {
      return limparMemoria(JSON.parse(bruto ?? "null"));
    } catch {
      return null;
    }
  }, [bruto]);
}
