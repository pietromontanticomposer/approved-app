// app/api/versions/rename/route.ts
import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth, canModifyProject } from '@/lib/auth';

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function PATCH(req: NextRequest) {
  try {
    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { versionId, media_display_name, projectId } = body;

    if (!versionId || !isUuid(versionId)) {
      return NextResponse.json({ error: "Valid versionId required" }, { status: 400 });
    }

    if (!media_display_name) {
      return NextResponse.json({ error: "media_display_name required" }, { status: 400 });
    }

    if (!projectId || !isUuid(projectId)) {
      return NextResponse.json({ error: "Valid projectId required" }, { status: 400 });
    }

    // Verify project modify permission
    const canModify = await canModifyProject(auth.userId, projectId);
    if (!canModify) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("versions")
      .update({ media_display_name })
      .eq("id", versionId)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/versions/rename] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ version: data }, { status: 200 });
  } catch (err: any) {
    console.error("[PATCH /api/versions/rename] Error:", err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
