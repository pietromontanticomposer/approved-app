import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { isUuid } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * DELETE /api/projects/leave
 * Body: { project_id }
 * Removes the authenticated user from a project they are a member of (not owner).
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { project_id } = body;

    if (!project_id || !isUuid(project_id)) {
      return NextResponse.json({ error: "project_id must be a valid UUID" }, { status: 400 });
    }

    // Make sure the user is NOT the owner (owners cannot leave their own project)
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("owner_id")
      .eq("id", project_id)
      .maybeSingle();

    if (project?.owner_id === auth.userId) {
      return NextResponse.json({ error: "Project owners cannot leave their own project" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("project_members")
      .delete()
      .eq("project_id", project_id)
      .eq("member_id", auth.userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/projects/leave]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
