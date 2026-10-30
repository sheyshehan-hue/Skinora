import "server-only";
import crypto from "crypto";

const md5 = (s: string) => crypto.createHash("md5").update(s).digest("hex").toUpperCase();

export const payhereConfigured = () => !!(process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_MERCHANT_SECRET);

/** Fields for the PayHere Checkout form (https://support.payhere.lk/api-&-mobile-sdk/checkout-api). */
export function payhereCheckout(o: { id: string; number: string; total: number; name: string; email: string; phone: string; addressLine1: string; city: string }) {
  const merchantId = process.env.PAYHERE_MERCHANT_ID!;
  const secret = process.env.PAYHERE_MERCHANT_SECRET!;
  const amount = o.total.toFixed(2);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [first, ...rest] = o.name.split(" ");
  const hash = md5(merchantId + o.number + amount + "LKR" + md5(secret));
  return {
    action: process.env.PAYHERE_SANDBOX === "false" ? "https://www.payhere.lk/pay/checkout" : "https://sandbox.payhere.lk/pay/checkout",
    fields: {
      merchant_id: merchantId,
      return_url: `${site}/checkout/success/${o.id}`,
      cancel_url: `${site}/checkout?cancelled=${o.number}`,
      notify_url: `${site}/api/payhere/notify`,
      order_id: o.number,
      items: `Skinora order ${o.number}`,
      currency: "LKR",
      amount,
      first_name: first,
      last_name: rest.join(" ") || first,
      email: o.email,
      phone: o.phone,
      address: o.addressLine1,
      city: o.city,
      country: "Sri Lanka",
      hash,
    },
  };
}

/** Verifies the md5sig PayHere posts to notify_url. status_code 2 = success. */
export function verifyPayhereNotify(p: Record<string, string>) {
  const secret = process.env.PAYHERE_MERCHANT_SECRET ?? "";
  const local = md5(p.merchant_id + p.order_id + p.payhere_amount + p.payhere_currency + p.status_code + md5(secret));
  return local === p.md5sig;
}

/**
 * Koko and Mintpay issue merchant credentials and a redirect URL after onboarding.
 * Until those are set, both run through the on-site demo gateway so the full flow can be tested.
 */
export const bnplConfigured = (m: "KOKO" | "MINTPAY") => (m === "KOKO" ? !!process.env.KOKO_API_KEY : !!process.env.MINTPAY_API_KEY);
