import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className={cn("[--app-wrapper-max-width:72rem]", "[--app-header-height:3rem]")}>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-(--app-wrapper-max-width) flex-1 flex-col px-4 pt-4 pb-8 md:px-6 md:pt-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
