// app/page.tsx

import { supabase } from "@/lib/supabaseClient";

type ProjectRow = {
  id: string;
  title: string;
  created_at: string;
  owner: string | null;
  data: any;
};

export default async function Home() {
  // Legge tutte le righe dalla tabella "projects"
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "white",
        padding: "40px",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      }}
    >
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1.5rem" }}>Projects</h1>

      {/* Errore Supabase */}
      {error && (
        <p style={{ color: "#f97373" }}>
          Errore nel caricamento dei progetti: {error.message}
        </p>
      )}

      {/* Nessun dato */}
      {!error && (!data || data.length === 0) && (
        <p>Nessun progetto trovato nella tabella "projects".</p>
      )}

      {/* Lista progetti */}
      {data && data.length > 0 && (
        <ul style={{ listStyle: "disc", paddingLeft: "1.5rem" }}>
          {data.map((project: ProjectRow) => (
            <li key={project.id} style={{ marginBottom: "0.5rem" }}>
              {project.title}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
