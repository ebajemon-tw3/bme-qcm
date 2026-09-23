import { Suspense } from "react";
import { SessionView } from "@/components/session-view";

export default function SessionPage() {
  return (
    <Suspense fallback={null}>
      <SessionView />
    </Suspense>
  );
}
