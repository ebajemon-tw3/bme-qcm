import * as React from "react";

// Rendu minimal du markdown des fiches : **gras**, `code`, et "À VÉRIFIER" signalé en ambre.
export function MdInline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|À VÉRIFIER)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="text-[0.95em] text-muted-foreground">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part === "À VÉRIFIER") {
          return (
            <span key={i} className="text-warn">
              À VÉRIFIER
            </span>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}
