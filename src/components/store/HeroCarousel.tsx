"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";

type Slide = { id: string; eyebrow: string | null; title: string; subtitle: string | null; ctaLabel: string | null; ctaHref: string | null; imageUrl: string | null };

export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length, i]);

  return (
    <section className="relative" aria-roledescription="carousel">
      <div className="relative h-[78svh] min-h-[520px] overflow-hidden bg-ivory-200 lg:h-[86vh] lg:max-h-[860px]">
        {slides.map((s, idx) => (
          <div key={s.id} className={clsx("absolute inset-0 transition-opacity duration-[1400ms] ease-luxe", idx === i ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={idx !== i}>
            {s.imageUrl && (
              <Image src={s.imageUrl} alt="" fill priority={idx === 0} sizes="100vw" className={clsx("object-cover object-[70%_center] transition-transform duration-[8000ms] ease-out lg:object-center", idx === i ? "scale-105" : "scale-100")} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ivory from-0% via-ivory/85 via-45% to-transparent to-80% lg:bg-gradient-to-r lg:from-ivory/85 lg:via-ivory/30 lg:to-transparent" />
            <div className="container-lux relative flex h-full items-end pb-20 lg:items-center lg:pb-0">
              <div className={clsx("max-w-xl transition-all delay-300 duration-[1200ms] ease-luxe", idx === i ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")}>
                {s.eyebrow && <p className="eyebrow mb-5 text-champagne-700">{s.eyebrow}</p>}
                <h1 className="text-balance font-serif text-[44px] font-light leading-[1.02] sm:text-6xl lg:text-[84px]">{s.title}</h1>
                {s.subtitle && <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-700">{s.subtitle}</p>}
                {s.ctaHref && (
                  <Link href={s.ctaHref} className="btn-primary mt-9">
                    {s.ctaLabel ?? "Discover"}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 gap-3 lg:left-12 lg:translate-x-0">
          {slides.map((s, idx) => (
            <button key={s.id} onClick={() => setI(idx)} aria-label={`Slide ${idx + 1}`} className="group py-2">
              <span className="block h-px w-10 bg-ink/20">
                <span className={clsx("block h-full bg-ink transition-all", idx === i ? "w-full duration-[7000ms] ease-linear" : "w-0 duration-0")} />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
