"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type Place = "sidebar" | "navbar";

// Un seul bouton visible à la fois : dans la barre du haut quand la navigation est fermée,
// dans la navigation quand elle est ouverte.
export function CustomTrigger({ place }: { place: Place }) {
  const isMobile = useIsMobile();
  const { open, openMobile } = useSidebar();
  const sidebarOpen = isMobile ? openMobile : open;

  return (
    <SidebarTrigger
      className={cn(
        "size-10 transition-opacity duration-300 ease-out motion-reduce:transition-none md:size-7",
        sidebarOpen && place === "navbar" && "pointer-events-none opacity-0",
        !sidebarOpen && place === "sidebar" && "pointer-events-none opacity-0",
      )}
    />
  );
}
