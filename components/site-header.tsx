import Link from "next/link";
import { ScanSearch, FlaskConical } from "lucide-react";
import { isDemoMode } from "@/lib/env";
import { Badge } from "@/components/ui";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/audit", label: "Audit" },
  { href: "/reports/example", label: "Example report" },
  { href: "/methodology", label: "Methodology" },
];

const SiteHeader = () => {
  const demo = isDemoMode();

  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href={"/"}
          className="focus-ring flex items-center gap-2.5 rounded-md"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-linear-to-br from-ts-500 to-cyan-500 shadow-[0_4px_18px_-4px_rgba(49,120,198,0.8)]">
            <ScanSearch className="size-5 text-white" aria-hidden />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            SiteSage <span className="text-ts-300">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring rounded-md px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {demo ? (
            <Badge tone="medium" className="gap-1.5">
              <FlaskConical className="size-3" aria-hidden /> Demo mode
            </Badge>
          ) : (
            <Badge tone="success">Live agent</Badge>
          )}

          <Link href={"/audit"} className="hidden sm:block">
            <span className="focus-ring inline-flex h-9 items-center rounded-lg bg-ts-500 px-4 text-sm font-medium text-white transition-colors hover:bg-ts-400">
              Start audit
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
