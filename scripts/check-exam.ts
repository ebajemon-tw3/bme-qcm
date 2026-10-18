// Vérifie les générateurs de la révision d'exam sur 200 graines chacun.
//
//   bun scripts/check-exam.ts
//
// Chaque corrigé est recalculé par une méthode indépendante : conversion XML écrite ici, arithmétique
// décimale pour les sous-réseaux, comparaison de chaînes de bits pour le plus long préfixe,
// Floyd-Warshall et seconde implémentation de Dijkstra pour les graphes.
import { tally, type CheckResult } from "../lib/exam-check";
import { checkDijkstra, generateDijkstra, parseCell, type DijkstraExercise } from "../lib/exam-dijkstra";
import { checkLpm, checkSubnet, generateLpm, generateSubnet, toIp } from "../lib/exam-ipv4";
import { checkJson, checkXml, checkYaml, generateXml, parseYaml, toJson, toYaml, type Value } from "../lib/exam-xml";

const N = 200;
const failures: string[] = [];
let checks = 0;

function expect(condition: boolean, message: string) {
  checks++;
  if (!condition && failures.length < 40) failures.push(message);
}

function allOk(result: CheckResult, where: string) {
  const { ok, total } = tally(result);
  const wrong = Object.entries(result).filter(([, r]) => !r.ok).map(([k]) => k);
  expect(ok === total && total > 0, `${where} : corrigé saisi refusé (${wrong.join(", ")})`);
}

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// XML vers JSON et YAML ----------------------------------------------------------------------------

interface XEl {
  tag: string;
  text: string;
  children: XEl[];
}

function parseXmlRef(xml: string): XEl {
  const tokens = xml.match(/<\/?[A-Za-z][\w]*>|[^<]+/g) ?? [];
  const stack: XEl[] = [{ tag: "#doc", text: "", children: [] }];
  for (const tok of tokens) {
    if (tok.startsWith("</")) {
      const el = stack.pop()!;
      if (el.tag !== tok.slice(2, -1)) throw new Error(`balise fermante ${tok} pour <${el.tag}>`);
    } else if (tok.startsWith("<")) {
      const el: XEl = { tag: tok.slice(1, -1), text: "", children: [] };
      stack[stack.length - 1].children.push(el);
      stack.push(el);
    } else if (tok.trim()) {
      stack[stack.length - 1].text += tok.trim();
    }
  }
  if (stack.length !== 1 || stack[0].children.length !== 1) throw new Error("XML mal formé");
  return stack[0].children[0];
}

function convertRef(el: XEl): Value {
  if (el.children.length === 0) return /^-?\d+$/.test(el.text) ? Number(el.text) : el.text;
  const tags = el.children.map((c) => c.tag);
  if (tags.length >= 2 && tags.every((t) => t === tags[0])) return el.children.map(convertRef);
  const out: Record<string, Value> = {};
  for (const tag of [...new Set(tags)]) {
    const group = el.children.filter((c) => c.tag === tag);
    out[tag] = group.length > 1 ? group.map(convertRef) : convertRef(group[0]);
  }
  return out;
}

for (let seed = 1; seed <= N; seed++) {
  const ex = generateXml(seed);
  const where = `xml graine ${seed}`;
  const again = generateXml(seed);
  expect(again.xml === ex.xml, `${where} : génération non déterministe`);
  let ref: Value = null;
  try {
    ref = convertRef(parseXmlRef(ex.xml));
  } catch (error) {
    expect(false, `${where} : ${(error as Error).message}`);
  }
  expect(same(ref, ex.expected), `${where} : corrigé différent de la conversion de référence`);
  const simple = Object.values(ex.expected).filter((v) => typeof v !== "object").length;
  expect(simple >= 3 && simple <= 6 + 2, `${where} : ${simple} éléments simples`);
  expect(Object.values(ex.expected).some((v) => typeof v === "object" && !Array.isArray(v)), `${where} : pas d'élément composé`);
  expect(Object.keys(ex.listTags).length === 1, `${where} : pas de liste`);

  const json = toJson(ex.expected);
  const yaml = toYaml(ex.expected);
  expect(same(JSON.parse(json), ex.expected), `${where} : toJson ne relit pas`);
  expect(checkJson(ex, json).ok, `${where} : corrigé JSON refusé : ${checkJson(ex, json).messages.join(" | ")}`);
  expect(checkJson(ex, JSON.stringify({ [ex.root]: ex.expected })).ok, `${where} : racine gardée refusée`);
  expect(same(parseYaml(yaml), ex.expected), `${where} : aller-retour YAML différent`);
  expect(checkYaml(ex, yaml).ok, `${where} : corrigé YAML refusé : ${checkYaml(ex, yaml).messages.join(" | ")}`);
  const rooted = `${ex.root}:\n${yaml.split("\n").map((l) => `  ${l}`).join("\n")}`;
  expect(checkYaml(ex, rooted).ok, `${where} : YAML avec racine refusé`);

  allOk(checkXml(ex, { json, yaml }), where);
  expect(tally(checkXml(ex, {})).ok === 0, `${where} : réponse vide acceptée`);

  const trailing = json.replace(/\n\}$/, ",\n}");
  expect(checkJson(ex, trailing).messages.some((m) => m.includes("virgule finale")), `${where} : virgule finale non signalée`);
  const numberKey = Object.entries(ex.expected).find(([, v]) => typeof v === "number");
  if (numberKey) {
    const quoted = { ...ex.expected, [numberKey[0]]: String(numberKey[1]) };
    expect(checkJson(ex, JSON.stringify(quoted)).messages.some((m) => m.includes("nombre")), `${where} : nombre entre guillemets non signalé`);
    const yamlQuoted = toYaml(ex.expected).replace(new RegExp(`^${numberKey[0]}: (\\d+)$`, "m"), `${numberKey[0]}: "$1"`);
    expect(checkYaml(ex, yamlQuoted).messages.some((m) => m.includes("nombre")), `${where} : nombre YAML entre guillemets non signalé`);
  }
  const ipKey = Object.entries(ex.expected).find(([, v]) => typeof v === "string" && /^\d+\.\d+\.\d+\.\d+$/.test(v));
  if (ipKey) {
    const bare = json.replace(`"${ipKey[1]}"`, ipKey[1] as string);
    expect(checkJson(ex, bare).messages.some((m) => m.includes("adresse IP")), `${where} : IP sans guillemets non signalée`);
  }
  const bareKey = json.replace(/^ {2}"(\w+)":/m, "  $1:");
  expect(checkJson(ex, bareKey).messages.some((m) => m.includes("clé sans guillemets")), `${where} : clé sans guillemets non signalée`);
  const [listPath, item] = Object.entries(ex.listTags)[0];
  const parts = listPath.split(".");
  const wrapped = structuredClone(ex.expected) as Record<string, Value>;
  let parent = wrapped as Record<string, Value>;
  for (const p of parts.slice(0, -1)) parent = parent[p] as Record<string, Value>;
  parent[parts[parts.length - 1]] = { [item]: parent[parts[parts.length - 1]] };
  expect(checkJson(ex, JSON.stringify(wrapped)).messages.some((m) => m.includes("balise répétée")), `${where} : balise répétée gardée non signalée`);
  expect(checkYaml(ex, yaml.replace(/^( +)/m, "$1\t")).messages.some((m) => m.includes("tabulation")), `${where} : tabulation non signalée`);
  expect(!checkYaml(ex, yaml.replace(/^(\w+): /m, "$1:")).ok, `${where} : espace manquant après : accepté`);
}

const yamlCases: [string, Value][] = [
  ["a: 1\nl:\n- x\n- y\nb: 2", { a: 1, l: ["x", "y"], b: 2 }],
  ["l:\n  - name: eth0\n    mtu: 1500\n  - name: eth1\n    mtu: 9000", { l: [{ name: "eth0", mtu: 1500 }, { name: "eth1", mtu: 9000 }] }],
  ["# comment\n---\nt: 'it''s'\nq: \"10.0.0.1\"\nf: [a, 2]", { t: "it's", q: "10.0.0.1", f: ["a", 2] }],
  ["o:\n  ip: 192.168.1.1 # gateway\n  n: 7", { o: { ip: "192.168.1.1", n: 7 } }],
];
for (const [src, want] of yamlCases) expect(same(parseYaml(src), want), `yaml : ${JSON.stringify(src)} mal lu`);
const yamlErrors: [string, string][] = [
  ["a: 1\n  b: 2", "indentation inattendue"],
  ["o:\n    a: 1\n  b: 2", "indentation incohérente"],
  ["a: 1\na: 2", "déjà définie"],
  ["l:\n  - name: x\n  mtu: 1", "clé au niveau des tirets"],
  ["a:1", "espace manquant"],
];
for (const [src, msg] of yamlErrors) {
  let got = "";
  try {
    parseYaml(src);
  } catch (error) {
    got = (error as Error).message;
  }
  expect(got.includes(msg), `yaml : ${JSON.stringify(src)} devrait signaler « ${msg} », lu « ${got} »`);
}

// Adressage IPv4 -----------------------------------------------------------------------------------

function refIp(text: string): number | null {
  const parts = text.split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d+$/.test(p) || Number(p) > 255)) return null;
  return parts.reduce((acc, p) => acc * 256 + Number(p), 0);
}

function refMask(prefix: number) {
  const bits = "1".repeat(prefix) + "0".repeat(32 - prefix);
  return [0, 8, 16, 24].map((i) => parseInt(bits.slice(i, i + 8), 2)).join(".");
}

for (let seed = 1; seed <= N; seed++) {
  const ex = generateSubnet(seed);
  const where = `ipv4 graine ${seed} (${toIp(ex.address)}/${ex.prefix})`;
  const size = 2 ** (32 - ex.prefix);
  const network = ex.address - (ex.address % size);
  expect(toIp(ex.mask) === refMask(ex.prefix), `${where} : masque`);
  expect(ex.network === network, `${where} : réseau`);
  expect(ex.broadcast === network + size - 1, `${where} : broadcast`);
  expect(ex.hosts === size - 2, `${where} : nombre d'hôtes`);
  expect(ex.address !== network && ex.address !== network + size - 1, `${where} : adresse hôte non attribuable`);
  expect(ex.prefix >= 9 && ex.prefix <= 30, `${where} : préfixe hors plage`);
  expect(ex.candidates.length >= 4 && ex.candidates.length <= 6, `${where} : ${ex.candidates.length} adresses à classer`);
  expect(new Set(ex.candidates.map((c) => c.text)).size === ex.candidates.length, `${where} : adresses en double`);
  for (const c of ex.candidates) {
    const n = refIp(c.text);
    const valid = n !== null;
    const sameNet = valid && n - (n % size) === network;
    const assignable = sameNet && n !== network && n !== network + size - 1 && n !== ex.address;
    expect(c.valid === valid, `${where} : ${c.text} validité`);
    expect(!valid || c.same === sameNet, `${where} : ${c.text} même sous-réseau`);
    expect(!valid || c.assignable === assignable, `${where} : ${c.text} attribuable`);
  }
  expect(ex.candidates.some((c) => c.assignable), `${where} : aucune adresse attribuable`);
  const yn = (b: boolean) => (b ? "yes" : "no");
  const answer: Record<string, string> = { mask: toIp(ex.mask), net: `${toIp(ex.network)}/${ex.prefix}`, bc: toIp(ex.broadcast), hosts: String(ex.hosts) };
  ex.candidates.forEach((c, i) => {
    answer[`c${i}-valid`] = yn(c.valid);
    if (c.valid) {
      answer[`c${i}-same`] = yn(c.same);
      answer[`c${i}-assign`] = yn(c.assignable);
    }
  });
  allOk(checkSubnet(ex, answer), where);
  const hostsWrong = checkSubnet(ex, { ...answer, hosts: String(ex.hosts + 2) }).hosts;
  expect(!hostsWrong.ok && !!hostsWrong.hint?.includes("moins 2"), `${where} : oubli du moins 2 non signalé`);
  expect(ex.candidates.some((c) => c.valid && !c.same), `${where} : aucune adresse hors sous-réseau`);
}

// Plus long préfixe --------------------------------------------------------------------------------

function bits(n: number) {
  return n.toString(2).padStart(32, "0");
}

for (let seed = 1; seed <= N; seed++) {
  const ex = generateLpm(seed);
  const where = `lpm graine ${seed}`;
  expect(ex.lines.length >= 4 && ex.lines.length <= 5, `${where} : ${ex.lines.length} lignes`);
  expect(ex.destinations.length >= 3 && ex.destinations.length <= 4, `${where} : ${ex.destinations.length} destinations`);
  expect(new Set(ex.lines.map((l) => l.iface).concat(ex.defaultIface)).size === ex.lines.length + 1, `${where} : interfaces en double`);
  ex.lines.forEach((l, i) => {
    const hostBitsZero = /^0*$/.test(bits(l.written).slice(l.prefix));
    expect(bits(l.network) === bits(l.written).slice(0, l.prefix).padEnd(32, "0"), `${where} : réseau de la ligne ${i + 1}`);
    expect(hostBitsZero === (ex.malformed !== i), `${where} : ligne ${i + 1} ${hostBitsZero ? "bien" : "mal"} écrite`);
  });
  for (const d of ex.destinations) {
    const b = bits(d.address);
    const matching = ex.lines.flatMap((l, i) => (b.slice(0, l.prefix) === bits(l.written).slice(0, l.prefix) ? [i] : []));
    const best = matching.sort((x, y) => ex.lines[y].prefix - ex.lines[x].prefix)[0];
    const iface = best === undefined ? ex.defaultIface : ex.lines[best].iface;
    expect(iface === d.iface, `${where} : ${toIp(d.address)} vers ${d.iface}, référence ${iface}`);
    expect(same([...d.matches].sort(), [...matching].sort()), `${where} : lignes correspondantes de ${toIp(d.address)}`);
  }
  expect(ex.destinations.some((d) => d.winner === -1), `${where} : pas de destination par défaut`);
  const lpmAnswer: Record<string, string> = Object.fromEntries(ex.destinations.map((d, i) => [`d${i}`, d.iface]));
  if (ex.malformed !== null) {
    const line = ex.lines[ex.malformed];
    lpmAnswer["bad-line"] = String(ex.malformed + 1);
    lpmAnswer["bad-net"] = `${toIp(line.network)}/${line.prefix}`;
  }
  allOk(checkLpm(ex, lpmAnswer), where);
  expect(new Set(ex.destinations.map((d) => d.iface)).size === ex.destinations.length, `${where} : deux destinations vers la même interface`);
}

// Dijkstra ----------------------------------------------------------------------------------------

function refDijkstra(ex: DijkstraExercise) {
  const { nodes, edges } = ex.graph;
  const n = nodes.length;
  const w = (a: number, b: number) => edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))?.w;
  const dist = nodes.map(() => Infinity);
  const prev = nodes.map(() => -1);
  const inTree = nodes.map(() => false);
  dist[ex.source] = 0;
  const rows: { taken: number; cells: string[] }[] = [];
  for (let k = 0; k < n; k++) {
    const candidates = nodes.map((_, v) => v).filter((v) => !inTree[v] && dist[v] < Infinity);
    const u = candidates.reduce((a, b) => (dist[b] < dist[a] ? b : a));
    inTree[u] = true;
    for (let v = 0; v < n; v++) {
      const c = w(u, v);
      if (c !== undefined && !inTree[v] && dist[u] + c < dist[v]) {
        dist[v] = dist[u] + c;
        prev[v] = u;
      }
    }
    rows.push({ taken: u, cells: nodes.map((_, v) => (inTree[v] ? "" : dist[v] === Infinity ? "inf" : `${dist[v]},${nodes[prev[v]]}`)) });
  }
  return { rows, dist, prev };
}

function floyd(ex: DijkstraExercise) {
  const n = ex.graph.nodes.length;
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
  for (const e of ex.graph.edges) d[e.a][e.b] = d[e.b][e.a] = Math.min(d[e.a][e.b], e.w);
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) d[i][j] = Math.min(d[i][j], d[i][k] + d[k][j]);
  return d;
}

for (let seed = 1; seed <= N; seed++) {
  const ex = generateDijkstra(seed);
  const where = `dijkstra graine ${seed}`;
  const n = ex.graph.nodes.length;
  expect(n >= 5 && n <= 7, `${where} : ${n} nœuds`);
  const ref = refDijkstra(ex);
  const fw = floyd(ex);
  expect(ex.rounds.length === n, `${where} : ${ex.rounds.length} rondes`);
  ex.rounds.forEach((round, r) => {
    expect(round.taken === ref.rows[r].taken, `${where} : ronde ${r + 1}, nœud pris`);
    round.cells.forEach((cell, v) => {
      const text = cell === null ? "" : cell.dist === Infinity ? "inf" : `${cell.dist},${ex.graph.nodes[cell.prev]}`;
      expect(text === ref.rows[r].cells[v], `${where} : ronde ${r + 1}, nœud ${ex.graph.nodes[v]} : ${text} au lieu de ${ref.rows[r].cells[v]}`);
      if (text && text !== "inf") expect(same(parseCell(text, ex.graph.nodes), { dist: cell!.dist, prev: cell!.prev }), `${where} : relecture de ${text}`);
    });
  });
  for (const entry of ex.fib) {
    expect(entry.cost === fw[ex.source][entry.node], `${where} : coût vers ${ex.graph.nodes[entry.node]}`);
    const link = ex.graph.edges.find(
      (e) => (e.a === ex.source && e.b === entry.nextHop) || (e.b === ex.source && e.a === entry.nextHop),
    );
    expect(link !== undefined, `${where} : next hop ${ex.graph.nodes[entry.nextHop]} non voisin de la source`);
    if (link) expect(link.w + fw[entry.nextHop][entry.node] === entry.cost, `${where} : next hop vers ${ex.graph.nodes[entry.node]} hors plus court chemin`);
  }
  expect(ex.fib.length === n - 1, `${where} : FIB incomplète`);
  const dijAnswer: Record<string, string> = {};
  ref.rows.forEach((row, r) => {
    dijAnswer[`t${r}`] = ex.graph.nodes[row.taken].toLowerCase();
    row.cells.forEach((c, v) => {
      if (v !== ex.source && c) dijAnswer[`c${r}-${v}`] = c.replace(",", ", ");
    });
  });
  for (const f of ex.fib) {
    dijAnswer[`fc${f.node}`] = String(f.cost);
    dijAnswer[`fh${f.node}`] = ex.graph.nodes[f.nextHop];
  }
  allOk(checkDijkstra(ex, dijAnswer), where);
}

console.log(`${checks} contrôles sur ${N} exercices de chaque type.`);
if (failures.length) {
  console.error(`${failures.length} échecs :\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("Tous les corrigés sont conformes.");
