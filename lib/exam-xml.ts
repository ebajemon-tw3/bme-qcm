// Exercice « XML vers JSON et YAML » (hta1p p. 24 à 26, « Possible exam question »).
// Règles du cours : la racine disparaît, un élément texte devient « clé: valeur », un nombre reste
// sans guillemets, une adresse IP ou un texte est une chaîne, une balise répétée devient une liste.

import type { CheckResult } from "@/lib/exam-check";
import { rng, type Rng } from "@/lib/exam-rng";

export type Scalar = string | number | boolean | null;
export type Value = Scalar | Value[] | { [key: string]: Value };
type Obj = { [key: string]: Value };

interface XNode {
  tag: string;
  text?: string | number;
  children?: XNode[];
}

export interface XmlExercise {
  seed: number;
  root: string;
  xml: string;
  expected: Obj;
  /** Chemin d'une liste (« options.dns ») vers le nom de la balise répétée. */
  listTags: Record<string, string>;
}

type Gen = (r: Rng) => string | number;
type Field = [string, Gen];

const HOSTS = ["labo-pc7", "edge1", "core-sw2", "web01", "ns1", "mail-gw", "db-backup", "printer3", "lab-ws12", "proxy2"];
const DOMAINS = ["bme.hu", "tmit.bme.hu", "example.org", "example.net", "vik.bme.hu"];
const MASKS = ["255.255.255.0", "255.255.240.0", "255.255.255.128", "255.255.252.0"];

function ip(r: Rng) {
  const kind = r.int(0, 3);
  if (kind === 0) return `192.168.${r.int(0, 254)}.${r.int(1, 254)}`;
  if (kind === 1) return `10.${r.int(0, 255)}.${r.int(0, 255)}.${r.int(1, 254)}`;
  if (kind === 2) return `172.${r.int(16, 31)}.${r.int(0, 255)}.${r.int(1, 254)}`;
  return `152.66.${r.int(0, 255)}.${r.int(1, 254)}`;
}

function cidr(r: Rng) {
  return `${ip(r)}/${r.pick([24, 25, 26, 28, 30])}`;
}

function network(r: Rng) {
  return r.pick([`10.${r.int(0, 255)}.0.0/16`, `192.168.${r.int(0, 255)}.0/24`, `172.${r.int(16, 31)}.0.0/16`, `152.66.${r.int(0, 255)}.0/24`]);
}

const fixed = (values: readonly (string | number)[]): Gen => (r) => r.pick(values);

interface ListSpec {
  key: string;
  item: string;
  /** « wrap » : conteneur dont tous les enfants portent la même balise. « repeat » : balise répétée parmi des sœurs. */
  form: "wrap" | "repeat";
  values?: Gen;
  fields?: Field[];
}

interface Kind {
  root: string;
  simple: Field[];
  compound: { tag: string; fields: Field[] };
  lists: ListSpec[];
}

const KINDS: Kind[] = [
  {
    root: "host",
    simple: [
      ["hostname", fixed(HOSTS)],
      ["ip", ip],
      ["prefix", (r) => r.int(16, 30)],
      ["mtu", fixed([1500, 9000, 1400])],
      ["vlan", (r) => r.int(2, 4000)],
      ["os", fixed(["Debian", "Ubuntu", "FreeBSD", "OpenBSD"])],
      ["room", fixed(["IE218", "IB144", "IE345"])],
    ],
    compound: {
      tag: "gateway",
      fields: [
        ["address", ip],
        ["interface", fixed(["eth0", "eth1", "wlan0"])],
        ["metric", (r) => r.int(1, 20)],
      ],
    },
    lists: [
      { key: "dns", item: "dns", form: "repeat", values: ip },
      { key: "services", item: "port", form: "wrap", values: fixed([22, 25, 53, 80, 443, 993]) },
      { key: "aliases", item: "alias", form: "wrap", values: fixed(HOSTS) },
    ],
  },
  {
    root: "lease",
    simple: [
      ["ip", ip],
      ["hostname", fixed(HOSTS)],
      ["duration", fixed([3600, 7200, 43200, 86400])],
      ["server", ip],
      ["state", fixed(["active", "expired", "offered"])],
      ["client", fixed(["dhclient", "systemd-networkd"])],
    ],
    compound: {
      tag: "options",
      fields: [
        ["router", ip],
        ["netmask", fixed(MASKS)],
        ["domain", fixed(DOMAINS)],
        ["timeServer", ip],
      ],
    },
    lists: [
      { key: "dns", item: "dns", form: "repeat", values: ip },
      { key: "ntp", item: "server", form: "wrap", values: ip },
    ],
  },
  {
    root: "router",
    simple: [
      ["name", fixed(["edge1", "core2", "border-r1", "lab-router"])],
      ["id", (r) => r.int(1, 99)],
      ["ospfArea", fixed(["0.0.0.0", "0.0.0.1", "0.0.0.2"])],
      ["asn", (r) => r.int(64512, 65534)],
      ["vendor", fixed(["BIRD", "FRRouting", "Quagga"])],
      ["uptime", (r) => r.int(100, 90000)],
    ],
    compound: {
      tag: "bgp",
      fields: [
        ["neighbor", ip],
        ["remoteAs", (r) => r.int(64512, 65534)],
        ["holdTime", fixed([90, 180])],
      ],
    },
    lists: [
      { key: "interfaces", item: "ifname", form: "wrap", values: fixed(["eth0", "eth1", "eth2", "wlan0", "lo"]) },
      {
        key: "interfaces",
        item: "interface",
        form: "wrap",
        fields: [
          ["name", fixed(["eth0", "eth1", "eth2", "wlan0"])],
          ["address", cidr],
          ["mtu", fixed([1500, 9000])],
        ],
      },
      { key: "protocols", item: "protocol", form: "wrap", values: fixed(["ospf", "rip", "bgp", "static"]) },
    ],
  },
  {
    root: "server",
    simple: [
      ["name", fixed(["www", "mail", "dns1", "proxy"])],
      ["address", ip],
      ["port", fixed([80, 443, 25, 53, 8080])],
      ["transport", fixed(["TCP", "UDP"])],
      ["software", fixed(["nginx", "Apache", "Kea", "Postfix", "Dovecot"])],
      ["workers", (r) => r.int(2, 16)],
    ],
    compound: {
      tag: "listen",
      fields: [
        ["address", ip],
        ["port", fixed([80, 443, 8443, 587, 993])],
        ["backlog", fixed([128, 256, 511])],
      ],
    },
    lists: [
      { key: "aliases", item: "alias", form: "wrap", values: (r) => `${r.pick(["www", "web", "static", "api"])}.${r.pick(DOMAINS)}` },
      { key: "allow", item: "allow", form: "repeat", values: network },
    ],
  },
  {
    root: "NTALecture",
    simple: [
      ["seq", (r) => r.int(1, 13)],
      ["title", fixed(["Protocols Practical", "IPv4 Practical", "Routing Practical", "TCP Practical"])],
      ["weekday", fixed(["Wednesday", "Thursday"])],
      ["pages", (r) => r.int(14, 26)],
      ["department", fixed(["TMIT"])],
    ],
    compound: {
      tag: "room",
      fields: [
        ["building", fixed(["IB", "IE"])],
        ["number", (r) => r.int(100, 450)],
        ["seats", (r) => r.int(30, 200)],
      ],
    },
    lists: [
      { key: "slides", item: "SlideTitle", form: "wrap", values: fixed(["Title", "Practical", "Buckets", "Multiplexing", "Serialization", "Headers"]) },
      { key: "topic", item: "topic", form: "repeat", values: fixed(["TLV", "JSON", "YAML", "XML", "QoS"]) },
    ],
  },
  {
    root: "zone",
    simple: [
      ["name", fixed(DOMAINS)],
      ["ttl", fixed([300, 3600, 86400])],
      ["serial", (r) => 2026100100 + r.int(0, 3099)],
      ["admin", (r) => `hostmaster.${r.pick(DOMAINS)}`],
      ["primary", (r) => `ns1.${r.pick(DOMAINS)}`],
    ],
    compound: {
      tag: "soa",
      fields: [
        ["refresh", fixed([3600, 7200])],
        ["retry", fixed([600, 900])],
        ["expire", fixed([604800, 1209600])],
      ],
    },
    lists: [
      { key: "ns", item: "ns", form: "repeat", values: (r) => `ns${r.int(1, 4)}.${r.pick(DOMAINS)}` },
      {
        key: "records",
        item: "record",
        form: "wrap",
        fields: [
          ["name", fixed(["www", "mail", "ftp", "vpn"])],
          ["type", fixed(["A"])],
          ["address", ip],
        ],
      },
    ],
  },
];

function subset<T>(r: Rng, items: T[], min: number, max: number) {
  const count = r.int(min, Math.min(max, items.length));
  const keep = new Set(r.shuffle(items.map((_, i) => i)).slice(0, count));
  return items.filter((_, i) => keep.has(i));
}

function distinct(r: Rng, gen: Gen, count: number) {
  const out: (string | number)[] = [];
  for (let guard = 0; out.length < count && guard < 50; guard++) {
    const v = gen(r);
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

function leaf(tag: string, value: string | number): XNode {
  return { tag, text: value };
}

function xmlOf(node: XNode, depth = 0): string {
  const pad = "  ".repeat(depth);
  if (node.children === undefined) return `${pad}<${node.tag}>${node.text}</${node.tag}>`;
  return [`${pad}<${node.tag}>`, ...node.children.map((c) => xmlOf(c, depth + 1)), `${pad}</${node.tag}>`].join("\n");
}

export function generateXml(seed: number): XmlExercise {
  const r = rng(seed);
  const kind = r.pick(KINDS);
  const listTags: Record<string, string> = {};
  const rootNodes: XNode[] = [];
  const expected: Obj = {};

  for (const [tag, gen] of subset(r, kind.simple, 3, 6)) {
    const v = gen(r);
    rootNodes.push(leaf(tag, v));
    expected[tag] = v;
  }

  const compoundNode: XNode = { tag: kind.compound.tag, children: [] };
  const compoundValue: Obj = {};
  for (const [tag, gen] of subset(r, kind.compound.fields, 2, 3)) {
    const v = gen(r);
    compoundNode.children!.push(leaf(tag, v));
    compoundValue[tag] = v;
  }

  const list = r.pick(kind.lists);
  const count = r.int(2, list.fields ? 3 : 4);
  const items: Value[] = [];
  const itemNodes: XNode[] = [];
  if (list.fields) {
    const names = distinct(r, list.fields[0][1], count);
    const fields = [list.fields[0], ...subset(r, list.fields.slice(1), 1, 2)];
    for (const name of names) {
      const value: Obj = {};
      const node: XNode = { tag: list.item, children: [] };
      for (const [tag, gen] of fields) {
        const v = tag === fields[0][0] ? name : gen(r);
        value[tag] = v;
        node.children!.push(leaf(tag, v));
      }
      items.push(value);
      itemNodes.push(node);
    }
  } else {
    for (const v of distinct(r, list.values!, count)) {
      items.push(v);
      itemNodes.push(leaf(list.item, v));
    }
  }

  const inCompound = list.form === "repeat" && r.chance(0.5);
  if (inCompound) {
    compoundNode.children!.push(...itemNodes);
    compoundValue[list.key] = items;
    listTags[`${kind.compound.tag}.${list.key}`] = list.item;
  } else {
    listTags[list.key] = list.item;
  }

  const blocks: { nodes: XNode[]; key: string; value: Value }[] = [
    { nodes: [compoundNode], key: kind.compound.tag, value: compoundValue },
  ];
  if (!inCompound) {
    blocks.push({
      nodes: list.form === "wrap" ? [{ tag: list.key, children: itemNodes }] : itemNodes,
      key: list.key,
      value: items,
    });
  }
  for (const block of r.shuffle(blocks)) {
    rootNodes.push(...block.nodes);
    expected[block.key] = block.value;
  }

  const xml = xmlOf({ tag: kind.root, children: rootNodes });
  return { seed, root: kind.root, xml, expected, listTags };
}

// Corrigés ----------------------------------------------------------------------------------------

function isObj(v: Value): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function inlineJson(v: Value): string {
  if (Array.isArray(v)) return `[${v.map(inlineJson).join(", ")}]`;
  if (isObj(v)) return `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inlineJson(x)}`).join(", ")} }`;
  return JSON.stringify(v);
}

export function toJson(v: Value, depth = 0): string {
  const pad = "  ".repeat(depth + 1);
  const end = "  ".repeat(depth);
  if (Array.isArray(v)) {
    if (v.every((x) => !isObj(x) && !Array.isArray(x)) && inlineJson(v).length <= 40) return inlineJson(v);
    return `[\n${v.map((x) => pad + inlineJson(x)).join(",\n")}\n${end}]`;
  }
  if (isObj(v)) {
    return `{\n${Object.entries(v)
      .map(([k, x]) => `${pad}${JSON.stringify(k)}: ${toJson(x, depth + 1)}`)
      .join(",\n")}\n${end}}`;
  }
  return JSON.stringify(v);
}

function yamlScalar(v: Scalar): string {
  if (typeof v !== "string") return String(v);
  const risky =
    v === "" ||
    /^[-?:,[\]{}#&*!|>'"%@`\s]/.test(v) ||
    /(: |\s#)/.test(v) ||
    /\s$/.test(v) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(v) ||
    /^[-+]?(\d+|\d*\.\d+)$/.test(v);
  return risky ? JSON.stringify(v) : v;
}

export function toYaml(v: Value, depth = 0): string {
  const pad = "  ".repeat(depth);
  const lines: string[] = [];
  if (isObj(v)) {
    for (const [k, x] of Object.entries(v)) {
      if (Array.isArray(x) || isObj(x)) {
        lines.push(`${pad}${k}:`, toYaml(x, depth + 1));
      } else {
        lines.push(`${pad}${k}: ${yamlScalar(x)}`);
      }
    }
  } else if (Array.isArray(v)) {
    for (const x of v) {
      if (isObj(x)) {
        const inner = toYaml(x, depth + 1).split("\n");
        lines.push(`${pad}- ${inner[0].trimStart()}`, ...inner.slice(1));
      } else if (Array.isArray(x)) {
        lines.push(`${pad}-`, toYaml(x, depth + 1));
      } else {
        lines.push(`${pad}- ${yamlScalar(x)}`);
      }
    }
  } else {
    lines.push(pad + yamlScalar(v));
  }
  return lines.join("\n");
}

// Parseur YAML du sous-ensemble utile ---------------------------------------------------------------

export class YamlError extends Error {
  constructor(
    message: string,
    public line: number,
  ) {
    super(`ligne ${line} : ${message}`);
  }
}

interface Line {
  n: number;
  indent: number;
  text: string;
}

function stripComment(text: string) {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === "#" && (i === 0 || /\s/.test(text[i - 1]))) {
      return text.slice(0, i).trimEnd();
    }
  }
  return text.trimEnd();
}

export function yamlScalarValue(raw: string, n: number): Value {
  const s = raw.trim();
  if (s.startsWith('"')) {
    if (!s.endsWith('"') || s.length < 2) throw new YamlError("guillemet ouvrant sans guillemet fermant.", n);
    try {
      return JSON.parse(s) as string;
    } catch {
      return s.slice(1, -1);
    }
  }
  if (s.startsWith("'")) {
    if (!s.endsWith("'") || s.length < 2) throw new YamlError("apostrophe ouvrante sans apostrophe fermante.", n);
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (s.startsWith("[")) {
    if (!s.endsWith("]")) throw new YamlError("crochet ouvrant sans crochet fermant.", n);
    const body = s.slice(1, -1).trim();
    return body ? body.split(",").map((part) => yamlScalarValue(part, n)) : [];
  }
  if (s.startsWith("{")) {
    throw new YamlError("la notation en ligne { } existe en YAML mais ce correcteur attend l'indentation.", n);
  }
  if (/^[-+]?\d+$/.test(s)) return Number(s);
  if (/^[-+]?\d*\.\d+$/.test(s)) return Number(s);
  if (/^(true|false)$/.test(s)) return s === "true";
  if (s === "" || s === "~" || s === "null") return null;
  return s;
}

function splitKey(line: Line): { key: string; rest: string } {
  const text = line.text;
  let key: string;
  let rest: string;
  const quoted = text.match(/^("[^"]*"|'[^']*')\s*:(\s+(.*))?$/);
  if (quoted) {
    key = quoted[1].slice(1, -1);
    rest = quoted[3] ?? "";
    return { key, rest };
  }
  const sep = text.search(/:(\s|$)/);
  if (sep === -1) {
    if (text.includes(":")) throw new YamlError(`espace manquant après « : » dans « ${text} ».`, line.n);
    throw new YamlError(`« clé: valeur » attendu, lu « ${text} ».`, line.n);
  }
  key = text.slice(0, sep).trim();
  rest = text.slice(sep + 1).trim();
  if (!key) throw new YamlError("clé vide avant « : ».", line.n);
  return { key, rest };
}

class YamlReader {
  i = 0;
  constructor(private lines: Line[]) {}

  peek() {
    return this.lines[this.i];
  }

  isItem(line: Line) {
    return line.text === "-" || line.text.startsWith("- ");
  }

  block(indent: number): Value {
    const first = this.peek();
    return this.isItem(first) ? this.sequence(indent, false) : this.mapping(indent);
  }

  child(parentIndent: number, allowSameIndentList: boolean): Value {
    const next = this.peek();
    if (!next) return null;
    if (next.indent > parentIndent) return this.block(next.indent);
    if (allowSameIndentList && next.indent === parentIndent && this.isItem(next)) return this.sequence(parentIndent, true);
    return null;
  }

  mapping(indent: number): Obj {
    const out: Obj = {};
    while (this.i < this.lines.length) {
      const line = this.peek();
      if (line.indent < indent) break;
      if (line.indent > indent) {
        throw new YamlError("indentation incohérente : la ligne ne s'aligne ni sur le bloc au-dessus ni sur son parent.", line.n);
      }
      if (this.isItem(line)) {
        throw new YamlError("élément de liste « - » sans clé parente à ce niveau.", line.n);
      }
      const { key, rest } = splitKey(line);
      if (key in out) {
        throw new YamlError(`clé « ${key} » déjà définie dans ce bloc. Une balise répétée devient une seule clé suivie d'une liste « - ».`, line.n);
      }
      this.i++;
      out[key] = rest ? yamlScalarValue(rest, line.n) : this.child(indent, true);
      const next = this.peek();
      if (next && next.indent > indent && rest) {
        throw new YamlError(`indentation inattendue : « ${key} » a déjà une valeur sur sa ligne.`, next.n);
      }
    }
    return out;
  }

  // sameIndent : liste écrite au niveau de sa clé (« key: » puis « - a » sans retrait), valide en YAML.
  sequence(indent: number, sameIndent: boolean): Value[] {
    const out: Value[] = [];
    while (this.i < this.lines.length) {
      const line = this.peek();
      if (line.indent < indent) break;
      if (line.indent > indent) throw new YamlError("indentation inattendue dans la liste.", line.n);
      if (!this.isItem(line)) {
        if (sameIndent) break;
        if (/:(\s|$)/.test(line.text)) {
          throw new YamlError("clé au niveau des tirets : les clés d'un élément de liste s'alignent sur le texte qui suit « - ».", line.n);
        }
        throw new YamlError(`élément de liste attendu (« - valeur »), lu « ${line.text} ».`, line.n);
      }
      const rest = line.text === "-" ? "" : line.text.slice(2);
      const offset = line.text.length - rest.trimStart().length;
      const body = rest.trim();
      if (!body) {
        this.i++;
        out.push(this.child(indent, false));
      } else if (/^[^"'[{].*?:(\s|$)/.test(body) || /^("[^"]*"|'[^']*')\s*:(\s|$)/.test(body)) {
        this.lines[this.i] = { n: line.n, indent: indent + offset, text: body };
        out.push(this.mapping(indent + offset));
      } else {
        this.i++;
        out.push(yamlScalarValue(body, line.n));
      }
    }
    return out;
  }
}

export function parseYaml(source: string): Value {
  const lines: Line[] = [];
  source.split(/\r?\n/).forEach((raw, idx) => {
    const n = idx + 1;
    const lead = raw.match(/^[ \t]*/)![0];
    if (lead.includes("\t")) throw new YamlError("tabulation dans l'indentation : YAML n'accepte que des espaces.", n);
    const text = stripComment(raw.slice(lead.length));
    if (!text || text === "---" || text === "...") return;
    lines.push({ n, indent: lead.length, text });
  });
  if (lines.length === 0) throw new YamlError("document vide.", 1);
  const reader = new YamlReader(lines);
  const base = lines[0].indent;
  const value = reader.block(base);
  const left = reader.peek();
  if (left) {
    throw new YamlError(
      left.indent < base
        ? "indentation plus faible que la première ligne."
        : "indentation incohérente : la ligne ne s'aligne sur aucun niveau au-dessus.",
      left.n,
    );
  }
  return value;
}

// Vérification --------------------------------------------------------------------------------------

export interface ConversionCheck {
  ok: boolean;
  messages: string[];
  notes: string[];
}

function lineOf(text: string, index: number) {
  return text.slice(0, index).split("\n").length;
}

function jsonSyntaxHints(text: string): string[] {
  const hints: string[] = [];
  const trailing = /,\s*[}\]]/.exec(text);
  if (trailing) hints.push(`ligne ${lineOf(text, trailing.index)} : virgule finale avant « ${trailing[0].trim().slice(-1)} », interdite en JSON.`);
  const single = /'[^'\n]*'/.exec(text);
  if (single) hints.push(`ligne ${lineOf(text, single.index)} : JSON n'accepte que les guillemets doubles (${single[0]}).`);
  const bareKey = /(^|[{,])\s*([A-Za-z_][\w-]*)\s*:/m.exec(text);
  if (bareKey) hints.push(`ligne ${lineOf(text, bareKey.index + bareKey[0].indexOf(bareKey[2]))} : clé sans guillemets (${bareKey[2]}), écrire "${bareKey[2]}".`);
  const bareIp = /[:[,]\s*(\d+\.\d+\.\d+\.\d+(\/\d+)?)/.exec(text);
  if (bareIp) hints.push(`ligne ${lineOf(text, bareIp.index)} : ${bareIp[1]} n'est pas un nombre, une adresse IP s'écrit entre guillemets.`);
  const bareText = /:\s*([A-Za-z][^,\n}\]]*)/.exec(text);
  if (bareText && !/^(true|false|null)\b/.test(bareText[1])) {
    hints.push(`ligne ${lineOf(text, bareText.index)} : texte sans guillemets (${bareText[1].trim()}), l'écrire entre guillemets.`);
  }
  return hints;
}

function duplicateJsonKeys(text: string): string[] {
  const found: string[] = [];
  const stack: (Set<string> | null)[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      const raw = text.slice(i, j + 1);
      const after = text.slice(j + 1).match(/^\s*:/);
      const top = stack[stack.length - 1];
      if (after && top) {
        const key = JSON.parse(raw) as string;
        if (top.has(key)) found.push(key);
        top.add(key);
      }
      i = j;
    } else if (c === "{") stack.push(new Set());
    else if (c === "[") stack.push(null);
    else if (c === "}" || c === "]") stack.pop();
  }
  return [...new Set(found)];
}

const show = (path: string) => path || "(racine)";

function describe(v: Value) {
  if (Array.isArray(v)) return "une liste";
  if (isObj(v)) return "un objet";
  if (v === null) return "une valeur vide";
  return typeof v === "number" ? `le nombre ${v}` : `"${v}"`;
}

function compare(expected: Value, actual: Value, path: string, ex: XmlExercise, out: string[]) {
  if (out.length >= 8) return;
  const here = show(path);
  if (Array.isArray(expected)) {
    const tag = ex.listTags[path];
    if (!Array.isArray(actual)) {
      if (isObj(actual) && tag && Object.keys(actual).length === 1 && tag in actual) {
        out.push(`${here} : la balise répétée <${tag}> disparaît, ${path} est directement la liste (hta1p p. 25).`);
      } else if (actual !== null && !isObj(actual)) {
        out.push(`${here} : une seule valeur lue. La balise <${tag}> répétée donne une liste de ${expected.length} éléments.`);
      } else {
        out.push(`${here} : liste attendue (balise <${tag}> répétée), lu ${describe(actual)}.`);
      }
      return;
    }
    if (actual.length !== expected.length) {
      out.push(`${here} : ${expected.length} éléments attendus, ${actual.length} lus.`);
      return;
    }
    expected.forEach((x, i) => compare(x, actual[i], `${path}[${i}]`, ex, out));
    return;
  }
  if (isObj(expected)) {
    if (!isObj(actual)) {
      out.push(`${here} : objet attendu (élément composé), lu ${describe(actual)}.`);
      return;
    }
    for (const key of Object.keys(expected)) {
      const sub = path ? `${path}.${key}` : key;
      if (!(key in actual)) {
        const near = Object.keys(actual).find((k) => k.toLowerCase() === key.toLowerCase());
        out.push(near ? `${sub} : la casse compte, écrire ${key} et non ${near}.` : `clé manquante : ${sub}.`);
        continue;
      }
      compare(expected[key], actual[key], sub, ex, out);
    }
    for (const key of Object.keys(actual)) {
      if (key in expected || Object.keys(expected).some((k) => k.toLowerCase() === key.toLowerCase())) continue;
      const sub = path ? `${path}.${key}` : key;
      const listOwner = Object.entries(ex.listTags).find(([, tag]) => tag === key);
      out.push(
        listOwner
          ? `${sub} : clé inattendue. La balise répétée <${key}> ne devient pas une clé, ${listOwner[0]} est directement la liste.`
          : `clé inattendue : ${sub}.`,
      );
    }
    return;
  }
  if (typeof expected === "number") {
    if (actual === expected) return;
    if (typeof actual === "string" && actual.trim() === String(expected)) {
      out.push(`${here} : ${expected} est un nombre, l'écrire sans guillemets.`);
    } else {
      out.push(`${here} : attendu ${expected}, lu ${describe(actual)}.`);
    }
    return;
  }
  if (actual === expected) return;
  if (typeof actual === "number" && String(actual) === expected) {
    out.push(`${here} : "${expected}" est du texte, l'écrire entre guillemets.`);
  } else {
    out.push(`${here} : attendu ${describe(expected)}, lu ${describe(actual)}.`);
  }
}

function unwrapRoot(ex: XmlExercise, actual: Value, notes: string[]): Value {
  if (isObj(actual) && Object.keys(actual).length === 1 && ex.root in actual && isObj(actual[ex.root])) {
    notes.push(`Racine <${ex.root}> gardée comme clé : accepté. Le cours la supprime (hta1p p. 25).`);
    return actual[ex.root];
  }
  return actual;
}

export function checkJson(ex: XmlExercise, text: string): ConversionCheck {
  const notes: string[] = [];
  if (!text.trim()) return { ok: false, messages: ["Zone vide."], notes };
  let parsed: Value;
  try {
    parsed = JSON.parse(text) as Value;
  } catch (error) {
    const hints = jsonSyntaxHints(text);
    return {
      ok: false,
      messages: hints.length ? hints : [`JSON invalide : ${(error as Error).message}`],
      notes,
    };
  }
  const dup = duplicateJsonKeys(text);
  if (dup.length) {
    return {
      ok: false,
      messages: dup.map(
        (k) => `clé "${k}" répétée dans un même objet : la seconde écrase la première. Une balise répétée devient une seule clé dont la valeur est une liste.`,
      ),
      notes,
    };
  }
  const messages: string[] = [];
  compare(ex.expected, unwrapRoot(ex, parsed, notes), "", ex, messages);
  return { ok: messages.length === 0, messages, notes };
}

export function checkYaml(ex: XmlExercise, text: string): ConversionCheck {
  const notes: string[] = [];
  if (!text.trim()) return { ok: false, messages: ["Zone vide."], notes };
  if (/^\s*[{[]/.test(text)) {
    return { ok: false, messages: ["Notation JSON : valide en YAML, mais l'exercice attend la notation par indentation (hta1p p. 26)."], notes };
  }
  let parsed: Value;
  try {
    parsed = parseYaml(text);
  } catch (error) {
    return { ok: false, messages: [error instanceof YamlError ? error.message : String(error)], notes };
  }
  const messages: string[] = [];
  compare(ex.expected, unwrapRoot(ex, parsed, notes), "", ex, messages);
  return { ok: messages.length === 0, messages, notes };
}

export function checkXml(ex: XmlExercise, value: Record<string, string>): CheckResult {
  return {
    json: { ok: checkJson(ex, value.json ?? "").ok },
    yaml: { ok: checkYaml(ex, value.yaml ?? "").ok },
  };
}
