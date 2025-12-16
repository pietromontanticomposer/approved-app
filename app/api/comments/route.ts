// app/api/comments/route.ts
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveActorId } from '@/lib/actorResolver';

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

/**
 * GET /api/comments?versionId=xxx
 * Ritorna commenti di una versione
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const versionId = url.searchParams.get('versionId');

    if (!versionId) {
      return NextResponse.json({ error: 'versionId required' }, { status: 400 });
    }

    const { data: comments, error } = await supabaseAdmin
      .from("comments")
      .select('*')
      .eq("version_id", versionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/comments] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: comments || [] }, { status: 200 });
  } catch (err: any) {
    console.error("[GET /api/comments] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[POST /api/comments] incoming body:', body);
    const { version_id, time_seconds, author, text } = body;

    if (!version_id || time_seconds === undefined || !text) {
      return NextResponse.json(
        { error: "version_id, time_seconds, and text are required" },
        { status: 400 }
      );
    }

    if (!isUuid(version_id)) {
      return NextResponse.json(
        { error: "version_id must be a UUID" },
        { status: 400 }
      );
    }

    // Derive author: prefer explicit body author, but always try to resolve
    // actor id from headers when available so we can persist ownership.
    let authorName = author || null;
    let resolvedActorUid: string | null = null;
    try {
      const actorHeader = (req as any).headers?.get
        ? req.headers.get('x-actor-id') || req.headers.get('x-actor') || null
        : null;

      const candidate = actorHeader || null;
      if (candidate) {
        const resolvedUid = await resolveActorId(candidate);
        if (resolvedUid) {
          resolvedActorUid = resolvedUid;
          // If author wasn't provided, try to derive it from user metadata
          if (!authorName) {
            try {
              const { data: userRow } = await supabaseAdmin
                .from('auth.users')
                .select('id, user_metadata')
                .eq('id', resolvedUid)
                .maybeSingle();

              if (userRow && userRow.user_metadata) {
                const meta = userRow.user_metadata as any;
                const first = meta.first_name || meta.firstName || meta.first || '';
                const last = meta.last_name || meta.lastName || meta.last || '';
                const display = meta.display_name || meta.full_name || `${first} ${last}`.trim();
                if (display) authorName = display;
              }
            } catch (e) {
              // ignore user lookup errors; we'll fall back later
            }
          }
        }
      }
    } catch (e) {
      // ignore resolution errors
    }

    const comment_id = uuidv4();

    // Debug: log incoming actor header and resolved UID to help diagnose null actor_id
    try {
      const actorHeaderDbg = (req as any).headers?.get ? req.headers.get('x-actor-id') || req.headers.get('x-actor') || null : null;
      console.log('[POST /api/comments] actor header:', actorHeaderDbg, 'resolvedActorUid (pre-insert):', resolvedActorUid);
    } catch (e) {
      // ignore
    }

    // Try inserting including actor_id; if the DB schema doesn't yet contain
    // actor_id (eg. dev instance without latest migrations) retry without it.
    let data: any = null;
    let insertError: any = null;
    try {
      const res = await supabaseAdmin
        .from("comments")
        .insert({
          id: comment_id,
          version_id,
          time_seconds,
          author: authorName || "Client",
          actor_id: resolvedActorUid,
          text,
        })
        .select()
        .single();
      data = res.data;
      insertError = res.error;
    } catch (e: any) {
      insertError = e;
    }

    // If the insert failed due to missing actor_id column in schema cache,
    // retry without actor_id to keep older deployments working.
    if (insertError) {
      const msg = (insertError && (insertError.message || insertError.error_description || String(insertError))) || '';
      if (msg.toLowerCase().includes('actor_id') || msg.toLowerCase().includes('schema cache')) {
        try {
          const res2 = await supabaseAdmin
            .from('comments')
            .insert({
              id: comment_id,
              version_id,
              time_seconds,
              author: authorName || 'Client',
              text,
            })
            .select()
            .single();
          data = res2.data;
          insertError = res2.error;
        } catch (e2: any) {
          insertError = e2;
        }
      }
    }

    if (insertError) {
      console.error('[POST /api/comments] Supabase error', insertError);
      return NextResponse.json({ error: insertError.message || JSON.stringify(insertError) }, { status: 500 });
    }

    console.log('[POST /api/comments] inserted comment:', data);

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/comments] Error", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, text } = body;

    if (!id || !text) {
      return NextResponse.json(
        { error: "id and text are required" },
        { status: 400 }
      );
    }

    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "id must be a UUID" },
        { status: 400 }
      );
    }

    // Resolve actor id from header for authorization
    const actorHeader = (req as any).headers?.get ? req.headers.get('x-actor-id') || req.headers.get('x-actor') || null : null;
    const resolvedUid = actorHeader ? await resolveActorId(actorHeader) : null;

    // Fetch the comment to check ownership
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('comments')
      .select('id, actor_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      console.error('[PATCH /api/comments] Error fetching comment', fetchErr);
      return NextResponse.json({ error: fetchErr.message || 'Error fetching comment' }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // If actor_id is not set on the comment, require migration/backfill
    if (!existing.actor_id) {
      return NextResponse.json({ error: "Comment does not have an actor_id; run migrations/backfill to enable edits/deletes" }, { status: 403 });
    }

    if (!resolvedUid || resolvedUid !== existing.actor_id) {
      return NextResponse.json({ error: 'Not authorized to edit this comment' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("comments")
      .update({ text })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/comments] Supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comment: data }, { status: 200 });
  } catch (err: any) {
    console.error("[PATCH /api/comments] Error", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
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
        { error: "id must be a UUID" },
        { status: 400 }
      );
    }

    // Resolve actor id from header for authorization
    const actorHeader = (req as any).headers?.get ? req.headers.get('x-actor-id') || req.headers.get('x-actor') || null : null;
    const resolvedUid = actorHeader ? await resolveActorId(actorHeader) : null;

    // Fetch the comment to check ownership
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('comments')
      .select('id, actor_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) {
      console.error('[DELETE /api/comments] Error fetching comment', fetchErr);
      return NextResponse.json({ error: fetchErr.message || 'Error fetching comment' }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (!existing.actor_id) {
      return NextResponse.json({ error: "Comment does not have an actor_id; run migrations/backfill to enable edits/deletes" }, { status: 403 });
    }

    if (!resolvedUid || resolvedUid !== existing.actor_id) {
      return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("comments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[DELETE /api/comments] Supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("[DELETE /api/comments] Error", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
