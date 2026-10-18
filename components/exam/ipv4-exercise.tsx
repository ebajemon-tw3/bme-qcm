"use client";

import * as React from "react";
import { AnswerInput, Bits, Hint, SolutionBlock, Statement, YesNo, type ExerciseProps } from "@/components/exam/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bin8, checkSubnet, generateSubnet, octets, partialOctet, toIp, type Candidate, type SubnetExercise } from "@/lib/exam-ipv4";

const ORDINAL = ["1st", "2nd", "3rd", "4th"];

function why(ex: SubnetExercise, c: Candidate) {
  if (!c.valid) {
    const bad = c.text.split(".").find((p) => Number(p) > 255);
    return `${bad} > 255`;
  }
  if (c.kind === "network") return "network address (host bits all 0)";
  if (c.kind === "broadcast") return "broadcast address (host bits all 1)";
  const net = `${toIp(c.network!)}/${ex.prefix}`;
  return c.same ? `network ${net}, a host of the subnet` : `its network is ${net}`;
}

function Steps({ ex }: { ex: SubnetExercise }) {
  const k = partialOctet(ex.prefix);
  const full = Math.floor(ex.prefix / 8);
  const split = [...Array(full).fill(8), ...(k === null ? [] : [ex.prefix % 8])].join(" + ");
  const maskOctet = k === null ? null : octets(ex.mask)[k];
  const block = maskOctet === null ? null : 256 - maskOctet;
  const value = k === null ? null : octets(ex.address)[k];
  const start = value === null || block === null ? null : value - (value % block);
  return (
    <ol className="flex list-decimal flex-col gap-1 pl-5">
      {k === null ? (
        <li>
          Split: /{ex.prefix} = {split}. No partial octet: the mask is {toIp(ex.mask)}, the network keeps the first {full}{" "}
          octets and sets the others to 0.
        </li>
      ) : (
        <>
          <li>
            Split: /{ex.prefix} = {split}. The {ORDINAL[k]} octet holds the boundary: {ex.prefix % 8} network bits in it.
          </li>
          <li>
            Mask octet: {ex.prefix % 8} ones = {bin8(maskOctet!)} = {maskOctet}. Mask {toIp(ex.mask)}.
          </li>
          <li>
            Block size: 256 - {maskOctet} = {block}.
          </li>
          <li>
            {value} = {bin8(value!)}. Largest multiple of {block} not above {value}: {start}. Block {start} to{" "}
            {start! + block! - 1} in the {ORDINAL[k]} octet.
          </li>
        </>
      )}
      <li>
        Address AND mask, bit by bit (table below): network {toIp(ex.network)}/{ex.prefix}.
      </li>
      <li>
        Broadcast: network with all {32 - ex.prefix} host bits set to 1: {toIp(ex.broadcast)}.
      </li>
      <li>
        Hosts: 2^(32 - {ex.prefix}) - 2 = {2 ** (32 - ex.prefix)} - 2 = {ex.hosts} (first {toIp(ex.network + 1)}, last{" "}
        {toIp(ex.broadcast - 1)}).
      </li>
    </ol>
  );
}

export function Ipv4Exercise({ seed, value, onChange, reveal, locked }: ExerciseProps) {
  const ex = React.useMemo(() => generateSubnet(seed), [seed]);
  const result = reveal !== "none" ? checkSubnet(ex, value) : null;
  const field = (key: string, label: string, placeholder: string, inputMode: "decimal" | "numeric" = "decimal") => (
    <label className="flex flex-col gap-1 text-sm">
      <span>{label}</span>
      <AnswerInput
        id={`ipv4-${key}`}
        label={label}
        value={value[key] ?? ""}
        onChange={(v) => onChange(key, v)}
        result={result?.[key]}
        locked={locked}
        placeholder={placeholder}
        inputMode={inputMode}
      />
      <Hint result={result?.[key]} />
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <Statement>
        <p>
          A host is configured as <strong className="tabular-nums">{toIp(ex.address)}/{ex.prefix}</strong>.
        </p>
        <p>(a) Give the netmask, the network address, the broadcast address and the number of assignable host addresses.</p>
      </Statement>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("mask", "Netmask", "255.255.0.0")}
        {field("net", "Network address", "a.b.c.d")}
        {field("bc", "Broadcast address", "a.b.c.d")}
        {field("hosts", "Assignable hosts", "254", "numeric")}
      </div>
      <Statement>
        <p>
          (b) For each address: is it valid, is it on the same subnet as the host, can it be assigned to another host of
          that subnet?
        </p>
      </Statement>
      <ul className="flex flex-col divide-y border-y">
        {ex.candidates.map((c, i) => {
          const invalid = value[`c${i}-valid`] === "no";
          return (
            <li key={c.text} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm tabular-nums">{c.text}</span>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                {(
                  [
                    ["valid", "Valid"],
                    ["same", "Same subnet"],
                    ["assign", "Assignable"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-muted-foreground">{label}</span>
                    <YesNo
                      label={`${c.text}, ${label}`}
                      value={value[`c${i}-${key}`]}
                      onChange={(v) => onChange(`c${i}-${key}`, v)}
                      result={result?.[`c${i}-${key}`]}
                      locked={locked}
                      disabled={key !== "valid" && invalid}
                    />
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {reveal === "solution" ? (
        <SolutionBlock>
          <Steps ex={ex} />
          <Table>
            <caption className="sr-only">ET binaire de l&apos;adresse et du masque</caption>
            <TableBody className="text-xs sm:text-sm">
              <TableRow>
                <TableCell className="text-muted-foreground">Address</TableCell>
                <TableCell>
                  <Bits value={ex.address} prefix={ex.prefix} />
                </TableCell>
                <TableCell className="tabular-nums">{toIp(ex.address)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Mask</TableCell>
                <TableCell>
                  <Bits value={ex.mask} prefix={ex.prefix} />
                </TableCell>
                <TableCell className="tabular-nums">{toIp(ex.mask)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">AND</TableCell>
                <TableCell>
                  <Bits value={ex.network} prefix={ex.prefix} />
                </TableCell>
                <TableCell className="tabular-nums">{toIp(ex.network)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Broadcast</TableCell>
                <TableCell>
                  <Bits value={ex.broadcast} prefix={ex.prefix} />
                </TableCell>
                <TableCell className="tabular-nums">{toIp(ex.broadcast)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Table>
            <caption className="sr-only">Classement des adresses</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Valid</TableHead>
                <TableHead>Same subnet</TableHead>
                <TableHead>Assignable</TableHead>
                <TableHead>Why</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-sm">
              {ex.candidates.map((c) => (
                <TableRow key={c.text}>
                  <TableCell className="tabular-nums">{c.text}</TableCell>
                  <TableCell>{c.valid ? "yes" : "no"}</TableCell>
                  <TableCell>{c.valid ? (c.same ? "yes" : "no") : ""}</TableCell>
                  <TableCell>{c.valid ? (c.assignable ? "yes" : "no") : ""}</TableCell>
                  <TableCell className="whitespace-normal">{why(ex, c)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground" lang="fr">
            Source : hta2p p. 6, 7, 11 et 12.
          </p>
        </SolutionBlock>
      ) : null}
    </div>
  );
}
