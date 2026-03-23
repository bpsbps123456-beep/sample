import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  description,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn("surface rounded-2xl p-6", className)}
    >
      <div className="mb-5 flex items-end justify-between gap-3 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">{title}</h2>
        {description ? (
          <p className="max-w-sm text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
