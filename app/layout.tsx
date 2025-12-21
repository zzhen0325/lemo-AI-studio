import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/common/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ViewComfyProvider } from "@/lib/providers/view-comfy-provider";
import { cn } from "@/lib/utils";

const rany = localFont({
  src: [
    {
      path: "../public/Font/Rany-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/Font/Rany.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/Font/Rany-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-rany",
});

const instrument = localFont({
  src: "../public/Font/InstrumentSerif-Regular.ttf",
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "Lemostudio",
  description: "PlaygroundV2 & Mapping Editor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${rany.variable} ${instrument.variable}`}>
      <head />
      <body className={cn("min-h-screen font-sans antialiased")}>

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

