import Link from "next/link";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.label, item: it.href ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${it.href}` : undefined })),
  };
  return (
    <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.16em] text-ink-400">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-2">/</span>}
          {it.href ? <Link href={it.href} className="inline-block hover:text-ink max-lg:py-2">{it.label}</Link> : <span className="text-ink-600">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({ eyebrow, title, description, crumbs, children }: { eyebrow?: string; title: string; description?: string | null; crumbs?: { label: string; href?: string }[]; children?: React.ReactNode }) {
  return (
    <div className="pb-10 pt-8 sm:pt-12">
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="mt-8 max-w-3xl animate-fadeUp">
        {eyebrow && <p className="eyebrow-wide mb-4">{eyebrow}</p>}
        <h1 className="display-caps text-balance text-[38px] leading-[1.02] sm:text-5xl lg:text-[64px]">{title}</h1>
        {description && <p className="mt-5 max-w-xl leading-relaxed text-ink-600">{description}</p>}
      </div>
      {children}
    </div>
  );
}
