import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json(
        { error: "versionId is required" },
        { status: 400 }
      );
    }

    if (!isUuid(versionId)) {
      return NextResponse.json(
        { error: "versionId must be a UUID" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("versions")
      .delete()
      .eq("id", versionId);

    if (error) {
      console.error("[DELETE /api/versions/delete] Supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("[DELETE /api/versions/delete] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
