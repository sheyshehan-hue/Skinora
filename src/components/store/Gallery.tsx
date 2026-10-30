"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

type Img = { url: string; alt: string | null };

export function Gallery({ images, alt }: { images: Img[]; alt: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const n = images.length;

  // phones: keep the dots in step with the swipe
  const onScroll = () => {
    const t = track.current;
    if (t) setI(Math.round(t.scrollLeft / t.clientWidth));
  };
  const show = (idx: number) => {
    setI(idx);
    track.current?.scrollTo({ left: idx * track.current.clientWidth, behavior: "smooth" });
  };

  return (
    <>
      {/* phones and tablets: swipe through, tap to view full screen */}
      <div className="relative -mx-4 sm:mx-0 lg:hidden">
        <div ref={track} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto" data-sk-track>
          {images.map((im, idx) => (
            <button key={im.url} onClick={() => setOpen(true)} className="relative aspect-square w-full shrink-0 snap-center bg-ivory-200 sm:aspect-[4/5]" aria-label={`View image ${idx + 1} of ${n} full screen`} data-sk-open={idx}>
              <Image src={im.url} alt={im.alt ?? alt} fill priority={idx === 0} sizes="100vw" className="object-cover" />
            </button>
          ))}
        </div>
        {n > 1 && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2" data-sk-dots>
            {images.map((_, idx) => (
              <span key={idx} className={clsx("h-1.5 rounded-full transition-all duration-500", idx === i ? "w-5 bg-ink" : "w-1.5 bg-ink/25")} />
            ))}
          </div>
        )}
        <span className="pointer-events-none absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/80 backdrop-blur" aria-hidden>
          <Expand width={14} strokeWidth={1.3} />
        </span>
      </div>

      {/* desktop: thumbnails, hover zoom, click for full screen */}
      <div className="hidden gap-4 lg:flex">
        {n > 1 && (
          <div className="flex w-20 shrink-0 flex-col gap-3">
            {images.map((im, idx) => (
              <button key={im.url} onClick={() => setI(idx)} onMouseEnter={() => setI(idx)} aria-label={`Image ${idx + 1}`} aria-current={idx === i} className={clsx("relative aspect-[4/5] w-full overflow-hidden bg-ivory-200 transition", idx === i ? "ring-1 ring-ink ring-offset-2 ring-offset-ivory" : "opacity-60 hover:opacity-100")}>
                <Image src={im.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="View full screen"
          data-sk-open="stage"
          className="group relative h-[min(calc(100vh_-_150px),calc((100vw_*_7_/_12_-_200px)_*_1.25),860px)] min-h-[520px] flex-1 cursor-zoom-in overflow-hidden bg-ivory-200"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
        >
          {images.map((im, idx) => (
            <Image
              key={im.url}
              src={im.url}
              alt={im.alt ?? alt}
              fill
              priority={idx === 0}
              sizes="(min-width:1024px) 50vw, 100vw"
              className={clsx("object-cover transition-[opacity,transform] duration-700 ease-luxe", idx === i ? "opacity-100" : "opacity-0")}
              style={idx === i && zoom ? { transform: "scale(1.7)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            />
          ))}
          <span className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/85 px-3 py-2 text-[10px] uppercase tracking-[0.18em] opacity-0 backdrop-blur transition group-hover:opacity-100">
            <Expand width={12} strokeWidth={1.4} /> Full screen
          </span>
        </button>
      </div>

      {open && <Lightbox images={images} alt={alt} start={i} onClose={(last) => { setOpen(false); show(last); }} />}
    </>
  );
}

function Lightbox({ images, alt, start, onClose }: { images: Img[]; alt: string; start: number; onClose: (last: number) => void }) {
  const [i, setI] = useState(start);
  const touch = useRef<number | null>(null);
  const n = images.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(i);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  });

  return (
    <div
      className="fixed inset-0 z-[70] flex animate-[fadeIn_300ms_ease-out] flex-col bg-ivory"
      role="dialog"
      aria-modal="true"
      aria-label="Product images"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <div className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8">
        <span className="text-[11px] uppercase tracking-[0.2em] text-ink-500">{i + 1} / {n}</span>
        <button onClick={() => onClose(i)} aria-label="Close full screen" className="grid h-10 w-10 place-items-center">
          <X strokeWidth={1.2} />
        </button>
      </div>
      <div className="relative flex-1">
        <Image src={images[i].url} alt={images[i].alt ?? alt} fill sizes="100vw" className="object-contain" />
        {n > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous image" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/80 backdrop-blur sm:left-8">
              <ChevronLeft strokeWidth={1.2} />
            </button>
            <button onClick={() => go(1)} aria-label="Next image" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/80 backdrop-blur sm:right-8">
              <ChevronRight strokeWidth={1.2} />
            </button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="flex shrink-0 justify-center gap-3 py-5">
          {images.map((im, idx) => (
            <button key={im.url} onClick={() => setI(idx)} aria-label={`Image ${idx + 1}`} className={clsx("relative h-16 w-[52px] overflow-hidden bg-ivory-200", idx === i ? "ring-1 ring-ink" : "opacity-50")}>
              <Image src={im.url} alt="" fill sizes="52px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
