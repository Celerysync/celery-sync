// What each plan costs, in the visitor's own currency. The same amounts live
// in Stripe as currency_options on each price (lookup keys in
// server/routes/stripe.js), and Stripe Checkout shows the visitor's local
// currency — so what people read here matches what they're charged.
// Change a price in BOTH places.
//
// Pounds and euros are deliberately absent: selling to the UK/EU makes us
// liable for their VAT from the first sale, so those wait until a
// merchant-of-record setup handles it. Everyone else sees Australian dollars.

const PRICES = {
  AUD: { rhythm: 9.97, voice: 24.97, topup: 6.99 },
  USD: { rhythm: 6.99, voice: 16.99, topup: 4.49 },
  CAD: { rhythm: 9.49, voice: 22.99, topup: 6.49 },
  NZD: { rhythm: 10.99, voice: 27.49, topup: 7.49 },
};
const SYMBOL = { AUD: "$", USD: "US$", CAD: "CA$", NZD: "NZ$" };
const CANADA = /^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal|Moncton|Whitehorse|Yellowknife|Iqaluit|Glace_Bay|Goose_Bay|Dawson_Creek|Swift_Current)/;

export function localCurrency(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "") {
  if (timeZone === "Pacific/Auckland" || timeZone === "Pacific/Chatham") return "NZD";
  if (CANADA.test(timeZone)) return "CAD";
  if (timeZone.startsWith("America/") || timeZone.startsWith("US/") || timeZone === "Pacific/Honolulu") return "USD";
  return "AUD";
}

const CURRENCY = localCurrency();

// price("voice") → "$24.97" (Australia) / "US$16.99" (US) …
export function price(plan) {
  return `${SYMBOL[CURRENCY]}${PRICES[CURRENCY][plan].toFixed(2)}`;
}
export const CURRENCY_CODE = CURRENCY;
