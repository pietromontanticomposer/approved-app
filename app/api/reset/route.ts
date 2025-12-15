import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/reset
 * Cancella tutti i progetti e i dati correlati (cues, versions, comments, references).
 * Usa il service role per bypassare RLS.
 * ATTENZIONE: Operazione distruttiva. Disponibile solo in sviluppo.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Reset disabilitato in produzione" },
      { status: 403 }
    );
  }

  try {
    // Cancella nell'ordine per evitare vincoli FK
    const steps: Array<{ table: string; filter?: (q: any) => any }> = [
      { table: "comments" },
      { table: "versions" },
      { table: "cues" },
      { table: "reference_versions" },
      { table: "references" },
      { table: "projects" }
    ];

    const results: Array<{ table: string; error?: string }> = [];

    for (const step of steps) {
      let query = supabaseAdmin.from(step.table).delete();
      if (step.filter) query = step.filter(query);
      const { error } = await query;
      if (error) {
        results.push({ table: step.table, error: error.message });
      } else {
        results.push({ table: step.table });
      }
    }

    const failed = results.filter(r => r.error);
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
