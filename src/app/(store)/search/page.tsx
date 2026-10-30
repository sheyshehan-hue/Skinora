import { Listing, type SP } from "@/components/store/Listing";
import { PageHeader } from "@/components/store/PageHeader";

export const metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return (
    <div className="container-lux">
      <PageHeader eyebrow="Search" title={q ? `“${q}”` : "Search"} crumbs={[{ label: "Home", href: "/" }, { label: "Search" }]} />
      <Listing base={{ q }} sp={sp} />
    </div>
  );
}
