"use client";

import * as React from "react";
import { AnswerInput, Bits, Hint, SolutionBlock, Statement, type ExerciseProps } from "@/components/exam/parts";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { checkLpm, generateLpm, toIp, type LpmExercise as Lpm } from "@/lib/exam-ipv4";
import { cn } from "@/lib/utils";

function range(line: Lpm["lines"][number]) {
  return `${toIp(line.network)} to ${toIp(line.network + 2 ** (32 - line.prefix) - 1)}`;
}

export function LpmExercise({ seed, value, onChange, reveal, locked }: ExerciseProps) {
  const ex = React.useMemo(() => generateLpm(seed), [seed]);
  const result = reveal !== "none" ? checkLpm(ex, value) : null;
  const ifaces = [...ex.lines.map((l) => l.iface), ex.defaultIface].sort();
  const bad = ex.malformed === null ? null : ex.lines[ex.malformed];

  return (
    <div className="flex flex-col gap-4">
      <Statement>
        <p>Router R uses the routing table below and forwards with the longest prefix match.</p>
      </Statement>
      <Table>
        <caption className="sr-only">Table de routage</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Line</TableHead>
            <TableHead>Prefix</TableHead>
            <TableHead>Interface</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-sm tabular-nums">
          {ex.lines.map((l, i) => (
            <TableRow key={i}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>
                {toIp(l.written)}/{l.prefix}
              </TableCell>
              <TableCell>{l.iface}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell>{ex.lines.length + 1}</TableCell>
            <TableCell>0.0.0.0/0</TableCell>
            <TableCell>{ex.defaultIface}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <Statement>
        <p>(a) Give the outgoing interface for each destination.</p>
      </Statement>
      <div className="grid gap-3 sm:grid-cols-2">
        {ex.destinations.map((d, i) => (
          <label key={i} className="flex flex-col gap-1 text-sm">
            <span className="tabular-nums">{toIp(d.address)}</span>
            <NativeSelect
              className={cn(
                "w-full",
                result?.[`d${i}`] && (result[`d${i}`].ok ? "*:data-[slot=native-select]:border-ok" : "*:data-[slot=native-select]:border-bad"),
              )}
              value={value[`d${i}`] ?? ""}
              disabled={locked}
              onChange={(e) => onChange(`d${i}`, e.target.value)}
              aria-label={`Interface pour ${toIp(d.address)}`}
            >
              <NativeSelectOption value="">Interface</NativeSelectOption>
              {ifaces.map((f) => (
                <NativeSelectOption key={f} value={f}>
                  {f}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Hint result={result?.[`d${i}`]} />
          </label>
        ))}
      </div>
      {bad ? (
        <>
          <Statement>
            <p>(b) One line of the table is written incorrectly. Which one, and which network does it actually denote?</p>
          </Statement>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span>Line</span>
              <NativeSelect
                className={cn(
                  "w-full",
                  result?.["bad-line"] && (result["bad-line"].ok ? "*:data-[slot=native-select]:border-ok" : "*:data-[slot=native-select]:border-bad"),
                )}
                value={value["bad-line"] ?? ""}
                disabled={locked}
                onChange={(e) => onChange("bad-line", e.target.value)}
                aria-label="Ligne mal écrite"
              >
                <NativeSelectOption value="">Line</NativeSelectOption>
                {ex.lines.map((_, i) => (
                  <NativeSelectOption key={i} value={String(i + 1)}>
                    {i + 1}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>Actual network</span>
              <AnswerInput
                id="lpm-bad-net"
                label="Réseau réellement désigné"
                value={value["bad-net"] ?? ""}
                onChange={(v) => onChange("bad-net", v)}
                result={result?.["bad-net"]}
                locked={locked}
                placeholder="a.b.c.d/n"
                inputMode="decimal"
              />
              <Hint result={result?.["bad-net"]} />
            </label>
          </div>
        </>
      ) : null}
      {reveal === "solution" ? <LpmSolution ex={ex} /> : null}
    </div>
  );
}

function LpmSolution({ ex }: { ex: Lpm }) {
  const bad = ex.malformed === null ? null : ex.lines[ex.malformed];
  return (
    <SolutionBlock>
      <p>Each line covers the addresses whose first n bits equal its prefix bits:</p>
      <ul className="flex flex-col divide-y border-y text-xs sm:text-sm">
        {ex.lines.map((l, i) => (
          <li key={i} className="flex flex-col gap-0.5 py-2 tabular-nums">
            <span>
              {i + 1}. {toIp(l.network)}/{l.prefix} {l.iface}, {range(l)}
            </span>
            <Bits value={l.network} prefix={l.prefix} upto={l.prefix} />
          </li>
        ))}
      </ul>
      {ex.destinations.map((d, i) => (
        <div key={i} className="flex flex-col gap-2">
          <p className="flex flex-col tabular-nums">
            <strong>{toIp(d.address)}</strong>
            <span className="text-xs sm:text-sm">
              <Bits value={d.address} prefix={32} />
            </span>
          </p>
          <ul className="flex flex-col divide-y border-y text-xs sm:text-sm">
            {ex.lines.map((l, j) => (
              <li key={j} className={cn("grid grid-cols-[auto_1fr] gap-x-3 py-1.5 tabular-nums", j === d.winner && "text-ok")}>
                <span className="row-span-2">
                  {j + 1}. /{l.prefix}
                </span>
                <span>
                  <Bits value={l.network} prefix={l.prefix} upto={l.prefix} />{" "}
                  {d.matches.includes(j) ? (j === d.winner ? "match, longest" : "match") : "differs"}
                </span>
                <span className="text-muted-foreground">
                  <Bits value={d.address} prefix={32} upto={l.prefix} />
                </span>
              </li>
            ))}
          </ul>
          <p>
            {d.winner === -1
              ? `No line matches: default route, ${d.iface}.`
              : `Matching lines: ${d.matches.map((j) => `${j + 1} (/${ex.lines[j].prefix})`).join(", ")}. Longest prefix /${ex.lines[d.winner].prefix} wins: ${d.iface}.`}
          </p>
        </div>
      ))}
      {bad ? (
        <p>
          (b) Line {ex.malformed! + 1}, {toIp(bad.written)}/{bad.prefix}: its host bits are not all 0 (
          <Bits value={bad.written} prefix={bad.prefix} />
          ). In a /{bad.prefix} the network address is a multiple of the block size; the line actually denotes{" "}
          <strong className="tabular-nums">
            {toIp(bad.network)}/{bad.prefix}
          </strong>{" "}
          ({range(bad)}), and the router applies the mask in the same way.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground" lang="fr">
        Source : hta2p p. 13 et 14.
      </p>
    </SolutionBlock>
  );
}
