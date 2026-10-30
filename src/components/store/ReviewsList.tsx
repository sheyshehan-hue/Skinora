"use client";
import { useState } from "react";
import { Stars } from "./Stars";
import { formatDate } from "@/lib/format";

type R = { id: string; rating: number; title: string | null; body: string; name: string; skinType: string | null; verified: boolean; createdAt: string };

// Four reviews first; the rest on request, so the page stays short on phones.
export function ReviewsList({ reviews, total }: { reviews: R[]; total: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? reviews : reviews.slice(0, 4);
  return (
    <div>
      <ul className="divide-y divide-ink/10">
        {shown.map((r) => (
          <li key={r.id} className="py-7 first:pt-0">
            <div className="flex flex-wrap items-center gap-3">
              <Stars value={r.rating} size={12} />
              {r.title && <p className="font-serif text-xl">{r.title}</p>}
            </div>
            <p className="mt-3 leading-relaxed text-ink-700">{r.body}</p>
            <p className="mt-3 text-xs text-ink-400">
              {r.name}
              {r.skinType && <> · <span className="capitalize">{r.skinType}</span> skin</>} · {formatDate(r.createdAt)}
              {r.verified && <span className="ml-2 text-sage">✓ Verified purchase</span>}
            </p>
          </li>
        ))}
      </ul>
      {reviews.length > 4 && (
        <button onClick={() => setAll((x) => !x)} className="btn-outline mt-4 w-full sm:w-auto" data-sk-more-reviews>
          {all ? "Show fewer reviews" : `Show all ${Math.min(total, reviews.length)} reviews`}
        </button>
      )}
    </div>
  );
}
