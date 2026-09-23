import type { NextConfig } from "next";

// Publication sur GitHub Pages : export statique servi sous /<nom-du-dépôt>.
// BASE_PATH vide en local, "/bme-qcm" dans le workflow de déploiement.
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // Pas de AGENTS.md généré par `next dev`.
  agentRules: false,
};

export default nextConfig;
