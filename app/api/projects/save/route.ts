import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const project = body?.project;
    if (!project || !project.id) {
      return NextResponse.json({ error: "Missing project" }, { status: 400 });
    }

    const path = `projects/${project.id}/project.json`;
    const json = JSON.stringify(project);
    const buffer = Buffer.from(json, "utf-8");

    const { data, error } = await supabase.storage
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
