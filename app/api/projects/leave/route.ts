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
      .select("id, owner_id, team_id")
      .eq("id", project_id)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.owner_id === auth.userId) {
      return NextResponse.json({ error: "Project owners cannot leave their own project" }, { status: 403 });
    }

    if (project.team_id) {
      const { data: teamMembership } = await supabaseAdmin
        .from("team_members")
        .select("team_id")
        .eq("team_id", project.team_id)
        .eq("user_id", auth.userId)
        .maybeSingle();

      if (teamMembership) {
        return NextResponse.json(
          {
            error: "This project is shared through a team. Leave the team to remove access.",
            code: "TEAM_SHARED_PROJECT"
          },
          { status: 409 }
        );
      }
    }

    const { data: membership } = await supabaseAdmin
      .from("project_members")
      .select("project_id")
      .eq("project_id", project_id)
      .eq("member_id", auth.userId)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this project" }, { status: 404 });
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
