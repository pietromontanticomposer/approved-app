// app/api/diagnose-upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { checkAdminSecret } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = checkAdminSecret(req);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const timestamp = new Date().toISOString();

  // Capture ALL headers
  const allHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    allHeaders[key] = value;
  });

  // Try to parse form data
  let formData: Record<string, any> = {};
  try {
    const form = await req.formData();
    form.forEach((value, key) => {
      formData[key] = value instanceof File ?
        `File: ${value.name} (${value.size} bytes, ${value.type})` :
        value;
    });
  } catch (e) {
    formData = { error: 'Could not parse formData: ' + String(e) };
  }

  // Test auth
  let authResult: any = null;
  let authError: any = null;
  try {
    authResult = await verifyAuth(req);
  } catch (e) {
    authError = String(e);
  }

  // Return comprehensive diagnostic
  return NextResponse.json({
    timestamp,
    success: !!authResult,
    auth: authResult,
    authError,
    headers: {
      authorization: allHeaders['authorization'] || null,
      'x-actor-id': allHeaders['x-actor-id'] || null,
      'content-type': allHeaders['content-type'] || null,
      'user-agent': allHeaders['user-agent'] || null,
      origin: allHeaders['origin'] || null,
      referer: allHeaders['referer'] || null,
    },
    allHeaders,
    formData,
    env: {
      APP_ALLOW_PUBLIC_USER: process.env.APP_ALLOW_PUBLIC_USER,
      NODE_ENV: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    expectedBehavior: {
      shouldHaveAuthHeader: 'Yes - from flow.js line 1807',
      shouldHaveActorId: 'Yes - from flow.js line 1809',
      shouldPassAuth: authResult ? 'YES ✅' : 'NO ❌',
      reason: !authResult ? 'Check headers above - one is missing or malformed' : 'Auth working correctly',
    }
  }, { status: authResult ? 200 : 401 });
}
