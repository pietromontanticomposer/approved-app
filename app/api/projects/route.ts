// app/api/projects/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

type DbProject = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

/**
 * GET /api/projects
 * Ritorna la lista dei progetti da Supabase
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, description, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/projects] Supabase error", error);
      return NextResponse.json(
        {
          error: error.message || "Errore nel caricamento dei progetti",
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { projects: (data ?? []) as DbProject[] },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[GET /api/projects] Unexpected error", err);
    return NextResponse.json(
      {
        error:
          err?.message || "Errore imprevisto nel caricamento dei progetti",
        details: String(err),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Crea un nuovo progetto su Supabase
 * Body JSON: { title: string, description?: string }
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    if (!rawBody) {
      console.error("[POST /api/projects] Empty request body");
      return NextResponse.json(
        { error: "Empty request body" },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (err) {
      console.error(
        "[POST /api/projects] JSON parse error",
        err,
        "RAW:",
        rawBody
      );
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const rawName = typeof body.name === "string" ? body.name : "";
    const rawDescription =
      typeof body.description === "string" ? body.description : "";

    const name = rawName.trim();
    const description = rawDescription.trim();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        name,
        description: description || null,
      })
      .select("id, name, description, created_at")
      .single();

    if (error) {
      console.error("[POST /api/projects] Supabase insert error", error);
      return NextResponse.json(
        {
          error:
            error.message || "Errore nella creazione del progetto su Supabase",
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ project: data as DbProject }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/projects] Unexpected error", err);
    return NextResponse.json(
      {
        error:
          err?.message || "Errore imprevisto nella creazione del progetto",
        details: String(err),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects
 * Aggiorna titolo e descrizione
 * Body JSON: { id: string, title?: string, description?: string }
 */
export async function PATCH(req: Request) {
  try {
    const rawBody = await req.text();

    if (!rawBody) {
      console.error("[PATCH /api/projects] Empty request body");
      return NextResponse.json(
        { error: "Empty request body" },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (err) {
      console.error(
        "[PATCH /api/projects] JSON parse error",
        err,
        "RAW:",
        rawBody
      );
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const id = typeof body.id === "string" ? body.id : "";
    const rawName = typeof body.name === "string" ? body.name : "";
    const rawDescription =
      typeof body.description === "string" ? body.description : "";

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const update: { name?: string; description?: string | null } = {};

    if (rawName.trim()) update.name = rawName.trim();
    if (rawDescription.trim()) update.description = rawDescription.trim();

    if (!Object.keys(update).length) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("projects")
      .update(update)
      .eq("id", id)
      .select("id, name, description, created_at")
      .single();

    if (error) {
      console.error("[PATCH /api/projects] Supabase update error", error);
      return NextResponse.json(
        {
          error: error.message || "Errore nell'aggiornamento del progetto",
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ project: data as DbProject }, { status: 200 });
  } catch (err: any) {
    console.error("[PATCH /api/projects] Unexpected error", err);
    return NextResponse.json(
      {
        error:
          err?.message || "Errore imprevisto nell'aggiornamento del progetto",
        details: String(err),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects
 * Cancella un progetto.
 * Può ricevere l'id sia nel body JSON { id } sia come query string ?id=...
 */
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const queryId = url.searchParams.get("id") ?? "";

    const rawBody = await req.text();

    let body: any = null;
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch (err) {
        console.error(
          "[DELETE /api/projects] JSON parse error",
          err,
          "RAW:",
          rawBody
        );
        // Se il body è invalido ma abbiamo queryId, possiamo comunque procedere.
      }
    }

    const bodyId =
      body && typeof body.id === "string" ? body.id.trim() : "";

    const id = bodyId || queryId;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      console.error("[DELETE /api/projects] Supabase delete error", error);
      return NextResponse.json(
        {
          error:
            error.message || "Errore nella cancellazione del progetto",
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("[DELETE /api/projects] Unexpected error", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Errore imprevisto nella cancellazione del progetto",
        details: String(err),
      },
      { status: 500 }
    );
  }
}
