import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      projectId,
      cueId,
      cueIndex,
      cueName,
      version,
      versionFiles,
    } = body as any;

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // Ensure cue exists or create it
    let cue = null;
    if (cueId) {
      const { data: cueData, error: cueError } = await supabaseAdmin
        .from("cues")
        .select("*")
        .eq("id", cueId)
        .maybeSingle();
      if (cueError) throw cueError;
      cue = cueData;
    } else {
      const insertCue = {
        project_id: projectId,
        index_in_project: cueIndex ?? 0,
        name: cueName ?? null,
      };
      const { data: newCue, error: newCueError } = await supabaseAdmin
        .from("cues")
        .insert(insertCue)
        .select()
        .single();
      if (newCueError) throw newCueError;
      cue = newCue;
    }

    // Insert version
    const versionInsert: any = {
      cue_id: cue.id,
      index_in_cue: (version && version.index_in_cue) ?? 0,
      status: (version && version.status) ?? "in-review",
      media_type: version?.media_type ?? null,
      media_storage_path: version?.media_storage_path ?? null,
      media_url: version?.media_url ?? null,
      media_original_name: version?.media_original_name ?? null,
      media_display_name: version?.media_display_name ?? null,
      media_duration: version?.media_duration ?? null,
      media_thumbnail_path: version?.media_thumbnail_path ?? null,
      media_thumbnail_url: version?.media_thumbnail_url ?? null,
    };

    const { data: createdVersion, error: createVersionError } = await supabaseAdmin
      .from("versions")
      .insert(versionInsert)
      .select()
      .single();
    if (createVersionError) throw createVersionError;

    // Insert associated files if any
    let filesInserted = [];
    if (Array.isArray(versionFiles) && versionFiles.length > 0) {
      const filesToInsert = versionFiles.map((f: any) => ({
        version_id: createdVersion.id,
        name: f.name,
        type: f.type ?? null,
        url: f.url ?? null,
        size: f.size ?? null,
      }));
      const { data: insertedFiles, error: filesError } = await supabaseAdmin
        .from("version_files")
        .insert(filesToInsert)
        .select();
      if (filesError) throw filesError;
      filesInserted = insertedFiles;
    }

    return NextResponse.json({ cue, version: createdVersion, files: filesInserted });
  } catch (err: any) {
    console.error("[POST /api/versions/create]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
