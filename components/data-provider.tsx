"use client";

import * as React from "react";
import { UnlockScreen } from "@/components/unlock-screen";
import { fetchEncryptedBundle, openBundle } from "@/lib/bundle-client";
import { WrongPasswordError } from "@/lib/crypto";
import type { Bundle } from "@/lib/types";

// Le mot de passe retenu vit dans le localStorage de l'appareil, jamais ailleurs.
const PASSWORD_KEY = "bmeqcm.password";

type Phase =
  | { name: "loading" }
  | { name: "locked"; error?: string }
  | { name: "unlocking" }
  | { name: "unavailable"; error: string }
  | { name: "ready"; bundle: Bundle; remembered: boolean };

interface DataContextValue {
  bundle: Bundle;
  remembered: boolean;
  forgetPassword: () => void;
}

const DataContext = React.createContext<DataContextValue | null>(null);

export function useData() {
  const value = React.useContext(DataContext);
  if (!value) throw new Error("useData doit être appelé sous DataProvider.");
  return value;
}

function savedPassword() {
  try {
    return localStorage.getItem(PASSWORD_KEY);
  } catch {
    return null;
  }
}

function forgetSavedPassword() {
  try {
    localStorage.removeItem(PASSWORD_KEY);
  } catch {
    // Stockage indisponible : rien à oublier.
  }
}

function errorMessage(error: unknown) {
  return error instanceof WrongPasswordError ? "Mot de passe incorrect." : (error as Error).message;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = React.useState<Phase>({ name: "loading" });
  const file = React.useRef<Uint8Array<ArrayBuffer> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        file.current = await fetchEncryptedBundle();
      } catch (error) {
        if (!cancelled) setPhase({ name: "unavailable", error: (error as Error).message });
        return;
      }
      const saved = savedPassword();
      if (!saved) {
        if (!cancelled) setPhase({ name: "locked" });
        return;
      }
      try {
        const bundle = await openBundle(file.current, saved);
        if (!cancelled) setPhase({ name: "ready", bundle, remembered: true });
      } catch (error) {
        forgetSavedPassword();
        if (cancelled) return;
        setPhase({
          name: "locked",
          error:
            error instanceof WrongPasswordError
              ? "Le mot de passe retenu ne déchiffre plus les données : il a changé. Saisir le nouveau."
              : errorMessage(error),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unlock = React.useCallback(async (password: string, remember: boolean) => {
    if (!file.current) return;
    setPhase({ name: "unlocking" });
    try {
      const bundle = await openBundle(file.current, password);
      if (remember) {
        try {
          localStorage.setItem(PASSWORD_KEY, password);
        } catch {
          remember = false;
        }
      }
      setPhase({ name: "ready", bundle, remembered: remember });
    } catch (error) {
      setPhase({ name: "locked", error: errorMessage(error) });
    }
  }, []);

  const forgetPassword = React.useCallback(() => {
    forgetSavedPassword();
    setPhase({ name: "locked" });
  }, []);

  const value = React.useMemo(
    () => (phase.name === "ready" ? { bundle: phase.bundle, remembered: phase.remembered, forgetPassword } : null),
    [phase, forgetPassword],
  );

  if (!value) {
    return (
      <UnlockScreen
        busy={phase.name === "loading" || phase.name === "unlocking"}
        loading={phase.name === "loading"}
        error={phase.name === "locked" || phase.name === "unavailable" ? phase.error : undefined}
        disabled={phase.name === "unavailable"}
        onUnlock={unlock}
      />
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
