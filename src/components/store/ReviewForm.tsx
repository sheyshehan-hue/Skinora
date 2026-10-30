"use client";
import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReview } from "@/actions/reviews";
import { SKIN_TYPES } from "@/lib/constants";

export function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [state, action, pending] = useActionState(submitReview, { ok: false, error: null as string | null });
  if (state.ok) return <p className="font-serif text-xl italic text-champagne-700">Thank you, your review has been published.</p>;
  if (!open) return <button onClick={() => setOpen(true)} className="btn-outline">Write a review</button>;
  return (
    <form action={action} className="grid max-w-xl gap-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <p className="label">Your rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button type="button" key={i} onClick={() => setRating(i)} aria-label={`${i} stars`}>
              <Star width={22} strokeWidth={1.2} className={i <= rating ? "fill-champagne text-champagne" : "text-ink-300"} />
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="label">Name</span><input name="name" required className="input" /></label>
        <label>
          <span className="label">Skin type</span>
          <select name="skinType" className="input capitalize">
            <option value="">Prefer not to say</option>
            {SKIN_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <label><span className="label">Title</span><input name="title" className="input" /></label>
      <label><span className="label">Review</span><textarea name="body" required rows={4} className="input h-auto py-3" /></label>
      {state.error && <p className="text-sm text-rosewood">{state.error}</p>}
      <button disabled={pending} className="btn-primary justify-self-start">{pending ? "Submitting…" : "Submit review"}</button>
    </form>
  );
}
