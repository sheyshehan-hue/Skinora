import Link from "next/link";

export function SectionHeading({ eyebrow, title, href, linkLabel = "View all", center }: { eyebrow?: string; title: string; href?: string; linkLabel?: string; center?: boolean }) {
  return (
    <div className={center ? "mb-12 text-center" : "mb-10 flex items-end justify-between gap-6"}>
      <div>
        {eyebrow && <p className="eyebrow-wide mb-4">{eyebrow}</p>}
        <h2 className="display-caps text-balance text-[28px] leading-[1.08] sm:text-4xl lg:text-[44px]">{title}</h2>
      </div>
      {href && !center && (
        <Link href={href} className="btn-ghost shrink-0 text-[11px]">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
