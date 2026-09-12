"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardCopy,
  Download,
  FileJson,
  FlaskConical,
  ListChecks,
  RotateCcw,
  SearchX,
  Sparkles,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { AuditReport, Finding } from "@/features/audit/resport-schema";
import type { AuditCategory, Severity } from "@/features/audit/types";
import { auditReportToMarkdown } from "@/features/audit/markdown";
import { cn } from "@/lib/utils";
import { Badge, Button, Card, ScoreRing, scoreTone } from "@/components/ui";
import { CATEGORY_META, SEVERITY_META } from "./category-meta";

const ReportView = ({ report }: { report: AuditReport }) => {
  return (
    <div className="space-y-10">
      {/* Report Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {report.demoMode ? (
              <Badge tone="medium" className="gap-1">
                <FlaskConical className="size-3" aria-hidden /> Demo report
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportView;
