import { readFile } from "node:fs/promises";
import path from "node:path";

// Dev uniquement (voir pageExtensions dans next.config.ts) : sert data/bundle.json en clair,
// pour ne pas avoir à saisir le mot de passe en local.
export const dynamic = "force-static";

export async function GET() {
  try {
    const json = await readFile(path.join(process.cwd(), "data", "bundle.json"), "utf8");
    return new Response(json, { headers: { "content-type": "application/json" } });
  } catch {
    return new Response("data/bundle.json absent : lancer `bun run bundle`.", { status: 404 });
  }
}
