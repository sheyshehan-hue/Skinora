"use client";
import Link from "next/link";
import { useActionState } from "react";
import { customerLogin, customerRegister } from "@/actions/account";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(customerLogin, { error: null });
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="next" value={next ?? "/account"} />
      <label><span className="label">Email</span><input name="email" type="email" required className="input" autoComplete="email" /></label>
      <label><span className="label">Password</span><input name="password" type="password" required className="input" autoComplete="current-password" /></label>
      {state.error && <p className="text-sm text-rosewood">{state.error}</p>}
      <button disabled={pending} className="btn-primary">{pending ? "Signing in…" : "Sign in"}</button>
      <p className="text-center text-sm text-ink-500">New to Skinora? <Link href="/account/register" className="underline">Create an account</Link></p>
      <p className="text-center text-xs text-ink-400">Demo account: demo@skinora.lk / demo1234</p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(customerRegister, { error: null });
  return (
    <form action={action} className="grid gap-5">
      <label><span className="label">Full name</span><input name="name" required className="input" autoComplete="name" /></label>
      <label><span className="label">Email</span><input name="email" type="email" required className="input" autoComplete="email" /></label>
      <label><span className="label">Mobile (optional)</span><input name="phone" type="tel" className="input" autoComplete="tel" /></label>
      <label><span className="label">Password</span><input name="password" type="password" required minLength={8} className="input" autoComplete="new-password" /></label>
      {state.error && <p className="text-sm text-rosewood">{state.error}</p>}
      <button disabled={pending} className="btn-primary">{pending ? "Creating…" : "Create account"}</button>
      <p className="text-center text-sm text-ink-500">Already have an account? <Link href="/account/login" className="underline">Sign in</Link></p>
    </form>
  );
}
