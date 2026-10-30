import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-change-me");

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get("sk_staff")?.value;
    try {
      if (!token) throw new Error();
      await jwtVerify(token, secret());
    } catch {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  if (pathname.startsWith("/account") && !pathname.startsWith("/account/login") && !pathname.startsWith("/account/register")) {
    const token = req.cookies.get("sk_customer")?.value;
    try {
      if (!token) throw new Error();
      await jwtVerify(token, secret());
    } catch {
      const url = req.nextUrl.clone();
      url.pathname = "/account/login";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/account/:path*"] };
