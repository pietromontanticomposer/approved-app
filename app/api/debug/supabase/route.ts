import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Diagnostic endpoint to check Supabase admin connectivity without leaking secrets.
export async function GET() {
  try {
    const adminPresent = !!supabaseAdmin;

    const env = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      APP_ALLOW_FAKE_SUPABASE: !!process.env.APP_ALLOW_FAKE_SUPABASE,
      SMTP_HOST: !!process.env.SMTP_HOST,
      SMTP_USER: !!process.env.SMTP_USER,
      SMTP_PASS: !!process.env.SMTP_PASS,
      FROM_NAME: !!process.env.FROM_NAME,
      FROM_ADDRESS: !!process.env.FROM_ADDRESS,
    };

    let canQuery = false;
    let sample: any = null;

    if (adminPresent) {
      try {
        const res = await supabaseAdmin.from('projects').select('id').limit(1).maybeSingle();
        // supabase-js returns { data, error }, fake client returns similar shape
        if (res && (res.data || res.error !== undefined)) {
          if (!res.error) {
            canQuery = true;
            sample = res.data || null;
          } else {
            sample = { error: String(res.error) };
          }
        } else if (Array.isArray(res)) {
          canQuery = true;
          sample = res[0] || null;
        } else {
          sample = { info: 'unexpected response shape' };
        }
      } catch (e: any) {
        sample = { error: String(e) };
      }
    }

    return NextResponse.json({ ok: true, adminPresent, env, canQuery, sample });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
