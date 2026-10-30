import { PageHeader } from "@/components/store/PageHeader";
import { WishlistView } from "@/components/store/WishlistView";

export const metadata = { title: "Wishlist", robots: { index: false } };

export default function WishlistPage() {
  return (
    <div className="container-lux">
      <PageHeader eyebrow="Saved for later" title="Your wishlist" crumbs={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} />
      <WishlistView />
    </div>
  );
}
