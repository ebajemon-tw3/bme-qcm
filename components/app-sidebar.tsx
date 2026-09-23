"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CustomTrigger } from "@/components/custom-trigger";
import { useData } from "@/components/data-provider";
import { normalizePath, PAGES } from "@/components/nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuButton asChild isActive={active} className={cn("h-10 md:h-8", className)}>
      <Link href={href} onClick={() => setOpenMobile(false)} aria-current={active ? "page" : undefined}>
        {children}
      </Link>
    </SidebarMenuButton>
  );
}

function SubjectLinks() {
  const { bundle } = useData();
  const path = normalizePath(usePathname());
  const code = useSearchParams().get("c");
  return (
    <SidebarMenu>
      {bundle.subjects.map((subject) => {
        const count = bundle.questions[subject.code]?.length ?? 0;
        return (
          <SidebarMenuItem key={subject.code}>
            <NavLink
              href={`/matiere?c=${subject.code}`}
              active={path === "/matiere" && code === subject.code}
              className={count > 0 ? "pr-12" : undefined}
            >
              <span className="w-[8ch] shrink-0 text-muted-foreground">{subject.sigle ?? subject.code}</span>
              <span className="truncate">{subject.title}</span>
            </NavLink>
            {count > 0 ? <SidebarMenuBadge aria-label={`${count} questions`}>{count}</SidebarMenuBadge> : null}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const path = normalizePath(usePathname());
  return (
    <Sidebar className="*:data-[slot=sidebar-inner]:bg-background" collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="h-(--app-header-height,3rem) flex-row items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold">
          Révision BME
        </Link>
        <CustomTrigger place="sidebar" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Révision</SidebarGroupLabel>
          <SidebarMenu>
            {PAGES.map((page) => (
              <SidebarMenuItem key={page.href}>
                <NavLink href={page.href} active={path === page.href}>
                  <span>{page.title}</span>
                </NavLink>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Matières</SidebarGroupLabel>
          <Suspense fallback={null}>
            <SubjectLinks />
          </Suspense>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-2 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <NavLink href="/reglages" active={path === "/reglages"}>
              <span>Réglages</span>
            </NavLink>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
