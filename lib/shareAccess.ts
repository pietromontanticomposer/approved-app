import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAuth } from '@/lib/auth';
import { isUuid } from '@/lib/validation';
import { roleCanAccess, roleCanModify, roleCanReview } from './roles';
import type { AccessRole } from './roles';

export interface AccessContext {
  projectId: string;
  role: AccessRole;
  source: 'user' | 'share';
  userId?: string | null;
  shareId?: string | null;
}

function normalizeRole(role: string | null | undefined): AccessRole | null {
  if (!role) return null;
  const lower = String(role).toLowerCase();
  if (lower === 'owner') return 'owner';
  if (lower === 'editor') return 'editor';
  if (lower === 'commenter') return 'commenter';
  if (lower === 'viewer') return 'viewer';
  // Legacy role names
  if (lower === 'view') return 'viewer';
  if (lower === 'manage') return 'editor';
  if (lower === 'contribute') return 'commenter';
  return null;
}

export { roleCanAccess, roleCanModify, roleCanReview };

function getHeader(req: Request | NextRequest, key: string): string {
  return req.headers.get(key) || req.headers.get(key.toLowerCase()) || '';
}

function extractShareParams(req: Request | NextRequest): { shareId: string; token: string } {
  const shareIdHeader = getHeader(req, 'x-share-id');
  const tokenHeader = getHeader(req, 'x-share-token');

  let shareId = shareIdHeader || '';
  let token = tokenHeader || '';

  try {
    const url = new URL(req.url);
    if (!shareId) {
      shareId = url.searchParams.get('share_id') || '';
    }
    if (!token) {
      token = url.searchParams.get('share_token') || url.searchParams.get('token') || '';
    }
  } catch {
    // ignore URL parse errors
  }

  return { shareId, token };
}

export async function getProjectRoleForUser(userId: string, projectId: string): Promise<AccessRole | null> {
  try {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('owner_id, team_id')
      .eq('id', projectId)
      .maybeSingle();

    if (!project) return null;
    if (project.owner_id && project.owner_id === userId) return 'owner';

    const { data: projectMembership } = await supabaseAdmin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('member_id', userId)
      .maybeSingle();

    const projectRole = normalizeRole(projectMembership?.role || null);
    if (projectRole) return projectRole;

    if (project.team_id) {
      const { data: teamMembership } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', project.team_id)
        .eq('user_id', userId)
        .maybeSingle();

      const teamRole = normalizeRole(teamMembership?.role || null);
      if (teamRole) return teamRole;
    }

    return null;
  } catch (err) {
    console.error('[shareAccess] getProjectRoleForUser error', err);
    return null;
  }
}

export async function getShareLinkContext(req: Request | NextRequest, projectId?: string): Promise<AccessContext | null> {
  const { shareId, token } = extractShareParams(req);
  if (!shareId || !token) return null;

  try {
    const { data: linkData } = await supabaseAdmin
      .from('share_links')
      .select('*')
      .eq('id', shareId)
      .maybeSingle();

    if (!linkData) return null;
    if (projectId && linkData.project_id !== projectId) return null;
    if (linkData.revoked_at) return null;
    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) return null;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (tokenHash !== linkData.token_hash) return null;

    if (linkData.max_uses && linkData.max_uses > 0 && linkData.uses >= linkData.max_uses) {
      return null;
    }

    const role = normalizeRole(linkData.role) || 'viewer';

    return {
      projectId: linkData.project_id,
      role,
      source: 'share',
      shareId: linkData.id
    };
  } catch (err) {
    console.error('[shareAccess] getShareLinkContext error', err);
    return null;
  }
}

export async function resolveAccessContext(req: Request | NextRequest, projectId: string): Promise<AccessContext | null> {
  try {
    const auth = await verifyAuth(req as NextRequest);
    if (auth && auth.userId && isUuid(auth.userId)) {
      const role = await getProjectRoleForUser(auth.userId, projectId);
      if (role) {
        return {
          projectId,
          role,
          source: 'user',
          userId: auth.userId
        };
      }
    }

    const shareContext = await getShareLinkContext(req, projectId);
    if (shareContext) return shareContext;

    return null;
  } catch (err) {
    console.error('[shareAccess] resolveAccessContext error', err);
    return null;
  }
}
