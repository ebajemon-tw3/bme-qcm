import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GrokMessage, un tour de la conversation Grok. Le tour utilisateur porte le marqueur ❯,
 * la réponse de l'assistant est du texte simple. `time` s'aligne à droite.
 * Adapté de brainless : couleurs sur les variables du thème, échelle typographique du site.
 */
export function GrokMessage({
  role = "assistant",
  time,
  className,
  children,
  ...props
}: {
  role?: "user" | "assistant";
  time?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<"div">, "role">) {
  return (
    <div
      className={cn(
        "flex min-w-0 gap-2 font-mono text-sm leading-relaxed text-(--term-fg)",
        className,
      )}
      {...props}
    >
      {role === "user" ? (
        <span aria-hidden className="shrink-0">
          ❯
        </span>
      ) : null}
      <span className="min-w-0 flex-1 break-words">{children}</span>
      {time ? <span className="shrink-0 tabular-nums text-(--term-muted)">{time}</span> : null}
    </div>
  );
}
