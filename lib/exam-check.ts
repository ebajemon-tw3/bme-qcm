// Résultat de la correction automatique d'un exercice généré, champ par champ.

export interface FieldResult {
  ok: boolean;
  hint?: string;
}

export type CheckResult = Record<string, FieldResult>;

export function tally(result: CheckResult) {
  const fields = Object.values(result);
  return { ok: fields.filter((f) => f.ok).length, total: fields.length };
}

/** Note sur `max` au prorata des champs justes, arrondie au demi-point. */
export function suggestedScore(result: CheckResult, max: number) {
  const { ok, total } = tally(result);
  return total ? Math.round((ok / total) * max * 2) / 2 : 0;
}
