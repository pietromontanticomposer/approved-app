import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth, canAccessProject, canModifyProject } from "@/lib/auth";

const isUuid = (value: string | null) =>
  !!value &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

function mapNoteRow(row: any) {
  return {
    id: row.id,
    project_id: row.project_id,
    cue_id: row.cue_id,
    body: row.body,
    type: row.type || (row.cue_id ? "cue" : "general"),
    author_id: row.author_id,
    author_name: row.author_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");

    if (!isUuid(projectId)) {
      return NextResponse.json(
        { error: "Valid projectId is required" },
        { status: 400 }
      );
    }

    const canAccess = await canAccessProject(auth.userId, projectId!);
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("project_notes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/notes] Supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notes: (data || []).map(mapNoteRow) });
  } catch (err: any) {
    console.error("[GET /api/notes] Exception", err);
    return NextResponse.json(
      { error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const projectId = body?.projectId || body?.project_id || null;
    const cueId = body?.cueId || body?.cue_id || null;
    const content = typeof body?.body === "string" ? body.body : body?.text;
    const authorName =
      typeof body?.authorName === "string" && body.authorName.trim()
        ? body.authorName.trim()
        : null;

    if (!isUuid(projectId)) {
      return NextResponse.json(
        { error: "Valid projectId is required" },
        { status: 400 }
      );
    }

    if (cueId && !isUuid(cueId)) {
      return NextResponse.json(
        { error: "cueId must be a valid UUID" },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Note body is required" },
        { status: 400 }
      );
    }

    const canModify = await canModifyProject(auth.userId, projectId);
    if (!canModify) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const noteToInsert = {
      project_id: projectId,
      cue_id: cueId || null,
      body: content.trim(),
      type: cueId ? "cue" : "general",
      author_id: auth.userId,
      author_name: authorName || auth.userEmail || "User",
    };

    const { data, error } = await supabaseAdmin
      .from("project_notes")
      .insert(noteToInsert)
      .select("*")
      .single();

    if (error) {
      console.error("[POST /api/notes] Supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ note: mapNoteRow(data) }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/notes] Exception", err);
    return NextResponse.json(
      { error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const noteId = body?.noteId || body?.id || null;
    const content = typeof body?.body === "string" ? body.body : body?.text;

    if (!isUuid(noteId)) {
      return NextResponse.json(
        { error: "Valid noteId is required" },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Note body is required" },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("project_notes")
      .select("*")
      .eq("id", noteId)
      .maybeSingle();

    if (fetchError) {
      console.error("[PATCH /api/notes] Supabase fetch error", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const canModify = await canModifyProject(auth.userId, existing.project_id);
    if (!canModify) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("project_notes")
      .update({ body: content.trim() })
      .eq("id", noteId)
      .select("*")
      .single();

    if (error) {
      console.error("[PATCH /api/notes] Supabase update error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ note: mapNoteRow(data) }, { status: 200 });
  } catch (err: any) {
    console.error("[PATCH /api/notes] Exception", err);
    return NextResponse.json(
      { error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const noteId = url.searchParams.get("noteId");

    if (!isUuid(noteId)) {
      return NextResponse.json(
        { error: "Valid noteId is required" },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("project_notes")
      .select("*")
      .eq("id", noteId)
      .maybeSingle();

    if (fetchError) {
      console.error("[DELETE /api/notes] Supabase fetch error", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const canModify = await canModifyProject(auth.userId, existing.project_id);
    if (!canModify) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("project_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      console.error("[DELETE /api/notes] Supabase delete error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("[DELETE /api/notes] Exception", err);
    return NextResponse.json(
      { error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
