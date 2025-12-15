import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/teams
 * Create a new team/workspace
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, owner_id } = body;

    if (!name || !owner_id) {
      return NextResponse.json(
        { error: "name and owner_id are required" },
        { status: 400 }
      );
    }

    // Create team
    const { data: team, error: teamError } = await supabaseAdmin
      .from("teams")
      .insert({ name, owner_id })
      .select()
      .single();

    if (teamError) {
      console.error("[POST /api/teams] Error creating team:", teamError);
      return NextResponse.json(
        { error: teamError.message },
        { status: 500 }
      );
    }

    // Add owner as team member
    const { error: memberError } = await supabaseAdmin
      .from("team_members")
      .insert({
        team_id: team.id,
        user_id: owner_id,
        role: "owner"
      });

    if (memberError) {
      console.error("[POST /api/teams] Error adding team member:", memberError);
    }

    return NextResponse.json({ team }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/teams] Unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
