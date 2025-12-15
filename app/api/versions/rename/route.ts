import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { versionId, media_display_name } = body;

    if (!versionId || !media_display_name) {
      return NextResponse.json(
        { error: "versionId and media_display_name are required" },
        { status: 400 }
      );
    }

    if (!isUuid(versionId)) {
      return NextResponse.json(
        { error: "versionId must be a UUID" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("versions")
      .update({ media_display_name })
      .eq("id", versionId)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/versions/rename] Supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ version: data }, { status: 200 });
  } catch (err: any) {
    console.error("[PATCH /api/versions/rename] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
