// app/api/versions/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { cue_id, version } = body;
    
    if (!cue_id || !version) {
      return NextResponse.json(
        { error: "cue_id and version are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("versions")
      .insert({
        id: version.id,
        cue_id,
        index_in_cue: version.index || 0,
        status: version.status || "in-review",
        media_type: version.media?.type || null,
        media_storage_path: version.media?.storagePath || null,
        media_url: version.media?.url || null,
        media_original_name: version.media?.originalName || null,
        media_display_name: version.media?.displayName || null,
        media_duration: version.media?.duration || null,
        media_thumbnail_path: version.media?.thumbnailPath || null,
        media_thumbnail_url: version.media?.thumbnailUrl || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/versions] Supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ version: data }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/versions] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
