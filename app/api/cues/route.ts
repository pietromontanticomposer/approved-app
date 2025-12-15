// app/api/cues/route.ts
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

/**
 * GET /api/cues?projectId=xxx
 * Ritorna cue di un progetto
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    const { data: cues, error } = await supabaseAdmin
      .from("cues")
      .select('*')
      .eq("project_id", projectId)
      .order("index_in_project", { ascending: true });

    console.log('[GET /api/cues] result', { projectId, count: cues?.length, error, sample: cues?.[0] });

    if (error) {
      console.error("[GET /api/cues] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ cues: cues || [] }, { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error("[GET /api/cues] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { project_id, cue } = body;

    if (!project_id || !cue) {
      return NextResponse.json(
        { error: "project_id and cue are required" },
        { status: 400 }
      );
    }

    if (!isUuid(project_id)) {
      return NextResponse.json(
        { error: "project_id must be a UUID" },
        { status: 400 }
      );
    }

    const cue_id = uuidv4();
    
    const { data, error } = await supabaseAdmin
      .from("cues")
      .insert({
        id: cue_id,
        project_id,
        index_in_project: cue.index || 0,
        original_name: cue.originalName || null,
        name: cue.name || null,
        display_name: cue.displayName || null,
        status: cue.status || "in-review",
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/cues] Supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[POST /api/cues] Cue created:", cue_id);
    return NextResponse.json({ cue: data, cueId: cue_id }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/cues] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/cues
 * Aggiorna una cue esistente
 * Body JSON: { id: string, name?: string, status?: string }
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name, status } = body;

    if (!id || !isUuid(id)) {
      return NextResponse.json(
        { error: "Valid cue id required" },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("cues")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/cues] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[PATCH /api/cues] Cue updated:", id);
    return NextResponse.json({ cue: data }, { status: 200 });
  } catch (err: any) {
    console.error("[PATCH /api/cues] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/cues?id=xxx
 * Cancella una cue e tutte le sue versioni
 */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id || !isUuid(id)) {
      return NextResponse.json(
        { error: "Valid cue id required" },
        { status: 400 }
      );
    }

    // Prima cancella tutte le versioni della cue
    const { error: versionsError } = await supabaseAdmin
      .from("versions")
      .delete()
      .eq("cue_id", id);

    if (versionsError) {
      console.error("[DELETE /api/cues] Error deleting versions:", versionsError);
      return NextResponse.json({ error: versionsError.message }, { status: 500 });
    }

    // Poi cancella la cue
    const { error } = await supabaseAdmin
      .from("cues")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[DELETE /api/cues] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[DELETE /api/cues] Cue deleted:", id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("[DELETE /api/cues] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
