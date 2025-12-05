import { supabase } from "@/lib/supabaseClient";

type ProjectRow = {
  id: string;
  title: string | null;
  owner: string | null;
  created_at: string | null;
  data: any;
};

export default async function HomePage() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  const projects = (data || []) as ProjectRow[];

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white text-black text-sm font-semibold">
            A
          </span>
          <span className="font-semibold tracking-tight">Approved</span>
        </div>
        <span className="text-xs text-white/50">
          Logged in as guest · demo workspace
        </span>
      </header>

      <section className="px-6 py-10 max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">
          I tuoi progetti Approved
        </h1>
        <p className="text-sm text-white/60 max-w-xl mb-8">
          Questa pagina legge direttamente dalla tabella <code>projects</code> su
          Supabase. Ogni riga della tabella diventa una card qui sotto.
        </p>

        {error && (
          <div className="mb-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Errore nel caricare i progetti: {error.message}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/60">
            Nessun progetto ancora. Aggiungi una riga a mano nella tabella{" "}
            <code>projects</code> su Supabase per vedere qualcosa qui.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <article
                key={project.id}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">
                    {project.title || "Untitled project"}
                  </h2>
                  {project.owner && (
                    <span className="text-xs rounded-full border border-white/15 px-2 py-0.5 text-white/70">
                      {project.owner}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/50">
                  Creato il{" "}
                  {project.created_at
                    ? new Date(project.created_at).toLocaleString()
                    : "data sconosciuta"}
                </p>
                <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-black/40 p-2 text-[11px] text-white/70">
                  {JSON.stringify(project.data ?? {}, null, 2)}
                </pre>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
