import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "media";
const SIGNED_URL_TTL_SECONDS = parseInt(
  process.env.NEXT_PUBLIC_SUPABASE_SIGNED_TTL || "7200",
  10
);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const projectId = form.get("projectId") as string | null;
    const cueId = form.get("cueId") as string | null;
    const versionId = form.get("versionId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const name = file.name || `upload-${Date.now()}`;
    const contentType = file.type || "application/octet-stream";

    const buffer = Buffer.from(await file.arrayBuffer());

    // Create path based on project/cue/version structure
    let folder = "uploads";
    if (projectId && cueId && versionId) {
      folder = `projects/${projectId}/cues/${cueId}/versions/${versionId}`;
    } else if (projectId) {
      folder = `projects/${projectId}`;
    }
    
    const path = `${folder}/${Date.now()}-${name}`;

    console.log("[POST /api/upload] Uploading file:", {
      path,
      size: file.size,
      type: contentType,
      projectId,
      cueId,
      versionId,
    });

    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType, upsert: false });

    if (error) {
      console.error("[POST /api/upload] Supabase storage error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[POST /api/upload] File uploaded to:", data.path);

    // Generate signed URL
    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(data.path, SIGNED_URL_TTL_SECONDS);

    if (signError) {
      console.warn("[POST /api/upload] Signed URL error (using public URL):", signError);
      // Fallback to public URL
      const { data: publicData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
      return NextResponse.json({
        success: true,
        path: data.path,
        mediaUrl: publicData?.publicUrl,
      });
    }

    return NextResponse.json({
      success: true,
      path: data.path,
      mediaUrl: signedData?.signedUrl,
    });
  } catch (err: any) {
    console.error("[POST /api/upload] Unexpected error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
