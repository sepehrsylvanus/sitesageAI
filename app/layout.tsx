import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "SiteSage AI — Agentic Website Audits",
    template: "%s · SiteSage AI",
  },
  description:
    "An AI agent that plans, calls real audit tools, and produces evidence-backed website audits: SEO, accessibility, performance, security headers, and HTML structure.",
  openGraph: {
    title: "SiteSage AI — Agentic Website Audits",
    description:
      "Watch an AI agent plan, call deterministic audit tools, and synthesize a prioritized website report.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#04070f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#0e1830",
              border: "1px solid rgba(126,160,220, 0.18)",
              color: "#dbe4f3",
            },
          }}
        />
      </body>
    </html>
  );
}
