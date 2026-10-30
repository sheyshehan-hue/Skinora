import { prisma } from "@/lib/prisma";
import { OrderDetail, orderDetailInclude } from "@/components/store/OrderDetail";

export const metadata = { title: "Track your order" };
export const dynamic = "force-dynamic";

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string; email?: string }> }) {
  const { order, email } = await searchParams;
  const o = order && email ? await prisma.order.findFirst({ where: { number: order.trim().toUpperCase(), email: email.trim().toLowerCase() }, include: orderDetailInclude }) : null;
  return (
    <div className="container-lux max-w-5xl py-14">
      {o ? (
        <OrderDetail o={o} />
      ) : (
        <div className="mx-auto max-w-md">
          <h1 className="text-center font-serif text-5xl font-light">Track your order</h1>
          <p className="mb-10 mt-3 text-center text-sm text-ink-500">Enter your order number and the email you used at checkout.</p>
          {order && email && <p className="mb-6 text-center text-sm text-rosewood">We couldn&apos;t find that order. Please check the details.</p>}
          <form className="grid gap-5">
            <label><span className="label">Order number</span><input name="order" defaultValue={order} placeholder="SK-100245" required className="input uppercase" /></label>
            <label><span className="label">Email</span><input name="email" type="email" defaultValue={email} required className="input" /></label>
            <button className="btn-primary">Track</button>
          </form>
        </div>
      )}
    </div>
  );
}
