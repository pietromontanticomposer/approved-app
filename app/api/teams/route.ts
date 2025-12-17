import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from '@/lib/auth';

export const runtime = "nodejs";

/**
 * POST /api/teams
 * Create a new team/workspace
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[POST /api/teams] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // SECURITY: Always use authenticated user as owner_id
    // This prevents users from creating teams on behalf of other users
    const owner_id = auth.userId;

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
