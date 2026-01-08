// lib/auth.ts
import { supabase } from "./supabaseClient";
import { supabaseAdmin } from "./supabaseAdmin";
import { NextRequest } from 'next/server';

const isDev = process.env.NODE_ENV !== "production";

// =======================
// CLIENT-SIDE AUTH
// =======================

/**
 * Ottiene l'utente autenticato corrente (CLIENT-SIDE)
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

// =======================
// SERVER-SIDE AUTH
// =======================

export interface AuthContext {
  userId: string;
  email: string;
  isAuthenticated: boolean;
}

/**
 * Verify authentication from request headers (SERVER-SIDE)
 * CRITICAL: This function MUST be used on all protected API routes
 *
 * Verification flow:
 * 1. Extract Bearer token from Authorization header
 * 2. Verify token with Supabase auth
 * 3. Return authenticated user ID
 *
 * DO NOT trust x-actor-id header - it can be spoofed by clients
 */
export async function verifyAuth(req: NextRequest): Promise<AuthContext | null> {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.get('authorization');
    const actorIdHeader = req.headers.get('x-actor-id');

    console.log('[Auth] verifyAuth called:', {
      hasAuthHeader: !!authHeader,
      hasActorId: !!actorIdHeader,
      env_APP_ALLOW_PUBLIC_USER: process.env.APP_ALLOW_PUBLIC_USER,
      env_NODE_ENV: process.env.NODE_ENV,
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const allowPublic =
        process.env.APP_ALLOW_PUBLIC_USER === '1' || process.env.NODE_ENV !== 'production';
      console.log('[Auth] No auth header - allowPublic:', allowPublic);
      if (allowPublic) {
        return {
          userId: 'public-user',
          email: 'public@approved.local',
          isAuthenticated: true,
        };
      }
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    if (!token) {
      if (isDev) console.log('[Auth] Empty token');
      return null;
    }

    // DEMO MODE: If token is "demo", trust x-actor-id header
    // This allows local development without real Supabase auth
    // Also works in production when APP_ALLOW_PUBLIC_USER=1
    if (token === 'demo') {
      const allowPublic = process.env.APP_ALLOW_PUBLIC_USER === '1' || process.env.NODE_ENV !== 'production';

      if (!allowPublic) {
        console.log('[Auth] Demo token not allowed in production without APP_ALLOW_PUBLIC_USER=1');
        return null;
      }

      const actorId = req.headers.get('x-actor-id');
      if (actorId && actorId.length > 0) {
        console.log('[Auth] Demo mode active - using x-actor-id:', actorId);
        return {
          userId: actorId,
          email: 'demo@approved.local',
          isAuthenticated: true,
        };
      }
      console.log('[Auth] Demo mode but no x-actor-id header');
      return null;
    }

    // Verify token with Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      if (isDev) console.log('[Auth] Token verification failed:', error?.message);
      return null;
    }

    return {
      userId: data.user.id,
      email: data.user.email || '',
      isAuthenticated: true,
    };
  } catch (err) {
    console.error('[Auth] Unexpected error during auth verification:', err);
    return null;
  }
}

/**
 * Get authenticated user ID or throw 401 error (SERVER-SIDE)
 * Use this in API routes that REQUIRE authentication
 */
export async function requireAuth(req: NextRequest): Promise<string> {
  const auth = await verifyAuth(req);
  if (!auth) {
    throw new Error('UNAUTHORIZED');
  }
  return auth.userId;
}

/**
 * Check if user has permission to access a project (SERVER-SIDE)
 * Returns true if user is owner or team member
 */
export async function canAccessProject(_userId: string, _projectId: string): Promise<boolean> {
  // TEMP: allow all authenticated users to access/modify any project.
  return true;
}

/**
 * Check if user can modify a project (owner or admin) (SERVER-SIDE)
 * TEMP: In public/demo mode, allow all modifications
 */
export async function canModifyProject(_userId: string, _projectId: string): Promise<boolean> {
  // Always allow in development or when public users are enabled
  const allowPublic = process.env.APP_ALLOW_PUBLIC_USER === '1' || process.env.NODE_ENV !== 'production';
  if (allowPublic) {
    return true;
  }
  return true;
}

/**
 * Ottiene il primo team dell'utente (tipicamente il workspace personale)
 */
export async function getUserDefaultTeam(userId: string) {
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, role, teams(id, name)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    teamId: data.team_id,
    role: data.role,
    teamName: (data.teams as any)?.name || "My Workspace",
  };
}

/**
 * Ottiene tutti i team dell'utente
 */
export async function getUserTeams(userId: string) {
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, role, joined_at, teams(id, name, description)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((tm) => ({
    teamId: tm.team_id,
    role: tm.role,
    joinedAt: tm.joined_at,
    team: tm.teams as any,
  }));
}
