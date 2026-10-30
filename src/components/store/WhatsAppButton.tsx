"use client";
import { usePathname } from "next/navigation";

export function WhatsAppButton({ number, message = "Hello Skinora, I need help with an order." }: { number: string; message?: string }) {
  const path = usePathname();
  if (path.startsWith("/checkout")) return null;
  const onProduct = path.startsWith("/p/");
  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={`fixed right-5 z-40 flex ${onProduct ? "bottom-24 w-12 justify-center !px-0 max-lg:hidden" : "bottom-5 sm:bottom-8"} h-12 items-center gap-2 rounded-full bg-[#1F2C26] pl-3 pr-4 text-[11px] uppercase tracking-[0.16em] text-white shadow-[0_8px_30px_rgba(0,0,0,0.18)] transition hover:bg-black sm:right-8`}
    >
      <svg viewBox="0 0 32 32" width="22" height="22" fill="#25D366" aria-hidden>
        <path d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.5.7 4.8 2 6.8L3 29l6.8-2.2c1.9 1.1 4 1.6 6.2 1.6 7 0 12.7-5.6 12.7-12.6S23 3 16 3zm0 23c-2 0-3.9-.6-5.6-1.6l-.4-.2-4 1.3 1.3-3.9-.3-.4a10.3 10.3 0 01-1.7-5.6C5.3 9.9 10.1 5.2 16 5.2s10.6 4.7 10.6 10.4S21.9 26 16 26zm5.8-7.8c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.6 8.6 0 01-4.3-3.7c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 00-.9.4 3.6 3.6 0 00-1.1 2.7 6.3 6.3 0 001.3 3.3 14.3 14.3 0 005.5 4.8c2 .9 2.8.9 3.8.8.6-.1 1.9-.8 2.2-1.5s.3-1.4.2-1.5-.3-.2-.6-.3z" />
      </svg>
      {!onProduct && <span className="max-sm:hidden">Order on WhatsApp</span>}
    </a>
  );
}
