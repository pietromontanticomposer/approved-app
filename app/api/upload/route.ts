import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as any;
    const projectId = form.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const name = file.name || `upload-${Date.now()}`;
    const contentType = file.type || "application/octet-stream";

    const buffer = Buffer.from(await file.arrayBuffer());

    const folder = projectId ? `projects/${projectId}` : `uploads`;
    const path = `${folder}/${Date.now()}-${name}`;

    const { data, error } = await supabase.storage
      .from("media")
      .upload(path, buffer, { contentType, upsert: true });

    if (error) {
      console.error("[POST /api/upload] Supabase storage error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const publicUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;

    return NextResponse.json({ url: publicUrl, path });
  } catch (err: any) {
    console.error("[POST /api/upload] Unexpected error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
