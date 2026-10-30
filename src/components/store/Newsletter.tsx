"use client";
import { useState } from "react";

export function Newsletter() {
  const [done, setDone] = useState(false);
  return done ? (
    <p className="font-serif text-xl italic text-ink">Thank you. Welcome to Skinora.</p>
  ) : (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
      className="flex max-w-sm border-b border-ink/30"
    >
      <input type="email" required placeholder="Your email address" className="h-11 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-400" aria-label="Email" />
      <button className="text-[11px] uppercase tracking-[0.18em] text-ink hover:text-champagne-700">Subscribe</button>
    </form>
  );
}
