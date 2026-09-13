import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { AuditWorkspace } from "@/components/audit/audit-workspace";
import { isDemoMode } from "@/lib/env";

const AuditPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) => {
  const { url } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="relative flex-1">
        <div
          className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-80"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <AuditWorkspace initialUrl={url ?? ""} demoMode={isDemoMode()} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default AuditPage;
