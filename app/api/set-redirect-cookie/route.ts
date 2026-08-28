import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { redirectTo } = await req.json();
  const response = NextResponse.json({ ok: true });
  if (redirectTo) {
    const decoded = decodeURIComponent(redirectTo);
    response.cookies.set("post_auth_redirect", redirectTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // expires in 10 min
      path: "/",
    });

    // Extract UUID if pointing to a template or result page
    const uuidMatch = decoded.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (uuidMatch && uuidMatch[1]) {
      response.cookies.set("pending_claim_analysis", uuidMatch[1], {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10,
        path: "/",
      });
    }
  }
  return response;
}