"use client";

import { useActionState } from "react";
import { updateBusinessSettingsAction, type FormState } from "@/lib/actions/settings";
import type { BusinessSettings } from "@/lib/repositories/receipts";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: FormState = {};

export function BusinessSettingsForm({ settings }: { settings: BusinessSettings }) {
  const [state, formAction] = useActionState(updateBusinessSettingsAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy">Business name (English)</span>
        <input
          name="trade_name_en"
          type="text"
          required
          defaultValue={settings.trade_name_en}
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy">Business name (Arabic)</span>
        <input
          name="trade_name_ar"
          type="text"
          dir="rtl"
          required
          defaultValue={settings.trade_name_ar}
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy">
          Corporate Tax TRN <span className="font-normal text-navy/50">(optional -- leave blank until you have one)</span>
        </span>
        <input
          name="trn"
          type="text"
          defaultValue={settings.trn ?? ""}
          placeholder="e.g. 100123456700003"
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
        <span className="mt-1 block text-xs text-navy/50">
          Printed on every receipt. Receipts print &quot;TRN pending&quot; until this is set.
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy">
          Address <span className="font-normal text-navy/50">(optional)</span>
        </span>
        <input
          name="address"
          type="text"
          defaultValue={settings.address ?? ""}
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm font-semibold text-green-700">Saved.</p>}
      <SubmitButton pendingText="Saving...">Save Settings</SubmitButton>
    </form>
  );
}
