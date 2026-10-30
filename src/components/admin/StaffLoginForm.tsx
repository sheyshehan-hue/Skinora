"use client";
import { useActionState } from "react";
import { staffLogin } from "@/actions/staff-auth";

export function StaffLoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(staffLogin, { error: null });
  return (
    <form action={action} className="mt-8 grid gap-4">
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <label><span className="a-label">Email</span><input name="email" type="email" required className="a-input h-11" defaultValue="admin@skinora.lk" /></label>
      <label><span className="a-label">Password</span><input name="password" type="password" required className="a-input h-11" /></label>
      {state.error && <p className="text-sm text-rosewood">{state.error}</p>}
      <button disabled={pending} className="a-btn-primary h-11">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
