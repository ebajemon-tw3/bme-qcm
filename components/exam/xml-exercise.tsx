"use client";

import * as React from "react";
import { AnswerArea, Code, SolutionBlock, Statement, type ExerciseProps } from "@/components/exam/parts";
import { checkJson, checkYaml, generateXml, toJson, toYaml, type ConversionCheck } from "@/lib/exam-xml";

function Feedback({ check }: { check: ConversionCheck }) {
  return (
    <div role="status" className="flex flex-col gap-1 text-xs">
      {check.ok ? <p className="text-ok">Juste.</p> : null}
      {check.messages.map((m, i) => (
        <p key={i} className="text-bad">
          {m}
        </p>
      ))}
      {check.notes.map((m, i) => (
        <p key={`n${i}`} className="text-muted-foreground">
          {m}
        </p>
      ))}
    </div>
  );
}

export function XmlExercise({ seed, value, onChange, reveal, locked }: ExerciseProps) {
  const ex = React.useMemo(() => generateXml(seed), [seed]);
  const json = value.json ?? "";
  const yaml = value.yaml ?? "";
  const jsonCheck = reveal !== "none" ? checkJson(ex, json) : null;
  const yamlCheck = reveal !== "none" ? checkYaml(ex, yaml) : null;
  const [listPath, item] = Object.entries(ex.listTags)[0];

  return (
    <div className="flex flex-col gap-4">
      <Statement>
        <p>Turn the given XML into JSON, then into YAML.</p>
      </Statement>
      <Code>{ex.xml}</Code>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">JSON</h3>
          <AnswerArea
            label="Réponse JSON"
            code
            value={json}
            onChange={(v) => onChange("json", v)}
            locked={locked}
            placeholder={'{\n  "key": "value"\n}'}
            invalid={jsonCheck ? !jsonCheck.ok : undefined}
          />
          {jsonCheck ? <Feedback check={jsonCheck} /> : null}
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">YAML</h3>
          <AnswerArea
            label="Réponse YAML"
            code
            value={yaml}
            onChange={(v) => onChange("yaml", v)}
            locked={locked}
            placeholder={"key: value"}
            invalid={yamlCheck ? !yamlCheck.ok : undefined}
          />
          {yamlCheck ? <Feedback check={yamlCheck} /> : null}
        </div>
      </div>
      {reveal === "solution" ? (
        <SolutionBlock>
          <div className="grid gap-4 lg:grid-cols-2">
            <Code>{toJson(ex.expected)}</Code>
            <Code>{toYaml(ex.expected)}</Code>
          </div>
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            <li>
              Drop the root element &lt;{ex.root}&gt;: its children become the keys of the top-level object (keeping
              &quot;{ex.root}&quot; as an outer key is also consistent).
            </li>
            <li>
              An element that only contains text becomes key: value. In JSON, numbers stay without quotes; text and IP
              addresses go in double quotes.
            </li>
            <li>
              The repeated &lt;{item}&gt; elements become one key, {listPath.split(".").pop()}, whose value is a list
              {item === listPath.split(".").pop() ? "" : `; the tag name ${item} disappears`}.
            </li>
            <li>
              The compound element becomes a nested object. In YAML: same tree, two spaces of indentation per level, one
              &quot;- &quot; per list item, no quotes needed.
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">Source : hta1p p. 24 à 26 (même enregistrement en XML, JSON et YAML).</p>
        </SolutionBlock>
      ) : null}
    </div>
  );
}
