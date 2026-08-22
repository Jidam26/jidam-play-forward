"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
  className = "",
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full rounded-lg bg-gold px-4 py-3 text-base font-bold text-navy transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
