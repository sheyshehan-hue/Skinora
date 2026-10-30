"use client";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import clsx from "clsx";
import { GripVertical, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { deleteProductImage, reorderProductImages, updateImageAlt, uploadProductImages } from "@/actions/admin/products";

type Img = { id: string; url: string; alt: string };

/** Drag-and-drop upload, reorder and delete for product images. */
export function ImageManager({ productId, images: initial }: { productId: string; images: Img[] }) {
  const [images, setImages] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [busy, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const upload = (files: FileList | File[]) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    start(async () => {
      const saved = await uploadProductImages(productId, fd);
      setImages((cur) => [...cur, ...saved.map((s) => ({ id: s.id, url: s.url, alt: s.alt ?? "" }))]);
    });
  };

  const onDropTile = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = [...images];
    const from = next.findIndex((i) => i.id === dragId);
    const to = next.findIndex((i) => i.id === targetId);
    next.splice(to, 0, next.splice(from, 1)[0]);
    setImages(next);
    setDragId(null);
    start(() => reorderProductImages(productId, next.map((i) => i.id)));
  };

  return (
    <div
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); setOver(false); upload(e.dataTransfer.files); } }}
      className={clsx("rounded-xl transition", over && "bg-champagne-50 ring-2 ring-champagne")}
    >
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {images.map((img, i) => (
          <li
            key={img.id}
            draggable
            onDragStart={() => setDragId(img.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropTile(img.id); }}
            className={clsx("group relative overflow-hidden rounded-lg border bg-ivory-200", dragId === img.id ? "opacity-40" : "border-ink/10")}
          >
            <div className="relative aspect-[4/5] cursor-grab active:cursor-grabbing">
              <Image src={img.url} alt={img.alt} fill sizes="200px" className="object-cover" />
              <span className="absolute left-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium">{i === 0 ? "Main" : i === 1 ? "Hover" : i + 1}</span>
              <GripVertical width={16} className="absolute right-2 top-2 text-ink/40" />
              <button onClick={() => { if (confirm("Delete this image?")) { setImages(images.filter((x) => x.id !== img.id)); start(() => deleteProductImage(img.id)); } }} className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-md bg-white/90 opacity-0 transition hover:text-[#b02e2e] group-hover:opacity-100" aria-label="Delete image"><Trash2 width={14} /></button>
            </div>
            <input defaultValue={img.alt} onBlur={(e) => e.target.value !== img.alt && updateImageAlt(img.id, e.target.value)} placeholder="Alt text" className="w-full border-t border-ink/10 bg-white px-2 py-1.5 text-[11px] outline-none" aria-label="Alt text" />
          </li>
        ))}
        <li>
          <button onClick={() => input.current?.click()} className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink/15 text-xs text-ink-500 transition hover:border-ink/40 hover:text-ink">
            {busy ? <Loader2 className="animate-spin" width={20} /> : <ImagePlus width={22} strokeWidth={1.4} />}
            {busy ? "Working…" : "Drop images or click"}
          </button>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
        </li>
      </ul>
    </div>
  );
}
