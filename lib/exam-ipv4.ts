// Exercices IPv4 : adressage d'un sous-réseau (hta2p p. 6, 7, 11, 12) et plus long préfixe
// (hta2p p. 13 et 14). Toute l'arithmétique est entière, sur des adresses non signées 32 bits.

import type { CheckResult } from "@/lib/exam-check";
import { rng, type Rng } from "@/lib/exam-rng";

export function maskOf(prefix: number) {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

export function toIp(n: number) {
  return [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
}

export function octets(n: number) {
  return [24, 16, 8, 0].map((s) => (n >>> s) & 255);
}

export function bin8(n: number) {
  return n.toString(2).padStart(8, "0");
}

/** Adresse décimale pointée stricte, ou null. */
export function parseIp(text: string): number | null {
  const m = text.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return parts.reduce((acc, p) => acc * 256 + p, 0);
}

/** « a.b.c.d/n » ou « a.b.c.d » (le préfixe est alors celui attendu). */
export function parseCidr(text: string): { ip: number; prefix: number | null } | null {
  const [addr, len, extra] = text.trim().split("/");
  if (extra !== undefined) return null;
  const ip = parseIp(addr ?? "");
  if (ip === null) return null;
  if (len === undefined) return { ip, prefix: null };
  if (!/^\d{1,2}$/.test(len.trim()) || Number(len) > 32) return null;
  return { ip, prefix: Number(len) };
}

export function parseCount(text: string): number | null {
  const clean = text.replace(/[\s  '.]/g, "");
  return /^\d+$/.test(clean) ? Number(clean) : null;
}

// Adressage d'un sous-réseau --------------------------------------------------------------------------

export type CandidateKind = "host" | "network" | "broadcast" | "below" | "above" | "far" | "invalid";

export interface Candidate {
  text: string;
  kind: CandidateKind;
  valid: boolean;
  same: boolean;
  assignable: boolean;
  /** Réseau de l'adresse quand elle est valide. */
  network: number | null;
}

export interface SubnetExercise {
  seed: number;
  address: number;
  prefix: number;
  mask: number;
  network: number;
  broadcast: number;
  hosts: number;
  candidates: Candidate[];
}

function firstOctet(r: Rng) {
  const kind = r.int(0, 3);
  if (kind === 0) return { base: (10 << 24) >>> 0, fixed: 8, min: 9 };
  if (kind === 1) return { base: ((172 << 24) | (16 << 16)) >>> 0, fixed: 12, min: 13 };
  if (kind === 2) return { base: ((192 << 24) | (168 << 16)) >>> 0, fixed: 16, min: 17 };
  const first = r.pick([62, 84, 98, 130, 145, 152, 170, 185, 193, 200, 212]);
  return { base: (first << 24) >>> 0, fixed: 8, min: 12 };
}

function randomPrefix(r: Rng, min: number) {
  for (;;) {
    const p = r.chance(0.75) ? r.int(Math.max(min, 17), 30) : r.int(min, 30);
    if (p % 8 !== 0 || r.chance(0.15)) return p;
  }
}

export function generateSubnet(seed: number): SubnetExercise {
  const r = rng(seed);
  const { base, fixed, min } = firstOctet(r);
  const prefix = randomPrefix(r, min);
  const randomPart = Math.floor(r.next() * 2 ** (32 - fixed)) >>> 0;
  const raw = (base | randomPart) >>> 0;
  const mask = maskOf(prefix);
  const network = (raw & mask) >>> 0;
  const size = 2 ** (32 - prefix);
  const address = network + r.int(1, size - 2);
  const broadcast = network + size - 1;

  const make = (kind: CandidateKind): Candidate | null => {
    let n: number;
    switch (kind) {
      case "host": {
        const offset = r.int(1, size - 3);
        n = network + (offset >= address - network ? offset + 1 : offset);
        return { text: toIp(n), kind, valid: true, same: true, assignable: true, network };
      }
      case "network":
        return { text: toIp(network), kind, valid: true, same: true, assignable: false, network };
      case "broadcast":
        return { text: toIp(broadcast), kind, valid: true, same: true, assignable: false, network };
      case "below":
        n = network - r.int(1, Math.min(size, 600));
        return { text: toIp(n), kind, valid: true, same: false, assignable: false, network: (n & mask) >>> 0 };
      case "above":
        n = broadcast + r.int(1, Math.min(size, 600));
        return { text: toIp(n), kind, valid: true, same: false, assignable: false, network: (n & mask) >>> 0 };
      case "far": {
        const parts = octets(address);
        const i = prefix > 16 ? r.int(0, 1) : 0;
        parts[i] = parts[i] === 255 ? 254 : parts[i] + 1;
        n = parts.reduce((acc, p) => acc * 256 + p, 0);
        return { text: parts.join("."), kind, valid: true, same: false, assignable: false, network: (n & mask) >>> 0 };
      }
      case "invalid": {
        const parts: (number | string)[] = octets(network + r.int(1, size - 2));
        parts[r.int(Math.min(3, Math.floor(prefix / 8)), 3)] = r.int(256, 399);
        return { text: parts.join("."), kind, valid: false, same: false, assignable: false, network: null };
      }
    }
  };

  const wanted: CandidateKind[] = ["host", r.pick(["network", "broadcast"] as const), r.pick(["below", "above"] as const)];
  if (r.chance(0.7)) wanted.push("invalid");
  const extra = r.shuffle<CandidateKind>(["host", "network", "broadcast", "below", "above", "far"]);
  const total = r.int(4, 6);
  const candidates: Candidate[] = [];
  for (const kind of [...wanted, ...extra, "host", "host", "far"] as CandidateKind[]) {
    if (candidates.length >= total) break;
    const c = make(kind);
    if (c && c.text !== toIp(address) && !candidates.some((x) => x.text === c.text)) candidates.push(c);
  }

  return {
    seed,
    address,
    prefix,
    mask,
    network,
    broadcast,
    hosts: size - 2,
    candidates: r.shuffle(candidates),
  };
}

/** Index de l'octet qui contient la frontière réseau/hôte, ou null si le préfixe est un multiple de 8. */
export function partialOctet(prefix: number) {
  return prefix % 8 === 0 ? null : Math.floor(prefix / 8);
}

// Plus long préfixe --------------------------------------------------------------------------------------

export interface LpmLine {
  /** Adresse telle qu'écrite dans la table (bits hôtes éventuellement non nuls). */
  written: number;
  prefix: number;
  iface: string;
  /** Réseau réel : adresse écrite ET masque. */
  network: number;
}

export interface LpmDestination {
  address: number;
  /** Index des lignes qui correspondent, sans la route par défaut. */
  matches: number[];
  /** Index de la ligne gagnante, -1 pour la route par défaut. */
  winner: number;
  iface: string;
}

export interface LpmExercise {
  seed: number;
  lines: LpmLine[];
  defaultIface: string;
  destinations: LpmDestination[];
  /** Index de la ligne mal écrite (variante), sinon null. */
  malformed: number | null;
}

export function lpmMatches(lines: LpmLine[], address: number) {
  return lines.flatMap((l, i) => (((address & maskOf(l.prefix)) >>> 0) === l.network ? [i] : []));
}

export function lpmWinner(lines: LpmLine[], matches: number[]) {
  return matches.reduce((best, i) => (best === -1 || lines[i].prefix > lines[best].prefix ? i : best), -1);
}

function prefixChain(r: Rng): number[] {
  const zone = r.int(0, 2);
  if (zone === 0) {
    const a = r.int(9, 11);
    const b = a + r.int(1, 2);
    return [a, b, Math.min(16, b + r.int(1, 3))];
  }
  if (zone === 1) {
    const a = r.int(16, 19);
    const b = a + r.int(1, 2);
    return [a, b, Math.min(24, b + r.int(1, 3))];
  }
  const a = r.int(11, 13);
  const b = a + r.int(1, 2);
  return [a, b, r.int(17, 20)];
}

function inside(r: Rng, line: LpmLine) {
  return (line.network + Math.floor(r.next() * 2 ** (32 - line.prefix))) >>> 0;
}

export function generateLpm(seed: number): LpmExercise {
  const r = rng(seed);
  for (;;) {
    const ex = tryLpm(r, seed);
    if (ex) return ex;
  }
}

function tryLpm(r: Rng, seed: number): LpmExercise | null {
  const first = r.pick([62, 84, 98, 130, 145, 152, 170, 185, 193, 200, 212]);
  const x = ((first << 24) | Math.floor(r.next() * 2 ** 24)) >>> 0;
  const chain = prefixChain(r);
  const nets = chain.map((p) => ({ prefix: p, network: (x & maskOf(p)) >>> 0 }));

  const j = r.int(0, 2);
  const flip = 2 ** (32 - nets[j].prefix);
  nets.push({ prefix: nets[j].prefix, network: (nets[j].network ^ flip) >>> 0 });
  if (r.chance(0.5)) {
    const p = Math.min(nets[0].prefix + r.int(2, 4), 26);
    const outsideChain = (nets[0].network | (~x & (2 ** (32 - nets[0].prefix) - 1))) >>> 0;
    const net = (outsideChain & maskOf(p)) >>> 0;
    if (!nets.some((n) => n.network === net && n.prefix === p)) nets.push({ prefix: p, network: net });
  }

  const ifaces = r.shuffle(["eth0", "eth1", "eth2", "eth3", "eth4", "eth5", "eth6", "eth7"]);
  const lines: LpmLine[] = r.shuffle(nets).map((n, i) => ({ ...n, written: n.network, iface: ifaces[i] }));
  const defaultIface = ifaces[lines.length];

  let malformed: number | null = null;
  if (r.chance(0.4)) {
    const options = lines.map((l, i) => [l, i] as const).filter(([l]) => l.prefix % 8 !== 0 && 8 - (l.prefix % 8) >= 2);
    if (options.length) {
      const [line, i] = r.pick(options);
      const hostBits = 8 - (line.prefix % 8);
      const shift = 24 - Math.floor(line.prefix / 8) * 8;
      const noise = r.int(1, 2 ** hostBits - 1) * 2 ** shift;
      line.written = (line.network + noise) >>> 0;
      malformed = i;
    }
  }

  const destinations: LpmDestination[] = [];
  const targets = r.shuffle(lines.map((_, i) => i));
  const want = r.int(2, 3);
  for (const t of targets) {
    if (destinations.length >= want) break;
    for (let guard = 0; guard < 60; guard++) {
      const address = inside(r, lines[t]);
      const matches = lpmMatches(lines, address);
      if (lpmWinner(lines, matches) === t) {
        destinations.push({ address, matches, winner: t, iface: lines[t].iface });
        break;
      }
    }
  }
  for (let guard = 0; guard < 60; guard++) {
    const lead = guard < 30 ? first : r.pick([62, 84, 98, 130, 145, 152, 170, 185, 193, 200, 212].filter((f) => f !== first));
    const address = ((lead << 24) | Math.floor(r.next() * 2 ** 24)) >>> 0;
    const matches = lpmMatches(lines, address);
    if (matches.length === 0) {
      destinations.push({ address, matches, winner: -1, iface: defaultIface });
      break;
    }
  }
  if (destinations.length < 3 || new Set(destinations.map((d) => d.address)).size !== destinations.length) return null;
  return { seed, lines, defaultIface, destinations: r.shuffle(destinations), malformed };
}

// Correction ---------------------------------------------------------------------------------------

function checkAddress(text: string, expected: number, prefix: number | null): { value: number | null; error?: string } {
  if (!text.trim()) return { value: null, error: "Champ vide." };
  const parsed = prefix === null ? { ip: parseIp(text), prefix: null } : parseCidr(text);
  if (!parsed || parsed.ip === null) return { value: null, error: "Format attendu : a.b.c.d, chaque octet de 0 à 255." };
  if (prefix !== null && parsed.prefix !== null && parsed.prefix !== prefix) {
    return { value: parsed.ip, error: `Le préfixe reste /${prefix}.` };
  }
  return { value: parsed.ip, error: parsed.ip === expected ? undefined : "" };
}

export function checkSubnet(ex: SubnetExercise, value: Record<string, string>): CheckResult {
  const out: CheckResult = {};
  const size = 2 ** (32 - ex.prefix);
  const k = partialOctet(ex.prefix);
  const block = k === null ? null : 2 ** (8 - (ex.prefix % 8));

  const mask = checkAddress(value.mask ?? "", ex.mask, null);
  out.mask = {
    ok: mask.error === undefined,
    hint: mask.error || (mask.error === "" ? `Masque d'un /${ex.prefix} : ${ex.prefix} bits à 1 puis ${32 - ex.prefix} bits à 0.` : undefined),
  };

  const net = checkAddress(value.net ?? "", ex.network, ex.prefix);
  let netHint = net.error;
  if (net.error === "" && net.value !== null) {
    if (net.value === ex.address) netHint = "C'est l'adresse de l'hôte : mettre ses bits hôtes à 0.";
    else if (k !== null && block !== null && octets(net.value)[k] % block !== 0) {
      netHint = `L'octet ${k + 1} du réseau est un multiple de la taille de bloc (${block}).`;
    } else netHint = "Ce n'est pas le bloc qui contient l'adresse de l'hôte.";
  }
  out.net = { ok: net.error === undefined, hint: netHint };

  const bc = checkAddress(value.bc ?? "", ex.broadcast, null);
  let bcHint = bc.error;
  if (bc.error === "" && bc.value !== null) {
    if (bc.value === ex.broadcast + 1) bcHint = "C'est le réseau suivant : le broadcast est l'adresse juste avant.";
    else if (bc.value === ex.network) bcHint = "C'est l'adresse du réseau : le broadcast met les bits hôtes à 1.";
    else bcHint = "Broadcast : adresse du réseau avec tous les bits hôtes à 1.";
  }
  out.bc = { ok: bc.error === undefined, hint: bcHint };

  const hosts = parseCount(value.hosts ?? "");
  out.hosts = {
    ok: hosts === ex.hosts,
    hint:
      hosts === null
        ? "Nombre entier attendu."
        : hosts === ex.hosts
          ? undefined
          : hosts === size
            ? "Retirer l'adresse du réseau et le broadcast (moins 2)."
            : `2 puissance (32 moins ${ex.prefix}), moins 2.`,
  };

  ex.candidates.forEach((c, i) => {
    const valid = value[`c${i}-valid`];
    out[`c${i}-valid`] = { ok: valid === (c.valid ? "yes" : "no") };
    if (!c.valid) return;
    out[`c${i}-same`] = { ok: value[`c${i}-same`] === (c.same ? "yes" : "no") };
    out[`c${i}-assign`] = { ok: value[`c${i}-assign`] === (c.assignable ? "yes" : "no") };
  });
  return out;
}

export function checkLpm(ex: LpmExercise, value: Record<string, string>): CheckResult {
  const out: CheckResult = {};
  ex.destinations.forEach((d, i) => {
    const chosen = value[`d${i}`] ?? "";
    let hint: string | undefined;
    if (!chosen) hint = "Choisir une interface.";
    else if (chosen !== d.iface) {
      const line = ex.lines.findIndex((l) => l.iface === chosen);
      if (line === -1) hint = d.matches.length ? "Une ligne correspond : la route par défaut ne sert qu'en dernier recours." : undefined;
      else if (d.matches.includes(line)) hint = `La ligne ${line + 1} correspond, mais une ligne plus longue correspond aussi.`;
      else hint = `La ligne ${line + 1} ne correspond pas : comparer ses ${ex.lines[line].prefix} premiers bits.`;
    }
    out[`d${i}`] = { ok: chosen === d.iface, hint };
  });
  if (ex.malformed !== null) {
    const line = ex.lines[ex.malformed];
    out["bad-line"] = { ok: value["bad-line"] === String(ex.malformed + 1) };
    const net = checkAddress(value["bad-net"] ?? "", line.network, line.prefix);
    out["bad-net"] = {
      ok: net.error === undefined,
      hint: net.error || (net.value === line.written ? "C'est l'adresse écrite : mettre ses bits hôtes à 0." : undefined),
    };
  }
  return out;
}
