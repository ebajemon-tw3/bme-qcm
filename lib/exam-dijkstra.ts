// Exercice Dijkstra (hta4p p. 3 et p. 8 à 14) : on prend dans la file le nœud de plus petite
// distance (à égalité, la plus petite lettre) et on ne remplace un chemin que s'il est strictement
// meilleur (« if d < v.dist »).

import type { CheckResult } from "@/lib/exam-check";
import { rng, type Rng } from "@/lib/exam-rng";

export interface Edge {
  a: number;
  b: number;
  w: number;
}

export interface Graph {
  nodes: string[];
  pos: [number, number][];
  edges: Edge[];
}

export interface Cell {
  dist: number;
  prev: number;
  /** « new » : premier chemin trouvé ; « better » : remplace un chemin plus cher. */
  change: "same" | "new" | "better";
}

export interface Round {
  taken: number;
  takenDist: number;
  /** Une cellule par nœud encore dans la file après la ronde, null sinon. */
  cells: (Cell | null)[];
  /** Chemins examinés pendant la ronde. */
  tried: { node: number; via: number; cost: number; before: number; kept: boolean }[];
}

export interface FibEntry {
  node: number;
  cost: number;
  nextHop: number;
}

export interface DijkstraExercise {
  seed: number;
  graph: Graph;
  source: number;
  rounds: Round[];
  fib: FibEntry[];
}

const LAYOUTS: Record<number, { pos: [number, number][]; candidates: [number, number][] }> = {
  5: {
    pos: [
      [0, 0],
      [1, 0],
      [2, 0],
      [0.5, 1],
      [1.5, 1],
    ],
    candidates: [
      [0, 1],
      [1, 2],
      [0, 3],
      [1, 3],
      [1, 4],
      [2, 4],
      [3, 4],
    ],
  },
  6: {
    pos: [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    candidates: [
      [0, 1],
      [1, 2],
      [3, 4],
      [4, 5],
      [0, 3],
      [1, 4],
      [2, 5],
      [0, 4],
      [1, 5],
    ],
  },
  7: {
    pos: [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 0.5],
    ],
    candidates: [
      [0, 1],
      [1, 2],
      [3, 4],
      [4, 5],
      [0, 3],
      [1, 4],
      [2, 5],
      [0, 4],
      [1, 5],
      [2, 6],
      [5, 6],
    ],
  },
};

function randomGraph(r: Rng): Graph {
  const n = r.int(5, 7);
  const { pos, candidates } = LAYOUTS[n];
  const parent = pos.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const order = r.shuffle(candidates);
  const chosen: [number, number][] = [];
  const rest: [number, number][] = [];
  for (const [a, b] of order) {
    if (find(a) !== find(b)) {
      parent[find(a)] = find(b);
      chosen.push([a, b]);
    } else {
      rest.push([a, b]);
    }
  }
  chosen.push(...rest.slice(0, r.int(1, Math.min(3, rest.length))));
  return {
    nodes: "ABCDEFG".slice(0, n).split(""),
    pos,
    edges: chosen.map(([a, b]) => ({ a: Math.min(a, b), b: Math.max(a, b), w: r.int(1, 8) })),
  };
}

export function neighbours(graph: Graph, u: number) {
  return graph.edges
    .filter((e) => e.a === u || e.b === u)
    .map((e) => ({ v: e.a === u ? e.b : e.a, w: e.w }))
    .sort((x, y) => x.v - y.v);
}

export function runDijkstra(graph: Graph, source: number) {
  const n = graph.nodes.length;
  const dist = Array<number>(n).fill(Infinity);
  const prev = Array<number>(n).fill(-1);
  const done = Array<boolean>(n).fill(false);
  dist[source] = 0;
  const rounds: Round[] = [];
  let ties = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let v = 0; v < n; v++) {
      if (!done[v] && dist[v] !== Infinity && (u === -1 || dist[v] < dist[u])) u = v;
    }
    if (dist.filter((d, v) => !done[v] && d === dist[u]).length > 1) ties++;
    done[u] = true;
    const before = [...dist];
    const tried: Round["tried"] = [];
    for (const { v, w } of neighbours(graph, u)) {
      if (done[v]) continue;
      const d = dist[u] + w;
      const kept = d < dist[v];
      if (!kept && d === dist[v]) ties++;
      tried.push({ node: v, via: u, cost: d, before: dist[v], kept });
      if (kept) {
        dist[v] = d;
        prev[v] = u;
      }
    }
    rounds.push({
      taken: u,
      takenDist: dist[u],
      tried,
      cells: dist.map((d, v) =>
        done[v]
          ? null
          : { dist: d, prev: prev[v], change: d === before[v] ? "same" : before[v] === Infinity ? "new" : "better" },
      ),
    });
  }
  const fib: FibEntry[] = [];
  for (let v = 0; v < n; v++) {
    if (v === source) continue;
    let hop = v;
    while (prev[hop] !== source) hop = prev[hop];
    fib.push({ node: v, cost: dist[v], nextHop: hop });
  }
  return { rounds, fib, ties };
}

export function generateDijkstra(seed: number): DijkstraExercise {
  const r = rng(seed);
  let best: DijkstraExercise | null = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    const graph = randomGraph(r);
    const source = r.int(0, graph.nodes.length - 1);
    const { rounds, fib, ties } = runDijkstra(graph, source);
    const better = rounds.some((round) => round.cells.some((c) => c?.change === "better"));
    best = { seed, graph, source, rounds, fib };
    if (ties <= 1 && better) break;
  }
  return best!;
}

/** « 5,C », « 5 C », « 5;C », « inf », « ∞ ». Distance Infinity et prev -1 pour l'infini. */
export function parseCell(text: string, nodes: string[]): { dist: number; prev: number } | null {
  const s = text.trim().toLowerCase();
  if (/^(inf|infini|infinity|oo|∞)([\s,;/-]*-?)?$/.test(s)) return { dist: Infinity, prev: -1 };
  const m = s.match(/^(\d+)\s*[,;/ ]?\s*([a-g])$/);
  if (!m) return null;
  const prev = nodes.indexOf(m[2].toUpperCase());
  return prev === -1 ? null : { dist: Number(m[1]), prev };
}

export function parseNode(text: string, nodes: string[]) {
  const i = nodes.indexOf(text.trim().toUpperCase());
  return i === -1 ? null : i;
}

function lastPrev(ex: DijkstraExercise, v: number) {
  const cells = ex.rounds.map((r) => r.cells[v]).filter((c): c is Cell => c !== null);
  return cells.length ? cells[cells.length - 1].prev : -1;
}

export function checkDijkstra(ex: DijkstraExercise, value: Record<string, string>): CheckResult {
  const { nodes } = ex.graph;
  const out: CheckResult = {};
  ex.rounds.forEach((round, r) => {
    const taken = parseNode(value[`t${r}`] ?? "", nodes);
    const tied = r > 0 && ex.rounds[r - 1].cells.some((c, v) => c && v !== round.taken && c.dist === round.takenDist);
    out[`t${r}`] = {
      ok: taken === round.taken,
      hint: taken !== round.taken && tied ? "Égalité dans la file : prendre la plus petite lettre." : undefined,
    };
    nodes.forEach((_, v) => {
      if (v === ex.source) return;
      const key = `c${r}-${v}`;
      const text = (value[key] ?? "").trim();
      const cell = round.cells[v];
      if (!cell) {
        if (text && text !== "-") out[key] = { ok: false, hint: "Nœud déjà pris : laisser la case vide." };
        return;
      }
      const parsed = parseCell(text, nodes);
      let hint: string | undefined;
      if (!text) hint = "Case vide.";
      else if (!parsed) hint = "Format « distance,précédent » (par exemple 5,C) ou « inf ».";
      else if (parsed.dist === cell.dist && parsed.prev !== cell.prev && cell.dist !== Infinity) {
        hint = "Bonne distance, autre précédent : à coût égal on garde l'ancien chemin (d < v.dist, hta4p p. 3).";
      }
      const ok = !!parsed && parsed.dist === cell.dist && (cell.dist === Infinity || parsed.prev === cell.prev);
      out[key] = { ok, hint: ok ? undefined : hint };
    });
  });
  for (const entry of ex.fib) {
    const cost = (value[`fc${entry.node}`] ?? "").trim();
    out[`fc${entry.node}`] = { ok: /^\d+$/.test(cost) && Number(cost) === entry.cost };
    const hop = parseNode(value[`fh${entry.node}`] ?? "", nodes);
    out[`fh${entry.node}`] = {
      ok: hop === entry.nextHop,
      hint:
        hop !== null && hop !== entry.nextHop && hop === lastPrev(ex, entry.node)
          ? "C'est le nœud précédent sur le chemin : le next hop est le premier saut depuis la source."
          : undefined,
    };
  }
  return out;
}
