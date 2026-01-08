// app/api/test-auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  console.log('[TEST-AUTH] Starting test');

  const authHeader = req.headers.get('authorization');
  const actorId = req.headers.get('x-actor-id');

  console.log('[TEST-AUTH] Headers:', { authHeader, actorId });

  const auth = await verifyAuth(req);

  console.log('[TEST-AUTH] Auth result:', auth);

  return NextResponse.json({
    success: !!auth,
    auth: auth,
    headers: {
      authorization: authHeader,
      actorId: actorId,
    },
    env: {
      APP_ALLOW_PUBLIC_USER: process.env.APP_ALLOW_PUBLIC_USER,
      NODE_ENV: process.env.NODE_ENV,
    },
  });
}
