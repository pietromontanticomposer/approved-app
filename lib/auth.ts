// lib/auth.ts
import { supabase } from "./supabaseClient";
import { supabaseAdmin } from "./supabaseAdmin";
import { NextRequest } from 'next/server';

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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Auth] No valid authorization header found');
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    if (!token) {
      console.log('[Auth] Empty token');
      return null;
    }

    // Verify token with Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      console.log('[Auth] Token verification failed:', error?.message);
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
export async function canAccessProject(userId: string, projectId: string): Promise<boolean> {
  try {
    // Check if user owns the project
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('owner_id, team_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return false;
    }

    // User is owner
    if (project.owner_id === userId) {
      return true;
    }

    // Check if user is in project_members
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('member_id')
      .eq('project_id', projectId)
      .eq('member_id', userId)
      .maybeSingle();

    if (member) {
      return true;
    }

    // Check if user is in team
    if (project.team_id) {
      const { data: teamMember } = await supabaseAdmin
        .from('team_members')
        .select('user_id')
        .eq('team_id', project.team_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (teamMember) {
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error('[Auth] Error checking project access:', err);
    return false;
  }
}

/**
 * Check if user can modify a project (owner or admin) (SERVER-SIDE)
 */
export async function canModifyProject(userId: string, projectId: string): Promise<boolean> {
  try {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id, team_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return false;
    }

    // Only owner can modify
    if (project.owner_id === userId) {
      return true;
    }

    // Check if user is admin in team
    if (project.team_id) {
      const { data: teamMember } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', project.team_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (teamMember && teamMember.role === 'admin') {
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error('[Auth] Error checking modify permission:', err);
    return false;
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
