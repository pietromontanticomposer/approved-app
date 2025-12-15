// app/api/references/route.ts
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "media";
const SIGNED_URL_TTL_SECONDS = parseInt(
  process.env.NEXT_PUBLIC_SUPABASE_SIGNED_TTL || "7200",
  10
);

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

const isAbsoluteUrl = (url: string | null) => !!url && /^https?:\/\//i.test(url);

function normalizeStoragePath(path: string | null) {
  if (!path) return null;
  const trimmed = path.replace(/^\/+/, "");
  if (trimmed.startsWith(`${STORAGE_BUCKET}/`)) {
    return trimmed.slice(STORAGE_BUCKET.length + 1);
  }
  return trimmed;
}

function extractPathFromSupabaseUrl(url: string) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex(p => p === "object");
    if (idx >= 0) {
      const after = parts.slice(idx + 1);
      if (after.length >= 2 && after[1] === STORAGE_BUCKET) {
        return after.slice(2).join("/");
      }
      if (after.length >= 3 && after[0] === "sign" && after[2] === STORAGE_BUCKET) {
        return after.slice(3).join("/");
      }
    }
  } catch (err) {
    console.warn("[GET /api/references] Failed to parse Supabase URL", { url, err });
  }
  return null;
}

async function resolveMediaUrl(raw: string | null): Promise<string | null> {
  if (!raw) return null;

  if (isAbsoluteUrl(raw)) {
    const supaPath = SUPABASE_URL ? extractPathFromSupabaseUrl(raw) : null;
    if (!supaPath) return raw;
    raw = supaPath;
  }

  const cleanPath = normalizeStoragePath(raw);
  if (!cleanPath) return null;

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(cleanPath, SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.error("[GET /api/references] Signed URL error", { path: cleanPath, error });
    }

    if (data?.signedUrl) {
      return data.signedUrl;
    }
  } catch (err) {
    console.error("[GET /api/references] Exception signing URL", err);
  }

  if (SUPABASE_URL) {
    return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${cleanPath}`;
  }

  return `/${cleanPath}`;
}

/**
 * GET /api/references?projectId=xxx
 * Ritorna reference files di un progetto
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    const { data: roots, error } = await supabaseAdmin
      .from("references_root")
      .select('*')
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/references] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rootIds = (roots || []).map(r => r.id);
    let versions: any[] = [];

    if (rootIds.length) {
      const { data: versionRows, error: versionErr } = await supabaseAdmin
        .from("reference_versions")
        .select('*')
        .in("root_id", rootIds)
        .order("created_at", { ascending: true });

      if (versionErr) {
        console.error("[GET /api/references] Version load error", versionErr);
      } else {
        versions = versionRows || [];
      }
    }

    const versionsByRoot: Record<string, any[]> = {};
    for (const v of versions) {
      const urlSigned = await resolveMediaUrl(v.url || v.thumbnail_path || null);
      const thumbSigned = await resolveMediaUrl(v.thumbnail_url || v.thumbnail_path || null);
      const prepared = {
        ...v,
        url: urlSigned || v.url,
        thumbnail_url: thumbSigned || v.thumbnail_url,
      };
      if (!versionsByRoot[prepared.root_id]) versionsByRoot[prepared.root_id] = [];
      versionsByRoot[prepared.root_id].push(prepared);
    }

    const enriched = (roots || []).map(r => ({
      ...r,
      versions: versionsByRoot[r.id] || [],
    }));

    return NextResponse.json({ references: enriched }, { status: 200 });
  } catch (err: any) {
    console.error("[GET /api/references] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { project_id, root_id, name, type, url, size } = body;

    if (!project_id || !name || !url) {
      return NextResponse.json(
        { error: "project_id, name, and url are required" },
        { status: 400 }
      );
    }

    if (!isUuid(project_id)) {
      return NextResponse.json(
        { error: "project_id must be a UUID" },
        { status: 400 }
      );
    }

    // If root_id is provided, add to existing reference root
    if (root_id) {
      if (!isUuid(root_id)) {
        return NextResponse.json(
          { error: "root_id must be a UUID" },
          { status: 400 }
        );
      }

      const version_id = uuidv4();
      const { data, error } = await supabaseAdmin
        .from("reference_versions")
        .insert({
          id: version_id,
          root_id,
          name,
          type: type || null,
          url,
          size: size || null,
        })
        .select()
        .single();

      if (error) {
        console.error("[POST /api/references] Supabase error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ version: data }, { status: 201 });
    }

    // Create new reference root and version
    const root_id_new = uuidv4();
    const version_id = uuidv4();

    // Insert root
    const { data: rootData, error: rootError } = await supabaseAdmin
      .from("references_root")
      .insert({
        id: root_id_new,
        project_id,
        name,
        active_version_index: 0,
      })
      .select()
      .single();

    if (rootError) {
      console.error("[POST /api/references] Root insert error", rootError);
      return NextResponse.json({ error: rootError.message }, { status: 500 });
    }

    // Insert version
    const { data: versionData, error: versionError } = await supabaseAdmin
      .from("reference_versions")
      .insert({
        id: version_id,
        root_id: root_id_new,
        name,
        type: type || null,
        url,
        size: size || null,
      })
      .select()
      .single();

    if (versionError) {
      console.error("[POST /api/references] Version insert error", versionError);
      return NextResponse.json({ error: versionError.message }, { status: 500 });
    }

    return NextResponse.json(
      { root: rootData, version: versionData },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/references] Error", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { rootId, versionId } = body;

    if (!rootId) {
      return NextResponse.json(
        { error: "rootId is required" },
        { status: 400 }
      );
    }

    if (!isUuid(rootId)) {
      return NextResponse.json(
        { error: "rootId must be a UUID" },
        { status: 400 }
      );
    }

    // Delete specific version if versionId provided
    if (versionId) {
      if (!isUuid(versionId)) {
        return NextResponse.json(
          { error: "versionId must be a UUID" },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin
        .from("reference_versions")
        .delete()
        .eq("id", versionId)
        .eq("root_id", rootId);

      if (error) {
        console.error("[DELETE /api/references] Version delete error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Version deleted" }, { status: 200 });
    }

    // Delete entire reference root group (cascade deletes versions)
    const { error } = await supabaseAdmin
      .from("references_root")
      .delete()
      .eq("id", rootId);

    if (error) {
      console.error("[DELETE /api/references] Root delete error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Reference group deleted" }, { status: 200 });
  } catch (err: any) {
    console.error("[DELETE /api/references] Error", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
