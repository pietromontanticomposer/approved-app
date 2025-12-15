import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/invites/details?token=uuid
 * Public endpoint that returns invite details using admin client (bypasses broken DB RPC)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

    const { data: linkData, error } = await supabaseAdmin
      .from("invites")
      .select(`id, team_id, project_id, email, role, invited_by, is_link_invite, expires_at, used_at, revoked`)
      .eq("id", token)
      .maybeSingle();

    if (error) {
      console.error('[GET /api/invites/details] DB error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!linkData) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

    // Validate not revoked/used/expired
    if (linkData.revoked) return NextResponse.json({ error: "Invite revoked" }, { status: 410 });
    if (linkData.used_at) return NextResponse.json({ error: "Invite already used" }, { status: 410 });
    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 410 });

    // Fetch team and project names
    const [{ data: team }, { data: project }, { data: invitedBy }] = await Promise.all([
      supabaseAdmin.from('teams').select('id,name').eq('id', linkData.team_id).maybeSingle(),
      linkData.project_id ? supabaseAdmin.from('projects').select('id,name').eq('id', linkData.project_id).maybeSingle() : Promise.resolve({ data: null }),
      linkData.invited_by ? supabaseAdmin.from('auth.users').select('id,email').eq('id', linkData.invited_by).maybeSingle() : Promise.resolve({ data: null })
    ]);

    const result = {
      id: linkData.id,
      team_id: linkData.team_id,
      team_name: team?.name || null,
      project_id: linkData.project_id,
      project_name: project?.name || null,
      email: linkData.email,
      role: linkData.role,
      invited_by_email: invitedBy?.email || null,
      is_link_invite: !!linkData.is_link_invite,
      expires_at: linkData.expires_at,
      is_expired: linkData.expires_at ? (new Date(linkData.expires_at) < new Date()) : false,
      is_used: !!linkData.used_at,
      is_revoked: !!linkData.revoked,
    };

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[GET /api/invites/details] Error', err);
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}
