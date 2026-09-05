import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <p className="font-mono text-7xl font-bold text-ts-500/40">404</p>
        <h1 className="mt-4 text-xl font-semibold text-white">
          Page not found
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
          The agent looked everywhere — this route doesn&apos;t exist.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="outline">
            <Compass className="size-4" aria-hidden /> Back to home
          </Button>
        </Link>
      </div>
    </div>
  );
}
