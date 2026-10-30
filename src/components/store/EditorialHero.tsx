import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Slide = { eyebrow: string | null; title: string; subtitle: string | null; ctaLabel: string | null; ctaHref: string | null; imageUrl: string | null };

// A still, editorial hero: words on warm stone at the left, the photograph bleeding off the right edge.
export function EditorialHero({ slide }: { slide: Slide }) {
  return (
    <section className="relative overflow-hidden bg-stone-100">
      <div className="relative aspect-[5/4] sm:aspect-[16/9] lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[66%]">
        {slide.imageUrl && <Image src={slide.imageUrl} alt="" fill priority sizes="(min-width:1024px) 66vw, 100vw" className="object-cover object-[62%_center] animate-[heroIn_1800ms_cubic-bezier(0.22,1,0.36,1)_both]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-100 via-transparent to-transparent to-40% lg:bg-gradient-to-r lg:from-stone-100 lg:via-stone-100/0 lg:via-25% lg:to-transparent" />
      </div>
      <div className="container-lux relative flex pb-14 pt-2 lg:min-h-[clamp(520px,42vw,700px)] lg:items-center lg:py-20">
        <div className="max-w-xl animate-fadeUp lg:max-w-[540px]">
          {slide.eyebrow && <p className="eyebrow-wide">{slide.eyebrow}</p>}
          <h1 className="display-caps mt-5 text-balance text-[46px] leading-[0.98] sm:text-[64px] lg:mt-7 lg:text-[clamp(64px,6.2vw,96px)]">{slide.title}</h1>
          {slide.subtitle && <p className="mt-6 max-w-md font-serif text-[19px] leading-snug text-ink-700 sm:text-[21px]">{slide.subtitle}</p>}
          {slide.ctaHref && (
            <Link href={slide.ctaHref} className="btn-primary group mt-9 h-[52px] px-8 text-[11px] tracking-[0.24em]">
              {slide.ctaLabel ?? "Discover"} <ArrowRight width={16} strokeWidth={1.2} className="ml-3 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          )}
          <p className="mt-7 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] uppercase tracking-[0.18em] text-ink-500">
            <span>100% authentic</span><span aria-hidden>·</span><span>Pay in 3, interest-free</span><span aria-hidden>·</span><span>Same-day Colombo</span>
          </p>
        </div>
      </div>
    </section>
  );
}
