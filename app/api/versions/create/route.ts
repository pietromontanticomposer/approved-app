// app/api/versions/create/route.ts
/**
 * Version Create API Route
 *
 * Secure implementation with authentication and authorization
 */

import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth, canModifyProject } from '@/lib/auth';

export const runtime = "nodejs";

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function POST(req: NextRequest) {
  try {
    console.log('[POST /api/versions/create] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.userId;
    const body = await req.json();

    const { projectId, cueId, cueIndex, cueName, version, versionFiles } = body as any;

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: "Valid projectId required" }, { status: 400 });
    }

    // SECURITY: Check project modify permission
    const canModify = await canModifyProject(userId, projectId);
    if (!canModify) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ensure cue exists or create it
    let cue = null;
    if (cueId) {
      if (!isUuid(cueId)) {
        return NextResponse.json({ error: "Invalid cueId" }, { status: 400 });
      }
      const { data: cueData } = await supabaseAdmin
        .from("cues")
        .select("*")
        .eq("id", cueId)
        .eq("project_id", projectId) // Verify cue belongs to project
        .maybeSingle();
      cue = cueData;
    }

    if (!cue) {
      const { data: newCue, error: newCueError } = await supabaseAdmin
        .from("cues")
        .insert({
          project_id: projectId,
          index_in_project: cueIndex ?? 0,
          name: cueName ?? null,
        })
        .select()
        .single();
      if (newCueError) throw newCueError;
      cue = newCue;
    }

    // Insert version
    const { data: createdVersion, error: createVersionError } = await supabaseAdmin
      .from("versions")
      .insert({
        cue_id: cue.id,
        index_in_cue: version?.index_in_cue ?? 0,
        status: version?.status ?? "in_review",
        media_type: version?.media_type ?? null,
        media_storage_path: version?.media_storage_path ?? null,
        media_url: version?.media_url ?? null,
        media_original_name: version?.media_original_name ?? null,
        media_display_name: version?.media_display_name ?? null,
        media_duration: version?.media_duration ?? null,
        media_thumbnail_path: version?.media_thumbnail_path ?? null,
        media_thumbnail_url: version?.media_thumbnail_url ?? null,
      })
      .select()
      .single();

    if (createVersionError) throw createVersionError;

    // Insert associated files if any
    let filesInserted = [];
    if (Array.isArray(versionFiles) && versionFiles.length > 0) {
      const { data: insertedFiles } = await supabaseAdmin
        .from("version_files")
        .insert(
          versionFiles.map((f: any) => ({
            version_id: createdVersion.id,
            name: f.name,
            type: f.type ?? null,
            url: f.url ?? null,
            size: f.size ?? null,
          }))
        )
        .select();
      filesInserted = insertedFiles || [];
    }

    console.log('[POST /api/versions/create] Version created:', createdVersion.id);
    return NextResponse.json({ cue, version: createdVersion, files: filesInserted });

  } catch (err: any) {
    console.error("[POST /api/versions/create] Error:", err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
