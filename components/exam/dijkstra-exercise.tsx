"use client";

import * as React from "react";
import { AnswerInput, Hint, SolutionBlock, Statement, type ExerciseProps } from "@/components/exam/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { checkDijkstra, generateDijkstra, type Cell, type DijkstraExercise as Dij } from "@/lib/exam-dijkstra";
import type { FieldResult } from "@/lib/exam-check";
import { cn } from "@/lib/utils";

const SCALE = 110;
const PAD = 26;

function GraphFigure({ ex }: { ex: Dij }) {
  const { nodes, pos, edges } = ex.graph;
  const width = Math.max(...pos.map(([x]) => x)) * SCALE + PAD * 2;
  const height = Math.max(...pos.map(([, y]) => y)) * SCALE + PAD * 2;
  const at = (i: number) => [pos[i][0] * SCALE + PAD, pos[i][1] * SCALE + PAD] as const;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-md"
      role="img"
      aria-label={`Graphe : ${edges.map((e) => `${nodes[e.a]}-${nodes[e.b]} coût ${e.w}`).join(", ")}. Source ${nodes[ex.source]}.`}
    >
      {edges.map((e, i) => {
        const [x1, y1] = at(e.a);
        const [x2, y2] = at(e.b);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted-foreground)" strokeWidth={1.5} />
            <rect x={mx - 9} y={my - 9} width={18} height={18} fill="var(--background)" />
            <text x={mx} y={my} textAnchor="middle" dominantBaseline="central" fontSize={14} fill="var(--foreground)">
              {e.w}
            </text>
          </g>
        );
      })}
      {nodes.map((n, i) => {
        const [x, y] = at(i);
        const source = i === ex.source;
        return (
          <g key={n}>
            <circle
              cx={x}
              cy={y}
              r={15}
              fill={source ? "var(--foreground)" : "var(--background)"}
              stroke="var(--foreground)"
              strokeWidth={1.5}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={14}
              fontWeight={600}
              fill={source ? "var(--background)" : "var(--foreground)"}
            >
              {n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function cellText(cell: Cell | null, nodes: string[]) {
  if (!cell) return "";
  return cell.dist === Infinity ? "inf" : `${cell.dist},${nodes[cell.prev]}`;
}

function firstHint(result: Record<string, FieldResult> | null, keys: string[]) {
  return keys.map((k) => result?.[k]).find((r) => r && !r.ok && r.hint);
}

export function DijkstraExercise({ seed, value, onChange, reveal, locked }: ExerciseProps) {
  const ex = React.useMemo(() => generateDijkstra(seed), [seed]);
  const result = reveal !== "none" ? checkDijkstra(ex, value) : null;
  const { nodes } = ex.graph;
  const others = nodes.map((_, i) => i).filter((i) => i !== ex.source);
  const src = nodes[ex.source];

  return (
    <div className="flex flex-col gap-4">
      <Statement>
        <p>
          Run Dijkstra&apos;s algorithm from node <strong>{src}</strong>, as on the slides. For each round give the node
          taken from the priority queue, then, for every node still in the queue, its tentative distance and previous node
          written <code>distance,previous</code> (<code>inf</code> if not reached yet). Leave the cell of a node empty once
          it has been taken, including in the round where it is taken. On a tie take the smallest letter; a path replaces
          the current one only if it is strictly cheaper.
        </p>
      </Statement>
      <GraphFigure ex={ex} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
          <caption className="sr-only">Rondes de l&apos;algorithme</caption>
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-1 py-2 font-normal">Round</th>
              <th className="px-1 py-2 font-normal">Taken</th>
              {others.map((v) => (
                <th key={v} className="px-1 py-2 font-normal">
                  {nodes[v]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ex.rounds.map((_, r) => (
              <tr key={r} className="border-b">
                <td className="px-1 py-1 tabular-nums text-muted-foreground">{r + 1}</td>
                <td className="px-1 py-1">
                  <AnswerInput
                    id={`dij-t${r}`}
                    label={`Ronde ${r + 1}, nœud pris`}
                    value={value[`t${r}`] ?? ""}
                    onChange={(v) => onChange(`t${r}`, v)}
                    result={result?.[`t${r}`]}
                    locked={locked}
                    className="w-12 text-center uppercase"
                  />
                </td>
                {others.map((v) => (
                  <td key={v} className="px-1 py-1">
                    <AnswerInput
                      id={`dij-c${r}-${v}`}
                      label={`Ronde ${r + 1}, nœud ${nodes[v]}`}
                      value={value[`c${r}-${v}`] ?? ""}
                      onChange={(x) => onChange(`c${r}-${v}`, x)}
                      result={result?.[`c${r}-${v}`]}
                      locked={locked}
                      className="w-16"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Hint result={firstHint(result, Object.keys(result ?? {}).filter((k) => !k.startsWith("f")))} />
      <Statement>
        <p>FIB of {src}: cost and next hop for every destination.</p>
      </Statement>
      <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 text-sm sm:max-w-sm">
        <span className="text-xs text-muted-foreground">Dest.</span>
        <span className="text-xs text-muted-foreground">Cost</span>
        <span className="text-xs text-muted-foreground">Next hop</span>
        {ex.fib.map((f) => (
          <React.Fragment key={f.node}>
            <span>{nodes[f.node]}</span>
            <AnswerInput
              id={`dij-fc${f.node}`}
              label={`Coût vers ${nodes[f.node]}`}
              value={value[`fc${f.node}`] ?? ""}
              onChange={(v) => onChange(`fc${f.node}`, v)}
              result={result?.[`fc${f.node}`]}
              locked={locked}
              inputMode="numeric"
            />
            <AnswerInput
              id={`dij-fh${f.node}`}
              label={`Next hop vers ${nodes[f.node]}`}
              value={value[`fh${f.node}`] ?? ""}
              onChange={(v) => onChange(`fh${f.node}`, v)}
              result={result?.[`fh${f.node}`]}
              locked={locked}
              className="uppercase"
            />
          </React.Fragment>
        ))}
      </div>
      <Hint result={firstHint(result, Object.keys(result ?? {}).filter((k) => k.startsWith("f")))} />
      {reveal === "solution" ? <DijkstraSolution ex={ex} /> : null}
    </div>
  );
}

function path(ex: Dij, v: number) {
  const prev = (n: number) => {
    const cells = ex.rounds.map((r) => r.cells[n]).filter((c): c is Cell => c !== null);
    return cells[cells.length - 1].prev;
  };
  const out = [v];
  while (out[0] !== ex.source) out.unshift(prev(out[0]));
  return out.map((n) => ex.graph.nodes[n]).join("-");
}

function DijkstraSolution({ ex }: { ex: Dij }) {
  const { nodes } = ex.graph;
  const others = nodes.map((_, i) => i).filter((i) => i !== ex.source);
  return (
    <SolutionBlock>
      <p className="text-xs text-muted-foreground" lang="fr">
        Cellule « distance,précédent ». En ambre : chemin remplacé par un chemin strictement moins cher.
      </p>
      <Table>
        <caption className="sr-only">Tableau complet des rondes</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Round</TableHead>
            <TableHead>Taken</TableHead>
            {others.map((v) => (
              <TableHead key={v}>{nodes[v]}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="text-sm tabular-nums">
          {ex.rounds.map((round, r) => (
            <TableRow key={r}>
              <TableCell>{r + 1}</TableCell>
              <TableCell>
                {nodes[round.taken]} ({round.takenDist})
              </TableCell>
              {others.map((v) => {
                const cell = round.cells[v];
                return (
                  <TableCell
                    key={v}
                    className={cn(cell?.change === "better" && "text-warn underline", cell?.dist === Infinity && "text-muted-foreground")}
                  >
                    {cellText(cell, nodes)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ol className="flex list-decimal flex-col gap-1 pl-5">
        {ex.rounds.map((round, r) => (
          <li key={r}>
            Take {nodes[round.taken]} ({round.takenDist}).{" "}
            {round.tried.length === 0
              ? "No neighbour left in the queue."
              : round.tried
                  .map((t) => {
                    const cost = `${nodes[t.via]}-${nodes[t.node]}: ${round.takenDist} + ${t.cost - round.takenDist} = ${t.cost}`;
                    if (t.before === Infinity) return `${cost}, new path`;
                    return t.kept ? `${cost} < ${t.before}, better` : `${cost}, not < ${t.before}, kept`;
                  })
                  .join("; ") + "."}
          </li>
        ))}
      </ol>
      <Table>
        <caption className="sr-only">FIB</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Destination</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Next hop</TableHead>
            <TableHead>Path</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-sm tabular-nums">
          {ex.fib.map((f) => (
            <TableRow key={f.node}>
              <TableCell>{nodes[f.node]}</TableCell>
              <TableCell>{f.cost}</TableCell>
              <TableCell>{nodes[f.nextHop]}</TableCell>
              <TableCell>{path(ex, f.node)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground" lang="fr">
        Next hop : premier saut du chemin depuis la source, obtenu en remontant les précédents. Source : hta4p p. 3 et 8 à
        14.
      </p>
    </SolutionBlock>
  );
}
