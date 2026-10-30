import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const tiles = [
  { title: "Skincare", sub: "Radiant rituals", href: "/c/skin-care", image: "/media/editorial/tile-skincare.jpg" },
  { title: "Fragrance", sub: "Scents that stay", href: "/c/fragrances", image: "/media/editorial/tile-fragrance.jpg" },
  { title: "Beauty essentials", sub: "Refined daily rituals", href: "/c/lifestyle", image: "/media/editorial/tile-essentials.jpg" },
  { title: "Our brands", sub: "A curated world", href: "/brands", image: "/media/editorial/tile-brands.jpg" },
];

export function CategoryTiles() {
  return (
    <nav aria-label="Shop by category" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
      {tiles.map((t) => (
        <Link key={t.href} href={t.href} className="group relative block aspect-[4/3] overflow-hidden bg-stone-200 lg:aspect-[7/3]">
          <Image src={t.image} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-[1600ms] ease-luxe group-hover:scale-[1.06]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-ink/60 via-ink/20 to-transparent transition-opacity duration-700 group-hover:opacity-90" />
          <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white sm:inset-x-6 sm:bottom-5">
            <span>
              <span className="display-caps block text-[14px] tracking-[0.18em] sm:text-lg lg:text-[16px] xl:text-[19px]">{t.title}</span>
              <span className="mt-1.5 block text-[10px] uppercase tracking-[0.26em] text-white/85 sm:text-[9.5px] sm:tracking-[0.3em]">{t.sub}</span>
            </span>
            <ArrowRight width={18} strokeWidth={1.1} className="shrink-0 transition-transform duration-500 group-hover:translate-x-1 max-sm:hidden" />
          </div>
        </Link>
      ))}
    </nav>
  );
}
