import {
  Accessibility,
  Braces,
  Gauge,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { AuditCategory, Severity } from "@/features/audit/types";

export const CATEGORY_META: Record<
  AuditCategory,
  { label: string; icon: LucideIcon; color: string }
> = {
  seo: { label: "Technical SEO", icon: Search, color: "#7aa8e8" },
  accessibility: {
    label: "Accessibility",
    icon: Accessibility,
    color: "#34d399",
  },
  performance: { label: "Performance", icon: Gauge, color: "#22d3ee" },
  security: { label: "Security Headers", icon: ShieldCheck, color: "#fbbf24" },
  html: { label: "HTML Structure", icon: Braces, color: "#c084fc" },
};

export const SEVERITY_META: Record<
  Severity,
  {
    label: string;
    tone: "critical" | "high" | "medium" | "low" | "info";
    order: number;
  }
> = {
  critical: { label: "Critical", tone: "critical", order: 0 },
  high: { label: "High", tone: "high", order: 1 },
  medium: { label: "Medium", tone: "medium", order: 2 },
  low: { label: "Low", tone: "low", order: 3 },
  info: { label: "Info", tone: "info", order: 4 },
};
