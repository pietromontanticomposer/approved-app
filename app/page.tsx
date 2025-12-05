import { createClient } from "@supabase/supabase-js";

export default async function Home() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await client.from("projects").select("*");

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "white",
        padding: "40px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Projects</h1>

      {error && (
        <p style={{ color: "red" }}>
          Errore nel caricamento dei progetti: {error.message}
        </p>
      )}

      {!error && data && data.length === 0 && <p>Nessun progetto trovato.</p>}

      {data && data.length > 0 && (
        <ul>
          {data.map((p) => (
            <li key={p.id} style={{ marginBottom: "8px" }}>
              {p.title}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
