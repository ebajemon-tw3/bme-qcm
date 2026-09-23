"use client";

import * as React from "react";
import { GrokPrompt } from "@/components/brainless/grok/grok-prompt";
import { GrokThinking } from "@/components/brainless/grok/grok-thinking";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

export function UnlockScreen({
  busy,
  loading,
  error,
  disabled,
  onUnlock,
}: {
  busy: boolean;
  loading: boolean;
  error?: string;
  disabled: boolean;
  onUnlock: (password: string, remember: boolean) => void;
}) {
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(true);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password && !busy) onUnlock(password, remember);
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">Révision BME</h1>
          <p className="text-sm text-muted-foreground">
            Le contenu de ce site est chiffré. Le mot de passe le déchiffre dans ce navigateur, il n&apos;est
            envoyé nulle part.
          </p>
        </header>

        {loading ? (
          <GrokThinking verbs={["Chargement des données", "Déchiffrement"]} />
        ) : (
        <form onSubmit={submit} noValidate>
          <FieldGroup className="gap-6">
            <Field>
              <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
              <GrokPrompt
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "unlock-error" : undefined}
              />
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(checked) => setRemember(checked === true)}
                disabled={disabled}
              />
              <FieldLabel htmlFor="remember" className="font-normal">
                Retenir le mot de passe sur cet appareil
              </FieldLabel>
            </Field>
            <Button type="submit" size="lg" className="h-11" disabled={!password || busy || disabled}>
              Déverrouiller
            </Button>
          </FieldGroup>
        </form>
        )}

        <div className="min-h-6">
          {busy && !loading ? <GrokThinking verbs={["Dérivation de la clé", "Déchiffrement"]} /> : null}
          {error && !busy ? (
            <p id="unlock-error" role="alert" className="text-sm text-bad">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
