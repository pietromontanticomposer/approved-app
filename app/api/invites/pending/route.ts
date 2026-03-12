import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from "@/lib/auth";

export const runtime = "nodejs";
const isDev = process.env.NODE_ENV !== "production";

/**
 * GET /api/invites/pending
 * Returns pending invites for the authenticated user's email address.
 * Used to show in-app notifications for users who already have an account.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(auth.userId);
    if (!user?.email) return NextResponse.json({ invites: [] });

    const email = user.email.toLowerCase();
    const now = new Date().toISOString();

    const { data: invites, error } = await supabaseAdmin
      .from("invites")
      .select("id, project_id, team_id, role, invited_by, created_at")
      .ilike("email", email)
      .is("used_at", null)
      .eq("revoked", false)
      .gte("expires_at", now)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!invites || invites.length === 0) return NextResponse.json({ invites: [] });

    const projectIds = [...new Set(invites.filter(i => i.project_id).map(i => i.project_id))];
    const inviterIds = [...new Set(invites.filter(i => i.invited_by).map(i => i.invited_by))];

    const [projectsRes, invitersRes] = await Promise.all([
      projectIds.length > 0
        ? supabaseAdmin.from("projects").select("id, name").in("id", projectIds)
        : Promise.resolve({ data: [] as any[] }),
      inviterIds.length > 0
        ? supabaseAdmin.from("users").select("id, email, full_name").in("id", inviterIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const projectMap: Record<string, string> = {};
    for (const p of (projectsRes.data || [])) projectMap[p.id] = p.name;

    const inviterMap: Record<string, string> = {};
    for (const u of (invitersRes.data || [])) {
      inviterMap[u.id] = u.full_name || u.email?.split("@")[0] || "Someone";
    }

    const enriched = invites.map(inv => ({
      id: inv.id,
      project_id: inv.project_id,
      project_name: inv.project_id ? (projectMap[inv.project_id] || "Unknown project") : null,
      role: inv.role,
      invited_by_name: inv.invited_by ? (inviterMap[inv.invited_by] || "Someone") : "Someone",
      created_at: inv.created_at,
    }));

    if (isDev) console.log("[GET /api/invites/pending] Found", enriched.length, "pending invites for", email);
    return NextResponse.json({ invites: enriched });
  } catch (err: any) {
    console.error("[GET /api/invites/pending]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
