// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// Usa SOLO env server-side per sicurezza.
// Per il tuo caso, basta ANON KEY, protetta da RLS.
const url =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    "[supabaseClient] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars"
  );
}

// Tipo generico, va benissimo per il tuo uso attuale
export const supabase = createClient(url, anon);
