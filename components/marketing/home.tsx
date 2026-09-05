"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Accessibility,
  ArrowRight,
  Braces,
  CheckCircle2,
  EyeOff,
  FlaskConical,
  Gauge,
  Globe,
  KeyRound,
  ListChecks,
  Loader2,
  Play,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Button, Input } from "@/components/ui";
import { CATEGORY_META } from "@/components/report/category-meta";

export function CategoriesSection() {
  return <h3>CategoriesSection</h3>;
}
export function ExampleFindingsSection() {
  return <h3>ExampleFindingsSection</h3>;
}
export function FinalCtaSection() {
  return <h3>FinalCtaSection</h3>;
}
export function HeroSection({ demoMode }: { demoMode: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const target = url.trim();
    router.push(target ? `/audit?url=${encodeURIComponent(target)}` : "/audit");
  };
  return (
    <section className="relative overflow-hidden px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-20">
      <div
        className="bg-grid pointer-events-none absolute inset-0"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-130 w-220 -translate-x-1/2 rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(closest-side, rgba(49,120,198,0.28), transparent)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <Badge tone="ts" className="mx-auto animate-fade-up gap-1.5">
          <ScanSearch className="size-3" aria-hidden /> tool-using ai agent ·
          not a chatbot
        </Badge>
        <h1
          className="mt-6 animate-fade-up text-4xl leading-[1.05] font-bold tracking-tight text-white sm:text-6xl"
          style={{ animationDelay: "80ms" }}
        >
          An AI agent that audits
          <span className="block bg-linear-to-r from-ts-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
            your website for real
          </span>
        </h1>
        <p
          className="mx-auto mt-6 max-w-2xl animate-fade-up text-base leading-relaxed text-slate-400 sm:text-lg"
          style={{ animationDelay: "160ms" }}
        >
          SiteSage plans the audit, calls deterministic tools — fetch, HTML,
          links, headers, SEO, images, performance — and synthesizes a
          prioritized, evidence-backed report. Every tool call is visible. Every
          claim cites evidence.
        </p>

        <form
          onSubmit={submit}
          className="mx-auto mt-9 flex max-w-xl animate-fade-up flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Globe
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-600"
              aria-hidden
            />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-site.com"
              inputMode="url"
              spellCheck={false}
              aria-label="Website URL to audit"
              className="pl-11"
            />
          </div>
          <Button type="submit" size="lg" className="shrink-0">
            <Play className="size-4" aria-hidden /> Run the agent
          </Button>
        </form>

        <p
          className="mt-4 animate-fade-up text-xs text-slate-500"
          style={{ animationDelay: "320ms" }}
        >
          {demoMode ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <FlaskConical className="size-3 text-sev-medium" aria-hidden />
                Demo Mode active — no AI key configured; audits run on a canned
                snapshot, clearly labelled.
              </span>
            </>
          ) : (
            "SSRF-protected fetching · 8-step tool budget · scores computed by code, not the model"
          )}
        </p>
      </div>
    </section>
  );
}
export function HowItWorksSection() {
  return <h3>HowItWorksSection</h3>;
}
export function MiniAgentTimeline() {
  return <h3>MiniAgentTimeline</h3>;
}
export function SecurityNoteSection() {
  return <h3>SecurityNoteSection</h3>;
}

const Home = () => {
  return <div>Home</div>;
};

export default Home;
