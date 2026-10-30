"use server";
import { revalidatePath } from "next/cache";
import type { DiscountType, OrderStatus, ReturnStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { markPaid, restock } from "@/lib/orders";
import { notifyOrder } from "@/lib/notify";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// ───────── orders
export async function updateOrderStatus(form: FormData) {
  await requireStaff("orders");
  const id = s(form, "id");
  const status = s(form, "status") as OrderStatus;
  const o = await prisma.order.findUniqueOrThrow({ where: { id } });
  if (o.status === status) return;
  await prisma.$transaction(async (tx) => {
    if (status === "CANCELLED" && o.status !== "CANCELLED") await restock(id, tx);
    await tx.order.update({
      where: { id },
      data: {
        status,
        courier: s(form, "courier") || o.courier,
        trackingNumber: s(form, "trackingNumber") || o.trackingNumber,
        ...(status === "DELIVERED" && o.paymentMethod === "COD" ? { codCollected: true, paymentStatus: "PAID" } : {}),
        ...(status === "CANCELLED" && o.paymentStatus === "PENDING" ? { paymentStatus: "FAILED" } : {}),
        events: { create: { status, note: s(form, "note") || null } },
      },
    });
  });
  const updated = await prisma.order.findUniqueOrThrow({ where: { id } });
  if (form.get("notify") === "on") await notifyOrder(updated, "status");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}

export async function confirmPayment(form: FormData) {
  await requireStaff("orders");
  await markPaid(s(form, "id"), s(form, "ref") || "Confirmed by staff");
  revalidatePath(`/admin/orders/${s(form, "id")}`);
}

export async function remitCod(form: FormData) {
  await requireStaff("orders");
  const ids = form.getAll("ids").map(String);
  await prisma.order.updateMany({ where: { id: { in: ids }, codCollected: true, codRemittedAt: null }, data: { codRemittedAt: new Date() } });
  revalidatePath("/admin/orders");
}

export async function createReturn(form: FormData) {
  await requireStaff("orders");
  const orderId = s(form, "id");
  await prisma.returnRequest.create({ data: { orderId, reason: s(form, "reason") || "Customer request", refundAmount: Number(s(form, "amount") || 0) } });
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function updateReturn(form: FormData) {
  await requireStaff("orders");
  const id = s(form, "id");
  const status = s(form, "status") as ReturnStatus;
  const restockItems = form.get("restock") === "on";
  const r = await prisma.returnRequest.update({ where: { id }, data: { status, restock: restockItems } });
  if (status === "REFUNDED") {
    await prisma.$transaction(async (tx) => {
      if (restockItems) await restock(r.orderId, tx);
      await tx.order.update({ where: { id: r.orderId }, data: { status: "RETURNED", paymentStatus: "REFUNDED", events: { create: { status: "RETURNED", note: `Refunded LKR ${r.refundAmount.toLocaleString()}` } } } });
    });
  }
  revalidatePath(`/admin/orders/${r.orderId}`);
  revalidatePath("/admin/orders");
}

// ───────── inventory
export async function receiveStock(form: FormData) {
  await requireStaff("inventory");
  const variantId = s(form, "variantId");
  const qty = Number(s(form, "quantity"));
  const unitCost = Number(s(form, "unitCost"));
  if (!variantId || !qty || qty < 1) throw new Error("Choose a product and quantity.");
  await prisma.$transaction(async (tx) => {
    await tx.batch.create({
      data: {
        variantId,
        batchNumber: s(form, "batchNumber"),
        quantity: qty,
        remaining: qty,
        unitCost,
        expiryDate: new Date(s(form, "expiryDate")),
        manufacturedAt: s(form, "manufacturedAt") ? new Date(s(form, "manufacturedAt")) : null,
        supplierId: s(form, "supplierId") || null,
        importRef: s(form, "importRef") || null,
      },
    });
    const v = await tx.variant.findUniqueOrThrow({ where: { id: variantId } });
    // weighted-average landed cost
    const newCost = Math.round((v.costPrice * v.stock + unitCost * qty) / (v.stock + qty));
    await tx.variant.update({ where: { id: variantId }, data: { stock: { increment: qty }, costPrice: newCost } });
  });
  revalidatePath("/admin/inventory");
}

export async function writeOffBatch(form: FormData) {
  await requireStaff("inventory");
  const id = s(form, "id");
  const b = await prisma.batch.findUniqueOrThrow({ where: { id } });
  await prisma.$transaction([
    prisma.batch.update({ where: { id }, data: { remaining: 0, importRef: `${b.importRef ?? ""} · written off ${new Date().toISOString().slice(0, 10)}` } }),
    prisma.variant.update({ where: { id: b.variantId }, data: { stock: { decrement: b.remaining } } }),
  ]);
  revalidatePath("/admin/inventory");
}

// ───────── promotions
export async function saveDiscount(form: FormData) {
  await requireStaff("promotions");
  const id = s(form, "id");
  const data = {
    code: s(form, "code").toUpperCase().replace(/\s/g, ""),
    description: s(form, "description") || null,
    type: s(form, "type") as DiscountType,
    value: Number(s(form, "value") || 0),
    minSpend: Number(s(form, "minSpend") || 0),
    usageLimit: s(form, "usageLimit") ? Number(s(form, "usageLimit")) : null,
    startsAt: s(form, "startsAt") ? new Date(s(form, "startsAt")) : null,
    endsAt: s(form, "endsAt") ? new Date(s(form, "endsAt")) : null,
    active: form.get("active") === "on",
  };
  if (!data.code) return;
  if (id) await prisma.discountCode.update({ where: { id }, data });
  else await prisma.discountCode.create({ data });
  revalidatePath("/admin/promotions");
}

export async function saveFlashSale(form: FormData) {
  await requireStaff("promotions");
  const id = s(form, "id");
  const productIds = form.getAll("productIds").map(String);
  const data = { name: s(form, "name"), discountPercent: Number(s(form, "discountPercent")), startsAt: new Date(s(form, "startsAt")), endsAt: new Date(s(form, "endsAt")), active: form.get("active") === "on" };
  const fs = id ? await prisma.flashSale.update({ where: { id }, data }) : await prisma.flashSale.create({ data });
  await prisma.flashSaleProduct.deleteMany({ where: { flashSaleId: fs.id } });
  await prisma.flashSaleProduct.createMany({ data: productIds.map((productId) => ({ flashSaleId: fs.id, productId })) });
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
}

export async function saveBundle(form: FormData) {
  await requireStaff("promotions");
  const id = s(form, "id");
  const productIds = form.getAll("productIds").map(String);
  const name = s(form, "name");
  const data = { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), description: s(form, "description") || null, price: Number(s(form, "price")), active: form.get("active") === "on" };
  const b = id ? await prisma.bundle.update({ where: { id }, data }) : await prisma.bundle.create({ data });
  await prisma.bundleItem.deleteMany({ where: { bundleId: b.id } });
  await prisma.bundleItem.createMany({ data: productIds.map((productId) => ({ bundleId: b.id, productId })) });
  revalidatePath("/admin/promotions");
}

export async function adjustPoints(form: FormData) {
  await requireStaff("customers");
  const customerId = s(form, "customerId");
  const points = Number(s(form, "points"));
  if (!points) return;
  await prisma.$transaction([
    prisma.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { increment: points } } }),
    prisma.loyaltyTransaction.create({ data: { customerId, points, reason: s(form, "reason") || "Manual adjustment" } }),
  ]);
  revalidatePath("/admin/customers");
}
