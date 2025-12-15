// app/api/comments/route.ts
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

/**
 * GET /api/comments?versionId=xxx
 * Ritorna commenti di una versione
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const versionId = url.searchParams.get('versionId');

    if (!versionId) {
      return NextResponse.json({ error: 'versionId required' }, { status: 400 });
    }

    const { data: comments, error } = await supabaseAdmin
      .from("comments")
      .select('*')
      .eq("version_id", versionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/comments] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: comments || [] }, { status: 200 });
  } catch (err: any) {
    console.error("[GET /api/comments] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { version_id, time_seconds, author, text } = body;

    if (!version_id || time_seconds === undefined || !text) {
      return NextResponse.json(
        { error: "version_id, time_seconds, and text are required" },
        { status: 400 }
      );
    }

    if (!isUuid(version_id)) {
      return NextResponse.json(
        { error: "version_id must be a UUID" },
        { status: 400 }
      );
    }

    const comment_id = uuidv4();

    const { data, error } = await supabaseAdmin
      .from("comments")
      .insert({
        id: comment_id,
        version_id,
        time_seconds,
        author: author || "Client",
        text,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/comments] Supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/comments] Error", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, text } = body;

    if (!id || !text) {
      return NextResponse.json(
        { error: "id and text are required" },
        { status: 400 }
      );
    }

    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "id must be a UUID" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("comments")
      .update({ text })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/comments] Supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comment: data }, { status: 200 });
  } catch (err: any) {
    console.error("[PATCH /api/comments] Error", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "id must be a UUID" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("comments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[DELETE /api/comments] Supabase error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("[DELETE /api/comments] Error", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
