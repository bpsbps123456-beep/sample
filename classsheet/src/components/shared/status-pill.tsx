import { cn } from "@/lib/utils";

const variants = {
  online: "bg-emerald-50 text-emerald-700",
  idle: "bg-amber-50 text-amber-700",
  offline: "bg-rose-50 text-rose-700",
  submitted: "bg-sky-50 text-sky-700",
} as const;

interface StatusPillProps {
  label: string;
  variant: keyof typeof variants;
}

export function StatusPill({ label, variant }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        variants[variant],
      )}
    >
      {label}
    </span>
  );
}
