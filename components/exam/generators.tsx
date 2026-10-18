import type { ComponentType } from "react";
import { DijkstraExercise } from "@/components/exam/dijkstra-exercise";
import { Ipv4Exercise } from "@/components/exam/ipv4-exercise";
import { LpmExercise } from "@/components/exam/lpm-exercise";
import type { ExerciseProps } from "@/components/exam/parts";
import { XmlExercise } from "@/components/exam/xml-exercise";
import type { CheckResult } from "@/lib/exam-check";
import { checkDijkstra, generateDijkstra } from "@/lib/exam-dijkstra";
import { checkLpm, checkSubnet, generateLpm, generateSubnet } from "@/lib/exam-ipv4";
import { checkXml, generateXml } from "@/lib/exam-xml";
import type { GeneratorId } from "@/lib/types";

export const GENERATORS: Record<
  GeneratorId,
  { title: string; Component: ComponentType<ExerciseProps>; check: (seed: number, value: Record<string, string>) => CheckResult }
> = {
  xml: { title: "XML vers JSON et YAML", Component: XmlExercise, check: (s, v) => checkXml(generateXml(s), v) },
  ipv4: { title: "Adressage IPv4", Component: Ipv4Exercise, check: (s, v) => checkSubnet(generateSubnet(s), v) },
  lpm: { title: "Plus long préfixe", Component: LpmExercise, check: (s, v) => checkLpm(generateLpm(s), v) },
  dijkstra: { title: "Dijkstra", Component: DijkstraExercise, check: (s, v) => checkDijkstra(generateDijkstra(s), v) },
};
