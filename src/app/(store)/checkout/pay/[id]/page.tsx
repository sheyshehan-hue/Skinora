import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { payhereCheckout, payhereConfigured } from "@/lib/payments";
import { formatLKR } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/constants";
import { AutoSubmit, DemoGateway } from "@/components/store/PaymentGateway";

export const metadata = { title: "Payment", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const o = await prisma.order.findUnique({ where: { id: (await params).id } });
  if (!o) notFound();
  if (o.paymentStatus === "PAID") redirect(`/checkout/success/${o.id}`);

  if (o.paymentMethod === "PAYHERE" && payhereConfigured()) {
    const { action, fields } = payhereCheckout(o);
    return (
      <div className="container-lux py-32 text-center">
        <p className="font-serif text-3xl italic">Taking you to PayHere secure checkout…</p>
        <AutoSubmit action={action} fields={fields} />
      </div>
    );
  }

  return (
    <div className="container-lux py-20">
      <DemoGateway orderId={o.id} number={o.number} method={PAYMENT_LABEL[o.paymentMethod]} total={formatLKR(o.total)} instalment={formatLKR(Math.ceil(o.total / 3))} bnpl={o.paymentMethod !== "PAYHERE"} />
    </div>
  );
}
