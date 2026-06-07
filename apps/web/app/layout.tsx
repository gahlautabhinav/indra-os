import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";
import { TopBar } from "@/components/layout/TopBar";
import { SigilBar } from "@/components/layout/SigilBar";
import { CommandEther } from "@/components/command/CommandEther";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "INDRA — Agentic OS",
  description: "The Operating System for AI Workforces",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#07090d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="bg-canvas text-ink-primary antialiased">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <SigilBar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <TopBar />
              <main className="flex-1 overflow-auto bg-canvas">
                {children}
              </main>
            </div>
          </div>
          <CommandEther />
        </Providers>
      </body>
    </html>
  );
}
