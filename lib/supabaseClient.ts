// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    "[supabaseClient] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
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

