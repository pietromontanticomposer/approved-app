// app/api/cues/route.ts
/**
 * Cues API Route
 *
 * Secure implementation with:
 * - Server-side authentication verification
 * - Project access authorization checks
 * - Input validation
 * - Error handling
 * - Type safety
 */

import { NextResponse, NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth, canAccessProject, canModifyProject } from '@/lib/auth';

const isDev = process.env.NODE_ENV !== "production";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * GET /api/cues?projectId=xxx
 *
 * Returns cues for a project
 * Requires: Authentication + project access
 * Returns: { cues: Cue[] }
 */
export async function GET(req: NextRequest) {
  try {
    if (isDev) console.log('[GET /api/cues] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      if (isDev) console.log('[GET /api/cues] Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    if (!isUuid(projectId)) {
      return NextResponse.json(
        { error: 'projectId must be a valid UUID' },
        { status: 400 }
      );
    }

    // SECURITY: Check if user has access to this project
    const hasAccess = await canAccessProject(userId, projectId);
    if (!hasAccess) {
      if (isDev) console.log('[GET /api/cues] User does not have access to project');
      return NextResponse.json(
        { error: 'Forbidden - you do not have access to this project' },
        { status: 403 }
      );
    }

    // Fetch cues
    const { data: cues, error } = await supabaseAdmin
      .from("cues")
      .select('*')
      .eq("project_id", projectId)
      .order("index_in_project", { ascending: true });

    if (error) {
      console.error("[GET /api/cues] Error fetching cues:", error);
      return NextResponse.json(
        { error: `Failed to fetch cues: ${error.message}` },
        { status: 500 }
      );
    }

    if (isDev) console.log('[GET /api/cues] Found', cues?.length || 0, 'cues for project', projectId);
    return NextResponse.json({ cues: cues || [] }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error("[GET /api/cues] Error:", err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cues
 *
 * Creates a new cue in a project
 * Requires: Authentication + project modify permission
 * Body: { project_id: string, cue: { name, index, status, ... } }
 * Returns: { cue: Cue, cueId: string }
 */
export async function POST(req: NextRequest) {
  try {
    if (isDev) console.log('[POST /api/cues] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      if (isDev) console.log('[POST /api/cues] Unauthorized request');
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
      console.error('[POST /api/cues] Invalid JSON:', err);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { project_id, cue } = body;

    if (!project_id || !cue) {
      return NextResponse.json(
        { error: "project_id and cue are required" },
        { status: 400 }
      );
    }

    if (!isUuid(project_id)) {
      return NextResponse.json(
        { error: "project_id must be a valid UUID" },
        { status: 400 }
      );
    }

    // SECURITY: Check if user can modify this project
    const canModify = await canModifyProject(userId, project_id);
    if (!canModify) {
      if (isDev) console.log('[POST /api/cues] User not authorized to modify project');
      return NextResponse.json(
        { error: 'Forbidden - you do not have permission to modify this project' },
        { status: 403 }
      );
    }

    // Use client-provided ID if valid UUID, otherwise generate new one
    const cue_id = cue.id && isUuid(cue.id) ? cue.id : uuidv4();

    const buildCuePayload = (includeMax: boolean) => {
      const payload: any = {
        id: cue_id,
        project_id,
        index_in_project: typeof cue.index === 'number' ? cue.index : 0,
        original_name: cue.originalName || null,
        name: cue.name || null,
        display_name: cue.displayName || null,
        status: cue.status || "in_review",
      };
      if (includeMax) {
        payload.max_revisions = typeof cue.max_revisions === "number" ? cue.max_revisions : null;
      }
      return payload;
    };

    const insertCue = async (includeMax: boolean) => {
      return supabaseAdmin
        .from("cues")
        .insert(buildCuePayload(includeMax))
        .select()
        .single();
    };

    // Create cue (retry without max_revisions if schema cache is outdated)
    let { data, error } = await insertCue(true);
    if (error && error.message && error.message.includes("max_revisions")) {
      console.warn("[POST /api/cues] max_revisions missing, retrying without column");
      const retry = await insertCue(false);
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("[POST /api/cues] Error creating cue:", error);
      return NextResponse.json(
        { error: `Failed to create cue: ${error.message}` },
        { status: 500 }
      );
    }

    if (isDev) console.log("[POST /api/cues] Cue created:", cue_id);
    return NextResponse.json({ cue: data, cueId: cue_id }, { status: 201 });

  } catch (err: any) {
    console.error("[POST /api/cues] Error:", err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cues
 *
 * Updates a cue's name or status
 * Requires: Authentication + project modify permission
 * Body: { id: string, name?: string, status?: string }
 * Returns: { cue: Cue }
 */
export async function PATCH(req: NextRequest) {
  try {
    if (isDev) console.log('[PATCH /api/cues] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      if (isDev) console.log('[PATCH /api/cues] Unauthorized request');
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
      console.error('[PATCH /api/cues] Invalid JSON:', err);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { id, name, status, index_in_project } = body;

    if (!id || !isUuid(id)) {
      return NextResponse.json(
        { error: "Valid cue id is required" },
        { status: 400 }
      );
    }

    // Fetch cue to check project access
    const { data: existingCue, error: fetchError } = await supabaseAdmin
      .from("cues")
      .select('id, project_id')
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("[PATCH /api/cues] Error fetching cue:", fetchError);
      return NextResponse.json(
        { error: `Failed to fetch cue: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!existingCue) {
      return NextResponse.json(
        { error: 'Cue not found' },
        { status: 404 }
      );
    }

    // SECURITY: Check if user can modify the project this cue belongs to
    const canModify = await canModifyProject(userId, existingCue.project_id);
    if (!canModify) {
      if (isDev) console.log('[PATCH /api/cues] User not authorized to modify project');
      return NextResponse.json(
        { error: 'Forbidden - you do not have permission to modify this cue' },
        { status: 403 }
      );
    }

    // Build update object
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    if (index_in_project !== undefined) {
      const idxNum = Number(index_in_project);
      if (!Number.isFinite(idxNum) || idxNum < 0) {
        return NextResponse.json(
          { error: "index_in_project must be a non-negative number" },
          { status: 400 }
        );
      }
      updates.index_in_project = idxNum;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Update cue
    const { data, error } = await supabaseAdmin
      .from("cues")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/cues] Error updating cue:", error);
      return NextResponse.json(
        { error: `Failed to update cue: ${error.message}` },
        { status: 500 }
      );
    }

    if (isDev) console.log("[PATCH /api/cues] Cue updated:", id);
    return NextResponse.json({ cue: data }, { status: 200 });

  } catch (err: any) {
    console.error("[PATCH /api/cues] Error:", err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cues?id=xxx
 *
 * Deletes a cue and all its versions (cascade)
 * Requires: Authentication + project modify permission
 * Query: ?id=<cue_id>
 * Returns: { success: true }
 */
export async function DELETE(req: NextRequest) {
  try {
    if (isDev) console.log('[DELETE /api/cues] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      if (isDev) console.log('[DELETE /api/cues] Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    const userId = auth.userId;

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id || !isUuid(id)) {
      return NextResponse.json(
        { error: "Valid cue id is required" },
        { status: 400 }
      );
    }

    // Fetch cue to check project access
    const { data: existingCue, error: fetchError } = await supabaseAdmin
      .from("cues")
      .select('id, project_id')
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("[DELETE /api/cues] Error fetching cue:", fetchError);
      return NextResponse.json(
        { error: `Failed to fetch cue: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!existingCue) {
      return NextResponse.json(
        { error: 'Cue not found' },
        { status: 404 }
      );
    }

    // SECURITY: Check if user can modify the project this cue belongs to
    const canModify = await canModifyProject(userId, existingCue.project_id);
    if (!canModify) {
      if (isDev) console.log('[DELETE /api/cues] User not authorized to modify project');
      return NextResponse.json(
        { error: 'Forbidden - you do not have permission to delete this cue' },
        { status: 403 }
      );
    }

    // Delete all versions of this cue first
    const { error: versionsError } = await supabaseAdmin
      .from("versions")
      .delete()
      .eq("cue_id", id);

    if (versionsError) {
      console.error("[DELETE /api/cues] Error deleting versions:", versionsError);
      return NextResponse.json(
        { error: `Failed to delete cue versions: ${versionsError.message}` },
        { status: 500 }
      );
    }

    // Delete the cue
    const { error } = await supabaseAdmin
      .from("cues")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[DELETE /api/cues] Error deleting cue:", error);
      return NextResponse.json(
        { error: `Failed to delete cue: ${error.message}` },
        { status: 500 }
      );
    }

    if (isDev) console.log("[DELETE /api/cues] Cue deleted:", id);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    console.error("[DELETE /api/cues] Error:", err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
