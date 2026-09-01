"use client";

import { useActionState } from "react";
import type { Game } from "@/lib/repositories/games";
import { updateGameAction, type FormState } from "@/lib/actions/games";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: FormState = {};

export function EditGameForm({ game }: { game: Game }) {
  const action = updateGameAction.bind(null, game.id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy">Sport</span>
        <select
          name="sport"
          required
          defaultValue={game.sport}
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        >
          <option value="Football">Football</option>
          <option value="Volleyball">Volleyball</option>
          <option value="Padel">Padel</option>
          <option value="Basketball">Basketball</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy">Date</span>
          <input
            name="date"
            type="date"
            required
            defaultValue={game.date}
            className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy">Time</span>
          <input
            name="time"
            type="time"
            required
            defaultValue={game.time}
            className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy">Venue</span>
        <input
          name="venue"
          type="text"
          required
          defaultValue={game.venue}
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy">Price (AED)</span>
          <input
            name="price_aed"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={game.price_aed}
            className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy">Total spots</span>
          <input
            name="total_spots"
            type="number"
            min={1}
            step="1"
            required
            defaultValue={game.total_spots}
            className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy">
          Attendees played <span className="font-normal text-navy/50">(corrects the X/Y shown for this game)</span>
        </span>
        <input
          name="spots_filled"
          type="number"
          min={0}
          step="1"
          required
          defaultValue={game.spots_filled}
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
        <span className="mt-1 block text-xs text-navy/50">
          Use this to fix a game that shows the wrong number played -- e.g. one added before real bookings were
          tracked. It doesn&apos;t change who&apos;s listed as an attendee, just the count.
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy">
          Revenue override (AED) <span className="font-normal text-navy/50">(optional)</span>
        </span>
        <input
          name="imported_revenue"
          type="number"
          min={0}
          step="0.01"
          defaultValue={game.imported_revenue ?? ""}
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
        <span className="mt-1 block text-xs text-navy/50">
          Leave blank to use the sum of real paid bookings. Set this to record a known total instead (e.g. for a game
          with no per-attendee payment records).
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy">
          Payment link <span className="font-normal text-navy/50">(optional)</span>
        </span>
        <input
          name="payment_link"
          type="url"
          defaultValue={game.payment_link ?? ""}
          placeholder="https://pay.adcb.com/..."
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton pendingText="Saving...">Save Changes</SubmitButton>
    </form>
  );
}
