"use client";

import { usePathname } from "next/navigation";
import { CustomTrigger } from "@/components/custom-trigger";
import { normalizePath, TITLES } from "@/components/nav";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";

export function AppHeader() {
  const title = TITLES[normalizePath(usePathname())] ?? "";
  return (
    <header className="sticky top-0 z-50 flex h-(--app-header-height) w-full shrink-0 items-center gap-3 border-b bg-background px-2 md:px-4">
      <CustomTrigger place="navbar" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
