// lib/supabaseClient.ts

import { createClient } from "@supabase/supabase-js";

// Questi valori arrivano da .env.local in locale
// e dalle Environment Variables su Vercel.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Un solo client riutilizzato da tutta l'app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
