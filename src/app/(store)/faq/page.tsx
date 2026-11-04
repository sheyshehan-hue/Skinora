import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/store/PageHeader";
import { FaqSection } from "@/components/store/SeoBlocks";
import { STORE_FAQ, alternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "FAQ: Delivery, Payment & Authenticity in Sri Lanka",
  description: "Answers about shopping at Skinora in Sri Lanka: original products, delivery times by district, cash on delivery, Koko and Mintpay, returns and our Colombo 07 atelier.",
  alternates: alternates("/faq"),
};

export default function FaqPage() {
  return (
    <div className="container-lux max-w-5xl">
      <PageHeader eyebrow="Client care" title="Frequently asked questions" description="Everything about shopping with Skinora in Sri Lanka. Can't find your answer? Message us on WhatsApp." crumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]} />
      <FaqSection items={STORE_FAQ} title="Shopping with Skinora" />
      <p className="mt-10 text-sm text-ink-600">
        See also: <Link href="/delivery" className="underline">delivery rates by district</Link>, <Link href="/authenticity" className="underline">our authenticity promise</Link> and <Link href="/guides" className="underline">skincare guides</Link>.
      </p>
    </div>
  );
}
