import { Suspense } from "react";
import { QcmFlow } from "@/components/quiz/qcm-flow";

export default function QcmPage() {
  return (
    <Suspense fallback={null}>
      <QcmFlow />
    </Suspense>
  );
}
