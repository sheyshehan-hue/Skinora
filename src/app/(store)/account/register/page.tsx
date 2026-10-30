import { RegisterForm } from "@/components/store/AuthForms";

export const metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <div className="container-lux grid min-h-[70vh] place-items-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center font-serif text-5xl font-light">Join Skinora</h1>
        <p className="mb-10 mt-3 text-center text-sm text-ink-500">Receive 500 welcome points, early access to launches and your full order history.</p>
        <RegisterForm />
      </div>
    </div>
  );
}
