import Link from "next/link";
import { faqLd, ldJson, type QA } from "@/lib/seo";

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(data)} />;
}

/** The short, direct answer at the top of a page. Written to be quoted by search snippets and AI assistants. */
export function AnswerBox({ children, label = "In short" }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="border-l-2 border-champagne bg-white/60 px-5 py-4 sm:px-6">
      <p className="eyebrow-wide mb-2">{label}</p>
      <p className="max-w-3xl text-[15.5px] leading-relaxed text-ink-700">{children}</p>
    </div>
  );
}

/** Visible FAQ with matching FAQPage structured data. */
export function FaqSection({ items, title = "Questions, answered", id = "faq" }: { items: QA[]; title?: string; id?: string }) {
  if (!items.length) return null;
  return (
    <section id={id} className="scroll-mt-28">
      <JsonLd data={faqLd(items)} />
      <h2 className="display-caps text-[28px] leading-[1.08] sm:text-4xl">{title}</h2>
      <div className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
        {items.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-serif text-xl sm:text-2xl">
              <h3 className="font-serif font-normal">{f.q}</h3>
              <span className="text-lg font-light transition duration-300 group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-700">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function GuideLinks({ guides, title = "Guides" }: { guides: { slug: string; title: string; answer: string }[]; title?: string }) {
  if (!guides.length) return null;
  return (
    <section>
      <h2 className="display-caps text-[28px] leading-[1.08] sm:text-4xl">{title}</h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2">
        {guides.map((g) => (
          <li key={g.slug} className="border border-ink/10 bg-white/50 p-6">
            <Link href={`/guides/${g.slug}`} className="font-serif text-2xl hover:text-champagne-700">{g.title}</Link>
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-600">{g.answer}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
