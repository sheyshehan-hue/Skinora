import { PageHeader } from "@/components/store/PageHeader";
import { TrustBar } from "@/components/store/TrustBar";

export const metadata = { title: "Authenticity promise", description: "How Skinora guarantees 100% authentic skincare and fragrance in Sri Lanka: authorised distributors, batch and expiry transparency and climate-controlled storage." };

const steps = [
  ["Authorised sourcing only", "We buy exclusively from brand-authorised distributors in South Korea, France, the UAE and Singapore. Every shipment comes with invoices and certificates we keep on file."],
  ["Cleared through Customs", "Each import is cleared through Sri Lanka Customs under Skinora Imports (Pvt) Ltd, and the CUSDEC reference is recorded against every batch."],
  ["Batch & expiry, before you buy", "Each product page shows the batch number and best-before date of the exact stock we'll send you. We dispatch first-expiry-first-out."],
  ["Climate-controlled storage", "Sri Lankan heat degrades actives and fragrance. Our Colombo store room is held at 18–22°C with humidity control."],
  ["Sealed and traceable", "Your order confirmation lists the batch of every item, so you can verify it with the brand."],
];

export default function AuthenticityPage() {
  return (
    <div className="container-lux max-w-5xl">
      <PageHeader eyebrow="Our promise" title="100% authentic. Always." description="Counterfeit beauty is common in Sri Lanka. Skinora exists so you never have to wonder." crumbs={[{ label: "Home", href: "/" }, { label: "Authenticity" }]} />
      <ol className="divide-y divide-ink/10 border-y border-ink/10">
        {steps.map(([t, d], i) => (
          <li key={t} className="grid gap-4 py-10 md:grid-cols-[120px_1fr_2fr]">
            <span className="font-serif text-5xl text-champagne-600">0{i + 1}</span>
            <h2 className="font-serif text-3xl">{t}</h2>
            <p className="leading-relaxed text-ink-700">{d}</p>
          </li>
        ))}
      </ol>
      <div className="mt-20"><TrustBar /></div>
    </div>
  );
}
