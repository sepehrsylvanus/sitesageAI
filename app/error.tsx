"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Digest is safe to display; message/stack may contain internals and stays server-side.
    console.error("Route error:", error.digest ?? "unknown");
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <TriangleAlert
          className="mx-auto size-12 text-sev-medium"
          aria-hidden
        />
        <h1 className="mt-4 text-xl font-semibold text-white">
          Something went wrong
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
          An unexpected error occurred while rendering this page. No details are
          exposed here by design.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
