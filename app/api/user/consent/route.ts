import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
    const { consent } = await req.json();

    if (consent !== 'accepted' && consent !== 'declined') {
        return NextResponse.json({ error: 'Invalid consent value' }, { status: 400 });
    }

    const cookieStore = await cookies();
    cookieStore.set('cookie_consent', consent, {
        maxAge: 365 * 24 * 60 * 60, // 365 days
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    });

    const { userId } = await auth();

    if (userId) {
        await db.update(users)
            .set({
                cookieConsent: consent,
                cookieConsentAt: new Date(),
            })
            .where(eq(users.clerkId, userId));
    }

    return NextResponse.json({ ok: true });
}
