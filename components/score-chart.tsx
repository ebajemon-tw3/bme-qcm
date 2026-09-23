import { percent } from "@/lib/format";

export interface ScorePoint {
  label: string;
  value: number;
}

// Courbe de score par session, en SVG simple. Une ligne, des points, trois repères horizontaux.
export function ScoreChart({ points, title }: { points: ScorePoint[]; title: string }) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune session sur ce périmètre.</p>;
  }
  const width = 640;
  const height = 200;
  const pad = { top: 12, right: 12, bottom: 24, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => pad.top + (1 - v) * innerH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const mean = points.reduce((s, p) => s + p.value, 0) / points.length;

  return (
    <figure className="flex max-w-3xl flex-col gap-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${title}. ${points.length} sessions, dernier score ${percent(last.value)}, moyenne ${percent(mean)}.`}
      >
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text x={pad.left - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
              {Math.round(v * 100)}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke="var(--foreground)" strokeWidth={1.5} />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={3} fill="var(--foreground)">
            <title>{`${p.label} : ${percent(p.value)}`}</title>
          </circle>
        ))}
        <text x={pad.left} y={height - 6} fontSize={11} fill="var(--muted-foreground)">
          {points[0].label}
        </text>
        {points.length > 1 ? (
          <text x={width - pad.right} y={height - 6} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
            {last.label}
          </text>
        ) : null}
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        {title}, en % de réponses justes par session. Dernier : {percent(last.value)}, moyenne : {percent(mean)}.
      </figcaption>
    </figure>
  );
}
