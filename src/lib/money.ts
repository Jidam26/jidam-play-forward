/**
 * Money values that come from real arithmetic (e.g. a 20% operator cut, or
 * revenue minus several expense line items) can pick up floating-point
 * noise -- 480 - 374.4 is 105.60000000000002 in JS, not 105.6. Round to the
 * nearest cent before displaying anywhere money is shown as a bare number.
 */
export function formatMoney(amount: number): string {
  return (Math.round(amount * 100) / 100).toLocaleString();
}
