// app/api/comments/route.ts
/**
 * Comments API Route
 *
 * Secure implementation with:
 * - Server-side authentication verification
 * - Proper authorization checks (user can only edit/delete own comments)
 * - Input validation
 * - Error handling
 * - Type safety
 */

import { NextResponse, NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from '@/lib/auth';
import { resolveAccessContext, roleCanAccess, roleCanReview, roleCanModify } from '@/lib/shareAccess';
import { isUuid } from '@/lib/validation';

const isDev = process.env.NODE_ENV !== "production";

/**
 * Get user display name from auth metadata
 */
async function getUserDisplayName(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (!userData?.user?.user_metadata) {
      return null;
    }

    const meta = userData.user.user_metadata as any;
    const first = meta.first_name || meta.firstName || meta.first || '';
    const last = meta.last_name || meta.lastName || meta.last || '';
    const display = meta.display_name || meta.full_name || `${first} ${last}`.trim();

    return display || null;
  } catch (err) {
    console.warn('[Comments] Error fetching user metadata:', err);
    return null;
  }
}

function normalizeVersionStatus(status: string | null | undefined): string {
  if (!status) return "in_review";
  if (status === "in-review") return "in_review";
  if (status === "changes-requested") return "changes_requested";
  return status;
}

async function getVersionCommentContext(versionId: string): Promise<{
  projectId: string | null;
  ownerId: string | null;
  status: string;
}> {
  const { data: version, error: versionErr } = await supabaseAdmin
    .from("versions")
    .select("id, cue_id, status")
    .eq("id", versionId)
    .maybeSingle();

  if (versionErr || !version) {
    return { projectId: null, ownerId: null, status: "in_review" };
  }

  const { data: cue } = await supabaseAdmin
    .from("cues")
    .select("project_id")
    .eq("id", (version as any).cue_id)
    .maybeSingle();

  const projectId = (cue as any)?.project_id || null;
  if (!projectId) {
    return {
      projectId: null,
      ownerId: null,
      status: normalizeVersionStatus((version as any).status)
    };
  }

  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .maybeSingle();

  return {
    projectId,
    ownerId: (project as any)?.owner_id || null,
    status: normalizeVersionStatus((version as any).status)
  };
}

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * GET /api/comments?versionId=xxx
 *
 * Returns comments for a version
 * Requires: Authentication (to ensure user has access to the version/project)
 * Returns: { comments: Comment[] }
 */
export async function GET(req: NextRequest) {
  try {
    if (isDev) console.log('[GET /api/comments] Request started');

    // Auth is optional for share-link access; resolveAccessContext handles validation.

    const url = new URL(req.url);
    const versionId = url.searchParams.get('versionId');

    if (!versionId) {
      return NextResponse.json(
        { error: 'versionId query parameter is required' },
        { status: 400 }
      );
    }

    if (!isUuid(versionId)) {
      return NextResponse.json(
        { error: 'versionId must be a valid UUID' },
        { status: 400 }
      );
    }

    // SECURITY: Verify version belongs to a project the user can access
    const { data: version } = await supabaseAdmin
      .from("versions")
      .select("id, cues(project_id)")
      .eq("id", versionId)
      .single();

    const projectId = (version as any)?.cues?.project_id || null;
    if (!projectId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const access = await resolveAccessContext(req, projectId);
    if (!access || !roleCanAccess(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch comments
    const { data: comments, error } = await supabaseAdmin
      .from("comments")
      .select('*')
      .eq("version_id", versionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/comments] Error:", error);
      return NextResponse.json(
        { error: `Failed to fetch comments: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ comments: comments || [] }, { status: 200 });

  } catch (err: any) {
    console.error("[GET /api/comments] Error:", err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/comments
 *
 * Creates a new comment
 * Requires: Authentication
 * Body: { version_id: string, time_seconds: number, text: string, author?: string, parent_comment_id?: string | null }
 * Returns: { comment: Comment }
 */
export async function POST(req: NextRequest) {
  try {
    if (isDev) console.log('[POST /api/comments] Request started');

    const auth = await verifyAuth(req);
    const userId = auth?.userId || null;

    // Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch (err) {
      console.error('[POST /api/comments] Invalid JSON:', err);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const {
      version_id,
      time_seconds,
      author,
      text,
      audio_url,
      parent_comment_id
    } = body;

    // Validate required fields (text can be empty for voice comments)
    if (!version_id || time_seconds === undefined) {
      return NextResponse.json(
        { error: "version_id and time_seconds are required" },
        { status: 400 }
      );
    }

    // Either text or audio_url must be provided
    if (!text && !audio_url) {
      return NextResponse.json(
        { error: "Either text or audio_url is required" },
        { status: 400 }
      );
    }

    if (!isUuid(version_id)) {
      return NextResponse.json(
        { error: "version_id must be a valid UUID" },
        { status: 400 }
      );
    }

    if (typeof time_seconds !== 'number' || time_seconds < 0) {
      return NextResponse.json(
        { error: "time_seconds must be a non-negative number" },
        { status: 400 }
      );
    }

    // Validate text if provided
    if (text && typeof text !== 'string') {
      return NextResponse.json(
        { error: "text must be a string" },
        { status: 400 }
      );
    }

    // Validate audio_url if provided
    if (audio_url && typeof audio_url !== 'string') {
      return NextResponse.json(
        { error: "audio_url must be a string" },
        { status: 400 }
      );
    }

    if (parent_comment_id !== undefined && parent_comment_id !== null && !isUuid(parent_comment_id)) {
      return NextResponse.json(
        { error: "parent_comment_id must be a valid UUID when provided" },
        { status: 400 }
      );
    }

    const versionContext = await getVersionCommentContext(version_id);
    const projectId = versionContext.projectId;
    if (!projectId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const access = await resolveAccessContext(req, projectId);
    if (!access || !roleCanReview(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isInternalReviewer =
      access.source === 'user' &&
      (roleCanModify(access.role) || (!!versionContext.ownerId && access.userId === versionContext.ownerId));
    const isReply = !!parent_comment_id;

    if (!isReply) {
      if (versionContext.status !== "in_review") {
        return NextResponse.json(
          { error: "New comments are closed for this version" },
          { status: 403 }
        );
      }
    } else {
      const { data: parentComment, error: parentErr } = await supabaseAdmin
        .from("comments")
        .select("id, version_id, actor_id, parent_comment_id")
        .eq("id", parent_comment_id)
        .maybeSingle();

      if (parentErr) {
        return NextResponse.json(
          { error: `Failed to load parent comment: ${parentErr.message}` },
          { status: 500 }
        );
      }

      if (!parentComment || parentComment.version_id !== version_id) {
        return NextResponse.json(
          { error: "Parent comment is invalid for this version" },
          { status: 400 }
        );
      }

      if (versionContext.status === "review_completed") {
        const parentIsOwnerReply =
          !!versionContext.ownerId &&
          parentComment.actor_id === versionContext.ownerId &&
          !!parentComment.parent_comment_id;

        if (!isInternalReviewer && !parentIsOwnerReply) {
          return NextResponse.json(
            { error: "You can only reply to owner responses on this version" },
            { status: 403 }
          );
        }
      } else if (versionContext.status !== "in_review") {
        return NextResponse.json(
          { error: "Replies are closed for this version" },
          { status: 403 }
        );
      }
    }

    // Determine author name and actor based on access source
    let authorName = typeof author === 'string' ? author.trim() : null;
    let actorId: string | null = null;
    let guestSessionId: string | null = null;

    if (access.source === 'guest') {
      // Guest: use nickname from session
      authorName = authorName || access.guestNickname || 'Guest';
      actorId = null;
      guestSessionId = access.guestSessionId || null;
    } else if (access.source === 'user' && access.userId) {
      // Authenticated user
      actorId = isUuid(access.userId) ? access.userId : null;
      if (!authorName) {
        authorName = await getUserDisplayName(access.userId);
      }
    } else {
      // Fallback for share link access
      if (!authorName && userId) {
        authorName = await getUserDisplayName(userId);
      }
      actorId = isUuid(userId || '') ? userId : null;
    }

    const comment_id = uuidv4();

    // Insert comment
    const { data, error: insertError } = await supabaseAdmin
      .from("comments")
      .insert({
        id: comment_id,
        version_id,
        time_seconds,
        author: authorName || "User",
        actor_id: actorId,
        guest_session_id: guestSessionId,
        parent_comment_id: parent_comment_id || null,
        text: text ? text.trim() : '',
        audio_url: audio_url || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/comments] Error creating comment:', insertError);
      return NextResponse.json(
        { error: `Failed to create comment: ${insertError.message}` },
        { status: 500 }
      );
    }

    if (isDev) console.log('[POST /api/comments] Comment created:', comment_id);
    return NextResponse.json({ comment: data }, { status: 201 });

  } catch (err: any) {
    console.error("[POST /api/comments] Error:", err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/comments
 *
 * Updates a comment's text
 * Requires: Authentication + ownership (user must be comment author)
 * Body: { id: string, text: string }
 * Returns: { comment: Comment }
 */
export async function PATCH(req: NextRequest) {
  try {
    if (isDev) console.log('[PATCH /api/comments] Request started');

    const auth = await verifyAuth(req);
    const userId = auth?.userId || null;

    // Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch (err) {
      console.error('[PATCH /api/comments] Invalid JSON:', err);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { id, text } = body;

    if (!id || !text) {
      return NextResponse.json(
        { error: "id and text are required" },
        { status: 400 }
      );
    }

    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "id must be a valid UUID" },
        { status: 400 }
      );
    }

    if (typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: "text must be a non-empty string" },
        { status: 400 }
      );
    }

    // SECURITY: Fetch comment and check ownership
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('comments')
      .select('id, actor_id, guest_session_id, version_id, versions(cue_id, cues(project_id))')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      console.error('[PATCH /api/comments] Error fetching comment:', fetchErr);
      return NextResponse.json(
        { error: `Failed to fetch comment: ${fetchErr.message}` },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    const projectId = (existing as any)?.versions?.cues?.project_id || null;
    if (!projectId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const access = await resolveAccessContext(req, projectId);
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const versionContext = await getVersionCommentContext(existing.version_id);
    const isInternalUser =
      access.source === 'user' &&
      (roleCanModify(access.role) || (!!versionContext.ownerId && access.userId === versionContext.ownerId));
    const activeUserId = access.source === 'user' ? access.userId : userId;
    const isUserAuthor = existing.actor_id && activeUserId && existing.actor_id === activeUserId;
    const isGuestAuthor = access.source === 'guest' && existing.guest_session_id && access.guestSessionId === existing.guest_session_id;
    if (!isInternalUser && !isUserAuthor && !isGuestAuthor) {
      if (isDev) console.log('[PATCH /api/comments] User not authorized to edit comment');
      return NextResponse.json(
        { error: 'Forbidden - you do not have permission to edit this comment' },
        { status: 403 }
      );
    }

    if (!isInternalUser && versionContext.status !== 'in_review') {
      return NextResponse.json(
        { error: 'Comments can no longer be edited on this version' },
        { status: 403 }
      );
    }

    // Update comment
    const { data, error: updateError } = await supabaseAdmin
      .from("comments")
      .update({ text: text.trim() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[PATCH /api/comments] Error updating comment:", updateError);
      return NextResponse.json(
        { error: `Failed to update comment: ${updateError.message}` },
        { status: 500 }
      );
    }

    if (isDev) console.log('[PATCH /api/comments] Comment updated:', id);
    return NextResponse.json({ comment: data }, { status: 200 });

  } catch (err: any) {
    console.error("[PATCH /api/comments] Error:", err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/comments?id=xxx
 *
 * Deletes a comment
 * Requires: Authentication + ownership (user must be comment author)
 * Query: ?id=<comment_id>
 * Returns: { success: true }
 */
export async function DELETE(req: NextRequest) {
  try {
    if (isDev) console.log('[DELETE /api/comments] Request started');

    const auth = await verifyAuth(req);
    const userId = auth?.userId || null;

    // Get comment ID from query
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "id must be a valid UUID" },
        { status: 400 }
      );
    }

    // SECURITY: Fetch comment with version status and project owner in a single query
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('comments')
      .select('id, actor_id, guest_session_id, version_id, versions(status, cue_id, cues(project_id, projects(owner_id)))')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      console.error('[DELETE /api/comments] Error fetching comment:', fetchErr);
      return NextResponse.json(
        { error: `Failed to fetch comment: ${fetchErr.message}` },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    const versionData = (existing as any)?.versions;
    const projectId = versionData?.cues?.project_id || null;
    if (!projectId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ownerId = versionData?.cues?.projects?.owner_id || null;
    const versionStatus = normalizeVersionStatus(versionData?.status);

    const access = await resolveAccessContext(req, projectId);
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isInternalUser =
      access.source === 'user' &&
      (roleCanModify(access.role) || (!!ownerId && access.userId === ownerId));
    const activeUserId = access.source === 'user' ? access.userId : userId;
    const isUserAuthor = existing.actor_id && activeUserId && existing.actor_id === activeUserId;
    const isGuestAuthor = access.source === 'guest' && existing.guest_session_id && access.guestSessionId === existing.guest_session_id;
    if (!isInternalUser && !isUserAuthor && !isGuestAuthor) {
      if (isDev) console.log('[DELETE /api/comments] User not authorized to delete comment');
      return NextResponse.json(
        { error: 'Forbidden - you do not have permission to delete this comment' },
        { status: 403 }
      );
    }

    if (!isInternalUser && versionStatus !== 'in_review') {
      return NextResponse.json(
        { error: 'Comments can no longer be deleted on this version' },
        { status: 403 }
      );
    }

    // Delete comment
    const { error: deleteError } = await supabaseAdmin
      .from("comments")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[DELETE /api/comments] Error deleting comment:", deleteError);
      return NextResponse.json(
        { error: `Failed to delete comment: ${deleteError.message}` },
        { status: 500 }
      );
    }

    if (isDev) console.log('[DELETE /api/comments] Comment deleted:', id);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    console.error("[DELETE /api/comments] Error:", err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
