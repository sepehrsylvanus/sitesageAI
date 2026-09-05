import SiteHeader from "@/components/site-header";
import { isDemoMode } from "@/lib/env";
import {
  CategoriesSection,
  ExampleFindingsSection,
  FinalCtaSection,
  HeroSection,
  HowItWorksSection,
  MiniAgentTimeline,
  SecurityNoteSection,
} from "@/components/marketing/home";
import SiteFooter from "@/components/site-footer";
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <HeroSection demoMode={isDemoMode()} />
        <MiniAgentTimeline />
        <CategoriesSection />
        <HowItWorksSection />
        <ExampleFindingsSection />
        <SecurityNoteSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
