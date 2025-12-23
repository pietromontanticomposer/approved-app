// app/api/versions/route.ts
/**
 * Version Management API Route
 *
 * Secure implementation with authentication and authorization
 */

import { NextResponse, NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth, canAccessProject, canModifyProject } from '@/lib/auth';
import { resolveMediaUrl, detectMediaType, parseWaveformData } from "@/lib/mediaUrlResolver";

export const runtime = "nodejs";
const isDev = process.env.NODE_ENV !== "production";

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

/**
 * GET /api/versions?cueId=xxx&projectId=xxx
 * Returns versions for a cue
 */
export async function GET(req: NextRequest) {
  try {
    if (isDev) console.log('[GET /api/versions] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const cueId = url.searchParams.get('cueId');
    const projectId = url.searchParams.get('projectId');

    if (!cueId || !isUuid(cueId)) {
      return NextResponse.json({ error: 'Valid cueId required' }, { status: 400 });
    }

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Valid projectId required' }, { status: 400 });
    }

    // SECURITY: Verify cue belongs to project user can access
    const { data: cue } = await supabaseAdmin
      .from("cues")
      .select("project_id")
      .eq("id", cueId)
      .single();

    if (!cue || cue.project_id !== projectId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // SECURITY: Check project access permission
    const canAccess = await canAccessProject(auth.userId, projectId);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: versions, error } = await supabaseAdmin
      .from("versions")
      .select('*')
      .eq("cue_id", cueId)
      .order("index_in_cue", { ascending: true });

    if (isDev) console.log('[GET /api/versions] result', { cueId, count: versions?.length, error });

    if (error) {
      console.error("[GET /api/versions] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Costruisci URL pubblici per i media
    const processedVersions = await Promise.all(
      (versions || []).map(async v => {
        const mediaUrl = await resolveMediaUrl(v.media_url || v.media_storage_path || null);
        const thumbUrl = await resolveMediaUrl(
          v.media_thumbnail_url || v.media_thumbnail_path || null
        );

        const mediaType =
          v.media_type ||
          detectMediaType(
            v.media_original_name ||
              v.media_display_name ||
              v.media_storage_path ||
              v.media_url ||
              ""
          );

        return {
          ...v,
          media_type: mediaType,
          media_url: mediaUrl,
          media_filename: v.media_original_name || v.media_display_name || "Media",
          duration: v.media_duration,
          thumbnail_url: thumbUrl,
          waveform: parseWaveformData(v.media_waveform_data)
        };
      })
    );

    return NextResponse.json({ versions: processedVersions }, { status: 200 });
  } catch (err: any) {
    console.error("[GET /api/versions] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (isDev) console.log('[POST /api/versions] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { cue_id, version, projectId } = body;

    if (!cue_id || !version) {
      return NextResponse.json(
        { error: "cue_id and version are required" },
        { status: 400 }
      );
    }

    if (!isUuid(cue_id)) {
      return NextResponse.json(
        { error: "cue_id must be a UUID" },
        { status: 400 }
      );
    }

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json(
        { error: "Valid projectId required" },
        { status: 400 }
      );
    }

    // SECURITY: Verify cue belongs to project
    const { data: cue } = await supabaseAdmin
      .from("cues")
      .select("project_id")
      .eq("id", cue_id)
      .single();

    if (!cue || cue.project_id !== projectId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // SECURITY: Check project modify permission
    const canModify = await canModifyProject(auth.userId, projectId);
    if (!canModify) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const version_id =
      version && version.id && isUuid(version.id) ? version.id : uuidv4();

    const { data, error } = await supabaseAdmin
      .from("versions")
      .insert({
        id: version_id,
        cue_id,
        index_in_cue: version.index || 0,
        status: version.status || "in_review",
        media_type: version.media_type || null,
        media_storage_path: version.media_storage_path || null,
        media_url: version.media_url || null,
        media_original_name: version.media_original_name || null,
        media_display_name: version.media_display_name || null,
        media_duration: version.media_duration || null,
        media_thumbnail_path: version.media_thumbnail_path || null,
        media_thumbnail_url: version.media_thumbnail_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/versions] Supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (isDev) console.log('[POST /api/versions] Version created:', data.id);
    return NextResponse.json({ version: data }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/versions] Error", err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (isDev) console.log('[PATCH /api/versions] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, projectId } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 }
      );
    }

    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "id must be a UUID" },
        { status: 400 }
      );
    }

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json(
        { error: "Valid projectId required" },
        { status: 400 }
      );
    }

    // SECURITY: Verify version belongs to project user can modify
    const { data: version } = await supabaseAdmin
      .from("versions")
      .select("cue_id, cues(project_id)")
      .eq("id", id)
      .single();

    if (!version || !version.cues || (version.cues as any).project_id !== projectId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // SECURITY: Check project modify permission
    const canModify = await canModifyProject(auth.userId, projectId);
    if (!canModify) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("versions")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/versions] Supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (isDev) console.log('[PATCH /api/versions] Version updated:', data.id);
    return NextResponse.json({ version: data }, { status: 200 });
  } catch (err: any) {
    console.error("[PATCH /api/versions] Error", err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
