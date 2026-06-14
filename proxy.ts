import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { routing } from "./i18n/routing";
import { db } from "./lib/db";
import { users } from "./lib/db/schema";
import { eq } from "drizzle-orm";

const intlMiddleware = createMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  "/api/generate-pdf",
  "/:locale/dashboard(.*)",
]);

const isAdminRoute = createRouteMatcher(["/:locale/admin(.*)"]);

// Pages where we should NOT apply the cookie redirect
const isAuthPage = (pathname: string) =>
  pathname.includes("/sign-in") || pathname.includes("/sign-up");

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;

  console.log(`[MIDDLEWARE] Request: ${pathname}`);

  // 1. PDF BYPASS
  const pdfSecret = req.headers.get("x-pdf-gen-secret");
  const expectedSecret = process.env.PDF_GEN_SECRET || "internal-bypass";
  if (pdfSecret === expectedSecret) {
    return NextResponse.next();
  }

  // 2. IGNORE CLERK INTERNALS & STRIPE
  if (
    pathname.includes("/api/stripe/webhook") ||
    pathname.includes("/__clerk") ||
    pathname.includes(".js")
  ) {
    return NextResponse.next();
  }

  // 3. BYPASS PRINT
  if (pathname.includes("/print/")) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  if (userId) {
    // Check DB for admin/block status
    const [dbUser] = await db.select().from(users).where(eq(users.clerkId, userId));

    if (dbUser?.isBlocked && !pathname.includes("/blocked")) {
      return NextResponse.redirect(new URL("/[locale]/blocked", req.url).toString().replace("[locale]", pathname.split('/')[1] || 'fr'));
    }

    if (isAdminRoute(req) && !dbUser?.isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // ✅ Manual login/signup with redirectTo param in URL
    const redirectTo = req.nextUrl.searchParams.get("redirectTo");
    if (redirectTo && isAuthPage(pathname)) {
      return NextResponse.redirect(
        new URL(decodeURIComponent(redirectTo), req.url),
      );
    }

    // ✅ Google OAuth / any OAuth — cookie check runs on EVERY page
    // Google drops user on /fr or /dashboard — we catch it here regardless
    if (!isAuthPage(pathname) && !pathname.startsWith("/api")) {
      const cookieRedirect = req.cookies.get("post_auth_redirect")?.value;
      if (cookieRedirect) {
        const response = NextResponse.redirect(
          new URL(decodeURIComponent(cookieRedirect), req.url),
        );
        // ✅ Clear cookie immediately to prevent redirect loop
        response.cookies.delete("post_auth_redirect");
        return response;
      }
    }
  }

  // 4. PROTECT
  if (isProtectedRoute(req) || isAdminRoute(req)) {
    await auth.protect();
  }

  // 5. INTL
  let response = NextResponse.next();
  if (!pathname.startsWith("/api")) {
    response = intlMiddleware(req);
  }

  // ✅ GDPR Tracking Cookie
  const cookieConsent = req.cookies.get("cookie_consent")?.value;
  if (!req.cookies.has("_cvb_track") && cookieConsent === "accepted") {
    const token = crypto.randomBytes(16).toString("hex");
    response.cookies.set("_cvb_track", token, {
      maxAge: 30 * 24 * 3600, // 30 days
      secure: true,
      sameSite: "strict",
      httpOnly: false,
    });
  }

  return response;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
