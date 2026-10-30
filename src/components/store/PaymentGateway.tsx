"use client";
import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { demoPay } from "@/actions/checkout";

export function AutoSubmit({ action, fields }: { action: string; fields: Record<string, string> }) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => ref.current?.submit(), []);
  return (
    <form ref={ref} method="post" action={action}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <noscript><button className="btn-primary mt-8">Continue to payment</button></noscript>
    </form>
  );
}

export function DemoGateway({ orderId, number, method, total, instalment, bnpl }: { orderId: string; number: string; method: string; total: string; instalment: string; bnpl: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="mx-auto max-w-md border border-ink/10 bg-white p-10 text-center">
      <p className="eyebrow">Test mode · {method}</p>
      <p className="mt-4 font-serif text-4xl">{total}</p>
      <p className="mt-2 text-sm text-ink-500">Order {number}{bnpl && <> · 3 instalments of {instalment}</>}</p>
      <p className="mt-6 text-xs leading-relaxed text-ink-500">No live gateway credentials are configured, so this simulated gateway stands in. Add your merchant keys in <code>.env</code> and customers will be sent to {method} instead.</p>
      <button disabled={pending} onClick={() => start(async () => { await demoPay(orderId, "success"); router.push(`/checkout/success/${orderId}`); })} className="btn-primary mt-8 w-full">
        {pending ? "Processing…" : "Approve payment"}
      </button>
      <button onClick={() => router.push(`/checkout?cancelled=${number}`)} className="mt-3 text-[11px] uppercase tracking-[0.16em] text-ink-500 hover:text-ink">Cancel</button>
    </div>
  );
}
