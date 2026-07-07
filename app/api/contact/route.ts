// 




import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/rate-limit/upstash";

const resendApiKey = process.env.RESEND_API_KEY || "re_dummy_key_for_build";
const resend = new Resend(resendApiKey);

// Rate limit: 5 requests per IP per hour
const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    analytics: false,
});

export async function POST(req: NextRequest) {
    try {
        // ── Rate limiting ─────────────────────────────────────
        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "anonymous";

        const { success: rateLimitOk } = await ratelimit.limit(`contact:${ip}`);
        if (!rateLimitOk) {
            return NextResponse.json(
                { error: "Trop de demandes. Réessayez dans une heure." },
                { status: 429 }
            );
        }

        // ── Parse body ────────────────────────────────────────
        const body = await req.json();
        const { name, email, subject, message, captchaToken, currentUrl } = body;

        // ── Server-side validation ────────────────────────────
        if (!name || name.trim().length < 2 || name.trim().length > 100) {
            return NextResponse.json({ error: "Nom invalide." }, { status: 400 });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: "Email invalide." }, { status: 400 });
        }
        if (!subject || subject.trim().length < 3 || subject.trim().length > 150) {
            return NextResponse.json({ error: "Sujet invalide." }, { status: 400 });
        }
        if (!message || message.trim().length < 10 || message.trim().length > 3000) {
            return NextResponse.json(
                { error: "Message trop court ou trop long (10–3000 caractères)." },
                { status: 400 }
            );
        }
        if (!captchaToken) {
            return NextResponse.json({ error: "CAPTCHA requis." }, { status: 400 });
        }

        // ── Verify hCaptcha ───────────────────────────────────
        const captchaVerify = await fetch("https://api.hcaptcha.com/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                secret: process.env.HCAPTCHA_SECRET_KEY || "",
                response: captchaToken,
                remoteip: ip,
            }),
        });
        const captchaResult = await captchaVerify.json();
        if (!captchaResult.success) {
            return NextResponse.json(
                { error: "CAPTCHA invalide. Réessayez." },
                { status: 400 }
            );
        }

        // ── Get user info if logged in ────────────────────────
        const { userId: clerkId } = await auth();
        let userSection = "";

        if (clerkId) {
            const clerkUser = await currentUser();
            const dbUser = await db.query.users.findFirst({
                where: and(eq(users.clerkId, clerkId), isNull(users.deletedAt)),
            });

            const plan = dbUser?.plan || "free";
            const credits = dbUser?.credits ?? 0;
            // const isPaid = plan !== "free" || credits > 0;
            // The account is only paid if the plan name itself is not "free"
            const isPaid = plan.toLowerCase() !== "free";

            userSection = `
        <tr><td colspan="2" style="padding:12px 0 4px;font-weight:700;color:#059669;font-size:13px;border-top:1px solid #e2e8f0;">COMPTE UTILISATEUR</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;width:160px;">Authentification</td><td style="padding:4px 0;font-size:13px;color:#1e293b;font-weight:600;">✅ Connecté</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Clerk ID</td><td style="padding:4px 0;font-size:13px;color:#1e293b;font-family:monospace;">${clerkId}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Nom (Clerk)</td><td style="padding:4px 0;font-size:13px;color:#1e293b;">${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Email (Clerk)</td><td style="padding:4px 0;font-size:13px;color:#1e293b;">${clerkUser?.emailAddresses[0]?.emailAddress || ""}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Plan</td><td style="padding:4px 0;font-size:13px;font-weight:700;color:${isPaid ? "#059669" : "#64748b"};">${plan.toUpperCase()} ${isPaid ? "💳" : ""}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Crédits restants</td><td style="padding:4px 0;font-size:13px;color:#1e293b;">${credits}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Type de compte</td><td style="padding:4px 0;font-size:13px;color:#1e293b;">${isPaid ? "Payant" : "Gratuit"}</td></tr>
      `;
        } else {
            userSection = `
        <tr><td colspan="2" style="padding:12px 0 4px;font-weight:700;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;">COMPTE UTILISATEUR</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;width:160px;">Authentification</td><td style="padding:4px 0;font-size:13px;color:#1e293b;">👤 Visiteur anonyme</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Clerk ID</td><td style="padding:4px 0;font-size:13px;color:#94a3b8;">N/A</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Plan</td><td style="padding:4px 0;font-size:13px;color:#94a3b8;">N/A</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Crédits</td><td style="padding:4px 0;font-size:13px;color:#94a3b8;">N/A</td></tr>
      `;
        }

        // ── Build email HTML ──────────────────────────────────
        const now = new Date().toLocaleString("fr-FR", {
            timeZone: "Europe/Paris",
            dateStyle: "full",
            timeStyle: "short",
        });

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    
    <div style="background:linear-gradient(135deg,#059669,#047857);padding:28px 32px;">
      <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
        📬 OuiCV — Nouveau message
      </div>
      <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">
        Formulaire de contact
      </div>
    </div>

    <div style="padding:28px 32px;">
      
      <div style="background:#f0fdf4;border-left:4px solid #059669;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Sujet</div>
        <div style="font-size:16px;font-weight:700;color:#1e293b;">${subject}</div>
      </div>

      <div style="margin-bottom:28px;">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Message</div>
        <div style="background:#f8fafc;border-radius:10px;padding:18px;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <tr><td colspan="2" style="padding:4px 0 8px;font-weight:700;color:#059669;font-size:13px;">EXPÉDITEUR</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;width:160px;">Nom</td><td style="padding:4px 0;font-size:13px;color:#1e293b;font-weight:600;">${name}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Email</td><td style="padding:4px 0;font-size:13px;"><a href="mailto:${email}" style="color:#059669;">${email}</a></td></tr>
        
        ${userSection}

        <tr><td colspan="2" style="padding:12px 0 4px;font-weight:700;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;">DÉTAILS TECHNIQUES</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Date</td><td style="padding:4px 0;font-size:13px;color:#1e293b;">${now}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">URL</td><td style="padding:4px 0;font-size:13px;color:#94a3b8;font-family:monospace;font-size:12px;">${currentUrl || "N/A"}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">IP</td><td style="padding:4px 0;font-size:13px;color:#94a3b8;">${ip}</td></tr>
      </table>
    </div>

    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
      <div style="font-size:12px;color:#94a3b8;">
        OuiCV · Formulaire de contact · Répondre à <a href="mailto:${email}" style="color:#059669;">${email}</a>
      </div>
    </div>
  </div>
</body>
</html>`;

        // ── Dynamic Environment Config ────────────────────────
        const isDevelopment = process.env.NODE_ENV === "development";

        // In dev phase, Resend requires 'onboarding@resend.dev'
        const fromEmail = isDevelopment
            ? "OuiCV Contact <onboarding@resend.dev>"
            : `OuiCV Contact <${process.env.CONTACT_EMAIL || "contact@ouicv.fr"}>`;

        // Destination target email setup
        const toEmail = process.env.CONTACT_EMAIL || "contact@ouicv.fr";

        // ADD THIS LINE RIGHT HERE BEFORE SENDING:
        const recipients = isDevelopment ? [toEmail, toEmail] : [toEmail, email];

        // ── Send email via Resend ─────────────────────────────
        const { error: sendError } = await resend.emails.send({
            from: fromEmail,
            to: recipients, // <-- This will now compile perfectly
            replyTo: email,
            subject: `[OuiCV Contact] ${subject}`,
            html: emailHtml,
        });

        if (sendError) {
            console.error("Resend error:", sendError);
            return NextResponse.json(
                { error: "Erreur lors de l'envoi. Réessayez plus tard." },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Contact API error:", err);
        return NextResponse.json(
            { error: "Une erreur est survenue." },
            { status: 500 }
        );
    }
}