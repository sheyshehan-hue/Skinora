import { PageHeader } from "@/components/store/PageHeader";
import { CartView } from "@/components/store/CartView";

export const metadata = { title: "Your bag", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-lux">
      <PageHeader title="Your bag" crumbs={[{ label: "Home", href: "/" }, { label: "Bag" }]} />
      <CartView />
    </div>
  );
}
