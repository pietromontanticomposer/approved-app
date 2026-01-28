// app/api/projects/route.ts
/**
 * Projects API Route
 *
 * Secure, professional implementation with:
 * - Server-side authentication verification
 * - Proper authorization checks
 * - Input validation
 * - Error handling
 * - Type safety
 */

import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth, isProjectOwner } from '@/lib/auth';
import { getShareLinkContext } from '@/lib/shareAccess';
import { isUuid } from '@/lib/validation';

const isDev = process.env.NODE_ENV !== "production";

// ============================================================================
// TYPES
// ============================================================================

type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  team_id: string | null;
  owner_id: string | null;
};

type ProjectWithMembers = Project & {
  team_members: TeamMember[];
};

type TeamMember = {
  user_id: string;
  role: string;
  joined_at: string;
};

function normalizeRole(role: string | null | undefined) {
  if (!role) return null;
  const lower = String(role).toLowerCase();
  if (lower === 'owner') return 'owner';
  if (lower === 'editor') return 'editor';
  if (lower === 'commenter') return 'commenter';
  if (lower === 'viewer') return 'viewer';
  if (lower === 'view') return 'viewer';
  if (lower === 'manage') return 'editor';
  if (lower === 'contribute') return 'commenter';
  return null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Hydrate projects with team member information
 */
async function hydrateProjectsWithTeamMembers(projects: Project[]): Promise<ProjectWithMembers[]> {
  const teamIds = Array.from(
    new Set(projects.map(project => project.team_id).filter(Boolean))
  ) as string[];

  const membersByTeam = new Map<string, TeamMember[]>();

  if (teamIds.length > 0) {
    try {
      const { data, error } = await supabaseAdmin
        .from('team_members')
        .select('team_id, user_id, role, joined_at')
        .in('team_id', teamIds);

      if (error) {
        throw error;
      }

      (data || []).forEach((row: any) => {
        if (!row?.team_id) return;
        const existing = membersByTeam.get(row.team_id) || [];
        existing.push({
          user_id: row.user_id,
          role: row.role,
          joined_at: row.joined_at
        });
        membersByTeam.set(row.team_id, existing);
      });
    } catch (err) {
      console.warn('[Projects] Warning loading team_members batch:', err);
    }
  }

  return projects.map((project) => ({
    ...project,
    team_members: project.team_id ? (membersByTeam.get(project.team_id) || []) : []
  }));
}

/**
 * Get projects owned by user
 */
async function getOwnedProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Projects] Error loading owned projects:', error);
    throw new Error(`Failed to load owned projects: ${error.message}`);
  }

  return data || [];
}

/**
 * Get projects shared with user
 */
async function getSharedProjects(userId: string, ownedProjectIds: string[]): Promise<Project[]> {
  const membershipResult = await supabaseAdmin
    .from('project_members')
    .select('project_id')
    .eq('member_id', userId);

  if (membershipResult.error) {
    console.error('[Projects] Error loading project memberships:', membershipResult.error);
    throw new Error(`Failed to load project memberships: ${membershipResult.error.message}`);
  }

  const projectIdsFromMembership = (membershipResult.data || [])
    .map((row: any) => row.project_id)
    .filter(Boolean);

  // Combine and deduplicate, excluding owned projects
  const allSharedIds = new Set([...projectIdsFromMembership]);
  const ownedIdsSet = new Set(ownedProjectIds);
  const finalSharedIds = Array.from(allSharedIds).filter(id => !ownedIdsSet.has(id));

  if (finalSharedIds.length === 0) {
    return [];
  }

  // Fetch shared projects
  const { data: sharedProjects, error: sharedError } = await supabaseAdmin
    .from('projects')
    .select('*')
    .in('id', finalSharedIds)
    .order('created_at', { ascending: false});

  if (sharedError) {
    console.error('[Projects] Error loading shared projects:', sharedError);
    throw new Error(`Failed to load shared projects: ${sharedError.message}`);
  }

  return sharedProjects || [];
}

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * GET /api/projects
 *
 * Returns user's owned and shared projects
 * Requires: Authentication
 * Returns: { my_projects: Project[], shared_with_me: Project[], projects: Project[] }
 */
export async function GET(req: NextRequest) {
  try {
    if (isDev) console.log('[GET /api/projects] Request started');

    // Allow share-link access without authentication (returns a single shared project)
    const shareContext = await getShareLinkContext(req);
    if (shareContext) {
      const { data: sharedProject } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('id', shareContext.projectId)
        .maybeSingle();

      if (!sharedProject) {
        return NextResponse.json({ projects: [], my_projects: [], shared_with_me: [], public: true }, { status: 200 });
      }

      const enriched = await hydrateProjectsWithTeamMembers([sharedProject]);
      return NextResponse.json({
        my_projects: [],
        shared_with_me: enriched.map(p => ({ ...p, is_shared: true, share_role: shareContext.role, project_role: shareContext.role })),
        projects: enriched.map(p => ({ ...p, is_shared: true, share_role: shareContext.role, project_role: shareContext.role })),
        public: true,
        share: { role: shareContext.role }
      }, { status: 200 });
    }

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      if (isDev) console.log('[GET /api/projects] Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    const userId = auth.userId;
    if (isDev) console.log('[GET /api/projects] Authenticated user:', userId);

    if (!isUuid(userId)) {
      return NextResponse.json({
        my_projects: [],
        shared_with_me: [],
        projects: [],
        public: true,
      }, { status: 200 });
    }

    // Fetch owned projects
    const ownedProjects = await getOwnedProjects(userId);
    if (isDev) console.log('[GET /api/projects] Found', ownedProjects.length, 'owned projects');

    // Fetch shared projects
    const ownedProjectIds = ownedProjects.map(p => p.id);
    const sharedProjects = await getSharedProjects(userId, ownedProjectIds);
    if (isDev) console.log('[GET /api/projects] Found', sharedProjects.length, 'shared projects');

    // Hydrate with team member info
    const myProjectsHydrated = await hydrateProjectsWithTeamMembers(ownedProjects);
    const sharedProjectsHydrated = await hydrateProjectsWithTeamMembers(sharedProjects);

    // Combine for backward compatibility
    const allProjects = [...myProjectsHydrated, ...sharedProjectsHydrated];

    // Compute roles for current user across projects
    const allProjectIds = allProjects.map(p => p.id);
    const { data: membershipRows } = await supabaseAdmin
      .from('project_members')
      .select('project_id, role')
      .eq('member_id', userId)
      .in('project_id', allProjectIds);

    const roleByProject = new Map<string, string>();
    (membershipRows || []).forEach((row: any) => {
      if (row?.project_id) roleByProject.set(row.project_id, row.role || '');
    });

    const teamIds = Array.from(new Set(allProjects.map(p => p.team_id).filter(Boolean))) as string[];
    const teamRoleByTeam = new Map<string, string>();
    if (teamIds.length > 0) {
      const { data: teamRows } = await supabaseAdmin
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', userId)
        .in('team_id', teamIds);
      (teamRows || []).forEach((row: any) => {
        if (row?.team_id) teamRoleByTeam.set(row.team_id, row.role || '');
      });
    }

    const attachRole = (project: any) => {
      if (project.owner_id === userId) return { ...project, project_role: 'owner' };
      const projectRole = normalizeRole(roleByProject.get(project.id) || '');
      if (projectRole) return { ...project, project_role: projectRole };
      const teamRole = normalizeRole(teamRoleByTeam.get(project.team_id || '') || '');
      return { ...project, project_role: teamRole || null };
    };

    const myProjectsWithRole = myProjectsHydrated.map(attachRole);
    const sharedProjectsWithRole = sharedProjectsHydrated.map(attachRole);
    const allProjectsWithRole = [...myProjectsWithRole, ...sharedProjectsWithRole];

    return NextResponse.json({
        my_projects: myProjectsWithRole,
        shared_with_me: sharedProjectsWithRole,
        projects: allProjectsWithRole, // Backward compatibility
    }, { status: 200 });

  } catch (err: any) {
    console.error('[GET /api/projects] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 *
 * Creates a new project
 * Requires: Authentication
 * Body: { name: string, description?: string, team_id?: string }
 * Returns: { project: Project }
 */
export async function POST(req: NextRequest) {
  try {
    if (isDev) console.log('[POST /api/projects] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      if (isDev) console.log('[POST /api/projects] Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    // Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch (err) {
      console.error('[POST /api/projects] Invalid JSON:', err);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    let teamId = typeof body.team_id === 'string' ? body.team_id : 'auto';

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Handle auto team assignment
    if (teamId === 'auto') {
      if (isDev) console.log('[POST /api/projects] Auto-assigning team');

      // Find user's first team
      const { data: userTeams } = await supabaseAdmin
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (userTeams?.team_id) {
        teamId = userTeams.team_id;
        if (isDev) console.log('[POST /api/projects] Using existing team:', teamId);
      } else {
        // Create personal workspace
        const { data: newTeam, error: teamError } = await supabaseAdmin
          .from('teams')
          .insert({
            name: 'My Workspace',
            owner_id: userId
          })
          .select()
          .single();

        if (teamError) {
          console.error('[POST /api/projects] Error creating team:', teamError);
          return NextResponse.json(
            { error: 'Failed to create workspace' },
            { status: 500 }
          );
        }

        teamId = newTeam.id;
        if (isDev) console.log('[POST /api/projects] Created new team:', teamId);

        // Add user as team member
        await supabaseAdmin
          .from('team_members')
          .insert({
            team_id: teamId,
            user_id: userId,
            role: 'owner'
          });
      }
    }

    // Create project
    const { data: project, error: createError } = await supabaseAdmin
      .from('projects')
      .insert({
        name,
        description: description || null,
        team_id: teamId,
        owner_id: userId
      })
      .select()
      .single();

    if (createError) {
      console.error('[POST /api/projects] Error creating project:', createError);
      return NextResponse.json(
        { error: `Failed to create project: ${createError.message}` },
        { status: 500 }
      );
    }

    // Add creator as project member
    try {
      await supabaseAdmin
        .from('project_members')
        .upsert({
          project_id: project.id,
          member_id: userId,
          role: 'owner',
          added_by: userId
        }, {
          onConflict: 'project_id,member_id'
        });
    } catch (err) {
      console.warn('[POST /api/projects] Warning adding project membership:', err);
    }

    if (isDev) console.log('[POST /api/projects] Project created:', project.id);
    return NextResponse.json({ project }, { status: 201 });

  } catch (err: any) {
    console.error('[POST /api/projects] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects
 *
 * Updates a project's name or description
 * Requires: Authentication + ownership permission
 * Body: { id: string, name?: string, description?: string }
 * Returns: { project: Project }
 */
export async function PATCH(req: NextRequest) {
  try {
    if (isDev) console.log('[PATCH /api/projects] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      if (isDev) console.log('[PATCH /api/projects] Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    // Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch (err) {
      console.error('[PATCH /api/projects] Invalid JSON:', err);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const projectId = typeof body.id === 'string' ? body.id.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : null;
    const description = typeof body.description === 'string' ? body.description.trim() : null;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // SECURITY: Only owners can rename projects (not editors)
    const isOwner = await isProjectOwner(userId, projectId);
    if (!isOwner) {
      if (isDev) console.log('[PATCH /api/projects] User not authorized to rename project - not owner');
      return NextResponse.json(
        { error: 'Forbidden - only the project owner can rename the project' },
        { status: 403 }
      );
    }

    // Build update object
    const updates: any = {};
    if (name !== null) updates.name = name;
    if (description !== null) updates.description = description;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Nothing to update' },
        { status: 400 }
      );
    }

    // Update project
    const { data: project, error: updateError } = await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('[PATCH /api/projects] Error updating project:', updateError);
      return NextResponse.json(
        { error: `Failed to update project: ${updateError.message}` },
        { status: 500 }
      );
    }

    if (isDev) console.log('[PATCH /api/projects] Project updated:', projectId);
    return NextResponse.json({ project }, { status: 200 });

  } catch (err: any) {
    console.error('[PATCH /api/projects] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects
 *
 * Deletes a project
 * Requires: Authentication + ownership permission
 * Query: ?id=<project_id> OR Body: { id: string }
 * Returns: { success: true }
 */
export async function DELETE(req: NextRequest) {
  try {
    if (isDev) console.log('[DELETE /api/projects] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      if (isDev) console.log('[DELETE /api/projects] Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    // Get project ID from query or body
    const url = new URL(req.url);
    let projectId = url.searchParams.get('id') || '';

    if (!projectId) {
      try {
        const body = await req.json();
        projectId = typeof body.id === 'string' ? body.id.trim() : '';
      } catch {
        // Body parsing failed, continue with empty projectId
      }
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // SECURITY: Only owners can delete projects (not editors)
    const isOwner = await isProjectOwner(userId, projectId);
    if (!isOwner) {
      if (isDev) console.log('[DELETE /api/projects] User not authorized to delete project - not owner');
      return NextResponse.json(
        { error: 'Forbidden - only the project owner can delete the project' },
        { status: 403 }
      );
    }

    // Delete project (cascade will handle related records)
    const { error: deleteError } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      console.error('[DELETE /api/projects] Error deleting project:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete project: ${deleteError.message}` },
        { status: 500 }
      );
    }

    if (isDev) console.log('[DELETE /api/projects] Project deleted:', projectId);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    console.error('[DELETE /api/projects] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
