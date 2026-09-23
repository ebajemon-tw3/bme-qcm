import Link from "next/link";
import { Button } from "@/components/ui/button";
import { chapterRange, daysBetween, inDays, percent } from "@/lib/format";
import type { AnswerRecord } from "@/lib/history";
import { successRate, tally } from "@/lib/stats";
import type { Question, SessionBlock, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

// Séance à préparer : chapitres au programme, couverture de la banque et taux de réussite.
export function BlockCard({
  subject,
  block,
  bank,
  answers,
  today,
}: {
  subject: Subject;
  block: SessionBlock;
  bank: Question[];
  answers: AnswerRecord[];
  today: string;
}) {
  const questions = bank.filter((q) => block.chapters.includes(q.chapter));
  const t = tally(answers.filter((a) => block.chapters.includes(a.chapter)));
  const days = daysBetween(today, block.date);
  return (
    <div className="flex flex-col gap-3 border p-4">
      <div className="flex flex-col gap-1 text-sm">
        <span>
          <span className="mr-2 text-muted-foreground">{subject.sigle ?? subject.code}</span>
          <time dateTime={block.date} className={cn(days <= 3 && days >= 0 && "text-warn")}>
            {block.date}
          </time>
          <span className="text-muted-foreground"> · {days >= 0 ? inDays(days) : "passée"}</span>
        </span>
        <span>
          {block.label}, {chapterRange(block.chapters)}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {questions.length} questions, {t.seen.size} vues, réussite {percent(successRate(t))}
        </span>
      </div>
      <Button asChild size="lg" className="h-11 w-full sm:w-fit">
        <Link href={`/qcm?c=${subject.code}&p=seance&d=${block.date}`}>Réviser cette séance</Link>
      </Button>
    </div>
  );
}
