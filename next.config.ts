import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// Publication sur GitHub Pages : export statique servi sous /<nom-du-dépôt>.
// BASE_PATH vide en local, "/bme-qcm" dans le workflow de déploiement.
const basePath = process.env.BASE_PATH ?? "";

export default function config(phase: string): NextConfig {
  return {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
    basePath,
    assetPrefix: basePath || undefined,
    env: { NEXT_PUBLIC_BASE_PATH: basePath },
    // Les fichiers *.dev.ts ne sont routés que par `next dev` : absents de l'export statique.
    ...(phase === PHASE_DEVELOPMENT_SERVER && { pageExtensions: ["dev.ts", "tsx", "ts", "jsx", "js"] }),
    // Pas de AGENTS.md généré par `next dev`.
    agentRules: false,
  };
}
