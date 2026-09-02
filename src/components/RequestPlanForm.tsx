"use client";

import { useActionState } from "react";
import { requestPlanPurchaseAction, type RequestPlanState } from "@/lib/actions/plans";
import { SubmitButton } from "@/components/SubmitButton";
import { PaymentInstructions } from "@/components/PaymentInstructions";

const initialState: RequestPlanState = {};

export function RequestPlanForm({
  planId,
  paymentLink,
  planLabel,
  alreadyRequested,
}: {
  planId: string;
  paymentLink: string | null;
  planLabel: string;
  /** True if this member already has a pending (or paid) request for this exact plan -- from a server-refreshed prop. */
  alreadyRequested: boolean;
}) {
  const [state, formAction] = useActionState(requestPlanPurchaseAction, initialState);

  if (alreadyRequested || state.success) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-navy/5 px-4 py-3 text-center text-sm font-semibold text-navy">
          Requested — see it under My Plans
        </p>
        <PaymentInstructions paymentLink={paymentLink} gameLabel={planLabel} />
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="planId" value={planId} />
      <SubmitButton pendingText="Requesting...">Buy This Plan</SubmitButton>
      {state.error && <p className="text-center text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
