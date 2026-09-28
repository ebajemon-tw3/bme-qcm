"use client";

import * as React from "react";
import { GrokThinking } from "@/components/brainless/grok/grok-thinking";
import { fetchBundle } from "@/lib/bundle-client";
import type { Bundle } from "@/lib/types";

type Phase = { name: "loading" } | { name: "unavailable"; error: string } | { name: "ready"; bundle: Bundle };

interface DataContextValue {
  bundle: Bundle;
}

const DataContext = React.createContext<DataContextValue | null>(null);

export function useData() {
  const value = React.useContext(DataContext);
  if (!value) throw new Error("useData doit être appelé sous DataProvider.");
  return value;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = React.useState<Phase>({ name: "loading" });

  React.useEffect(() => {
    let cancelled = false;
    fetchBundle().then(
      (bundle) => !cancelled && setPhase({ name: "ready", bundle }),
      (error: Error) => !cancelled && setPhase({ name: "unavailable", error: error.message }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const value = React.useMemo(() => (phase.name === "ready" ? { bundle: phase.bundle } : null), [phase]);

  if (!value) {
    return (
      <main className="flex min-h-dvh flex-col justify-center px-4 py-10">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <h1 className="text-xl font-semibold">Révision BME</h1>
          {phase.name === "unavailable" ? (
            <p role="alert" className="text-sm text-bad">
              {phase.error}
            </p>
          ) : (
            <GrokThinking verbs={["Chargement des données"]} />
          )}
        </div>
      </main>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
