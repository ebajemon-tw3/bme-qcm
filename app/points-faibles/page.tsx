import { Suspense } from "react";
import { WeakView } from "@/components/weak-view";

export default function WeakPage() {
  return (
    <Suspense fallback={null}>
      <WeakView />
    </Suspense>
  );
}
