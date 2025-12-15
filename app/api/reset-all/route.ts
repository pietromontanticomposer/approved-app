import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/reset-all
 * Svuota completamente l'istanza: dati applicativi (projects, cues, versions, comments,
 * references, teams, team_members) e tutte le autenticazioni (utenti Supabase).
 * SOLO SVILUPPO. Usa il service role.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Reset-all disabilitato in produzione" },
      { status: 403 }
    );
  }

  try {
    const results: Array<{ op: string; ok: boolean; error?: string }> = [];

    // 1) Cancella dati applicativi rispettando dipendenze
    const tablesInOrder = [
      "comments",
      "versions",
      "cues",
      "reference_versions",
      "references",
      "projects",
      "team_members",
      "teams",
    ];

    for (const table of tablesInOrder) {
      const { error } = await supabaseAdmin.from(table).delete();
      results.push({ op: `delete:${table}`, ok: !error, error: error?.message });
    }

    // 2) Cancella tutti gli utenti Supabase Auth
    try {
      const { data: users, error: listErr } = await (supabaseAdmin as any).auth.admin.listUsers();
      if (listErr) {
        results.push({ op: "auth:listUsers", ok: false, error: listErr.message });
      } else {
        for (const u of users?.users || []) {
          const { error: delErr } = await (supabaseAdmin as any).auth.admin.deleteUser(u.id);
          results.push({ op: `auth:deleteUser:${u.id}`, ok: !delErr, error: delErr?.message });
        }
      }
    } catch (e: any) {
      results.push({ op: "auth:exception", ok: false, error: e?.message || String(e) });
    }

    const failed = results.filter(r => !r.ok);
    return NextResponse.json(
      {
        success: failed.length === 0,
        results,
      },
      { status: failed.length ? 207 : 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Errore imprevisto" },
      { status: 500 }
    );
  }
}
