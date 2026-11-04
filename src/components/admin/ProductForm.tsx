"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { Plus, Trash2 } from "lucide-react";
import { deleteProduct, saveProduct, type ProductInput } from "@/actions/admin/products";
import { CONCERNS, KEY_INGREDIENTS, SKIN_TYPES } from "@/lib/constants";
import { formatLKR } from "@/lib/format";

type Opt = { id: string; name: string; origin?: string | null };
type V = { id?: string; name: string; sku: string; price: number; salePrice: number | null; costPrice: number; stock: number; reorderLevel: number; leadTimeDays: number };
type P = Omit<ProductInput, "variants"> & { variants: V[] };

const blank: P = {
  name: "", slug: "", brandId: "", categoryId: "", tagline: "", description: "", ingredients: "", keyIngredients: [], howToUse: "", skinTypes: [], concerns: [], gender: null,
  isLuxury: false, isNew: true, isBestSeller: false, featured: false, status: "DRAFT", originCountry: "", metaTitle: "", metaDescription: "",
  variants: [{ name: "", sku: "", price: 0, salePrice: null, costPrice: 0, stock: 0, reorderLevel: 10, leadTimeDays: 21 }],
};

export function ProductForm({ brands, categories, product }: { brands: Opt[]; categories: Opt[]; product?: P }) {
  const router = useRouter();
  const [p, setP] = useState<P>(product ?? blank);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof P>(k: K, v: P[K]) => setP((x) => ({ ...x, [k]: v }));
  const toggle = (k: "skinTypes" | "concerns" | "keyIngredients", v: string) => set(k, (p[k] ?? []).includes(v) ? (p[k] ?? []).filter((x) => x !== v) : [...(p[k] ?? []), v]);
  const setV = (i: number, k: keyof V, v: string) => set("variants", p.variants.map((x, j) => (j === i ? { ...x, [k]: k === "name" || k === "sku" ? v : k === "salePrice" && v === "" ? null : Number(v) } : x)));

  const submit = () =>
    start(async () => {
      const res = await saveProduct(p);
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: "Saved" });
      if (!product) router.push(`/admin/products/${res.id}`);
      else router.refresh();
    });

  const remove = () => {
    if (!product?.id || !confirm("Delete this product? Products with orders are archived instead.")) return;
    start(async () => {
      const r = await deleteProduct(product.id!);
      alert(r.archived ? "This product has order history, so it was archived and hidden from the store." : "Product deleted.");
      router.push("/admin/products");
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <section className="card space-y-4 p-5">
          <h2 className="text-[15px] font-medium">Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <L label="Product name" className="sm:col-span-2"><input value={p.name} onChange={(e) => set("name", e.target.value)} className="a-input" /></L>
            <L label="Brand">
              <select value={p.brandId} onChange={(e) => { set("brandId", e.target.value); const b = brands.find((x) => x.id === e.target.value); if (b?.origin && !p.originCountry) set("originCountry", b.origin); }} className="a-input">
                <option value="">Choose brand</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </L>
            <L label="Category"><select value={p.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="a-input"><option value="">Choose category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></L>
            <L label="Tagline" className="sm:col-span-2"><input value={p.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} className="a-input" placeholder="e.g. Blemish & pore refining serum" /></L>
            <L label="Description" className="sm:col-span-2"><textarea value={p.description} onChange={(e) => set("description", e.target.value)} rows={5} className="a-input h-auto py-2" /></L>
            <L label="Full ingredients (INCI)" className="sm:col-span-2"><textarea value={p.ingredients} onChange={(e) => set("ingredients", e.target.value)} rows={3} className="a-input h-auto py-2 text-xs" /></L>
            <L label="How to use" className="sm:col-span-2"><textarea value={p.howToUse} onChange={(e) => set("howToUse", e.target.value)} rows={3} className="a-input h-auto py-2" /></L>
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="text-[15px] font-medium">Variants, pricing & stock</h2><p className="text-xs text-ink-400">Prices in LKR. Cost is the landed import cost per unit, used for margin and reorder value.</p></div>
            <button type="button" onClick={() => set("variants", [...p.variants, { ...blank.variants[0] }])} className="a-btn-secondary h-8 text-xs"><Plus width={14} /> Variant</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-ink-400">{["Size / name", "SKU", "Price", "Sale price", "Cost", "Stock", "Reorder at", "Lead days", "Margin", ""].map((h) => <th key={h} className="pb-2 pr-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {p.variants.map((v, i) => {
                  const sell = v.salePrice || v.price;
                  const margin = sell ? (sell - v.costPrice) / sell : 0;
                  return (
                    <tr key={i}>
                      <td className="pb-2 pr-2"><input value={v.name} onChange={(e) => setV(i, "name", e.target.value)} className="a-input" placeholder="50 ml" /></td>
                      <td className="pb-2 pr-2"><input value={v.sku} onChange={(e) => setV(i, "sku", e.target.value)} className="a-input font-mono text-xs uppercase" /></td>
                      <td className="pb-2 pr-2"><input type="number" value={v.price} onChange={(e) => setV(i, "price", e.target.value)} className="a-input w-24" /></td>
                      <td className="pb-2 pr-2"><input type="number" value={v.salePrice ?? ""} onChange={(e) => setV(i, "salePrice", e.target.value)} className="a-input w-24" placeholder="—" /></td>
                      <td className="pb-2 pr-2"><input type="number" value={v.costPrice} onChange={(e) => setV(i, "costPrice", e.target.value)} className="a-input w-24" /></td>
                      <td className="pb-2 pr-2"><input type="number" value={v.stock} onChange={(e) => setV(i, "stock", e.target.value)} className="a-input w-20" /></td>
                      <td className="pb-2 pr-2"><input type="number" value={v.reorderLevel} onChange={(e) => setV(i, "reorderLevel", e.target.value)} className="a-input w-20" /></td>
                      <td className="pb-2 pr-2"><input type="number" value={v.leadTimeDays} onChange={(e) => setV(i, "leadTimeDays", e.target.value)} className="a-input w-20" /></td>
                      <td className={clsx("pb-2 pr-2 text-xs tabular-nums", margin < 0.25 ? "text-[#b02e2e]" : "text-ink-600")}>{(margin * 100).toFixed(0)}%</td>
                      <td className="pb-2">{p.variants.length > 1 && <button type="button" onClick={() => set("variants", p.variants.filter((_, j) => j !== i))} className="grid h-9 w-9 place-items-center rounded-md text-ink-400 hover:text-[#b02e2e]" aria-label="Remove variant"><Trash2 width={15} /></button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-400">Stock edits are logged as adjustment batches. To receive a shipment with batch number and expiry, use Inventory › Receive stock.</p>
        </section>

        <section className="card space-y-5 p-5">
          <h2 className="text-[15px] font-medium">Filters & suitability</h2>
          <Chips label="Skin types" options={SKIN_TYPES} value={p.skinTypes ?? []} onToggle={(v) => toggle("skinTypes", v)} />
          <Chips label="Concerns" options={CONCERNS} value={p.concerns ?? []} onToggle={(v) => toggle("concerns", v)} />
          <Chips label="Key ingredients" options={[...new Set([...KEY_INGREDIENTS, ...(p.keyIngredients ?? [])])]} value={p.keyIngredients ?? []} onToggle={(v) => toggle("keyIngredients", v)} />
          <L label="Add a custom key ingredient">
            <input className="a-input max-w-xs" placeholder="Type and press Enter" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = e.currentTarget.value.trim(); if (v) toggle("keyIngredients", v); e.currentTarget.value = ""; } }} />
          </L>
          <L label="Fragrance for"><select value={p.gender ?? ""} onChange={(e) => set("gender", e.target.value || null)} className="a-input max-w-xs"><option value="">Not a fragrance</option><option value="women">Her</option><option value="men">Him</option><option value="unisex">Unisex</option></select></L>
        </section>
      </div>

      <div className="space-y-6">
        <section className="card space-y-4 p-5 xl:sticky xl:top-6">
          <L label="Status"><select value={p.status} onChange={(e) => set("status", e.target.value as P["status"])} className="a-input"><option value="ACTIVE">Active (visible)</option><option value="DRAFT">Draft (hidden)</option><option value="ARCHIVED">Archived</option></select></L>
          <div className="space-y-2 text-sm">
            {([["isLuxury", "Luxury Collection"], ["isNew", "New arrival"], ["isBestSeller", "Best seller"], ["featured", "Featured on home page"]] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={!!p[k]} onChange={(e) => set(k, e.target.checked)} className="accent-ink" /> {l}</label>
            ))}
          </div>
          <L label="Country of origin"><input value={p.originCountry ?? ""} onChange={(e) => set("originCountry", e.target.value)} className="a-input" /></L>
          {msg && <p className={clsx("rounded-lg p-2 text-sm", msg.ok ? "bg-[#0ca30c]/10 text-[#0a7f0a]" : "bg-[#d03b3b]/10 text-[#b02e2e]")}>{msg.text}</p>}
          <button onClick={submit} disabled={pending} className="a-btn-primary w-full">{pending ? "Saving…" : product ? "Save changes" : "Create product"}</button>
          {product && <button onClick={remove} disabled={pending} className="a-btn-danger w-full">Delete product</button>}
          <p className="text-xs text-ink-400">From {formatLKR(Math.min(...p.variants.map((v) => v.salePrice || v.price)))}</p>
        </section>
        <section className="card space-y-4 p-5">
          <h2 className="text-[15px] font-medium">SEO</h2>
          <L label="URL slug"><input value={p.slug ?? ""} onChange={(e) => set("slug", e.target.value)} className="a-input font-mono text-xs" placeholder="auto from brand + name" /></L>
          <L label="Meta title (blank = “Brand Name Price in Sri Lanka”)"><input value={p.metaTitle ?? ""} onChange={(e) => set("metaTitle", e.target.value)} className="a-input" /></L>
          <L label={`Meta description (${(p.metaDescription ?? "").length}/160, blank = auto with LKR price)`}><textarea value={p.metaDescription ?? ""} onChange={(e) => set("metaDescription", e.target.value)} rows={3} className="a-input h-auto py-2" /></L>
        </section>
      </div>
    </div>
  );
}

function L({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={clsx("block", className)}><span className="a-label">{label}</span>{children}</label>;
}

function Chips({ label, options, value, onToggle }: { label: string; options: readonly string[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <div>
      <p className="a-label">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button type="button" key={o} onClick={() => onToggle(o)} className={clsx("rounded-full border px-3 py-1.5 text-xs capitalize transition max-lg:min-h-9", value.includes(o) ? "border-ink bg-ink text-white" : "border-ink/15 hover:border-ink/40")}>{o}</button>
        ))}
      </div>
    </div>
  );
}
