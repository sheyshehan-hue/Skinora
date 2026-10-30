import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/store/PageHeader";
import { formatLKR } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";

export const metadata = { title: "Delivery & returns", description: "Delivery rates for every district in Sri Lanka. Same-day in Colombo, next-day to major cities and island-wide in 1 to 5 days." };

export default async function DeliveryPage() {
  const zones = await prisma.deliveryZone.findMany({ orderBy: [{ province: "asc" }, { district: "asc" }] });
  return (
    <div className="container-lux max-w-5xl">
      <PageHeader eyebrow="Client care" title="Delivery & returns" description={`Complimentary island-wide delivery on orders over ${formatLKR(FREE_SHIPPING_THRESHOLD)}. Every parcel is packed by hand in Colombo, sealed, and insured in transit.`} crumbs={[{ label: "Home", href: "/" }, { label: "Delivery" }]} />
      <div className="overflow-x-auto border border-ink/10 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-ink/10 text-left text-[11px] uppercase tracking-[0.14em] text-ink-500"><th className="p-4">District</th><th className="p-4">Province</th><th className="p-4">Standard</th><th className="p-4">Express</th><th className="p-4">Timing</th></tr></thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.district} className="border-b border-ink/5">
                <td className="p-4 font-medium">{z.district}</td>
                <td className="p-4 text-ink-500">{z.province}</td>
                <td className="p-4">{formatLKR(z.standardFee)}</td>
                <td className="p-4">{z.expressFee ? `${formatLKR(z.expressFee)} ${z.sameDay ? "same-day" : "next-day"}` : "—"}</td>
                <td className="p-4 text-ink-500">{z.sameDay ? "Same-day or next-day" : z.etaDaysMin === z.etaDaysMax ? `${z.etaDaysMin} day` : `${z.etaDaysMin}–${z.etaDaysMax} days`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section id="returns" className="mt-20 grid gap-10 md:grid-cols-2">
        <div><h2 className="font-serif text-4xl">Returns</h2></div>
        <div className="space-y-4 leading-relaxed text-ink-700">
          <p>Unopened products in their original seal can be returned within 14 days of delivery for a full refund or exchange.</p>
          <p>For hygiene reasons, opened skincare and fragrance can only be returned if faulty or if you experience a reaction. Message us on WhatsApp with a photo and we&apos;ll arrange collection.</p>
          <p>Refunds go back to your original payment method within 5 to 7 working days. Cash on delivery refunds are made by bank transfer.</p>
        </div>
      </section>
    </div>
  );
}
