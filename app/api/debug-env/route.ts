// app/api/debug-env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    APP_ALLOW_PUBLIC_USER: process.env.APP_ALLOW_PUBLIC_USER,
    APP_ALLOW_PUBLIC_USER_length: process.env.APP_ALLOW_PUBLIC_USER?.length || 0,
    APP_ALLOW_PUBLIC_USER_equals_1: process.env.APP_ALLOW_PUBLIC_USER === '1',
    APP_ALLOW_PUBLIC_USER_charCodes: process.env.APP_ALLOW_PUBLIC_USER?.split('').map(c => c.charCodeAt(0)),
    NODE_ENV: process.env.NODE_ENV,
    has_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
