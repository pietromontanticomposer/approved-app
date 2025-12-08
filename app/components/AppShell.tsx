"use client";

import React, {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import FilePreview from "./FilePreview";
import MiniPreview from "./MiniPreview";
import SupabaseSyncBridge from "./SupabaseSyncBridge";

type DbProject = {
  id: string;
  title: string;
  created_at: string;
};

type MediaType = "audio" | "video";

export type Cue = {
  id: string;
  projectId: string;
  name: string;
  mediaType: MediaType;
  objectUrl: string;
  duration: number;
  comments?: {
    id: string;
    time: number;
    text: string;
  }[];
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return `${mm}:${ss}`;
}

function detectMediaType(file: File): MediaType | null {
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

export default function AppShell() {
  // Projects da Supabase via API
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Cue solo lato client
  const [cuesByProject, setCuesByProject] = useState<Record<string, Cue[]>>({});
  const [activeCueId, setActiveCueId] = useState<string | null>(null);

  // Player a destra
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);

  // Commenti
  const [commentDraft, setCommentDraft] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Carica progetti
  useEffect(() => {
    async function loadProjects() {
      try {
        setLoadingProjects(true);
        const res = await fetch("/api/projects");
        if (!res.ok) {
          console.error("[AppShell] Error fetching projects", res.status);
          return;
        }
        const data = (await res.json()) as { projects: DbProject[] };
        const list = data.projects || [];
        setProjects(list);
        if (list.length > 0) {
          setActiveProjectId((prev) => prev ?? list[0].id);
        }
      } catch (err) {
        console.error("[AppShell] loadProjects error", err);
      } finally {
        setLoadingProjects(false);
      }
    }

    loadProjects();
  }, []);

  const activeProject: DbProject | null = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const cuesForActiveProject: Cue[] = useMemo(() => {
    if (!activeProjectId) return [];
    return cuesByProject[activeProjectId] || [];
  }, [activeProjectId, cuesByProject]);

  const activeCue: Cue | null = useMemo(() => {
    if (!activeProjectId || !activeCueId) return null;
    const list = cuesByProject[activeProjectId] || [];
    return list.find((c) => c.id === activeCueId) ?? null;
  }, [activeProjectId, activeCueId, cuesByProject]);

  const activeCueComments = activeCue?.comments ?? [];
  const canComment = !!activeCue && activeCue.mediaType === "audio";

  // PROJECT CRUD

  async function handleNewProject() {
    const name = window.prompt("Project name", "New project");
    if (!name || !name.trim()) return;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name.trim() }),
      });

      if (!res.ok) {
        console.error("[AppShell] Error creating project", res.status);
        alert("Error creating project");
        return;
      }

      const data = (await res.json()) as { project: DbProject };
      const project = data.project;

      setProjects((prev) => [project, ...prev]);
      setActiveProjectId(project.id);
    } catch (err) {
      console.error("[AppShell] handleNewProject error", err);
      alert("Error creating project");
    }
  }

  async function handleRenameProject(project: DbProject) {
    const newName = window.prompt("Rename project", project.title);
    if (!newName || !newName.trim()) return;

    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id, title: newName.trim() }),
      });

      if (!res.ok) {
        console.error("[AppShell] Error renaming project", res.status);
        alert("Error renaming project");
        return;
      }

      setProjects((prev) =>
        prev.map((p) =>
          p.id === project.id ? { ...p, title: newName.trim() } : p
        )
      );
    } catch (err) {
      console.error("[AppShell] handleRenameProject error", err);
      alert("Error renaming project");
    }
  }

  async function handleDeleteProject(project: DbProject) {
    const ok = window.confirm(`Delete project "${project.title}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/projects?id=${project.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("[AppShell] Error deleting project", res.status);
        alert("Error deleting project");
        return;
      }

      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      setCuesByProject((prev) => {
        const clone = { ...prev };
        delete clone[project.id];
        return clone;
      });

      if (activeProjectId === project.id) {
        setActiveProjectId(null);
        setActiveCueId(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      }
    } catch (err) {
      console.error("[AppShell] handleDeleteProject error", err);
      alert("Error deleting project");
    }
  }

  function handleSelectProject(projectId: string) {
    setActiveProjectId(projectId);
    const list = cuesByProject[projectId] || [];
    setActiveCueId(list[0]?.id ?? null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCommentDraft("");
  }

  // CUES FROM FILES

  function addCueFromFile(file: File) {
    if (!activeProjectId || !activeProject) {
      alert("Create or select a project before dropping files.");
      return;
    }

    const mediaType = detectMediaType(file);
    if (!mediaType) {
      alert("Only audio or video files are supported for now.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const cueName = baseName.trim() || "Untitled cue";

    const cue: Cue = {
      id: generateId(),
      projectId: activeProjectId,
      name: cueName,
      mediaType,
      objectUrl,
      duration: 0,
      comments: [],
    };

    setCuesByProject((prev) => {
      const list = prev[activeProjectId] || [];
      return {
        ...prev,
        [activeProjectId]: [...list, cue],
      };
    });

    setActiveCueId(cue.id);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCommentDraft("");
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => addCueFromFile(file));

    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (!activeProjectId) {
      alert("Create or select a project before dropping files.");
      return;
    }

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => addCueFromFile(file));
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleRenameCue(cue: Cue) {
    const newName = window.prompt("Rename cue", cue.name);
    if (!newName || !newName.trim()) return;

    setCuesByProject((prev) => {
      const clone = { ...prev };
      const list = clone[cue.projectId] || [];
      const idx = list.findIndex((c) => c.id === cue.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], name: newName.trim() };
        clone[cue.projectId] = [...list];
      }
      return clone;
    });
  }

  function handleDeleteCue(cue: Cue) {
    const ok = window.confirm(`Delete cue "${cue.name}"?`);
    if (!ok) return;

    setCuesByProject((prev) => {
      const clone = { ...prev };
      const list = clone[cue.projectId] || [];
      const newList = list.filter((c) => c.id !== cue.id);
      clone[cue.projectId] = newList;
      return clone;
    });

    if (activeCueId === cue.id) {
      const list = cuesByProject[cue.projectId] || [];
      const remaining = list.filter((c) => c.id !== cue.id);
      setActiveCueId(remaining[0]?.id ?? null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setCommentDraft("");
    }
  }

  // AUDIO (player destra)

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeCue) return;

    audio.src = activeCue.objectUrl;
    setCurrentTime(0);
    setDuration(0);

    if (isPlaying) {
      audio
        .play()
        .then(() => {
          //
        })
        .catch((err) => {
          console.error("[AppShell] play error", err);
          setIsPlaying(false);
        });
    }
  }, [activeCue, isPlaying]);

  // SEEK DALLA WAVEFORM: FilePreview manda IL TEMPO IN SECONDI (ws.getCurrentTime())
  function handleWaveSeek(timeInSeconds: number) {
    const audio = audioRef.current;
    if (!audio) return;

    const safeTime =
      typeof timeInSeconds === "number" && Number.isFinite(timeInSeconds)
        ? Math.max(0, timeInSeconds)
        : 0;

    const dur = audio.duration;
    audio.currentTime =
      typeof dur === "number" && Number.isFinite(dur) && dur > 0
        ? Math.min(safeTime, dur)
        : safeTime;

    if (!isPlaying) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("[AppShell] seek play error", err);
          setIsPlaying(false);
        });
    }
  }

  // COMMENTI: aggiunta

  function handleCommentInputFocus() {
    if (!canComment) return;
    const tc = formatTime(currentTime);
    const prefix = `${tc}, `;
    if (!commentDraft.startsWith(prefix)) {
      setCommentDraft(prefix);
    }
  }

  function handleAddComment() {
    if (!canComment || !activeCue || !activeProjectId) return;
    const trimmed = commentDraft.trim();
    if (!trimmed) return;

    const tc = formatTime(currentTime);
    let text = trimmed;
    const prefix1 = `${tc}, `;
    const prefix2 = `${tc}`;
    if (text.startsWith(prefix1)) {
      text = text.slice(prefix1.length).trim();
    } else if (text.startsWith(prefix2)) {
      text = text.slice(prefix2.length).trim().replace(/^,/, "").trim();
    }

    const commentText = text || "(no text)";
    const newComment = {
      id: generateId(),
      time: currentTime,
      text: commentText,
    };

    setCuesByProject((prev) => {
      const list = prev[activeProjectId] || [];
      const updated = list.map((cue) =>
        cue.id === activeCue.id
          ? {
              ...cue,
              comments: [...(cue.comments ?? []), newComment],
            }
          : cue
      );
      return { ...prev, [activeProjectId]: updated };
    });

    setCommentDraft("");
  }

  function handleCommentClick(time: number) {
    const audio = audioRef.current;
    if (!audio) return;

    const dur = audio.duration;
    const safe =
      typeof dur === "number" && dur > 0
        ? Math.min(Math.max(time, 0), dur)
        : Math.max(time, 0);

    audio.currentTime = safe;
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.error("[AppShell] comment seek play error", err);
        setIsPlaying(false);
      });
  }

  const progressLabel =
    duration > 0
      ? `${formatTime(currentTime)} / ${formatTime(duration)}`
      : "--:-- / --:--";

  const hasProject = !!activeProject;

  return (
    <div className="app">
      {/* Initialize Supabase sync bridge */}
      {SupabaseSyncBridge && <div style={{ display: 'none' }} />}
      
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo">Approved</div>
        <button
          className="primary-btn full"
          type="button"
          onClick={handleNewProject}
        >
          + New project
        </button>

        <div className="sidebar-section">
          <h3>Projects</h3>
          <ul className="project-list">
            {loadingProjects ? (
              <li className="project-item empty">Loading projects…</li>
            ) : projects.length === 0 ? (
              <li className="project-item empty">
                No projects yet. Click "New project".
              </li>
            ) : (
              projects.map((project) => (
                <li
                  key={project.id}
                  className={
                    "project-item" +
                    (project.id === activeProjectId ? " active" : "")
                  }
                  onClick={() => handleSelectProject(project.id)}
                >
                  <span>{project.title}</span>
                  <div>
                    <button
                      type="button"
                      className="icon-btn tiny"
                      title="Rename project"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameProject(project);
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-btn tiny"
                      title="Delete project"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))
            )}
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
                {activeProject ? activeProject.title : "No project"}
              </div>
            </div>
            <div className="project-meta">
              {activeProject
                ? `${cuesForActiveProject.length} cues`
                : 'Click "New project" to get started'}
            </div>
          </div>
          <div className="topbar-actions">
            <button className="ghost-btn" type="button" disabled>
              Share link
            </button>
            <button className="primary-btn" type="button" disabled>
              Generate delivery
            </button>
          </div>
        </header>

        {/* UPLOAD STRIP */}
        <section className="upload-strip">
          <div
            id="globalDropzone"
            className={"dropzone" + (hasProject ? "" : " disabled")}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => {
              if (!hasProject) return;
              fileInputRef.current?.click();
            }}
          >
            <strong>Drop media here</strong>
            <span>
              {hasProject
                ? "Audio or video will become cues in this project."
                : "Create a project to start."}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              multiple
              style={{ display: "none" }}
              onChange={handleFileInputChange}
            />
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
            <h2>Project cues</h2>
            <div className="cue-list-subtitle">
              {activeProject
                ? cuesForActiveProject.length === 0
                  ? "No cues yet. Drop a media file."
                  : `${cuesForActiveProject.length} cues in this project.`
                : 'No project yet. Click "New project".'}
            </div>

            <div className="cue-list">
              {!activeProject ? (
                <div>No project. Click "New project" to get started.</div>
              ) : cuesForActiveProject.length === 0 ? (
                <div>No cues yet. Drop a media file.</div>
              ) : (
                cuesForActiveProject.map((cue, index) => (
                  <details
                    key={cue.id}
                    className="cue-block"
                    open={cue.id === activeCueId}
                  >
                    <summary>
                      <div className="cue-header">
                        <div>
                          <div className="cue-name">
                            {cue.name || `Cue ${index + 1}`}
                          </div>
                          <div className="cue-meta">
                            {cue.mediaType === "audio" ? "Audio" : "Video"}
                          </div>
                        </div>
                        <div className="cue-header-right">
                          <span className="cue-status in-review">
                            In review
                          </span>
                          <button
                            type="button"
                            className="ghost-btn tiny"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRenameCue(cue);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            className="ghost-btn tiny"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteCue(cue);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </summary>

                    <div
                      className={
                        "version-row" +
                        (cue.id === activeCueId ? " active" : "")
                      }
                      onClick={() => {
                        setActiveCueId(cue.id);
                        setIsPlaying(false);
                        setCurrentTime(0);
                        setCommentDraft("");
                      }}
                    >
                      <div className="version-label">v1</div>
                      <div className="version-preview">
                        <MiniPreview cue={cue} />
                      </div>
                      <div className="version-main">
                        <div className="version-title">{cue.name}</div>
                        <div className="version-meta">
                          {cue.mediaType === "audio" ? "Audio" : "Video"} ·{" "}
                          {duration > 0 && cue.id === activeCueId
                            ? formatTime(duration)
                            : "--:--"}
                        </div>
                      </div>
                      <div className="version-actions">
                        {/* Placeholder per azioni future */}
                      </div>
                    </div>
                  </details>
                ))
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="right-column">
            <div className="player-card">
              <div className="player-mode-toggle">
                <button
                  className="ghost-btn tiny player-mode-btn active"
                  type="button"
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
                  {activeCue ? activeCue.name : "No version selected"}
                </div>
                <span className="player-badge">
                  {activeCue ? activeCue.mediaType.toUpperCase() : "No media"}
                </span>
              </div>

              <div className="player-preview">
                <FilePreview
                  cue={activeCue}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={handleWaveSeek}
                />
              </div>

              <div className="player-controls">
                <button
                  className="primary-btn small"
                  type="button"
                  onClick={() => {
                    const audio = audioRef.current;
                    if (!audio || !activeCue) return;

                    if (isPlaying) {
                      audio.pause();
                      setIsPlaying(false);
                    } else {
                      audio
                        .play()
                        .then(() => setIsPlaying(true))
                        .catch((err) => {
                          console.error("[AppShell] play error", err);
                          setIsPlaying(false);
                        });
                    }
                  }}
                  disabled={!activeCue || activeCue.mediaType !== "audio"}
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>

                <input
                  className="volume-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                />

                <span className="time">{progressLabel}</span>
              </div>

              <audio
                ref={audioRef}
                controls={false}
                preload="metadata"
                style={{ display: "none" }}
              />
            </div>

            <div className="comments-card">
              <div className="comments-header">
                <h3>Comments</h3>
                <span className="tag small">
                  {canComment
                    ? activeCueComments.length === 0
                      ? "No comments"
                      : `${activeCueComments.length} comments`
                    : "Comments available on audio cues"}
                </span>
              </div>
              <ul className="comments-list">
                {canComment && activeCueComments.length > 0 ? (
                  activeCueComments.map((c) => (
                    <li
                      key={c.id}
                      onClick={() => handleCommentClick(c.time)}
                    >
                      <span className="timecode">{formatTime(c.time)}</span>
                      <p>{c.text}</p>
                    </li>
                  ))
                ) : (
                  <li>
                    {canComment
                      ? "No comments yet."
                      : "Select an audio cue to add comments."}
                  </li>
                )}
              </ul>

              <div className="comment-input">
                <input
                  type="text"
                  placeholder={
                    canComment
                      ? "Add a comment (auto timecode)…"
                      : "Comments only for audio cues"
                  }
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  onFocus={handleCommentInputFocus}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  disabled={!canComment}
                />
                <button
                  className="primary-btn small"
                  type="button"
                  onClick={handleAddComment}
                  disabled={!canComment || !commentDraft.trim()}
                >
                  Send
                </button>
              </div>
            </div>

            <div className="share-card">
              <div className="share-row">
                <div>
                  <strong>Client link</strong>
                  <div className="share-meta">
                    They can listen, comment and approve without an account.
                  </div>
                </div>
                <button className="ghost-btn small" disabled>
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
