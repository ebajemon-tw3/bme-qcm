import { Suspense } from "react";
import { SubjectView } from "@/components/subject-view";

export default function SubjectPage() {
  return (
    <Suspense fallback={null}>
      <SubjectView />
    </Suspense>
  );
}
