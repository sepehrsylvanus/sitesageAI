import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Shared UI primitives — deliberately small, styled for the ink/ts theme. */

type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-ts-500 text-white shadow-[0_0_0_1px_rgba(122,168,232,0.35),0_8px_24px_-8px_rgba(49,120,198,0.65)] hover:bg-ts-400 active:translate-y-px disabled:bg-ts-600/40 disabled:text-white/50 disabled:shadow-none",
  outline:
    "border border-ink-500/60 bg-ink-800/40 text-slate-200 hover:border-ts-400/60 hover:text-white disabled:opacity-45",
  ghost:
    "text-slate-300 hover:bg-white/[0.05] hover:text-white disabled:opacity-45",
  danger:
    "border border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 disabled:opacity-45",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex select-none items-center justify-center rounded-lg font-medium transition-all duration-150",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-2xl", className)} {...rest} />;
}

type BadgeTone =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "success"
  | "ts"
  | "neutral";

const badgeTones: Record<BadgeTone, string> = {
  critical: "bg-sev-critical/15 text-sev-critical border-sev-critical/30",
  high: "bg-sev-high/15 text-sev-high border-sev-high/30",
  medium: "bg-sev-medium/15 text-sev-medium border-sev-medium/30",
  low: "bg-sev-low/15 text-sev-low border-sev-low/30",
  info: "bg-slate-400/10 text-slate-300 border-slate-400/25",
  success: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  ts: "bg-ts-500/15 text-ts-300 border-ts-400/30",
  neutral: "bg-white/[0.05] text-slate-300 border-white/10",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "focus-ring h-12 w-full rounded-xl border border-ink-500/50 bg-ink-900/80 px-4 font-mono text-sm text-slate-100",
        "placeholder:text-slate-500 hover:border-ink-500 transition-colors",
        className,
      )}
      {...rest}
    />
  );
});

export function scoreTone(
  score: number | null,
): "success" | "medium" | "high" | "critical" | "neutral" {
  if (score === null) return "neutral";
  if (score >= 85) return "success";
  if (score >= 65) return "medium";
  if (score >= 45) return "high";
  return "critical";
}

const ringColors: Record<string, string> = {
  success: "#34d399",
  medium: "#fbbf24",
  high: "#fb923c",
  critical: "#f87171",
  neutral: "#475569",
};

export function ScoreRing({
  score,
  size = 132,
  stroke = 9,
  label,
}: {
  score: number | null;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const tone = scoreTone(score);
  const color = ringColors[tone]!;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score === null ? 0 : score / 100;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="img"
      aria-label={
        score === null ? "Score not available" : `Score ${score} out of 100`
      }
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(120,150,200,0.14)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)",
            filter: `drop-shadow(0 0 10px ${color}55)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono text-3xl font-bold tabular-nums"
          style={{ color }}
        >
          {score === null ? "–" : score}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          {label ?? "/ 100"}
        </span>
      </div>
    </div>
  );
}
