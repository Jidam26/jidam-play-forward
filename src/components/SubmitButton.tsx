"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
  /** Extra condition beyond the normal pending-submit disable, e.g. a type-to-confirm field not yet matching. */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`w-full rounded-lg bg-gold px-4 py-3 text-base font-bold text-navy transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
