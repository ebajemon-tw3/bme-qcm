import type { AnswerRecord } from "@/lib/history";
import type { MockExam, Question } from "@/lib/types";

// Vrai/faux : une question à choix unique et deux options.
export const isTrueFalse = (q: Question) => q.kind === "single" && q.choices.length === 2;

export interface MockScore {
  points: number;
  base: number;
  bonusPoints: number;
  bonus: number;
  tfWrong: number;
  skipped: number;
}

// Barème réel d'un sujet blanc à points négatifs, calculé sur les réponses dans l'ordre du sujet.
// Les bonus sont les premières questions du sujet.
export function mockScore(answers: AnswerRecord[], bank: Question[], mock: MockExam): MockScore {
  const byId = new Map(bank.map((q) => [q.id, q]));
  const bonus = Math.min(mock.bonus ?? 0, answers.length);
  let points = 0;
  let bonusPoints = 0;
  let tfWrong = 0;
  let skipped = 0;
  answers.forEach((a, i) => {
    const q = byId.get(a.questionId);
    let p = 0;
    if (a.selected.length === 0) skipped++;
    else if (a.correct) p = 1;
    else if (q && isTrueFalse(q)) {
      p = -1;
      tfWrong++;
    }
    points += p;
    if (i < bonus) bonusPoints += p;
  });
  return { points, base: answers.length - bonus, bonusPoints, bonus, tfWrong, skipped };
}
