import { LoginForm } from "@/components/store/AuthForms";

export const metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="container-lux grid min-h-[70vh] place-items-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center font-serif text-5xl font-light">Welcome back</h1>
        <p className="mb-10 mt-3 text-center text-sm text-ink-500">Sign in to see your orders, wishlist and loyalty points.</p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
