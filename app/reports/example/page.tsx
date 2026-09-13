import type { Metadata } from "next";
import { FlaskConical } from "lucide-react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ReportView from "@/components/report/report-view";
import { buildDemoReport } from "@/features/agent/demo";

export const metadata: Metadata = {
  title: "Example report",
  description:
    "A complete SiteSage AI report built from the canned demo fixture by the real deterministic tools.",
};

// Runs the real analyzers per request against the in-repo fixture HTML.
export const dynamic = "force-dynamic";

export default async function ExampleReportPage() {
  const report = await buildDemoReport("full");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-sev-medium/25 bg-sev-medium/[0.06] p-4">
          <FlaskConical
            className="mt-0.5 size-4 shrink-0 text-sev-medium"
            aria-hidden
          />
          <p className="text-xs leading-relaxed text-slate-300">
            <span className="font-semibold text-sev-medium">
              Example report (Demo fixture).
            </span>{" "}
            This report analyzes a canned snapshot of a fictional site. The
            deterministic tools, scoring engine and report UI are 100% real —
            only the website fetch and AI synthesis are simulated, and no live
            AI request was made.
          </p>
        </div>
        <ReportView report={report} />
      </main>
      <SiteFooter />
    </div>
  );
}
