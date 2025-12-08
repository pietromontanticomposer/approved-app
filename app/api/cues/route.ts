// app/api/cues/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

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

    const { data, error } = await supabase
      .from("cues")
      .insert({
        id: cue.id,
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

    return NextResponse.json({ cue: data }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/cues] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
