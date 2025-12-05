// app/page.tsx

import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type ProjectRow = {
  id: string;
  title: string | null;
  created_at: string | null;
};

async function getProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Errore Supabase:", error.message);
    return [];
  }

  return data ?? [];
}

export default async function HomePage() {
  const projects = await getProjects();
  const activeProject = projects[0] ?? null;

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo">Approved</div>

        <button className="primary-btn full" type="button" disabled>
          + New project
        </button>

        <div className="sidebar-section">
          <h3>Projects</h3>
          <ul className="project-list">
            {projects.length === 0 && (
              <li className="project-item empty">
                No projects yet. Add a row in the “projects” table on Supabase.
              </li>
            )}

            {projects.map((project, index) => (
              <li
                key={project.id}
                className={
                  "project-item" + (index === 0 ? " active" : "")
                }
              >
                <span>{project.title ?? "Untitled project"}</span>
                <button
                  type="button"
                  className="icon-btn tiny"
                  title="Project options"
                  disabled
                >
                  ⋯
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="project-header-left">
            <div className="project-title-row">
              <div className="project-title">
                {activeProject
                  ? activeProject.title ?? "Untitled project"
                  : "No project"}
              </div>
            </div>
            <div className="project-meta">
              {activeProject
                ? `Loaded from Supabase · ${
                    activeProject.created_at
                      ? new Date(
                          activeProject.created_at,
                        ).toLocaleString("it-IT")
                      : "no date"
                  }`
                : 'Click "+ New project" (disabled here)'}
            </div>
          </div>
          <div className="topbar-actions">
            <button className="ghost-btn" disabled>
              Share link
            </button>
            <button className="primary-btn" disabled>
              Generate delivery
            </button>
          </div>
        </header>

        {/* UPLOAD STRIP (SOLO UI) */}
        <section className="upload-strip">
          <div className="dropzone disabled">
            <strong>Drop media here</strong>
            <span>In questa demo è solo grafica.</span>
          </div>

          <div className="naming-options">
            <label className="rename-toggle">
              <input type="checkbox" disabled />
              <span>Auto rename files (composer preset)</span>
            </label>
            <div className="naming-levels">
              <span className="level-label">Scheme:</span>
              <label className="level-option">
                <input
                  type="radio"
                  name="namingLevel"
                  value="media"
                  defaultChecked
                  disabled
                />
                <span>Media</span>
              </label>
              <label className="level-option">
                <input
                  type="radio"
                  name="namingLevel"
                  value="cinema"
                  disabled
                />
                <span>Cinema</span>
              </label>
            </div>
          </div>
        </section>

        {/* CONTENT GRID */}
        <section className="content">
          {/* LEFT COLUMN */}
          <div className="left-column">
            {/* PROJECT REFERENCES CARD */}
            <div className="refs-card">
              <div className="refs-header">
                <div>
                  <h2>Project references</h2>
                  <div className="refs-subtitle">
                    Upload script, storyboard, temp tracks, brief…
                  </div>
                </div>
                <button className="ghost-btn tiny" type="button" disabled>
                  Show
                </button>
              </div>

              <div className="refs-body">
                <div className="refs-dropzone">
                  <strong>Drop reference files here</strong>
                  <span>PDF, images, audio, video, zip…</span>
                </div>
                <div className="refs-list refs-list-empty">
                  No reference files for this project. (UI only, not wired
                  yet)
                </div>
              </div>
            </div>

            {/* CUES */}
            <h2>Project cues</h2>
            <div className="cue-list-subtitle">
              Per ora nessuna logica: i dati arrivano solo dalla tabella
              “projects”.
            </div>
            <div className="cue-list cue-list-empty">
              Qui in futuro metteremo i cue collegati ai file. Adesso è
              solo layout.
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="right-column">
            {/* PLAYER CARD */}
            <div className="player-card">
              <div className="player-mode-toggle">
                <button
                  className="ghost-btn tiny player-mode-btn active"
                  type="button"
                  disabled
                >
                  Review versions
                </button>
                <button
                  className="ghost-btn tiny player-mode-btn"
                  type="button"
                  disabled
                >
                  Project references
                </button>
              </div>

              <div className="player-title-row">
                <div className="player-title">
                  No version selected (demo)
                </div>
                <span className="player-badge" data-status="">
                  No media
                </span>
              </div>

              <div className="player-preview">
                <div className="player-placeholder">
                  Qui metteremo il player vero. Ora è solo un posto
                  visivo.
                </div>
              </div>

              <div className="player-controls">
                <button
                  className="primary-btn small"
                  type="button"
                  disabled
                >
                  Play
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value="1"
                  className="volume-slider"
                  disabled
                  readOnly
                />
                <span className="time">--:-- / --:--</span>
              </div>

              <div className="status-controls">
                <button className="ghost-btn tiny" type="button" disabled>
                  In review
                </button>
                <button className="ghost-btn tiny" type="button" disabled>
                  Approved
                </button>
                <button className="ghost-btn tiny" type="button" disabled>
                  Changes requested
                </button>
              </div>
            </div>

            {/* COMMENTS */}
            <div className="comments-card">
              <div className="comments-header">
                <h3>Comments</h3>
                <span className="tag small">No comments (demo)</span>
              </div>
              <ul className="comments-list"></ul>

              <div className="comment-input">
                <input
                  type="text"
                  placeholder="Add a comment (auto timecode)…"
                  disabled
                />
                <button
                  className="primary-btn small"
                  type="button"
                  disabled
                >
                  Send
                </button>
              </div>
            </div>

            {/* SHARE */}
            <div className="share-card">
              <div className="share-row">
                <div>
                  <strong>Client link</strong>
                  <div className="share-meta">
                    They can listen, comment and approve without an
                    account.
                  </div>
                </div>
                <button
                  className="ghost-btn small"
                  type="button"
                  disabled
                >
                  Copy demo link
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
