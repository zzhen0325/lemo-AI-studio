import type { AppProps } from 'next/app';
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/common/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ViewComfyProvider } from "@/lib/providers/view-comfy-provider";

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <TooltipProvider>
                <ViewComfyProvider>
                    <Component {...pageProps} />
                </ViewComfyProvider>
            </TooltipProvider>
        </ThemeProvider>
    );
}
