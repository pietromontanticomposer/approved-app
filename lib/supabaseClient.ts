// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// Support both canonical env names and common variants to avoid deployment mismatches
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_API_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANONKEY;

if (!url || !anon) {
  throw new Error(
    "[supabaseClient] Missing Supabase URL or anon key. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY) are set in environment."
  );
}

// CRITICAL: This must work in browser AND server contexts
// Server-side: just for type exports, won't actually use auth
// Client-side: full auth with localStorage persistence
let supabaseInstance: any = null;

export function getSupabaseClient() {
  // Only initialize on browser
  if (typeof window === 'undefined') {
    return createClient(url, anon);
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anon, {
      auth: {
        persistSession: true,
        storageKey: 'approved-auth',
        storage: window.localStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    console.log('[SupabaseClient] Initialized with persistence');
    
    // Make available globally
    (window as any).supabaseClient = supabaseInstance;
  }
  
  return supabaseInstance;
}

// Default export for backwards compatibility
export const supabase = getSupabaseClient();

