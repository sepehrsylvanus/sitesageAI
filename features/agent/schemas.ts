import { z } from "zod";
import { AUDIT_LIMITS, type AuditMode } from "@/features/audit/types";

export const TOOL_NAMES = [
  "fetch_website_snapshot",
  "inspect_html_structure",
  "inspect_images",
  "inspect_links",
  "inspect_security_headers",
  "inspect_seo",
  "inspect_performance",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export const fetchSnapshotArgsSchema = z.object({
  url: z.string().max(2048),
});

export const emptyToolArgsSchema = z.object({}).loose();

export const toolArgsSchemas: Record<ToolName, z.ZodType<unknown>> = {
  fetch_website_snapshot: fetchSnapshotArgsSchema,
  inspect_html_structure: emptyToolArgsSchema,
  inspect_images: emptyToolArgsSchema,
  inspect_links: emptyToolArgsSchema,
  inspect_security_headers: emptyToolArgsSchema,
  inspect_seo: emptyToolArgsSchema,
  inspect_performance: emptyToolArgsSchema,
};

export interface AgentToolDefinition {
  name: ToolName;
  /** Operational label allowed to appear in the UI timeline. */
  activityLabel: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const AGENT_TOOLS: readonly AgentToolDefinition[] = [
  {
    name: "fetch_website_snapshot",
    activityLabel: "Fetching website snapshot",
    description:
      "Fetch the audited page (SSRF-protected, size-limited, HTML only). Must be called FIRST; every other tool reads its data from the run context.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The exact audited URL. Only this URL may be fetched.",
        },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
  {
    name: "inspect_html_structure",
    activityLabel: "Inspecting HTML structure",
    description:
      "Analyze the fetched HTML: title, meta, headings, landmarks, forms, semantic elements, duplicate IDs. No arguments — reads the run snapshot.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "inspect_images",
    activityLabel: "Checking images for missing alt text",
    description:
      "Analyze images: alt coverage, decorative heuristics, dimensions, lazy loading. Reads the run snapshot.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "inspect_links",
    activityLabel: "Analyzing links and safety attributes",
    description:
      "Classify internal/external links, detect unsafe target=_blank and invalid hrefs, and sample-check for broken links. Reads the run snapshot.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "inspect_security_headers",
    activityLabel: "Analyzing security headers",
    description:
      "Evaluate CSP, HSTS, frame protection, referrer/permissions policy and cookie flags from response headers.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "inspect_seo",
    activityLabel: "Running technical SEO checks",
    description:
      "Check title/description/canonical/robots/Open Graph/structured data, plus robots.txt and sitemap.xml probes.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "inspect_performance",
    activityLabel: "Collecting performance signals",
    description:
      "Measured Lighthouse data when a PageSpeed key is configured, otherwise clearly-labelled heuristics from the fetched document.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
] as const;

export const TOOLS_BY_MODE: Record<AuditMode, readonly ToolName[]> = {
  quick: [
    "fetch_website_snapshot",
    "inspect_html_structure",
    "inspect_security_headers",
    "inspect_seo",
  ],
  full: [
    "fetch_website_snapshot",
    "inspect_html_structure",
    "inspect_images",
    "inspect_links",
    "inspect_security_headers",
    "inspect_seo",
    "inspect_performance",
  ],
  seo: [
    "fetch_website_snapshot",
    "inspect_html_structure",
    "inspect_seo",
    "inspect_performance",
  ],
  accessibility: [
    "fetch_website_snapshot",
    "inspect_html_structure",
    "inspect_images",
    "inspect_links",
  ],
};

export function toChatCompletionTools(tools: readonly AgentToolDefinition[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export { AUDIT_LIMITS };
