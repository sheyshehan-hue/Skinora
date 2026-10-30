import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth";
import { customerLogout } from "@/actions/account";
import { formatDate, formatLKR } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/constants";

export const metadata = { title: "My account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const s = await getCustomerSession();
  if (!s) redirect("/account/login");
  const [c, sp] = await Promise.all([
    prisma.customer.findUnique({ where: { id: s.id }, include: { orders: { orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } } }, addresses: true, loyalty: { orderBy: { createdAt: "desc" }, take: 6 } } }),
    searchParams,
  ]);
  if (!c) redirect("/account/login");
  const spent = c.orders.filter((o) => o.paymentStatus === "PAID").reduce((a, o) => a + o.total, 0);
  const tier = spent > 250000 ? "Noir" : spent > 100000 ? "Champagne" : "Ivory";
  return (
    <div className="container-lux py-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">{sp.welcome ? "Welcome to Skinora" : "My account"}</p>
          <h1 className="mt-3 font-serif text-5xl font-light sm:text-6xl">Hello, {c.name.split(" ")[0]}</h1>
        </div>
        <form action={customerLogout}><button className="btn-ghost text-[11px]">Sign out</button></form>
      </div>
      <div className="mt-12 grid gap-px bg-ink/10 sm:grid-cols-3">
        <div className="bg-ink p-8 text-ivory">
          <p className="text-[11px] uppercase tracking-luxe text-champagne-300">{tier} member</p>
          <p className="mt-3 font-serif text-5xl">{c.loyaltyPoints.toLocaleString()}</p>
          <p className="mt-1 text-sm text-ivory/60">points · worth {formatLKR(c.loyaltyPoints)} at checkout</p>
        </div>
        <div className="bg-ivory p-8"><p className="eyebrow">Orders</p><p className="mt-3 font-serif text-5xl">{c.orders.length}</p></div>
        <div className="bg-ivory p-8"><p className="eyebrow">Earn</p><p className="mt-3 font-serif text-2xl">1 point for every LKR 100</p><p className="mt-1 text-sm text-ink-500">Redeem up to 20% of any order.</p></div>
      </div>
      <div className="mt-16 grid gap-14 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-6 font-serif text-3xl">Order history</h2>
          {c.orders.length === 0 ? (
            <p className="text-ink-500">No orders yet. <Link href="/" className="underline">Start exploring</Link>.</p>
          ) : (
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {c.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/account/orders/${o.number}`} className="grid grid-cols-2 gap-2 py-5 transition hover:bg-white sm:grid-cols-4 sm:px-3">
                    <span className="font-mono text-sm">{o.number}</span>
                    <span className="text-sm text-ink-500">{formatDate(o.createdAt)}</span>
                    <span className="text-sm">{ORDER_STATUS_LABEL[o.status]} · {o._count.items} items</span>
                    <span className="text-right text-sm">{formatLKR(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="space-y-10">
          <div>
            <h2 className="mb-4 font-serif text-2xl">Addresses</h2>
            {c.addresses.map((a) => (
              <p key={a.id} className="mb-3 border border-ink/10 bg-white p-4 text-sm leading-relaxed">
                <span className="eyebrow block">{a.label}{a.isDefault && " · default"}</span>
                {a.line1}<br />{a.line2 && <>{a.line2}<br /></>}{a.city}, {a.district}<br />{a.phone}
              </p>
            ))}
            {!c.addresses.length && <p className="text-sm text-ink-500">Addresses you use at checkout are saved here.</p>}
          </div>
          <div>
            <h2 className="mb-4 font-serif text-2xl">Points activity</h2>
            <ul className="space-y-2 text-sm">
              {c.loyalty.map((l) => (
                <li key={l.id} className="flex justify-between"><span className="text-ink-600">{l.reason} · {formatDate(l.createdAt, { day: "numeric", month: "short" })}</span><span className={l.points > 0 ? "text-sage" : ""}>{l.points > 0 ? "+" : ""}{l.points}</span></li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
