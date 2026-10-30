import { prisma } from "@/lib/prisma";
import { getCustomer } from "@/lib/auth";
import { CheckoutForm } from "@/components/store/CheckoutForm";

export const metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const [zones, customer, sp] = await Promise.all([prisma.deliveryZone.findMany({ orderBy: { district: "asc" } }), getCustomer(), searchParams]);
  const address = customer ? await prisma.address.findFirst({ where: { customerId: customer.id }, orderBy: { isDefault: "desc" } }) : null;
  return (
    <div className="container-lux pb-10 pt-10">
      <h1 className="font-serif text-5xl font-light">Checkout</h1>
      {sp.cancelled && <p className="mt-4 border border-rosewood/30 bg-rosewood/5 p-4 text-sm text-rosewood">Payment for order {sp.cancelled} was cancelled. Your items are still reserved: choose another way to pay below, or contact us on WhatsApp.</p>}
      <CheckoutForm
        districts={zones.map((z) => z.district)}
        customer={customer ? { name: customer.name, email: customer.email, phone: customer.phone ?? "", points: customer.loyaltyPoints } : null}
        address={address ? { line1: address.line1, line2: address.line2 ?? "", city: address.city, district: address.district } : null}
      />
    </div>
  );
}
