import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { versionId, updates, versionFiles } = body as any;

    if (!versionId) {
      return NextResponse.json({ error: "Missing versionId" }, { status: 400 });
    }

    const { data: updatedVersion, error: updateError } = await supabaseAdmin
      .from("versions")
      .update(updates)
      .eq("id", versionId)
      .select()
      .single();
    if (updateError) throw updateError;

    // Optionally insert new deliverable files
    let filesInserted: any[] = [];
    if (Array.isArray(versionFiles) && versionFiles.length > 0) {
      const filesToInsert = versionFiles.map((f: any) => ({
        version_id: versionId,
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

    return NextResponse.json({ version: updatedVersion, files: filesInserted });
  } catch (err: any) {
    console.error("[POST /api/versions/update]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
