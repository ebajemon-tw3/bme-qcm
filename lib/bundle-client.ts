import type { Bundle } from "@/lib/types";

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export async function fetchBundle(): Promise<Bundle> {
  const response = await fetch(`${BASE_PATH}/data.json`, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Fichier de données introuvable (HTTP ${response.status}).`);
  const bundle = (await response.json()) as Bundle;
  if (bundle.version !== 1) throw new Error("Version du fichier de données non prise en charge.");
  return bundle;
}
