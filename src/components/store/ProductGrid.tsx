import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Card } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";
import { Reveal } from "./Reveal";

/**
 * Story tiles sit inside long listings so the grid sells the Skinora ritual, not just SKUs.
 * One appears after every tenth product, rotating through these.
 */
export const STORIES = [
  { eyebrow: "The Skinora promise", quote: "Every bottle is lot-tracked from the brand's warehouse to your door.", cta: "How we verify", href: "/authenticity", tone: "ink" },
  { eyebrow: "Not sure where to begin?", quote: "Three minutes, five questions, a ritual built for Colombo's humidity.", cta: "Take the skin quiz", href: "/quiz", tone: "stone" },
  { eyebrow: "Pay your way", quote: "Three interest-free instalments with Koko or Mintpay, on every order.", cta: "Delivery & payment", href: "/delivery", tone: "sage" },
] as const;

export function StoryTile({ i }: { i: number }) {
  const s = STORIES[i % STORIES.length];
  const tone = s.tone === "ink" ? "bg-ink text-ivory" : s.tone === "sage" ? "bg-sage text-ivory" : "bg-stone-200 text-ink";
  return (
    <div className={`flex h-full min-h-[280px] flex-col justify-between p-6 sm:p-8 ${tone}`} data-sk-story>
      <p className="text-[10px] uppercase tracking-[0.24em] opacity-70">{s.eyebrow}</p>
      <p className="my-6 font-serif text-[22px] italic leading-snug sm:text-[26px]">{s.quote}</p>
      <Link href={s.href} className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] underline-offset-4 hover:underline">
        {s.cta} <ArrowRight width={13} strokeWidth={1.3} />
      </Link>
    </div>
  );
}

/**
 * Product grid. With `editorial`, every fifth product (starting with the first) becomes a
 * wide hero, and a story tile follows every tenth, so long listings read like a curated edit.
 * The rhythm stays gap-free on both the 3-column desktop grid and the 2-column phone grid.
 */
export function ProductGrid({ products, cols = 4, editorial }: { products: Card[]; cols?: 3 | 4; editorial?: boolean }) {
  return (
    <>
      {editorial && (
        <p className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-1 text-[10px] uppercase tracking-[0.2em] text-ink-500" data-sk-trust>
          <span>100% authentic</span>
          <span>Lot-tracked</span>
          <span>3 instalments · Koko / Mintpay</span>
          <span className="max-sm:hidden">Same-day Colombo</span>
        </p>
      )}
      <ul className={`grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-14 ${cols === 4 ? "lg:grid-cols-4 lg:gap-x-8" : "lg:grid-cols-3 lg:gap-x-10 lg:gap-y-20"}`}>
        {products.map((p, i) => {
          const feature = !!editorial && i % 5 === 0;
          const story = !!editorial && i % 10 === 9;
          return [
            <Reveal as="li" key={p.id} delay={(i % cols) * 80} className={feature ? "col-span-2" : undefined}>
              <ProductCard p={p} priority={i < 4} feature={feature} sizes={feature ? "(min-width:1024px) 35vw, 100vw" : cols === 4 ? "(min-width:1024px) 25vw, 50vw" : "(min-width:1024px) 30vw, 50vw"} />
            </Reveal>,
            story ? (
              <Reveal as="li" key={`story-${i}`} delay={160}>
                <StoryTile i={Math.floor(i / 10)} />
              </Reveal>
            ) : null,
          ];
        })}
      </ul>
    </>
  );
}
