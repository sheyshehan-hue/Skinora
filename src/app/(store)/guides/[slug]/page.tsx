import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { productsBySlugs } from "@/lib/catalog";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { STORE, abs, alternates } from "@/lib/seo";
import { PageHeader } from "@/components/store/PageHeader";
import { ProductGrid } from "@/components/store/ProductGrid";
import { AnswerBox, FaqSection, GuideLinks, JsonLd } from "@/components/store/SeoBlocks";
import { formatDate } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;
export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.metaDescription,
    alternates: alternates(`/guides/${g.slug}`),
    openGraph: { type: "article", title: g.title, description: g.metaDescription, url: `/guides/${g.slug}`, modifiedTime: g.updated },
  };
}

export default async function GuidePage({ params }: Props) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  const sections = await Promise.all(g.sections.map(async (s) => ({ ...s, products: await productsBySlugs(s.slugs ?? []) })));
  const url = abs(`/guides/${g.slug}`);
  const audience = g.audience === "men" ? { href: "/men", label: "Shop the men's edit" } : g.audience === "women" ? { href: "/women", label: "Shop the women's edit" } : null;

  return (
    <div className="container-lux">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          "@id": `${url}#article`,
          headline: g.title,
          description: g.metaDescription,
          abstract: g.answer,
          url,
          mainEntityOfPage: url,
          inLanguage: "en-LK",
          datePublished: g.updated,
          dateModified: g.updated,
          author: { "@type": "Organization", name: `${STORE.name} beauty advisors`, url: abs("/") },
          publisher: { "@id": abs("/#organization") },
          about: { "@type": "Place", name: "Sri Lanka" },
          speakable: { "@type": "SpeakableSpecification", cssSelector: ["[data-answer]"] },
        }}
      />
      <PageHeader eyebrow="Guide" title={g.title} crumbs={[{ label: "Home", href: "/" }, { label: "Guides", href: "/guides" }, { label: g.title }]} />
      <p className="-mt-4 mb-6 text-xs uppercase tracking-[0.16em] text-ink-400">Updated {formatDate(g.updated)} · By {STORE.name} beauty advisors</p>
      <article className="max-w-4xl">
        <div data-answer><AnswerBox label="The short answer">{g.answer}</AnswerBox></div>
        <h2 className="mt-12 font-serif text-3xl">Key points</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-ink-700">
          {g.keyPoints.map((k) => <li key={k}>{k}</li>)}
        </ul>
      </article>
      {sections.map((s) => (
        <section key={s.h} className="mt-16">
          <h2 className="max-w-4xl font-serif text-3xl sm:text-4xl">{s.h}</h2>
          <div className="mt-4 max-w-3xl space-y-4 leading-relaxed text-ink-700">{s.p.map((p) => <p key={p}>{p}</p>)}</div>
          {s.products.length > 0 && <div className="mt-8"><ProductGrid products={s.products} /></div>}
        </section>
      ))}
      {audience && (
        <p className="mt-16"><Link href={audience.href} className="btn-ghost text-[11px]">{audience.label}</Link></p>
      )}
      <div className="mt-24"><FaqSection items={g.faq} /></div>
      <div className="mt-24"><GuideLinks guides={GUIDES.filter((x) => x.slug !== g.slug).slice(0, 4)} title="More guides" /></div>
    </div>
  );
}
