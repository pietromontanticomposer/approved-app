import { supabaseAdmin } from './supabaseAdmin';

// Resolve a possible actor identifier (could be UID or email) to a Supabase UID.
export async function resolveActorId(candidate: string | null): Promise<string | null> {
  if (!candidate) return null;

  // If the candidate is an Authorization header value like "Bearer <token>",
  // try to resolve the token to a user via the admin client.
  const maybeBearer = String(candidate || '').trim();
  if (/^Bearer\s+/i.test(maybeBearer)) {
    const token = maybeBearer.split(/\s+/)[1];
    if (token) {
      try {
        const { data, error } = await supabaseAdmin.auth.getUser(token as string);
        if (!error && data?.user?.id) return data.user.id;
      } catch (e) {
        // ignore
      }
    }
  }

  // If it already looks like a UUID, assume it's a UID
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  if (uuidRegex.test(candidate)) return candidate;

  // If it looks like an email, try to find the user by email using admin API
  if (candidate.includes('@')) {
    try {
      // Prefer admin.listUsers if available
      if (supabaseAdmin.auth && supabaseAdmin.auth.admin && typeof supabaseAdmin.auth.admin.listUsers === 'function') {
        const res = await supabaseAdmin.auth.admin.listUsers({ search: candidate });
        if (!res.error && res.data && Array.isArray(res.data.users)) {
          const exact = res.data.users.find((u: any) => (u.email || '').toLowerCase() === candidate.toLowerCase());
          if (exact) return exact.id;
        }
      }

      // Fallback: query auth.users directly
      try {
        const authUsers = typeof supabaseAdmin.schema === "function"
          ? supabaseAdmin.schema("auth").from("users")
          : supabaseAdmin.from("auth.users");
        const { data } = await authUsers.select('id,email').eq('email', candidate).limit(1).maybeSingle();
        if (data && data.id) return data.id;
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // ignore lookup errors
    }
  }

  return null;
}
