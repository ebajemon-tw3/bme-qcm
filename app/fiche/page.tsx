import { Suspense } from "react";
import { SheetView } from "@/components/sheet-view";

export default function SheetPage() {
  return (
    <Suspense fallback={null}>
      <SheetView />
    </Suspense>
  );
}
