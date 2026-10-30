import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-ivory px-6 text-center">
      <div>
        <p className="font-serif text-3xl tracking-[0.3em]">SKINORA</p>
        <h1 className="mt-10 font-serif text-6xl font-light italic">Page not found</h1>
        <p className="mt-4 text-ink-500">The page you&apos;re looking for has moved or no longer exists.</p>
        <Link href="/" className="btn-primary mt-10">Return home</Link>
      </div>
    </div>
  );
}
