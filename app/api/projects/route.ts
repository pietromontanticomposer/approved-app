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
import { verifyAuth, canModifyProject } from '@/lib/auth';

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

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

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
  const [membershipResult, teamResult] = await Promise.all([
    supabaseAdmin
      .from('project_members')
      .select('project_id')
      .eq('member_id', userId),
    supabaseAdmin
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
  ]);

  if (membershipResult.error) {
    console.error('[Projects] Error loading project memberships:', membershipResult.error);
    throw new Error(`Failed to load project memberships: ${membershipResult.error.message}`);
  }

  if (teamResult.error) {
    console.error('[Projects] Error loading team memberships:', teamResult.error);
    throw new Error(`Failed to load team memberships: ${teamResult.error.message}`);
  }

  const projectIdsFromMembership = (membershipResult.data || [])
    .map((row: any) => row.project_id)
    .filter(Boolean);

  const teamIds = (teamResult.data || []).map((row: any) => row.team_id).filter(Boolean);

  // Get project IDs from teams
  let projectIdsFromTeams: string[] = [];
  if (teamIds.length > 0) {
    const { data: teamProjects, error: teamProjectsError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .in('team_id', teamIds);

    if (teamProjectsError) {
      console.error('[Projects] Error loading team projects:', teamProjectsError);
      throw new Error(`Failed to load team projects: ${teamProjectsError.message}`);
    }

    projectIdsFromTeams = (teamProjects || []).map(p => p.id).filter(Boolean);
  }

  // Combine and deduplicate, excluding owned projects
  const allSharedIds = new Set([...projectIdsFromMembership, ...projectIdsFromTeams]);
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
    console.log('[GET /api/projects] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      console.log('[GET /api/projects] Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    const userId = auth.userId;
    console.log('[GET /api/projects] Authenticated user:', userId);

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
    console.log('[GET /api/projects] Found', ownedProjects.length, 'owned projects');

    // Fetch shared projects
    const ownedProjectIds = ownedProjects.map(p => p.id);
    const sharedProjects = await getSharedProjects(userId, ownedProjectIds);
    console.log('[GET /api/projects] Found', sharedProjects.length, 'shared projects');

    // Hydrate with team member info
    const myProjectsHydrated = await hydrateProjectsWithTeamMembers(ownedProjects);
    const sharedProjectsHydrated = await hydrateProjectsWithTeamMembers(sharedProjects);

    // Combine for backward compatibility
    const allProjects = [...myProjectsHydrated, ...sharedProjectsHydrated];

    return NextResponse.json({
      my_projects: myProjectsHydrated,
      shared_with_me: sharedProjectsHydrated,
      projects: allProjects, // Backward compatibility
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
    console.log('[POST /api/projects] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      console.log('[POST /api/projects] Unauthorized request');
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
      console.log('[POST /api/projects] Auto-assigning team');

      // Find user's first team
      const { data: userTeams } = await supabaseAdmin
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (userTeams?.team_id) {
        teamId = userTeams.team_id;
        console.log('[POST /api/projects] Using existing team:', teamId);
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
        console.log('[POST /api/projects] Created new team:', teamId);

        // Add user as team member
        await supabaseAdmin
          .from('team_members')
          .insert({
            team_id: teamId,
            user_id: userId,
            role: 'admin'
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

    console.log('[POST /api/projects] Project created:', project.id);
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
 * Requires: Authentication + ownership/admin permission
 * Body: { id: string, name?: string, description?: string }
 * Returns: { project: Project }
 */
export async function PATCH(req: NextRequest) {
  try {
    console.log('[PATCH /api/projects] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      console.log('[PATCH /api/projects] Unauthorized request');
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

    // SECURITY: Check if user can modify this project
    const canModify = await canModifyProject(userId, projectId);
    if (!canModify) {
      console.log('[PATCH /api/projects] User not authorized to modify project');
      return NextResponse.json(
        { error: 'Forbidden - you do not have permission to modify this project' },
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

    console.log('[PATCH /api/projects] Project updated:', projectId);
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
 * Requires: Authentication + ownership/admin permission
 * Query: ?id=<project_id> OR Body: { id: string }
 * Returns: { success: true }
 */
export async function DELETE(req: NextRequest) {
  try {
    console.log('[DELETE /api/projects] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      console.log('[DELETE /api/projects] Unauthorized request');
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

    // SECURITY: Check if user can modify this project
    const canModify = await canModifyProject(userId, projectId);
    if (!canModify) {
      console.log('[DELETE /api/projects] User not authorized to delete project');
      return NextResponse.json(
        { error: 'Forbidden - you do not have permission to delete this project' },
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

    console.log('[DELETE /api/projects] Project deleted:', projectId);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    console.error('[DELETE /api/projects] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
