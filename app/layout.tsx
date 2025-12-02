import type { Metadata } from "next";
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/common/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ViewComfyProvider } from "@/lib/providers/view-comfy-provider";

export const metadata: Metadata = {
  title: "Lemostudio",
  description: "PlaygroundV2 & Mapping Editor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <ViewComfyProvider>
              {children}
            </ViewComfyProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
