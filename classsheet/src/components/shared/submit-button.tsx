"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  label: React.ReactNode;
  pendingLabel?: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
}

export function SubmitButton({
  label,
  pendingLabel = "처리 중...",
  className,
  name,
  value,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} name={name} value={value}>
      {pending ? pendingLabel : label}
    </button>
  );
}
