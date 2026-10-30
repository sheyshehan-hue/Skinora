"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { SlidersHorizontal, X } from "lucide-react";

export type Facets = {
  brands: { slug: string; name: string; count: number }[];
  skinTypes: [string, number][];
  concerns: [string, number][];
  ingredients: [string, number][];
  genders: [string, number][];
  priceMax: number;
};

const PRICE_BANDS: [string, number, number][] = [
  ["Under LKR 5,000", 0, 5000],
  ["LKR 5,000 – 10,000", 5000, 10000],
  ["LKR 10,000 – 25,000", 10000, 25000],
  ["LKR 25,000 – 50,000", 25000, 50000],
  ["Over LKR 50,000", 50000, 10_000_000],
];

export const SORTS = [
  ["bestsellers", "Best sellers"],
  ["new", "New arrivals"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["rating", "Top rated"],
] as const;

export function Filters({ facets, total, children }: { facets: Facets; total: number; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const list = (k: string) => sp.get(k)?.split(",").filter(Boolean) ?? [];
  const push = (next: URLSearchParams) => start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  const toggle = (k: string, v: string) => {
    const cur = list(k);
    const next = new URLSearchParams(sp.toString());
    const vals = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    if (vals.length) next.set(k, vals.join(","));
    else next.delete(k);
    push(next);
  };
  const setPrice = (min: number, max: number) => {
    const next = new URLSearchParams(sp.toString());
    if (sp.get("min") === String(min) && sp.get("max") === String(max)) {
      next.delete("min");
      next.delete("max");
    } else {
      next.set("min", String(min));
      next.set("max", String(max));
    }
    push(next);
  };
  const setSort = (v: string) => {
    const next = new URLSearchParams(sp.toString());
    next.set("sort", v);
    push(next);
  };
  const clear = () => {
    const next = new URLSearchParams();
    if (sp.get("q")) next.set("q", sp.get("q")!);
    push(next);
  };
  const activeCount = ["brand", "skin", "concern", "ingredient", "gender"].reduce((s, k) => s + list(k).length, 0) + (sp.get("min") ? 1 : 0);

  const Group = ({ title, k, options }: { title: string; k: string; options: { value: string; label: string; count?: number }[] }) =>
    options.length ? (
      <details open className="group border-b border-ink/10 py-5">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] uppercase tracking-[0.18em]">
          {title}
          <span className="text-base font-light transition group-open:rotate-45">+</span>
        </summary>
        <ul className="mt-4 space-y-2.5">
          {options.map((o) => {
            const on = list(k).includes(o.value);
            return (
              <li key={o.value}>
                <button onClick={() => toggle(k, o.value)} className={clsx("flex w-full items-center gap-3 text-left text-sm text-ink-700 hover:text-ink", (k === "skin" || k === "concern") && "capitalize")}>
                  <span className={clsx("grid h-4 w-4 shrink-0 place-items-center border transition", on ? "border-ink bg-ink" : "border-ink/30")}>{on && <span className="h-1.5 w-1.5 bg-ivory" />}</span>
                  <span className="flex-1">{o.label}</span>
                  {o.count !== undefined && <span className="text-xs text-ink-400">{o.count}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </details>
    ) : null;

  const panel = (
    <div className={clsx("transition-opacity", pending && "opacity-60")}>
      <Group title="Brand" k="brand" options={facets.brands.map((b) => ({ value: b.slug, label: b.name, count: b.count }))} />
      {facets.genders.length > 0 && <Group title="For" k="gender" options={facets.genders.map(([g, n]) => ({ value: g, label: g === "women" ? "Her" : g === "men" ? "Him" : "Everyone", count: n }))} />}
      <Group title="Skin type" k="skin" options={facets.skinTypes.map(([v, n]) => ({ value: v, label: v, count: n }))} />
      <Group title="Concern" k="concern" options={facets.concerns.map(([v, n]) => ({ value: v, label: v === "ageing" ? "Ageing & fine lines" : v, count: n }))} />
      <details open className="group border-b border-ink/10 py-5">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] uppercase tracking-[0.18em]">
          Price
          <span className="text-base font-light transition group-open:rotate-45">+</span>
        </summary>
        <ul className="mt-4 space-y-2.5">
          {PRICE_BANDS.filter(([, min]) => min < facets.priceMax).map(([label, min, max]) => {
            const on = sp.get("min") === String(min) && sp.get("max") === String(max);
            return (
              <li key={label}>
                <button onClick={() => setPrice(min, max)} className="flex items-center gap-3 text-sm text-ink-700 hover:text-ink">
                  <span className={clsx("h-4 w-4 rounded-full border transition", on ? "border-[5px] border-ink" : "border-ink/30")} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </details>
      <Group title="Key ingredient" k="ingredient" options={facets.ingredients.map(([v, n]) => ({ value: v, label: v, count: n }))} />
      {activeCount > 0 && (
        <button onClick={clear} className="btn-ghost mt-6 text-[11px]">
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* toolbar */}
      <div className="sticky top-16 z-20 -mx-4 mb-8 flex items-center justify-between border-y border-ink/10 bg-ivory/95 px-4 py-1 backdrop-blur lg:py-3 sm:mx-0 sm:px-0 lg:top-20 lg:border-x-0">
        <button onClick={() => setOpen(true)} className="flex min-h-11 items-center gap-2 text-[11px] uppercase tracking-[0.18em] lg:hidden">
          <SlidersHorizontal width={16} strokeWidth={1.2} /> Filter {activeCount > 0 && `(${activeCount})`}
        </button>
        <p className="hidden text-xs text-ink-500 lg:block">{total} products</p>
        <label className="flex min-h-11 items-center gap-2 text-[11px] uppercase tracking-[0.18em] lg:min-h-0">
          <span className="max-sm:hidden">Sort</span>
          <select value={sp.get("sort") ?? "bestsellers"} onChange={(e) => setSort(e.target.value)} className="cursor-pointer bg-transparent text-[11px] uppercase tracking-[0.12em] outline-none">
            {SORTS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-x-12 lg:grid-cols-[230px_1fr]">
        <aside className="hidden lg:block">{panel}</aside>
        <div className={clsx("transition-opacity duration-300", pending && "opacity-50")}>{children}</div>
      </div>

      {/* mobile sheet */}
      <div className={clsx("fixed inset-0 z-50 lg:hidden", open ? "visible" : "invisible")}>
        <div className={clsx("absolute inset-0 bg-ink/40 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
        <div className={clsx("absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col bg-ivory transition-transform duration-500 ease-luxe", open ? "translate-y-0" : "translate-y-full")}>
          <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
            <p className="font-serif text-2xl">Filter</p>
            <button onClick={() => setOpen(false)} aria-label="Close filters"><X strokeWidth={1.2} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5">{panel}</div>
          <div className="border-t border-ink/10 p-4">
            <button onClick={() => setOpen(false)} className="btn-primary w-full">Show {total} products</button>
          </div>
        </div>
      </div>
    </>
  );
}
