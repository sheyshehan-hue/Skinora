import "server-only";
import type { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { flashPercent, variantPrice } from "./catalog";
import { COD_LIMIT, FREE_SHIPPING_THRESHOLD, GIFT_WRAP_FEE, LOYALTY_EARN_PER_LKR } from "./constants";
import { notifyOrder } from "./notify";

export type CartLine = { variantId: string; qty: number };

export type QuoteInput = {
  lines: CartLine[];
  district?: string;
  delivery?: string; // standard | next-day | same-day
  promoCode?: string;
  giftWrap?: boolean;
  redeemPoints?: number;
  customerId?: string | null;
  paymentMethod?: PaymentMethod;
};

export type DeliveryOption = { id: string; label: string; detail: string; fee: number };

/** Server-side source of truth for prices, delivery, discounts and totals. */
export async function quote(input: QuoteInput) {
  const variants = await prisma.variant.findMany({
    where: { id: { in: input.lines.map((l) => l.variantId) } },
    include: { product: { include: { brand: true, images: { orderBy: { sortOrder: "asc" }, take: 1 }, flashSales: { include: { flashSale: true } } } } },
  });
  const issues: string[] = [];
  const lines = input.lines
    .map((l) => {
      const v = variants.find((x) => x.id === l.variantId);
      if (!v || v.product.status !== "ACTIVE") {
        issues.push("An item in your bag is no longer available and was removed.");
        return null;
      }
      const { price, compareAt } = variantPrice(v, flashPercent(v.product));
      let qty = l.qty;
      if (v.stock < qty) {
        issues.push(v.stock === 0 ? `${v.product.name} (${v.name}) has just sold out.` : `Only ${v.stock} of ${v.product.name} (${v.name}) left. We've updated your quantity.`);
        qty = v.stock;
      }
      return qty > 0 ? { variantId: v.id, productId: v.productId, name: v.product.name, brand: v.product.brand.name, variantName: v.name, image: v.product.images[0]?.url ?? "", price, compareAt, qty, stock: v.stock, costPrice: v.costPrice, lineTotal: price * qty } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  // Bundles: auto-applied when every product of a bundle is in the bag
  const bundles = await prisma.bundle.findMany({ where: { active: true }, include: { items: true } });
  let bundleDiscount = 0;
  const appliedBundles: string[] = [];
  for (const b of bundles) {
    const parts = b.items.map((i) => lines.find((l) => l.productId === i.productId));
    if (parts.every(Boolean)) {
      const full = parts.reduce((s, l) => s + l!.price, 0);
      if (full > b.price) {
        bundleDiscount += full - b.price;
        appliedBundles.push(b.name);
      }
    }
  }

  // Promo code
  let promoDiscount = 0;
  let freeShipping = false;
  let promoError: string | null = null;
  let promo: { code: string; description: string | null } | null = null;
  if (input.promoCode) {
    const now = new Date();
    const code = await prisma.discountCode.findUnique({ where: { code: input.promoCode.trim().toUpperCase() } });
    if (!code || !code.active || (code.startsAt && code.startsAt > now) || (code.endsAt && code.endsAt < now)) promoError = "This code isn't valid right now.";
    else if (code.usageLimit !== null && code.usedCount >= code.usageLimit) promoError = "This code has been fully redeemed.";
    else if (subtotal < code.minSpend) promoError = `Spend LKR ${code.minSpend.toLocaleString()} or more to use this code.`;
    else {
      promo = { code: code.code, description: code.description };
      if (code.type === "PERCENT") promoDiscount = Math.round(((subtotal - bundleDiscount) * code.value) / 100);
      if (code.type === "FIXED") promoDiscount = Math.min(code.value, subtotal - bundleDiscount);
      if (code.type === "FREE_SHIPPING") freeShipping = true;
    }
  }

  // Delivery
  const zone = input.district ? await prisma.deliveryZone.findUnique({ where: { district: input.district } }) : null;
  const options: DeliveryOption[] = [];
  const freeOver = subtotal >= FREE_SHIPPING_THRESHOLD || freeShipping;
  if (zone) {
    const eta = zone.etaDaysMin === zone.etaDaysMax ? `${zone.etaDaysMin} working day` : `${zone.etaDaysMin}–${zone.etaDaysMax} working days`;
    options.push({ id: "standard", label: zone.district === "Colombo" ? "Next-day delivery" : "Island-wide delivery", detail: zone.district === "Colombo" ? "Delivered tomorrow" : eta, fee: freeOver ? 0 : zone.standardFee });
    if (zone.nextDay && zone.district !== "Colombo" && zone.expressFee) options.push({ id: "next-day", label: "Next-day express", detail: "Order before 3pm", fee: zone.expressFee });
    if (zone.sameDay && zone.expressFee) options.push({ id: "same-day", label: "Same-day delivery", detail: "Order before 1pm, delivered by 9pm", fee: zone.expressFee });
  }
  const chosen = options.find((o) => o.id === input.delivery) ?? options[0];
  const deliveryFee = chosen?.fee ?? 0;
  const giftWrapFee = input.giftWrap ? GIFT_WRAP_FEE : 0;

  // Loyalty
  let loyaltyRedeemed = 0;
  let pointsAvailable = 0;
  if (input.customerId) {
    const c = await prisma.customer.findUnique({ where: { id: input.customerId }, select: { loyaltyPoints: true } });
    pointsAvailable = c?.loyaltyPoints ?? 0;
    if (input.redeemPoints) loyaltyRedeemed = Math.min(input.redeemPoints, pointsAvailable, Math.floor((subtotal - bundleDiscount - promoDiscount) * 0.2));
  }

  const discount = bundleDiscount + promoDiscount;
  const total = Math.max(0, subtotal - discount - loyaltyRedeemed + deliveryFee + giftWrapFee);
  const codAvailable = (zone?.codAvailable ?? true) && total <= COD_LIMIT;

  return {
    lines,
    issues,
    subtotal,
    bundleDiscount,
    appliedBundles,
    promo,
    promoDiscount,
    promoError,
    discount,
    deliveryOptions: options,
    delivery: chosen?.id ?? "standard",
    deliveryFee,
    giftWrapFee,
    loyaltyRedeemed,
    pointsAvailable,
    pointsToEarn: Math.floor(total / LOYALTY_EARN_PER_LKR),
    total,
    codAvailable,
  };
}
export type Quote = Awaited<ReturnType<typeof quote>>;

export type PlaceOrderInput = QuoteInput & {
  email: string;
  phone: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  giftMessage?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  marketingOptIn?: boolean;
  checkoutSessionId?: string;
};

async function nextOrderNumber(tx: Prisma.TransactionClient) {
  const last = await tx.order.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  const n = last ? parseInt(last.number.replace(/\D/g, ""), 10) + 1 : 100000;
  return `SK-${n}`;
}

/**
 * Creates an order: re-prices server-side, reserves stock first-expiry-first-out across batches,
 * records the timeline, links the customer (registered or guest) and sends notifications.
 */
export async function placeOrder(input: PlaceOrderInput) {
  const q = await quote(input);
  if (!q.lines.length) throw new Error("Your bag is empty.");
  if (q.issues.length) throw new Error(q.issues.join(" "));
  if (input.paymentMethod === "COD" && !q.codAvailable) throw new Error("Cash on delivery isn't available for this order. Please choose another payment method.");

  const order = await prisma.$transaction(async (tx) => {
    // Customer: logged-in, or find/create a guest record by email so repeat purchases are tracked
    let customerId = input.customerId ?? null;
    if (!customerId) {
      const existing = await tx.customer.findUnique({ where: { email: input.email.toLowerCase() } });
      customerId = existing
        ? existing.id
        : (await tx.customer.create({ data: { email: input.email.toLowerCase(), name: input.name, phone: input.phone, district: input.district, marketingOptIn: !!input.marketingOptIn } })).id;
    }

    // FEFO stock allocation
    const items: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    for (const l of q.lines) {
      const updated = await tx.variant.updateMany({ where: { id: l.variantId, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
      if (updated.count === 0) throw new Error(`Sorry, ${l.name} (${l.variantName}) just sold out.`);
      let need = l.qty;
      const batches = await tx.batch.findMany({ where: { variantId: l.variantId, remaining: { gt: 0 } }, orderBy: { expiryDate: "asc" } });
      for (const b of batches) {
        if (need <= 0) break;
        const take = Math.min(need, b.remaining);
        await tx.batch.update({ where: { id: b.id }, data: { remaining: { decrement: take } } });
        items.push({ variant: { connect: { id: l.variantId } }, batch: { connect: { id: b.id } }, productName: l.name, variantName: l.variantName, quantity: take, unitPrice: l.price, unitCost: b.unitCost });
        need -= take;
      }
      if (need > 0) items.push({ variant: { connect: { id: l.variantId } }, productName: l.name, variantName: l.variantName, quantity: need, unitPrice: l.price, unitCost: l.costPrice });
    }

    const status = input.paymentMethod === "COD" ? "CONFIRMED" : "PENDING_PAYMENT";
    const created = await tx.order.create({
      data: {
        number: await nextOrderNumber(tx),
        customerId,
        email: input.email.toLowerCase(),
        phone: input.phone,
        name: input.name,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        district: input.district,
        deliveryMethod: q.delivery,
        deliveryFee: q.deliveryFee,
        subtotal: q.subtotal,
        discount: q.discount,
        giftWrap: !!input.giftWrap,
        giftWrapFee: q.giftWrapFee,
        giftMessage: input.giftWrap ? input.giftMessage : null,
        loyaltyRedeemed: q.loyaltyRedeemed,
        total: q.total,
        promoCode: q.promo?.code,
        paymentMethod: input.paymentMethod,
        status,
        notes: input.notes,
        items: { create: items },
        events: { create: { status, note: input.paymentMethod === "COD" ? "Order placed · cash on delivery" : "Order placed · awaiting payment" } },
      },
    });
    if (q.promo) await tx.discountCode.update({ where: { code: q.promo.code }, data: { usedCount: { increment: 1 } } });
    if (q.loyaltyRedeemed && input.customerId) {
      await tx.customer.update({ where: { id: input.customerId }, data: { loyaltyPoints: { decrement: q.loyaltyRedeemed } } });
      await tx.loyaltyTransaction.create({ data: { customerId: input.customerId, points: -q.loyaltyRedeemed, reason: "Redeemed at checkout", orderId: created.id } });
    }
    if (input.checkoutSessionId) await tx.checkoutSession.updateMany({ where: { id: input.checkoutSessionId, orderId: null }, data: { orderId: created.id } });
    return created;
  });

  await notifyOrder(order, "placed");
  return order;
}

/** Marks an order paid (gateway callback, demo gateway or admin confirming a bank transfer). */
export async function markPaid(orderId: string, ref?: string) {
  const o = await prisma.order.findUnique({ where: { id: orderId } });
  if (!o || o.paymentStatus === "PAID") return o;
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "PAID", paymentRef: ref ?? o.paymentRef, status: o.status === "PENDING_PAYMENT" ? "CONFIRMED" : o.status, events: { create: { status: "CONFIRMED", note: `Payment received${ref ? ` · ${ref}` : ""}` } } },
  });
  if (updated.customerId) {
    const c = await prisma.customer.findUnique({ where: { id: updated.customerId } });
    if (c?.passwordHash) {
      const pts = Math.floor(updated.total / LOYALTY_EARN_PER_LKR);
      await prisma.customer.update({ where: { id: c.id }, data: { loyaltyPoints: { increment: pts } } });
      await prisma.loyaltyTransaction.create({ data: { customerId: c.id, points: pts, reason: "Order reward", orderId } });
    }
  }
  await notifyOrder(updated, "paid");
  return updated;
}

/** Returns reserved stock to its batches (cancellation or restocked return). */
export async function restock(orderId: string, tx: Prisma.TransactionClient = prisma) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const i of items) {
    await tx.variant.update({ where: { id: i.variantId }, data: { stock: { increment: i.quantity } } });
    if (i.batchId) await tx.batch.update({ where: { id: i.batchId }, data: { remaining: { increment: i.quantity } } });
  }
}
