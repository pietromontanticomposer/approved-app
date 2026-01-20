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
 * Returns true if user is owner or member of project_members (any role including viewer)
 */
export async function canAccessProject(userId: string, projectId: string): Promise<boolean> {
  // In demo/dev mode, allow access
  const allowPublic = process.env.APP_ALLOW_PUBLIC_USER === '1' || process.env.NODE_ENV !== 'production';
  if (allowPublic && userId === 'public-user') {
    return true;
  }

  try {
    // Check if user is owner
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .maybeSingle();

    if (project?.owner_id === userId) {
      return true;
    }

    // Check if user is a member (any role)
    const { data: membership } = await supabaseAdmin
      .from('project_members')
      .select('member_id')
      .eq('project_id', projectId)
      .eq('member_id', userId)
      .maybeSingle();

    if (membership) {
      return true;
    }

    return false;
  } catch (err) {
    console.error('[canAccessProject] Error:', err);
    return false;
  }
}

/**
 * Check if user can modify a project (owner or editor) (SERVER-SIDE)
 * Viewers can only read, comment, and download - NOT modify files
 */
export async function canModifyProject(userId: string, projectId: string): Promise<boolean> {
  // In demo/dev mode without real auth, allow modifications
  const allowPublic = process.env.APP_ALLOW_PUBLIC_USER === '1' || process.env.NODE_ENV !== 'production';
  if (allowPublic && userId === 'public-user') {
    return true;
  }

  try {
    // Check if user is owner
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .maybeSingle();

    if (project?.owner_id === userId) {
      return true;
    }

    // Check if user is a member
    const { data: membership } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('member_id', userId)
      .maybeSingle();

    // If user is a member, check their role
    if (membership) {
      // Only viewer role is restricted - editor/admin/null can modify
      if (membership.role === 'viewer') {
        return false;
      }
      // editor, admin, or any other role = can modify
      return true;
    }

    // If project has no owner set, allow authenticated users to modify
    // This handles legacy projects or projects being created
    if (!project?.owner_id) {
      return true;
    }

    // Not owner and not a member = cannot modify
    return false;
  } catch (err) {
    console.error('[canModifyProject] Error checking permissions:', err);
    // On error, allow modification to not break existing functionality
    return true;
  }
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
