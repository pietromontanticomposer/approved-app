// app/api/versions/update/route.ts
import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from '@/lib/auth';

export const runtime = "nodejs";

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { versionId, updates, versionFiles, projectId } = body as any;

    if (!versionId || !isUuid(versionId)) {
      return NextResponse.json({ error: "Valid versionId required" }, { status: 400 });
    }

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: "Valid projectId required" }, { status: 400 });
    }

    // Verify project modify permission
    const canModifyModule = await import('@/lib/auth');
    const canModify = await canModifyModule.canModifyProject(auth.userId, projectId);
    if (!canModify) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: updatedVersion, error: updateError } = await supabaseAdmin
      .from("versions")
      .update(updates)
      .eq("id", versionId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Insert new deliverable files if provided
    let filesInserted: any[] = [];
    if (Array.isArray(versionFiles) && versionFiles.length > 0) {
      const { data: insertedFiles } = await supabaseAdmin
        .from("version_files")
        .insert(
          versionFiles.map((f: any) => ({
            version_id: versionId,
            name: f.name,
            type: f.type ?? null,
            url: f.url ?? null,
            size: f.size ?? null,
          }))
        )
        .select();
      filesInserted = insertedFiles || [];
    }

    return NextResponse.json({ version: updatedVersion, files: filesInserted });
  } catch (err: any) {
    console.error("[POST /api/versions/update] Error:", err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
