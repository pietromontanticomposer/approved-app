import { NextResponse, NextRequest } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { verifyAuth, canModifyProject } from "@/lib/auth";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const project = body?.project;
    if (!project || !project.id || !isUuid(project.id)) {
      return NextResponse.json({ error: "Missing or invalid project" }, { status: 400 });
    }

    // SECURITY: Check if user can modify this project (viewers cannot save)
    const canModify = await canModifyProject(auth.userId, project.id);
    if (!canModify) {
      return NextResponse.json({ error: "Forbidden - viewers cannot modify projects" }, { status: 403 });
    }

    const path = `projects/${project.id}/project.json`;
    const json = JSON.stringify(project);
    const buffer = Buffer.from(json, "utf-8");

    const { error } = await supabase.storage
      .from("media")
      .upload(path, buffer, { contentType: "application/json", upsert: true });

    if (error) {
      console.error("[POST /api/projects/save] Supabase storage error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const publicUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (err: any) {
    console.error("[POST /api/projects/save] Unexpected error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
