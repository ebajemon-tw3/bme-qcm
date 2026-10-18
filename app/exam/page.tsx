import { Suspense } from "react";
import { ExamView } from "@/components/exam/exam-view";

export default function ExamPage() {
  return (
    <Suspense fallback={null}>
      <ExamView />
    </Suspense>
  );
}
