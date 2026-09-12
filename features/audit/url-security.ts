import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AppError } from "@/lib/errors";

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".corp",
  ".home",
];

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new AppError("INVALID_URL", "Please enter a website URL to audit.");
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;

  try {
    parsed = new URL(withScheme);
  } catch (error) {
    throw new AppError("INVALID_URL", "That doesn't look like a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppError(
      "INVALID_URL",
      "Only http:// and https:// URLs can be audited.",
    );
  }

  if (
    !parsed.hostname.includes(".") &&
    !/^\[?[0-9a-f:]+\]?$/i.test(parsed.hostname)
  ) {
    throw new AppError(
      "INVALID_URL",
      "Please enter a full public domain (for example https://example.com).",
    );
  }

  parsed.username = "";
  parsed.password = "";
  parsed.hash = "";

  return parsed.toString();
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)
  ) {
    return true;
  }

  const [a, b] = parts as [number, number, number, number];

  if (a === 0) return true; // 0.0.0.0/8

  if (a === 10) return true; // 10.0.0.0/8 private

  if (a === 127) return true; // 127.0.0.0/8 loopback

  if (a === 169 && b === 254) return true; // link-local + cloud metadata

  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private

  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 + 192.0.2.0/24 (TEST-NET-1)
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51) return true; // TEST-NET-2
  if (a === 203 && b === 0) return true; // 203.0.113.0/24 TEST-NET-3
  if (a >= 224) return true; // multicast + reserved

  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase();

  if (addr === "::" || addr === "::1") return true;
  if (
    addr.startsWith("fe80") ||
    addr.startsWith("fe90") ||
    addr.startsWith("fea0") ||
    addr.startsWith("feb0")
  ) {
    return true; // fe80::/10 link-local
  }
  if (addr.startsWith("fc") || addr.startsWith("fd")) return true; // fc00::/7 unique-local
  if (addr.startsWith("ff")) return true; // ff00::/8 multicast
  if (addr.startsWith("2001:db8")) return true; // documentation range
  if (addr.startsWith("2001:")) return true; // 2001::/32 Teredo (embeds IPv4)

  // IPv4-mapped (::ffff:1.2.3.4) and NAT64 (64:ff9b::1.2.3.4): decode and re-check.
  const embedded = extractEmbeddedIpv4(addr);
  if (embedded) return isPrivateIpv4(embedded);

  return false;
}

function extractEmbeddedIpv4(addr: string): string | null {
  const dotted = addr.match(/(\d{1,3}\.){3}\d{1,3}/);
  if (dotted) return dotted[0];
  if (addr.startsWith("::ffff:")) return addr.slice("::ffff:".length);
  if (addr.startsWith("64:ff9b::")) return addr.slice("64:ff9b::".length);
  return null;
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateIpv4(ip);
  if (kind === 6) return isPrivateIpv6(ip);
  return true; // Unparseable → treat as unsafe.
}

function assertHostNameAllowed(hostname: string): void {
  const host = hostname.toLowerCase().replace(/\.$/, "");

  if (
    BLOCKED_HOSTNAMES.has(host) ||
    BLOCKED_SUFFIXES.some((s) => host.endsWith(s))
  ) {
    throw new AppError(
      "BLOCKED_HOST",
      "Internal or local hostnames can't be audited. Please use a public website URL.",
    );
  }
}

export async function assertPublicHostname(hostname: string): Promise<void> {
  const host = hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "");

  assertHostNameAllowed(host);

  const literal = hostname.replace(/^\[|\]$/g, "");

  if (isIP(literal)) {
    if (isPrivateOrReservedIp(literal)) {
      throw new AppError(
        "BLOCKED_HOST",
        "IP addresses on private or reserved networks can't be audited.",
      );
    }

    return;
  }

  let addresses: Array<{ address: string; family: number }>;

  try {
    addresses = await lookup(host === hostname ? host : hostname, {
      all: true,
      verbatim: true,
    });
  } catch (error) {
    throw new AppError(
      "FETCH_FAILED",
      "We couldn't resolve that domain name.",
      { cause: error },
    );
  }

  if (addresses.length === 0) {
    throw new AppError(
      "FETCH_FAILED",
      "That domain name doesn't resolve to any address.",
    );
  }

  for (const { address } of addresses) {
    if (isPrivateOrReservedIp(address)) {
      throw new AppError(
        "BLOCKED_HOST",
        "That URL resolves to a private or reserved network address, which can't be audited.",
      );
    }
  }
}

export async function validateRedirectTarget(
  location: string,
  currentUrl: string,
): Promise<string> {
  let target: URL;

  try {
    target = new URL(location, currentUrl);
  } catch (error) {
    throw new AppError(
      "FETCH_FAILED",
      "The website redirected to an invalid address.",
    );
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new AppError(
      "BLOCKED_HOST",
      "The website redirected to a disallowed protocol.",
    );
  }

  target.username = "";
  target.password = "";
  target.hash = "";

  await assertPublicHostname(target.hostname);
  return target.toString();
}
