import Link from "next/link";
import { Check } from "lucide-react";
import { listProducts, productsBySlugs } from "@/lib/catalog";
import type { Landing } from "@/lib/landing";
import { GUIDES } from "@/lib/guides";
import { abs, itemListLd } from "@/lib/seo";
import { PageHeader } from "./PageHeader";
import { ProductGrid } from "./ProductGrid";
import { SectionHeading } from "./SectionHeading";
import { AnswerBox, FaqSection, GuideLinks, JsonLd } from "./SeoBlocks";

/** Men's / women's edit: answer-first intro, curated product rows, climate tips, guides and FAQ. */
export async function LandingPage({ landing }: { landing: Landing }) {
  const rows = await Promise.all(
    landing.sections.map(async (s) => ({
      ...s,
      products: s.gender ? (await listProducts({ gender: s.gender })).slice(0, 4) : await productsBySlugs(s.slugs ?? []),
    })),
  );
  const all = rows.flatMap((r) => r.products);
  const guides = landing.guides.map((g) => GUIDES.find((x) => x.slug === g)).filter((g): g is NonNullable<typeof g> => !!g);
  const path = `/${landing.slug}`;

  return (
    <div className="container-lux">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": `${abs(path)}#page`,
          url: abs(path),
          name: landing.h1,
          description: landing.metaDescription,
          inLanguage: "en-LK",
          isPartOf: { "@id": abs("/#website") },
          about: { "@type": "Audience", audienceType: landing.slug === "men" ? "Men" : "Women", geographicArea: { "@type": "Country", name: "Sri Lanka" } },
        }}
      />
      <JsonLd data={itemListLd(landing.h1, all.map((p) => ({ slug: p.slug, name: `${p.brand} ${p.name}` })))} />
      <PageHeader eyebrow={landing.eyebrow} title={landing.h1} crumbs={[{ label: "Home", href: "/" }, { label: landing.eyebrow }]} />
      <AnswerBox>{landing.answer}</AnswerBox>
      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-600">
        {landing.facts.map((f) => (
          <li key={f} className="inline-flex items-center gap-2"><Check width={14} className="text-sage" /> {f}</li>
        ))}
      </ul>

      {rows.map((r) =>
        r.products.length ? (
          <section key={r.title} className="mt-20">
            <SectionHeading title={r.title} href={r.href} linkLabel={r.cta} />
            <p className="-mt-6 mb-8 max-w-2xl text-ink-600">{r.intro}</p>
            <ProductGrid products={r.products} />
          </section>
        ) : null,
      )}

      <section className="mt-24">
        <SectionHeading eyebrow="Made for Sri Lanka" title="Tips for our climate" />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {landing.tips.map((t) => (
            <div key={t.title}>
              <h3 className="font-serif text-2xl">{t.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">{t.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-sm text-ink-600">
          Not sure where to start? <Link href="/quiz" className="underline">Take the two-minute skin quiz</Link> for a routine built for your skin.
        </p>
      </section>

      <div className="mt-24"><GuideLinks guides={guides} title="Read the guides" /></div>
      <div className="mt-24"><FaqSection items={landing.faq} /></div>
    </div>
  );
}
