"use client";
// AI face shape and hairstyle scan. The scan itself is plain JavaScript in /public/face-scan
// (face points are found in the browser with MediaPipe; the photo stays on the device unless the
// shopper taps "Try it on my photo"). This component loads it and connects it to the store.
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/store/cart";

export type FaceShopProduct = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  image: string;
  variants: { id: string; name: string; price: number; compareAt: number | null; stock: number }[];
};

type Mount = (host: HTMLElement, o: Record<string, unknown>) => () => void;
declare global {
  interface Window { SKFACE?: { mount?: Mount } }
}

const VERSION = "1";
let loading: Promise<void> | null = null;
function load(): Promise<void> {
  if (window.SKFACE?.mount) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((ok, no) => {
    if (!document.getElementById("sk-face-css")) {
      const l = document.createElement("link");
      l.id = "sk-face-css"; l.rel = "stylesheet"; l.href = `/face-scan/face-scan.css?v=${VERSION}`;
      document.head.appendChild(l);
    }
    // MediaPipe's files come from the public CDN (jsDelivr); the model is checked by SHA-256.
    (window as unknown as { SKFACE_ASSETS?: string }).SKFACE_ASSETS = "cdn";
    const s = document.createElement("script");
    s.src = `/face-scan/face-scan.js?v=${VERSION}`;
    s.onload = () => ok();
    s.onerror = () => { loading = null; no(new Error("load")); };
    document.body.appendChild(s);
  });
  return loading;
}

export function FaceScan({ onBack, products, showSaved }: { onBack: () => void; products: FaceShopProduct[]; showSaved?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const back = useRef(onBack);
  back.current = onBack;

  useEffect(() => {
    let off: (() => void) | undefined;
    let live = true;
    load().then(() => {
      if (!live || !ref.current || !window.SKFACE?.mount) return;
      off = window.SKFACE.mount(ref.current, {
        onBack: () => back.current(),
        products,
        showSaved,
        productHref: (slug: string) => `/p/${slug}`,
        addToCart: (item: Parameters<ReturnType<typeof useCart.getState>["add"]>[0], qty?: number) => {
          const c = useCart.getState();
          c.add(item, qty);
          c.setOpen(true);
        },
      });
    }).catch(() => setFailed(true));
    return () => { live = false; off?.(); };
  }, [products, showSaved]);

  if (failed) {
    return (
      <div className="container-lux py-24 text-center">
        <p className="font-serif text-3xl">The face scan could not load.</p>
        <p className="mt-3 text-ink-500">Please check your connection and try again.</p>
        <button onClick={onBack} className="btn-outline mt-8">Back</button>
      </div>
    );
  }
  return <div ref={ref} className="container-lux flex min-h-[78vh] flex-col items-center justify-center py-16" />;
}
