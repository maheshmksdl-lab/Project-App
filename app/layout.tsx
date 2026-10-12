import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppChrome } from "@/components/layout/app-chrome";
import "./globals.css";

// Inter for the interface; Source Serif for the greeting and wordmark.
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-serif-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Projects", template: "%s · EVOQ Projects" },
  description: "EVOQ Projects — plan, coordinate and deliver work across projects, approvals and operations.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only z-[70] rounded-md bg-white px-3 py-2 text-sm font-medium text-ink shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
