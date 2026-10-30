import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth";
import { OrderDetail, orderDetailInclude } from "@/components/store/OrderDetail";

export const dynamic = "force-dynamic";

export default async function AccountOrder({ params }: { params: Promise<{ number: string }> }) {
  const s = await getCustomerSession();
  if (!s) redirect("/account/login");
  const o = await prisma.order.findUnique({ where: { number: (await params).number }, include: orderDetailInclude });
  if (!o || o.customerId !== s.id) notFound();
  return (
    <div className="container-lux max-w-5xl py-14">
      <Link href="/account" className="text-[11px] uppercase tracking-[0.16em] text-ink-500 hover:text-ink">← My account</Link>
      <div className="mt-8"><OrderDetail o={o} /></div>
    </div>
  );
}
