import * as React from "react";

// Texte Cisco : le récupérateur NetAcad convertit <strong> en **...** et <em> en *...*.
// On restitue ces deux mises en valeur, le texte lui-même n'est pas touché.
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s](?:[^*]*[^*\s])?\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

// Les questions rédigées à la main entourent une sortie console de ``` : rendue telle quelle.
export function RichText({ text }: { text: string }) {
  if (!text.includes("```")) return <Inline text={text} />;
  const parts = text.split(/\n?```\n?/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="my-2 overflow-x-auto bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre">
            {part}
          </pre>
        ) : (
          part && <Inline key={i} text={part} />
        ),
      )}
    </>
  );
}
