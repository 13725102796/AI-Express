import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route protection middleware
// In production, this would check Auth.js session
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  const publicPaths = ["/login", "/api/auth"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (isPublic) {
    return NextResponse.next();
  }

  // For development, allow all routes
  // In production, check session cookie:
  // const session = request.cookies.get("next-auth.session-token");
  // if (!session) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
