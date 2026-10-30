"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth";
import { markPaid, placeOrder, quote, type CartLine } from "@/lib/orders";
import { DISTRICTS } from "@/lib/districts";

const lineSchema = z.array(z.object({ variantId: z.string(), qty: z.number().int().min(1).max(20) })).max(50);

export async function getQuote(input: { lines: CartLine[]; district?: string; delivery?: string; promoCode?: string; giftWrap?: boolean; redeemPoints?: number }) {
  const session = await getCustomerSession();
  return quote({ ...input, lines: lineSchema.parse(input.lines), customerId: session?.id });
}

export async function trackCheckout(lines: CartLine[], value: number, existingId?: string) {
  if (existingId) {
    const s = await prisma.checkoutSession.findUnique({ where: { id: existingId } });
    if (s && !s.orderId) {
      await prisma.checkoutSession.update({ where: { id: existingId }, data: { items: lines, itemCount: lines.reduce((a, l) => a + l.qty, 0), value } });
      return existingId;
    }
  }
  const s = await prisma.checkoutSession.create({ data: { items: lines, itemCount: lines.reduce((a, l) => a + l.qty, 0), value } });
  return s.id;
}

const orderSchema = z.object({
  lines: lineSchema.min(1),
  email: z.string().email("Please enter a valid email."),
  phone: z.string().regex(/^(\+?94|0)?\s?7\d[\s\d]{7,10}$/, "Please enter a Sri Lankan mobile number, e.g. 077 123 4567."),
  name: z.string().min(2, "Please enter your full name."),
  addressLine1: z.string().min(4, "Please enter your street address."),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "Please enter your city."),
  district: z.enum(DISTRICTS.map((d) => d.district) as [string, ...string[]], { message: "Please choose your district." }),
  delivery: z.string().optional(),
  promoCode: z.string().optional(),
  giftWrap: z.boolean().optional(),
  giftMessage: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  redeemPoints: z.number().int().min(0).optional(),
  paymentMethod: z.enum(["PAYHERE", "KOKO", "MINTPAY", "BANK_TRANSFER", "COD"]),
  marketingOptIn: z.boolean().optional(),
  checkoutSessionId: z.string().optional(),
  saveAddress: z.boolean().optional(),
});

export async function submitOrder(raw: unknown): Promise<{ ok: true; redirect: string } | { ok: false; error: string }> {
  const parsed = orderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const session = await getCustomerSession();
  try {
    const order = await placeOrder({ ...parsed.data, customerId: session?.id });
    if (session && parsed.data.saveAddress) {
      const has = await prisma.address.count({ where: { customerId: session.id } });
      await prisma.address.create({ data: { customerId: session.id, line1: parsed.data.addressLine1, line2: parsed.data.addressLine2, city: parsed.data.city, district: parsed.data.district, phone: parsed.data.phone, isDefault: has === 0 } });
    }
    const m = order.paymentMethod;
    return { ok: true, redirect: m === "PAYHERE" || m === "KOKO" || m === "MINTPAY" ? `/checkout/pay/${order.id}` : `/checkout/success/${order.id}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong. Please try again." };
  }
}

/** Demo gateway: only used when no live PayHere/Koko/Mintpay credentials are configured. */
export async function demoPay(orderId: string, outcome: "success" | "cancel") {
  const o = await prisma.order.findUnique({ where: { id: orderId } });
  if (!o || o.paymentStatus === "PAID") return;
  const live = o.paymentMethod === "PAYHERE" ? !!process.env.PAYHERE_MERCHANT_ID : o.paymentMethod === "KOKO" ? !!process.env.KOKO_API_KEY : !!process.env.MINTPAY_API_KEY;
  if (live) throw new Error("Demo payments are disabled when a live gateway is configured.");
  if (outcome === "success") await markPaid(orderId, `DEMO-${o.paymentMethod}-${Date.now().toString().slice(-6)}`);
}
