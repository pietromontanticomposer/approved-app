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
import { isUuid } from '@/lib/validation';

const isDev = process.env.NODE_ENV !== "production";

/**
 * Get user display name from auth metadata
 */
async function getUserDisplayName(userId: string): Promise<string | null> {
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

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      if (isDev) console.log('[GET /api/comments] Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

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
 * Body: { version_id: string, time_seconds: number, text: string, author?: string }
 * Returns: { comment: Comment }
 */
export async function POST(req: NextRequest) {
  try {
    if (isDev) console.log('[POST /api/comments] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      if (isDev) console.log('[POST /api/comments] Unauthorized request');
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
      console.error('[POST /api/comments] Invalid JSON:', err);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { version_id, time_seconds, author, text, audio_url } = body;

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

    // Determine author name
    let authorName = typeof author === 'string' ? author.trim() : null;
    if (!authorName) {
      authorName = await getUserDisplayName(userId);
    }

    const comment_id = uuidv4();

    // Insert comment with verified actor_id
    const { data, error: insertError } = await supabaseAdmin
      .from("comments")
      .insert({
        id: comment_id,
        version_id,
        time_seconds,
        author: authorName || "User",
        actor_id: userId, // Verified server-side
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

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      if (isDev) console.log('[PATCH /api/comments] Unauthorized request');
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
      .select('id, actor_id')
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

    // Check if comment has actor_id set
    if (!existing.actor_id) {
      return NextResponse.json(
        { error: "Comment does not have an actor_id; backfill required to enable editing" },
        { status: 403 }
      );
    }

    // Check ownership
    if (existing.actor_id !== userId) {
      if (isDev) console.log('[PATCH /api/comments] User not authorized to edit comment');
      return NextResponse.json(
        { error: 'Forbidden - you do not have permission to edit this comment' },
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

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      if (isDev) console.log('[DELETE /api/comments] Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    const userId = auth.userId;

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

    // SECURITY: Fetch comment and check ownership
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('comments')
      .select('id, actor_id')
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

    // Check if comment has actor_id set
    if (!existing.actor_id) {
      return NextResponse.json(
        { error: "Comment does not have an actor_id; backfill required to enable deletion" },
        { status: 403 }
      );
    }

    // Check ownership
    if (existing.actor_id !== userId) {
      if (isDev) console.log('[DELETE /api/comments] User not authorized to delete comment');
      return NextResponse.json(
        { error: 'Forbidden - you do not have permission to delete this comment' },
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
