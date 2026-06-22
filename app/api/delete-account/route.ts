import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Initiate user deletion in Clerk.
    // This action will trigger the 'user.deleted' webhook,
    // which our application uses to perform a soft delete in our database.
    const client = await clerkClient();
    await client.users.deleteUser(userId);

    // Clerk's deleteUser API returns a 200 even if the user is already deleted.
    // The actual database soft-deletion is handled by our webhook.

    console.log(`[API/DELETE-ACCOUNT] User ${userId} deletion initiated with Clerk.`);

    return new NextResponse('User deletion initiated', { status: 200 });
  } catch (error: any) {
    console.error('[API/DELETE-ACCOUNT] Error initiating user deletion with Clerk:', error);
    return new NextResponse(`Error: ${error.message || 'Failed to initiate user deletion'}`, { status: 500 });
  }
}