import { decryptBundle, InvalidBundleError } from "@/lib/crypto";
import type { Bundle } from "@/lib/types";

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export async function fetchEncryptedBundle() {
  const response = await fetch(`${BASE_PATH}/data.enc`, { cache: "no-cache" });
  if (!response.ok) {
    throw new InvalidBundleError(`Fichier de données introuvable (HTTP ${response.status}).`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function openBundle(file: Uint8Array<ArrayBuffer>, password: string): Promise<Bundle> {
  const compressed = await decryptBundle(file, password);
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
  const bundle = JSON.parse(await new Response(stream).text()) as Bundle;
  if (bundle.version !== 1) throw new InvalidBundleError("Version du fichier de données non prise en charge.");
  return bundle;
}
