// Vérifie que public/data.enc se déchiffre avec SITE_PASSWORD. Utilisé par le workflow de
// déploiement : un bundle chiffré avec un autre mot de passe fait échouer la publication.
// N'affiche que des comptes, jamais de contenu.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { decryptBundle } from "../lib/crypto";
import type { Bundle } from "../lib/types";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const password = process.env.SITE_PASSWORD;
if (!password) {
  console.error("Erreur : variable SITE_PASSWORD absente.");
  process.exit(1);
}

try {
  const file = new Uint8Array(await readFile(path.join(ROOT, "public", "data.enc")));
  const bundle = JSON.parse(gunzipSync(await decryptBundle(file, password)).toString("utf8")) as Bundle;
  if (bundle.version !== 1 || !Array.isArray(bundle.subjects)) throw new Error("structure inattendue");
  const total = Object.values(bundle.questions).reduce((n, qs) => n + qs.length, 0);
  console.log(
    `data.enc valide : ${bundle.subjects.length} matières, ${total} questions, généré le ${bundle.generatedAt}.`,
  );
} catch (error) {
  console.error(`Erreur : data.enc ne se déchiffre pas avec SITE_PASSWORD (${(error as Error).message}).`);
  process.exit(1);
}
