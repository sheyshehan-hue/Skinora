import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markPaid } from "@/lib/orders";
import { verifyPayhereNotify } from "@/lib/payments";

/** PayHere server-to-server payment notification (notify_url). */
export async function POST(req: Request) {
  const form = Object.fromEntries((await req.formData()).entries()) as Record<string, string>;
  if (!verifyPayhereNotify(form)) return new NextResponse("invalid signature", { status: 400 });
  const order = await prisma.order.findUnique({ where: { number: form.order_id } });
  if (!order) return new NextResponse("unknown order", { status: 404 });
  if (Number(form.payhere_amount) !== order.total || form.payhere_currency !== "LKR") return new NextResponse("amount mismatch", { status: 400 });

  const code = Number(form.status_code);
  if (code === 2) await markPaid(order.id, form.payment_id);
  else if (code === -1 || code === -2) {
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED", events: { create: { status: order.status, note: `PayHere status ${code}: ${form.status_message ?? "payment failed"}` } } } });
  }
  return new NextResponse("ok");
}
