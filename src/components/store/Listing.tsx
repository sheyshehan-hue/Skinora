import { Suspense } from "react";
import { getFacets, listProducts, type ListingFilters } from "@/lib/catalog";
import { Filters } from "./Filters";
import { ProductGrid } from "./ProductGrid";

export type SP = Record<string, string | string[] | undefined>;

export function parseFilters(sp: SP): ListingFilters {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const l = (k: string) => s(k)?.split(",").filter(Boolean);
  return {
    brand: l("brand"),
    skin: l("skin"),
    concern: l("concern"),
    ingredient: l("ingredient"),
    gender: l("gender")?.[0],
    min: s("min") ? Number(s("min")) : undefined,
    max: s("max") ? Number(s("max")) : undefined,
    sort: s("sort"),
    q: s("q"),
  };
}

/** Filterable product listing used by category, brand, offers and search pages. */
export async function Listing({ base, sp, facetCategory }: { base: ListingFilters; sp: SP; facetCategory?: string }) {
  const filters = { ...parseFilters(sp), ...base, brand: base.brand ?? parseFilters(sp).brand };
  const [products, facets] = await Promise.all([listProducts(filters), getFacets(facetCategory)]);
  return (
    <Suspense>
      <Filters facets={base.brand ? { ...facets, brands: [] } : facets} total={products.length}>
        {products.length ? (
          <ProductGrid products={products} cols={3} editorial />
        ) : (
          <div className="py-24 text-center">
            <p className="font-serif text-3xl italic">Nothing matches just yet</p>
            <p className="mt-3 text-sm text-ink-500">Try removing a filter, or ask us on WhatsApp and we&apos;ll source it for you.</p>
          </div>
        )}
      </Filters>
    </Suspense>
  );
}
