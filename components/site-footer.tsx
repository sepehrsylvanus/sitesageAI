import { ShieldCheck } from "lucide-react";

const SiteFooter = () => {
  return (
    <footer className=" border-t border-white/6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-medium text-slate-300">SiteSage AI</p>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            An educational agentic-audit project. Scores are automated
            indicators, not certifications. Audits analyze publicly available
            markup only — no JavaScript is executed and no private systems are
            touched.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="size-4 text-emerald-400/70" aria-hidden />
          SSRF-protected fetching · rate-limited · zero chain-of-thought
          exposure
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
