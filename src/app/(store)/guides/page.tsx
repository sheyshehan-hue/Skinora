import type { Metadata } from "next";
import { PageHeader } from "@/components/store/PageHeader";
import { GuideLinks, JsonLd } from "@/components/store/SeoBlocks";
import { GUIDES } from "@/lib/guides";
import { abs, alternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Skincare & Perfume Guides for Sri Lanka",
  description: "Straight answers for Sri Lankan shoppers: the best sunscreen for our climate, men's and women's routines for humid weather, perfumes that last in the heat, and how to spot fakes.",
  alternates: alternates("/guides"),
};

export default function GuidesPage() {
  return (
    <div className="container-lux">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Skinora guides", url: abs("/guides"), hasPart: GUIDES.map((g) => ({ "@type": "Article", headline: g.title, url: abs(`/guides/${g.slug}`) })) }} />
      <PageHeader eyebrow="Journal" title="Guides for Sri Lankan skin" description="Clear, practical answers about skincare and fragrance in Sri Lanka's heat and humidity, for men and women." crumbs={[{ label: "Home", href: "/" }, { label: "Guides" }]} />
      <GuideLinks guides={GUIDES} title="All guides" />
    </div>
  );
}
