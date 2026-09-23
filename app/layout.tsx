import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { DataProvider } from "@/components/data-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Révision BME",
  description: "Révision par QCM, semestre BME automne 2026.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#111113",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={cn("dark h-full antialiased font-mono", jetbrainsMono.variable)}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <DataProvider>
            <AppShell>{children}</AppShell>
          </DataProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
