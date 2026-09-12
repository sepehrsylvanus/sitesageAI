export type HeaderStatus = "good" | "warn" | "missing";

export interface SecurityHeaderCheck {
  header: string;
  status: HeaderStatus;
  value: string | null;
  note: string;
}

export interface SecurityHeadersAnalysis {
  checks: SecurityHeaderCheck[];
  presentCount: number;
  missingImportant: string[];
  cookieObservations: string[];
  serverDisclosure: string | null;
  warnings: string[];
  disclaimer: string;
}

function parseCsp(value: string | null): {
  hasFrameAncestors: boolean;
  hasUnsafeInline: boolean;
} {
  if (!value) return { hasFrameAncestors: false, hasUnsafeInline: false };
  const lower = value.toLowerCase();
  return {
    hasFrameAncestors: lower.includes("frame-ancestors"),
    hasUnsafeInline: lower.includes("unsafe-inline"),
  };
}

export function inspectSecurityHeaders(
  headers: Record<string, string>,
): SecurityHeadersAnalysis {
  const get = (name: string) => headers[name.toLowerCase()] ?? null;
  const csp = get("content-security-policy");
  const { hasFrameAncestors, hasUnsafeInline } = parseCsp(csp);
  const xfo = get("x-frame-options");

  const checks: SecurityHeaderCheck[] = [
    {
      header: "Content-Security-Policy",
      status: csp ? (hasUnsafeInline ? "warn" : "good") : "missing",
      value: csp ? csp.slice(0, 160) : null,
      note: csp
        ? hasUnsafeInline
          ? "Present, but allows 'unsafe-inline' scripts/styles, weakening XSS protection."
          : "Present. Review directives to ensure they match the site's needs."
        : "Missing. CSP is the primary browser-enforced mitigation for XSS.",
    },
    {
      header: "Strict-Transport-Security",
      status: get("strict-transport-security") ? "good" : "missing",
      value: get("strict-transport-security"),
      note: get("strict-transport-security")
        ? "Present. Browsers will enforce HTTPS for this host."
        : "Missing. Users on HTTP connections can be downgrade-attacked.",
    },

    {
      header: "X-Content-Type-Options",
      status:
        get("x-content-type-options")?.toLowerCase() === "nosniff"
          ? "good"
          : "missing",
      value: get("x-content-type-options"),
      note:
        get("x-content-type-options")?.toLowerCase() === "nosniff"
          ? "Present. Prevents MIME-type sniffing."
          : 'Missing or not "nosniff". Browsers may MIME-sniff responses.',
    },

    {
      header: "Referrer-Policy",
      status: get("referrer-policy") ? "good" : "missing",
      value: get("referrer-policy"),
      note: get("referrer-policy")
        ? "Present. Controls how much URL data leaks to third parties."
        : "Missing. Full URLs (incl. query strings) may leak in Referer headers.",
    },
    {
      header: "Permissions-Policy",
      status: get("permissions-policy") ? "good" : "missing",
      value: get("permissions-policy")
        ? (get("permissions-policy") as string).slice(0, 120)
        : null,
      note: get("permissions-policy")
        ? "Present. Restricts access to powerful browser features."
        : "Missing. Camera, microphone, geolocation etc. are not explicitly restricted.",
    },
    {
      header: "Frame protection (X-Frame-Options / CSP frame-ancestors)",
      status: xfo || hasFrameAncestors ? "good" : "missing",
      value: xfo ?? (hasFrameAncestors ? "via CSP frame-ancestors" : null),
      note:
        xfo || hasFrameAncestors
          ? "Present. Clickjacking protection is in place."
          : "Missing. The page may be embeddable in hostile iframes (clickjacking).",
    },
  ];

  const cookieObservations: string[] = [];

  const setCookie = get("set-cookie");
  if (setCookie) {
    const lower = setCookie.toLowerCase();
    if (!lower.includes("httponly"))
      cookieObservations.push("Set-Cookie without HttpOnly flag observed.");

    if (!lower.includes("secure"))
      cookieObservations.push("Set-Cookie without Secure flag observed.");

    if (!lower.includes("samesite"))
      cookieObservations.push(
        "Set-Cookie without SameSite attribute observed.",
      );

    if (cookieObservations.length === 0)
      cookieObservations.push(
        "Cookies include Secure, HttpOnly and SameSite flags.",
      );
  } else {
    cookieObservations.push(
      "No Set-Cookie header present on the HTML response.",
    );
  }

  const server = get("server");
  const poweredBy = get("x-powered-by");
  const serverDisclosure = poweredBy ?? server;

  const warnings: string[] = [];

  if (poweredBy) {
    warnings.push(
      `X-Powered-By discloses "${poweredBy}". Consider removing technology fingerprints.`,
    );
  }

  const important = [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
  ];

  const missingImportant = checks
    .filter(
      (c) =>
        c.status === "missing" && important.some((h) => c.header.startsWith(h)),
    )
    .map((c) => c.header);

  return {
    checks,
    presentCount: checks.filter((c) => c.status === "good").length,
    missingImportant,
    cookieObservations,
    serverDisclosure,
    warnings,
    disclaimer:
      "Header checks are one layer of defense-in-depth. They do not prove a website is secure or insecure overall.",
  };
}
