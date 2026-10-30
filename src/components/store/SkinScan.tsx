"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import { ArrowLeft, Camera, ImageUp, ShieldCheck, Sparkles } from "lucide-react";
import { analyseSkin, type ScanState } from "@/actions/skin-scan";
import { concernList, METRICS, RESCAN_DAYS, type SkinResult } from "@/lib/skin-metrics";

type Phase = "intro" | "camera" | "analysing" | "result";

export function SkinScan({ onBack, onDone }: { onBack: () => void; onDone: (r: SkinResult) => void }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [consent, setConsent] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<Extract<ScanState, { ok: true }> | null>(null);
  const [, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  useEffect(() => stopCamera, []);

  const openCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      setPhase("camera");
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError("We couldn't open your camera. You can upload a selfie instead.");
    }
  };

  const submit = (file: Blob) => {
    setPreview(URL.createObjectURL(file));
    setPhase("analysing");
    setError(null);
    const form = new FormData();
    form.set("photo", new File([file], "selfie.jpg", { type: file.type || "image/jpeg" }));
    form.set("consent", consent ? "yes" : "no");
    startTransition(async () => {
      const res = await analyseSkin(form);
      if (res.ok) {
        setScan(res);
        setPhase("result");
      } else {
        setError(res.error);
        setPhase("intro");
      }
    });
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const size = Math.min(v.videoWidth, v.videoHeight);
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    // Un-mirror and crop to a centred square
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, (v.videoWidth - size) / 2, (v.videoHeight - size) / 2, size, size, 0, 0, size, size);
    stopCamera();
    c.toBlob((b) => b && submit(b), "image/jpeg", 0.9);
  };

  if (phase === "result" && scan) return <ScanResult scan={scan} preview={preview} onDone={() => onDone(scan.result)} onRetake={() => { setScan(null); setPhase("intro"); }} />;

  return (
    <div className="container-lux flex min-h-[78vh] flex-col items-center justify-center py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-10 flex items-center gap-4">
          <button onClick={() => { stopCamera(); phase === "camera" ? setPhase("intro") : onBack(); }} aria-label="Back"><ArrowLeft width={18} strokeWidth={1.2} /></button>
          <p className="eyebrow">AI skin analysis</p>
        </div>

        {phase === "intro" && (
          <div className="animate-fadeUp">
            <h1 className="text-balance font-serif text-4xl font-light leading-tight sm:text-5xl">A selfie is all we need to read your skin</h1>
            <p className="mt-5 text-ink-600">Our AI looks at eight signs of skin health, from hydration and oil to dark spots and fine lines, then builds a routine around what it sees.</p>
            <ul className="mt-8 grid gap-3 text-sm text-ink-600 sm:grid-cols-3">
              {["Face a window or soft daylight", "Bare skin, no filters or heavy makeup", "Hair off your face, glasses off"].map((t, i) => (
                <li key={t} className="border border-ink/10 bg-white p-4"><span className="font-serif text-xl text-champagne-700">0{i + 1}</span><br />{t}</li>
              ))}
            </ul>
            <label className="mt-8 flex cursor-pointer items-start gap-3 text-sm text-ink-600">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-ink" />
              <span>I agree that Skinora may analyse my photo with AI. The photo is used once and never stored; only my skin scores are kept, and only if I&apos;m signed in. This is cosmetic advice, not a medical diagnosis.</span>
            </label>
            {error && <p role="alert" className="mt-6 border-l-2 border-rosewood bg-white px-4 py-3 text-sm text-rosewood">{error}</p>}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button disabled={!consent} onClick={openCamera} className="btn-primary"><Camera width={16} strokeWidth={1.4} /> Take a selfie</button>
              <button disabled={!consent} onClick={() => fileRef.current?.click()} className="btn-outline"><ImageUp width={16} strokeWidth={1.4} /> Upload a photo</button>
              <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) submit(f); }} />
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs text-ink-400"><ShieldCheck width={14} strokeWidth={1.4} /> Private by design. Your photo is never saved.</p>
          </div>
        )}

        {phase === "camera" && (
          <div className="animate-fadeUp flex flex-col items-center">
            <div className="relative aspect-square w-full max-w-md overflow-hidden bg-ink">
              <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[72%] w-[54%] rounded-[50%] border-2 border-dashed border-ivory/80 shadow-[0_0_0_9999px_rgba(26,25,23,0.45)]" />
              </div>
              <p className="absolute inset-x-0 bottom-4 text-center text-xs uppercase tracking-[0.18em] text-ivory">Fit your face inside the oval</p>
            </div>
            <button onClick={capture} className="btn-primary mt-8 w-full max-w-md"><Camera width={16} strokeWidth={1.4} /> Capture</button>
          </div>
        )}

        {phase === "analysing" && (
          <div className="flex flex-col items-center text-center">
            <div className="relative aspect-square w-full max-w-sm overflow-hidden bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview && <img src={preview} alt="Your selfie" className="h-full w-full object-cover opacity-80" />}
              <div className="absolute inset-x-0 h-1/3 animate-[scan_2.2s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-champagne/40 to-transparent" />
            </div>
            <p className="mt-8 flex items-center gap-2 font-serif text-2xl"><Sparkles width={18} strokeWidth={1.2} className="text-champagne-700" /> Reading your skin…</p>
            <p className="mt-2 text-sm text-ink-500">Checking hydration, oil, pores, tone and texture. This takes a few seconds.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="h-40 w-40" role="img" aria-label={`Skin score ${value} out of 100`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="6" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="#C6A15B" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 60 60)" className="transition-[stroke-dashoffset] duration-1000 ease-luxe" />
      <text x="60" y="66" textAnchor="middle" className="fill-current font-serif" fontSize="34">{value}</text>
    </svg>
  );
}

export function MetricBars({ scores }: { scores: Record<string, number> }) {
  return (
    <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
      {METRICS.map((m, i) => {
        const v = scores[m.key] ?? 0;
        return (
          <li key={m.key} className="animate-fadeUp" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="mb-2 flex items-baseline justify-between text-sm"><span>{m.label}</span><span className="font-serif text-lg">{v}</span></div>
            <div className="h-1 bg-ink/10"><div className={clsx("h-full transition-all duration-1000 ease-luxe", v < 55 ? "bg-rosewood" : v < 72 ? "bg-champagne" : "bg-sage")} style={{ width: `${v}%` }} /></div>
          </li>
        );
      })}
    </ul>
  );
}

function ScanResult({ scan, preview, onDone, onRetake }: { scan: Extract<ScanState, { ok: true }>; preview: string | null; onDone: () => void; onRetake: () => void }) {
  const { result, previous, saved } = scan;
  const delta = previous ? result.overall - previous.overall : null;
  return (
    <div className="container-lux py-16">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow text-center">Your skin analysis</p>
        <div className="mt-8 grid items-center gap-10 sm:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview && <img src={preview} alt="" className="hidden h-40 w-40 object-cover sm:block" />}
            <ScoreRing value={result.overall} />
          </div>
          <div>
            <h1 className="font-serif text-4xl font-light leading-tight sm:text-5xl">
              <em className="capitalize">{result.skinType}</em> skin{result.concerns.length > 0 && <>, focus on {concernList(result.concerns)}</>}
            </h1>
            <p className="mt-4 text-ink-600">{result.summary}</p>
            {delta !== null && (
              <p className={clsx("mt-4 text-sm", delta >= 0 ? "text-sage" : "text-rosewood")}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} points since your last scan
              </p>
            )}
            {result.engine === "device" && <p className="mt-4 text-xs text-ink-400">Demo estimate. Full AI analysis switches on once the store&apos;s AI key is added.</p>}
          </div>
        </div>
        <div className="mt-14 border-t border-ink/10 pt-10"><MetricBars scores={result.scores} /></div>
        <div className="mt-14 flex flex-col items-center gap-4 border-t border-ink/10 pt-10 text-center">
          <button onClick={onDone} className="btn-primary">Build my routine</button>
          {saved ? (
            <p className="text-sm text-ink-500">Saved to <Link href="/account" className="underline">your account</Link>. We&apos;ll remind you to re-scan in {RESCAN_DAYS / 7} weeks to see your progress.</p>
          ) : (
            <p className="text-sm text-ink-500"><Link href="/account/login?next=/quiz?scan=1" className="underline">Sign in</Link> to save your scan and track your skin&apos;s progress over time.</p>
          )}
          <button onClick={onRetake} className="text-[11px] uppercase tracking-[0.16em] text-ink-500 hover:text-ink">Retake photo</button>
        </div>
      </div>
    </div>
  );
}
