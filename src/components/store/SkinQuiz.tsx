"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import type { Card } from "@/lib/catalog";
import { useCart } from "@/store/cart";
import { formatLKR } from "@/lib/format";
import { ProductCard } from "./ProductCard";

type Candidate = Card & { category: string; skinTypes: string[]; concerns: string[]; keyIngredients: string[]; luxury: boolean };

const STEPS = [
  { key: "skin", q: "By midday, how does your skin feel?", options: [["oily", "Shiny all over"], ["combination", "Shiny T-zone, normal elsewhere"], ["dry", "Tight or flaky"], ["normal", "Comfortable and balanced"], ["sensitive", "Easily red or irritated"]] },
  { key: "concern", q: "What would you most like to improve?", multi: true, options: [["acne", "Breakouts & blemishes"], ["pigmentation", "Dark spots & uneven tone"], ["ageing", "Fine lines & firmness"], ["dryness", "Dehydration"], ["pores", "Visible pores"], ["dullness", "Dullness"], ["redness", "Redness"]] },
  { key: "sun", q: "How much time do you spend outdoors on a typical day?", options: [["low", "Mostly indoors, air-conditioned"], ["mid", "Commuting, an hour or two"], ["high", "Outdoors for much of the day"]] },
  { key: "routine", q: "How many steps do you want in your routine?", options: [["3", "Keep it simple: three steps"], ["5", "I enjoy a full ritual"]] },
  { key: "budget", q: "How would you like to invest?", options: [["essential", "Effective essentials"], ["mix", "A mix of essentials and treats"], ["luxury", "Prestige and luxury"]] },
] as const;

type Answers = { skin?: string; concern?: string[]; sun?: string; routine?: string; budget?: string };

function score(p: Candidate, a: Answers) {
  let s = 0;
  if (a.skin && p.skinTypes.includes(a.skin)) s += 4;
  if (a.skin === "sensitive" && !p.skinTypes.includes("sensitive")) s -= 3;
  for (const c of a.concern ?? []) if (p.concerns.includes(c)) s += 3;
  if (a.budget === "luxury" && p.luxury) s += 4;
  if (a.budget === "essential" && p.price > 15000) s -= 4;
  if (a.budget === "mix" && p.price > 60000) s -= 2;
  s += p.rating / 2 + Math.min(p.ratingCount, 20) / 20;
  if (p.stock <= 0) s -= 10;
  return s;
}

export function SkinQuiz({ candidates }: { candidates: Candidate[] }) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({});
  const add = useCart((s) => s.add);
  const done = step >= STEPS.length;

  const routine = useMemo(() => {
    if (!done) return [];
    const best = (cats: string[], exclude: string[] = []) => candidates.filter((c) => cats.includes(c.category) && !exclude.includes(c.id)).sort((x, y) => score(y, a) - score(x, a))[0];
    const steps: { step: string; when: string; why: string; p?: Candidate }[] = [];
    const cleanser = best(["cleansers"]);
    steps.push({ step: "Cleanse", when: "AM & PM", why: a.skin === "oily" ? "Lifts excess oil without stripping." : "Gentle enough to use twice a day.", p: cleanser });
    if (a.routine === "5") steps.push({ step: "Prep", when: "AM & PM", why: "Floods skin with hydration so actives absorb better.", p: best(["toners-essences"]) });
    const serum = best(["serums"]);
    steps.push({ step: "Treat", when: a.concern?.includes("ageing") ? "PM" : "AM & PM", why: `Targets ${a.concern?.slice(0, 2).join(" and ") || "your skin goals"}.`, p: serum });
    if (a.routine === "5") steps.push({ step: "Target", when: "PM, 2–3× a week", why: "A focused treatment to accelerate results.", p: best(["masks-treatments", "serums"], serum ? [serum.id] : []) });
    steps.push({ step: "Moisturise", when: "AM & PM", why: a.skin === "oily" ? "Lightweight hydration for humid days." : "Seals in moisture and supports the barrier.", p: best(["moisturisers"]) });
    steps.push({ step: "Protect", when: "Every morning", why: a.sun === "high" ? "Non-negotiable in Sri Lankan sun. Reapply every two hours outdoors." : "UV is the biggest cause of pigmentation and ageing, even indoors.", p: best(["sunscreen"]) });
    return steps;
  }, [done, a, candidates]);

  const pickOption = (key: string, value: string, multi?: boolean) => {
    if (multi) {
      const cur = (a.concern ?? []) as string[];
      setA({ ...a, concern: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value].slice(-3) });
    } else {
      setA({ ...a, [key]: value });
      setTimeout(() => setStep((s) => s + 1), 250);
    }
  };

  if (done) {
    const total = routine.reduce((s, r) => s + (r.p?.price ?? 0), 0);
    return (
      <div className="container-lux py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Your Skinora routine</p>
          <h1 className="mt-4 font-serif text-5xl font-light leading-tight sm:text-6xl">
            For <em className="capitalize">{a.skin}</em> skin, focused on {a.concern?.join(", ") || "balance"}
          </h1>
          <p className="mt-5 text-ink-600">Chosen for your answers, our clients&apos; reviews and Sri Lanka&apos;s heat and humidity.</p>
        </div>
        <ol className="mt-16 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {routine.map((r, i) =>
            r.p ? (
              <li key={r.step} className="animate-fadeUp" style={{ animationDelay: `${i * 120}ms` }}>
                <p className="mb-3 flex items-baseline gap-3">
                  <span className="font-serif text-3xl text-champagne-700">0{i + 1}</span>
                  <span className="text-[11px] uppercase tracking-[0.2em]">{r.step}</span>
                  <span className="text-xs text-ink-400">{r.when}</span>
                </p>
                <ProductCard p={r.p} />
                <p className="mt-3 text-sm text-ink-600">{r.why}</p>
              </li>
            ) : null,
          )}
        </ol>
        <div className="mx-auto mt-16 flex max-w-xl flex-col items-center gap-4 border-t border-ink/10 pt-10 text-center">
          <p className="font-serif text-3xl">Complete routine · {formatLKR(total)}</p>
          <button
            className="btn-primary"
            onClick={() => routine.forEach((r) => r.p?.variantId && r.p.stock > 0 && add({ variantId: r.p.variantId, productId: r.p.id, slug: r.p.slug, brand: r.p.brand, name: r.p.name, variantName: r.p.variantName ?? "", price: r.p.price, compareAt: r.p.compareAt, image: r.p.image, maxQty: r.p.variantStock }))}
          >
            Add the full routine to bag
          </button>
          <button onClick={() => { setA({}); setStep(0); }} className="text-[11px] uppercase tracking-[0.16em] text-ink-500 hover:text-ink">Retake the quiz</button>
        </div>
      </div>
    );
  }

  const s = STEPS[step];
  const multi = "multi" in s && s.multi;
  return (
    <div className="container-lux flex min-h-[78vh] flex-col items-center justify-center py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-12 flex items-center gap-4">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} aria-label="Back"><ArrowLeft width={18} strokeWidth={1.2} /></button>
          ) : (
            <Link href="/" aria-label="Exit quiz"><ArrowLeft width={18} strokeWidth={1.2} /></Link>
          )}
          <div className="h-px flex-1 bg-ink/10">
            <div className="h-full bg-ink transition-all duration-700 ease-luxe" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <span className="text-xs text-ink-400">{step + 1} / {STEPS.length}</span>
        </div>
        <h1 key={s.key} className="animate-fadeUp text-balance font-serif text-4xl font-light leading-tight sm:text-5xl">{s.q}</h1>
        {multi && <p className="mt-3 text-sm text-ink-500">Choose up to three.</p>}
        <div className="mt-10 grid gap-3">
          {s.options.map(([value, label], i) => {
            const on = multi ? a.concern?.includes(value) : (a as Record<string, unknown>)[s.key] === value;
            return (
              <button
                key={value}
                onClick={() => pickOption(s.key, value, multi)}
                className={clsx("animate-fadeUp flex items-center justify-between border px-6 py-5 text-left transition duration-300", on ? "border-ink bg-ink text-ivory" : "border-ink/15 bg-white hover:border-ink")}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="font-serif text-xl">{label}</span>
                <span className={clsx("h-4 w-4 rounded-full border", on ? "border-[5px] border-champagne" : "border-ink/30")} />
              </button>
            );
          })}
        </div>
        {multi && (
          <button disabled={!a.concern?.length} onClick={() => setStep(step + 1)} className="btn-primary mt-8 w-full">Continue</button>
        )}
      </div>
    </div>
  );
}
