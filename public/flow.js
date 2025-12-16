// =======================
// STATE
// =======================
const state = {
  projects: [],
  activeProjectId: null,
  autoRename: false,
  namingMode: "media", // "media" | "cinema"
  playerMode: "review" // "review" | "refs"
};

let mainWave = null;
let activeVideoEl = null;
let activeAudioEl = null;
const miniWaves = {};

// Player cache to avoid flicker
let currentPlayerVersionId = null;
let currentPlayerMediaType = null;

// UI state for reference panel
let referencesCollapsed = false;
let hasInitializedFromSupabase = false; // Prevent double init when fallback kicks in

// Global fetch wrapper: automatically attach auth headers (Authorization / x-actor-id)
// for same-origin API calls so the server can resolve the actor reliably.
;(function attachFetchAuth() {
  if (typeof window === 'undefined' || !window.fetch) return;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function(input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) ? input.url : '';
      // Only intercept same-origin API calls
      if (url && url.startsWith('/api')) {
        init = init || {};
        init.headers = init.headers || {};

        // If headers already include Authorization or x-actor-id, do not overwrite
        const hasAuthHeader = (init.headers['Authorization'] || init.headers['authorization']);
        const hasActor = (init.headers['x-actor-id'] || init.headers['X-Actor-Id']);

        if (!hasAuthHeader || !hasActor) {
          try {
            // Prefer flowAuth if available (handles special demo flows)
            if (window.flowAuth && typeof window.flowAuth.getAuthHeaders === 'function') {
              const fh = window.flowAuth.getAuthHeaders();
              if (fh && typeof fh === 'object') init.headers = { ...fh, ...init.headers };
            } else if (window.supabaseClient && window.supabaseClient.auth) {
              try {
                const sessionRes = await window.supabaseClient.auth.getSession();
                const session = sessionRes?.data?.session;
                if (session && session.user && session.user.id && !hasActor) {
                  init.headers['x-actor-id'] = session.user.id;
                }
                if (session && session.access_token && !hasAuthHeader) {
                  init.headers['Authorization'] = 'Bearer ' + session.access_token;
                }
              } catch (e) {
                // ignore
              }
            } else {
              // Try to parse cookie-based supabase session (best-effort)
              try {
                const cookie = document.cookie || '';
                const m = cookie.match(/(?:sb-access-token|supabase-auth-token|access_token|token)=([^;]+)/);
                if (m && m[1]) {
                  let val = decodeURIComponent(m[1]);
                  // cookie could be JSON
                  if (val.startsWith('{')) {
                    try { const parsed = JSON.parse(val); if (parsed?.access_token) init.headers['Authorization'] = 'Bearer ' + parsed.access_token; } catch(e){}
                  } else {
                    init.headers['Authorization'] = 'Bearer ' + val;
                  }
                }
              } catch (e) {}
            }
          } catch (e) {
            // swallow
          }
        }
      }
    } catch (e) {
      // continue without enrichment
    }
    return originalFetch(input, init);
  };
})();

// Upload progress tracking
let uploadProgressBar = null;
let activeUploads = 0;

// =======================
// DOM
// =======================
const newProjectBtn = document.getElementById("newProjectBtn");
if (!newProjectBtn) console.error('[FlowPreview] newProjectBtn not found in DOM');
const projectListEl = document.getElementById("projectList");
if (!projectListEl) console.error('[FlowPreview] projectListEl not found in DOM');
const projectTitleEl = document.getElementById("projectTitle");
if (!projectTitleEl) console.error('[FlowPreview] projectTitleEl not found in DOM');
const projectMetaEl = document.getElementById("projectMeta");
if (!projectMetaEl) console.error('[FlowPreview] projectMetaEl not found in DOM');
const projectMenuBtn = document.getElementById("projectMenuBtn");
if (!projectMenuBtn) console.error('[FlowPreview] projectMenuBtn not found in DOM');

const uploadStripEl = document.querySelector(".upload-strip");
const contentEl = document.querySelector(".content");
const rightColEl = document.querySelector(".right-column");

const dropzoneEl = document.getElementById("globalDropzone");
if (!dropzoneEl) console.error('[FlowPreview] dropzoneEl not found in DOM');

const cueListEl = document.getElementById("cueList");
if (!cueListEl) console.error('[FlowPreview] cueListEl not found in DOM');
const cueListSubtitleEl = document.getElementById("cueListSubtitle");
if (!cueListSubtitleEl) console.error('[FlowPreview] cueListSubtitleEl not found in DOM');

const autoRenameToggle = document.getElementById("autoRenameToggle");
if (!autoRenameToggle) console.error('[FlowPreview] autoRenameToggle not found in DOM');
const namingLevelRadios = document.querySelectorAll(
  "input[name='namingLevel']"
);
const namingLevelsEl = document.querySelector(".naming-levels");

const commentsListEl = document.getElementById("commentsList");
if (!commentsListEl) console.error('[FlowPreview] commentsListEl not found in DOM');
const commentsSummaryEl = document.getElementById("commentsSummary");
if (!commentsSummaryEl) console.error('[FlowPreview] commentsSummaryEl not found in DOM');
const commentInputEl = document.getElementById("commentInput");
if (!commentInputEl) console.error('[FlowPreview] commentInputEl not found in DOM');
const addCommentBtn = document.getElementById("addCommentBtn");
if (!addCommentBtn) console.error('[FlowPreview] addCommentBtn not found in DOM');

const playerTitleEl = document.getElementById("playerTitle");
if (!playerTitleEl) console.error('[FlowPreview] playerTitleEl not found in DOM');
const playerBadgeEl = document.getElementById("playerBadge");
if (!playerBadgeEl) console.error('[FlowPreview] playerBadgeEl not found in DOM');
const playerMediaEl = document.getElementById("playerMedia");
if (!playerMediaEl) console.error('[FlowPreview] playerMediaEl not found in DOM');
const playPauseBtn = document.getElementById("playPauseBtn");
if (!playPauseBtn) console.error('[FlowPreview] playPauseBtn not found in DOM');
const timeLabelEl = document.getElementById("timeLabel");
if (!timeLabelEl) console.error('[FlowPreview] timeLabelEl not found in DOM');
const volumeSlider = document.getElementById("volumeSlider");
if (!volumeSlider) console.error('[FlowPreview] volumeSlider not found in DOM');
const statusInReviewBtn = document.getElementById("statusInReviewBtn");
if (!statusInReviewBtn) console.error('[FlowPreview] statusInReviewBtn not found in DOM');
const statusApprovedBtn = document.getElementById("statusApprovedBtn");
if (!statusApprovedBtn) console.error('[FlowPreview] statusApprovedBtn not found in DOM');
const statusChangesBtn = document.getElementById("statusChangesBtn");
if (!statusChangesBtn) console.error('[FlowPreview] statusChangesBtn not found in DOM');

const shareBtn = document.getElementById("shareBtn");
if (!shareBtn) console.error('[FlowPreview] shareBtn not found in DOM');
const deliverBtn = document.getElementById("deliverBtn");
if (!deliverBtn) console.error('[FlowPreview] deliverBtn not found in DOM');
const copyLinkBtn = document.getElementById("copyLinkBtn");
if (!copyLinkBtn) console.error('[FlowPreview] copyLinkBtn not found in DOM');

// Player mode buttons
const modeReviewBtn = document.getElementById("modeReviewBtn");
if (!modeReviewBtn) console.error('[FlowPreview] modeReviewBtn not found in DOM');
const modeRefsBtn = document.getElementById("modeRefsBtn");
if (!modeRefsBtn) console.error('[FlowPreview] modeRefsBtn not found in DOM');

// Project References DOM
const refsBodyEl = document.getElementById("refsBody");
if (!refsBodyEl) console.error('[FlowPreview] refsBodyEl not found in DOM');
const refsDropzoneEl = document.getElementById("refsDropzone");
if (!refsDropzoneEl) console.error('[FlowPreview] refsDropzoneEl not found in DOM');
const refsListEl = document.getElementById("refsList");
if (!refsListEl) console.error('[FlowPreview] refsListEl not found in DOM');
const refsSubtitleEl = document.getElementById("refsSubtitle");
if (!refsSubtitleEl) console.error('[FlowPreview] refsSubtitleEl not found in DOM');
const refsToggleBtn = document.getElementById("refsToggleBtn");
if (!refsToggleBtn) console.error('[FlowPreview] refsToggleBtn not found in DOM');

if (volumeSlider) {
  volumeSlider.style.display = "none";
}

// Activate a given version (from a preview click) and open it in the main player
function activateVersionPreview(version) {
  if (!version) return;
  // find project and cue containing this version
  for (const project of state.projects) {
    for (const cue of project.cues || []) {
      if ((cue.versions || []).some(v => v.id === version.id)) {
        project.activeCueId = cue.id;
        project.activeVersionId = version.id;
        // ensure UI reflects selection
        renderAll();
        // scroll player into view if needed
        try {
          const playerRoot = document.getElementById('player-root');
          if (playerRoot) playerRoot.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (err) {
          // ignore
        }
        return;
      }
    }
  }
}

// =======================
// HELPERS
// =======================
function uid() {
  return Math.random().toString(36).slice(2);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${pad2(m)}:${pad2(ss)}`;
}

function cleanFileName(name) {
  if (!name) return "Untitled";
  const base = name.replace(/\.[^.]+$/, "");
  return base.replace(/[_\-]+/g, " ").trim() || "Untitled";
}

function detectRawType(fileName) {
  const n = fileName.toLowerCase();
  if (n.match(/\.(mp4|mov|mkv|avi|webm)$/)) return "video";
  if (n.match(/\.(wav|aiff|aif|mp3|m4a|ogg)$/)) return "audio";
  if (n.match(/\.(zip|rar|7z)$/)) return "zip";
  if (n.match(/\.(pdf)$/)) return "pdf";
  if (n.match(/\.(png|jpg|jpeg|webp|gif)$/)) return "image";
  return "other";
}

// Return a proxied URL on our domain when media comes from Supabase/storage
function getProxiedUrl(raw) {
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    const host = u.hostname || "";
    // If it's already our domain, return as-is
    if (host === window.location.hostname) return raw;
    // If it's a Supabase storage URL (public or signed), proxy through our API
    if (host.includes("supabase.co") || raw.includes("/storage/v1/object/")) {
      // Try to extract the internal storage path so the server can re-sign it.
      try {
        const parts = u.pathname.split("/").filter(Boolean);
        const objIdx = parts.findIndex(p => p === "object");
        if (objIdx >= 0) {
          const after = parts.slice(objIdx + 1); // [public|sign, bucket, ...path]
          if (after.length >= 3 && (after[0] === "public" || after[0] === "sign") && after[1]) {
            const bucket = after[1];
            const pathParts = after.slice(2);
            const storagePath = `${bucket}/${pathParts.join("/")}`;
            // Provide path to server so it can create signed url server-side
            return `/api/media/stream?path=${encodeURIComponent(storagePath)}`;
          }
        }
      } catch (e) {
        // fall back to proxy by full url
      }
      return `/api/media/stream?url=${encodeURIComponent(raw)}`;
    }
    // Otherwise return original
    return raw;
  } catch (e) {
    // Likely a storage path like "projects/..." → proxy by path
    return `/api/media/stream?path=${encodeURIComponent(raw)}`;
  }
}

function isFileDragEvent(e) {
  const dt = e.dataTransfer;
  if (!dt) return false;
  if (!dt.types) return false;
  return Array.from(dt.types).includes("Files");
}

function triggerDownload(url, filename) {
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "file";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

// =======================
// VERSION / CUE STATUS
// =======================
const VERSION_STATUSES = {
  "in-review": "In review",
  approved: "Approved",
  "changes-requested": "Changes requested"
};

function computeCueStatus(cue) {
  if (!cue.versions.length) return "in-review";
  if (cue.versions.some(v => v.status === "changes-requested")) {
    return "changes-requested";
  }
  if (cue.versions.some(v => v.status === "approved")) {
    return "approved";
  }
  return "in-review";
}

async function setVersionStatus(project, cue, version, status) {
  if (!VERSION_STATUSES[status]) return;

  try {
    const headers = window.flowAuth ? window.flowAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };
    const res = await fetch('/api/versions/update', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        cue_id: cue.id,
        version_id: version.id,
        status: status
      })
    });
    if (!res.ok) {
      console.error('[FlowPreview] Failed to update version status', await res.text());
      alert('Errore nell\'aggiornare lo stato della versione');
      return;
    }
    version.status = status;
    cue.status = computeCueStatus(cue);
    renderAll();
  } catch (err) {
    console.error('[FlowPreview] Exception updating version status', err);
    alert('Errore nell\'aggiornare lo stato della versione');
  }
}

// =======================
// GETTERS
// =======================
function getActiveProject() {
  return state.projects.find(x => x.id === state.activeProjectId) || null;
}

function getProjectById(id) {
  return state.projects.find(x => x.id === id) || null;
}

function getCue(project, cueId) {
  if (!project) return null;
  return project.cues.find(x => x.id === cueId) || null;
}

function getVersion(project, cueId, versionId) {
  const cue = getCue(project, cueId);
  if (!cue) return null;
  const version = cue.versions.find(x => x.id === versionId);
  if (!version) return null;
  return { cue, version };
}

function getActiveContext() {
  const p = getActiveProject();
  if (!p) return null;
  if (!p.activeCueId || !p.activeVersionId) return null;
  const ctx = getVersion(p, p.activeCueId, p.activeVersionId);
  if (!ctx) return null;
  return { project: p, cue: ctx.cue, version: ctx.version };
}

function ensureProjectReferences(project) {
  if (!project.references) {
    project.references = [];
  }
}

// =======================
// NAMING
// =======================
function computeCueDisplayName(project, cue, index) {
  const idx = index + 1;

  if (!state.autoRename) {
    return cue.name || cleanFileName(cue.originalName) || `Cue ${idx}`;
  }

  if (state.namingMode === "media") return `Cue ${pad2(idx)}`;
  return `1m${pad2(idx)}`;
}

function computeVersionLabel(i) {
  return `v${i + 1}`;
}

function computeMediaDisplayName(project, cue, version, fileName) {
  if (!state.autoRename) return fileName;

  const title =
    project.name.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12) ||
    "PROJECT";

  const ext = fileName.includes(".")
    ? fileName.substring(fileName.lastIndexOf(".")).toLowerCase()
    : "";

  const cueIndex = project.cues.findIndex(c => c.id === cue.id) + 1;
  const code =
    state.namingMode === "cinema"
      ? `1m${pad2(cueIndex)}`
      : `Cue_${pad2(cueIndex)}`;

  const ver = pad2(version.index + 1);

  let type = "MIX";
  if (ext.match(/mp3|m4a|ogg|aac/)) type = "PREVIEW";

  return `${title}_${code}_v${ver}_${type}${ext}`;
}

function refreshAllNames() {
  const project = getActiveProject();
  if (!project) return;

  project.cues.forEach((cue, i) => {
    cue.displayName = computeCueDisplayName(project, cue, i);
    cue.versions.forEach(v => {
      if (!v.media) return;
      v.media.displayName = computeMediaDisplayName(
        project,
        cue,
        v,
        v.media.originalName
      );
    });
  });
}

function updateNamesInDOM() {
  const project = getActiveProject();
  if (!project) return;

  project.cues.forEach(cue => {
    const details = cueListEl.querySelector(
      `details[data-cue-id="${cue.id}"]`
    );
    if (!details) return;

    const nameEl = details.querySelector(".cue-name");
    if (nameEl) {
      nameEl.textContent = cue.displayName || cue.name;
    }

    cue.versions.forEach(version => {
      const row = details.querySelector(
        `.version-row[data-version-id="${version.id}"]`
      );
      if (!row) return;

      const title = row.querySelector(".version-title");
      if (title) {
        title.textContent =
          version.media?.displayName ||
          version.media?.originalName ||
          "Media";
      }
    });
  });

  const ctx = getActiveContext();
  if (ctx) {
    const { cue, version } = ctx;
    playerTitleEl.textContent =
      `${cue.displayName} · ${computeVersionLabel(version.index)}`;
  }
}

// =======================
// PROJECT CRUD
// =======================
async function createNewProject() {
  console.log("[FlowPreview] createNewProject");
  const defaultName = "New project";
  const name = prompt("Project name", defaultName);
  if (name === null) return;

  const finalName = name.trim() || defaultName;
  try {
    // Get auth headers from flowAuth
    const headers = window.flowAuth ? window.flowAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: finalName, description: '', team_id: 'auto' })
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '<non-text-response>');
      console.error('[FlowPreview] Failed to create project', res.status, text);
      try {
        alert('Errore nella creazione del progetto:\n' + (text || 'unknown'));
      } catch (e) {
        // ignore alert failures
      }
      return;
    }
    const data = await res.json();
    // Support both response shapes:
    // - { projects: [...] }
    // - { my_projects: [...], shared_with_me: [...] }
    let projects = [];
    if (data.projects && Array.isArray(data.projects)) {
      projects = data.projects;
    } else if ((data.my_projects || data.shared_with_me) && (Array.isArray(data.my_projects) || Array.isArray(data.shared_with_me))) {
      const my = Array.isArray(data.my_projects) ? data.my_projects : [];
      const shared = Array.isArray(data.shared_with_me) ? data.shared_with_me : [];
      // Merge keeping order: my projects first, then shared
      projects = [...my, ...shared];
    }

    console.log("[Flow] Loaded projects:", projects.length);

    // Populate state with projects from DB (preserve owner/team_members)
    state.projects = projects.map(p => ({
      id: p.id,
      name: p.name || "Untitled",
      team_id: p.team_id,
      owner_id: p.owner_id || null,
      team_members: p.team_members || [],
      cues: [], // Load on demand if needed
      activeCueId: null,
      activeVersionId: null,
      references: p.references || []
    }));
    // Re-render UI after creating project
    renderAll();
  } catch (err) {
    console.error('[FlowPreview] Exception creating project', err);
    alert('Errore nella creazione del progetto');
  }
}

async function renameProject(project) {
  const name = prompt("Rename project", project.name);
  if (name === null) return;
  if (!name.trim()) return;

  const newName = name.trim();
  try {
    // Get auth headers from flowAuth
    const headers = window.flowAuth ? window.flowAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };
    const res = await fetch('/api/projects', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ id: project.id, name: newName })
    });
    if (!res.ok) {
      console.error('[FlowPreview] Failed to rename project', await res.text());
      alert('Errore nel rinominare il progetto');
      return;
    }
    project.name = newName;
    renderAll();
  } catch (err) {
    console.error('[FlowPreview] Exception renaming project', err);
    alert('Errore nel rinominare il progetto');
  }
}

async function deleteProject(id) {
  const p = getProjectById(id);
  if (!p) return;
  const ok = confirm(`Delete project "${p.name}"?`);
  if (!ok) return;

  try {
    // Get auth headers from flowAuth
    const headers = window.flowAuth ? window.flowAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };
    const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) {
      console.error('[FlowPreview] Failed to delete project', await res.text());
      alert('Errore nella cancellazione del progetto');
      return;
    }
  } catch (err) {
    console.error('[FlowPreview] Exception deleting project', err);
    alert('Errore nella cancellazione del progetto');
    return;
  }

  state.projects = state.projects.filter(x => x.id !== id);
  state.activeProjectId =
    state.projects.length ? state.projects[state.projects.length - 1].id : null;

  currentPlayerVersionId = null;
  currentPlayerMediaType = null;
  state.playerMode = "review";

  renderAll();
}

// =======================
// CUE / VERSION CRUD
// =======================
async function createCueFromFile(file) {
  const project = getActiveProject();
  if (!project) return;

  const cue = {
    id: uid(),
    index: project.cues.length,
    originalName: file.name,
    name: cleanFileName(file.name),
    displayName: "",
    status: "in-review",
    versions: [],
    isOpen: true
  };

  project.cues.push(cue);

  // Save cue to database
  try {
    const headers = window.flowAuth ? window.flowAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };
    const res = await fetch('/api/cues', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        project_id: project.id,
        cue: {
          id: cue.id,
          name: cue.name,
          index: cue.index,
          status: cue.status
        }
      })
    });
    
    if (!res.ok) {
      console.error('[Flow] Failed to save cue to database', await res.text());
    } else {
      const payload = await res.json().catch(() => null);
      const serverCueId = payload && (payload.cueId || (payload.cue && payload.cue.id));
      if (serverCueId) {
        // Replace the temporary client id with server-generated UUID so future calls use the correct id
        console.log('[Flow] Cue saved to database (server id):', serverCueId, 'clientTempId:', cue.id);
        // Update cue object and project references
        const oldId = cue.id;
        cue.id = serverCueId;
        const ci = project.cues.findIndex(c => c.id === oldId);
        if (ci >= 0) project.cues[ci].id = serverCueId;
      } else {
        console.log('[Flow] Cue saved to database (no server id returned), client id kept:', cue.id);
      }
    }
  } catch (err) {
    console.error('[Flow] Exception saving cue:', err);
  }

  const version = createVersionForCue(project, cue, file);

  project.activeCueId = cue.id;
  project.activeVersionId = version.id;

  cue.status = computeCueStatus(cue);
  refreshAllNames();
  renderAll();
}

// =======================
// UPLOAD TO SUPABASE
// =======================
function ensureProgressBar() {
  if (uploadProgressBar) return;
  
  uploadProgressBar = document.createElement("div");
  uploadProgressBar.id = "upload-progress-bar";
  uploadProgressBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #38bdf8, #0ea5e9);
    width: 0%;
    transition: width 0.3s ease;
    z-index: 9999;
    display: none;
  `;
  document.body.appendChild(uploadProgressBar);
}

function updateProgressBar(percent) {
  ensureProgressBar();
  uploadProgressBar.style.display = "block";
  uploadProgressBar.style.width = percent + "%";
}

function hideProgressBar() {
  if (uploadProgressBar) {
    uploadProgressBar.style.display = "none";
    uploadProgressBar.style.width = "0%";
  }
}

async function uploadFileToSupabase(file, projectId, cueId, versionId) {
  activeUploads++;
  updateProgressBar(0);
  
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    formData.append("cueId", cueId);
    formData.append("versionId", versionId);
    
    const xhr = new XMLHttpRequest();
    
    // Track upload progress accurately
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        // Real progress from 0 to 95% during upload
        const percent = Math.round((e.loaded / e.total) * 95);
        updateProgressBar(percent);
        console.log(`[Upload] Progress: ${percent}%`);
      }
    });
    
    xhr.addEventListener("load", () => {
      console.log("[Upload] HTTP transfer complete, processing response");
      
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const result = JSON.parse(xhr.responseText);
          console.log("[Upload] Server response received:", result);
          
          // Show 100% when server confirms
          updateProgressBar(100);
          
          // Update version with the signed URL from server
          const project = getProjectById(projectId);
          if (project) {
            const cue = project.cues.find(c => c.id === cueId);
            if (cue) {
              const version = cue.versions.find(v => v.id === versionId);
              if (version && version.media) {
                version.media.url = result.mediaUrl || version.media.url;
                version.isUploading = false;
                version.uploadProgress = 100;
                console.log("[Upload] Version updated with URL:", version.media.url);
                
                // Save version to database after upload completes
                saveVersionToDatabase(project.id, cue.id, version, result.path);
                
                renderVersionPreviews();
                renderPlayer();
              }
            }
          }
          
          activeUploads--;
          if (activeUploads === 0) {
            setTimeout(hideProgressBar, 800);
          }
        } catch (parseErr) {
          console.error("[Upload] Failed to parse response:", parseErr);
          activeUploads--;
          if (activeUploads === 0) hideProgressBar();
        }
      } else {
        console.error("[Upload] Server error:", xhr.status, xhr.statusText);
        activeUploads--;
        if (activeUploads === 0) hideProgressBar();
      }
    });
    
    xhr.addEventListener("error", () => {
      console.error("[Upload] Network error during upload");
      activeUploads--;
      if (activeUploads === 0) hideProgressBar();
    });
    
    xhr.addEventListener("abort", () => {
      console.warn("[Upload] Upload aborted");
      activeUploads--;
      if (activeUploads === 0) hideProgressBar();
    });
    
    xhr.open("POST", "/api/upload");
    console.log("[Upload] Starting upload:", file.name, `(${Math.round(file.size / 1024)} KB)`);
    xhr.send(formData);
    
  } catch (err) {
    console.error("[Upload] Exception:", err);
    activeUploads--;
    if (activeUploads === 0) hideProgressBar();
  }
}

async function saveVersionToDatabase(projectId, cueId, version, storagePath) {
  try {
    const versionData = {
      id: version.id,
      index: version.index,
      status: version.status,
      media_type: version.media && version.media.type ? version.media.type : null,
      media_storage_path: storagePath || null,
      media_url: version.media && version.media.url ? version.media.url : null,
      media_original_name: version.media && version.media.originalName ? version.media.originalName : null,
      media_display_name: version.media && (version.media.displayName || version.media.originalName) ? (version.media.displayName || version.media.originalName) : null,
      media_duration: version.media && version.media.duration ? version.media.duration : null,
      media_thumbnail_path: null,
      media_thumbnail_url: version.media && version.media.thumbnailUrl ? version.media.thumbnailUrl : null
    };

    const headers = window.flowAuth ? window.flowAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };
    const res = await fetch('/api/versions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        cue_id: cueId,
        version: versionData
      })
    });

    if (!res.ok) {
      console.error('[Flow] Failed to save version to database', await res.text());
    } else {
      console.log('[Flow] Version saved to database:', version.id);
    }
  } catch (err) {
    console.error('[Flow] Exception saving version:', err);
  }
}

function createVersionForCue(project, cue, file) {
  const version = {
    id: uid(),
    index: cue.versions.length,
    media: null,
    comments: [],
    deliverables: [],
    status: "in-review",
    uploadProgress: 0,
    isUploading: true
  };

  const type = detectRawType(file.name);
  const url = URL.createObjectURL(file);

  if (type === "audio" || type === "video") {
    version.media = {
      type,
      url,
      originalName: file.name,
      displayName: "",
      duration: null,
      thumbnailUrl: null,
      peaks: null
    };
  } else {
    version.deliverables.push({
      id: uid(),
      name: file.name,
      size: file.size,
      type,
      url
    });
  }

  cue.versions.push(version);
  cue.status = computeCueStatus(cue);
  
  // Start async upload to Supabase
  uploadFileToSupabase(file, project.id, cue.id, version.id);
  
  return version;
}

// =======================
// PROJECT REFERENCES (WITH VERSIONS)
// =======================
function createReferenceForProject(project, file, existingRefRoot) {
  ensureProjectReferences(project);
  const type = detectRawType(file.name);
  const url = URL.createObjectURL(file);

  const versionEntry = {
    id: uid(),
    name: file.name,
    size: file.size,
    type,
    url,
    createdAt: Date.now(),
    duration: null,
    thumbnailUrl: null
  };

  if (existingRefRoot) {
    existingRefRoot.versions.push(versionEntry);
    existingRefRoot.activeVersionIndex = existingRefRoot.versions.length - 1;
  } else {
    const root = {
      id: uid(),
      name: cleanFileName(file.name),
      versions: [versionEntry],
      activeVersionIndex: 0
    };
    project.references.push(root);
  }
}

function getReferenceIcon(type) {
  switch (type) {
    case "pdf":
      return "📄";
    case "image":
      return "🖼️";
    case "audio":
      return "🎵";
    case "video":
      return "🎬";
    case "zip":
      return "🗂️";
    default:
      return "📁";
  }
}

function getReferenceLabel(type) {
  switch (type) {
    case "pdf":
      return "PDF";
    case "image":
      return "Image";
    case "audio":
      return "Audio";
    case "video":
      return "Video";
    case "zip":
      return "Archive";
    default:
      return "File";
  }
}

function applyReferencesCollapsedState() {
  if (!refsBodyEl || !refsToggleBtn) return;
  if (referencesCollapsed) {
    refsBodyEl.classList.add("collapsed");
    refsToggleBtn.textContent = "Show";
  } else {
    refsBodyEl.classList.remove("collapsed");
    refsToggleBtn.textContent = "Hide";
  }
}

// =======================
// MINI WAVEFORM (CUE VERSIONS)
// =======================
function createMiniWave(version, container) {
  if (!version.media || version.media.type !== "audio" || !version.media.url)
    return;

  container.innerHTML = "";
  container.style.position = "relative";
  container.style.overflow = "hidden";

  if (miniWaves[version.id]) {
    try {
      miniWaves[version.id].destroy();
    } catch (e) {}
    delete miniWaves[version.id];
  }

  const ws = WaveSurfer.create({
    container,
    height: 36,
    waveColor: "rgba(148,163,184,0.8)",
    progressColor: "rgba(56,189,248,1)",
    cursorWidth: 0,
    barWidth: 2,
    barGap: 1,
    interact: false,
    responsive: true,
    normalize: true
  });

  miniWaves[version.id] = ws;

  ws.load(getProxiedUrl(version.media.url));

  ws.on("ready", () => {
    if (!version.media.duration) {
      version.media.duration = ws.getDuration();
    }

    const metaEl = document.querySelector(
      `.version-row[data-version-id="${version.id}"] .version-meta`
    );

    if (metaEl) {
      const dur = version.media.duration
        ? formatTime(version.media.duration)
        : "--:--";
      let txt = `Audio · ${dur}`;
      if (version.deliverables?.length) {
        txt += ` · ${version.deliverables.length} tech files`;
      }
      metaEl.textContent = txt;
    }

    ws.drawBuffer();
  });
}

// =======================
// MINI WAVEFORM (REFERENCE VERSIONS)
// =======================
function createRefMiniWave(refVersion, container) {
  if (refVersion.type !== "audio" || !refVersion.url) return;

  container.innerHTML = "";
  container.style.position = "relative";
  container.style.overflow = "hidden";

  if (miniWaves[refVersion.id]) {
    try {
      miniWaves[refVersion.id].destroy();
    } catch (e) {}
    delete miniWaves[refVersion.id];
  }

  const ws = WaveSurfer.create({
    container,
    height: 32,
    waveColor: "rgba(148,163,184,0.8)",
    progressColor: "rgba(56,189,248,1)",
    cursorWidth: 0,
    barWidth: 2,
    barGap: 1,
    interact: false,
    responsive: true,
    normalize: true
  });

  miniWaves[refVersion.id] = ws;

  ws.load(getProxiedUrl(refVersion.url));

  ws.on("ready", () => {
    if (!refVersion.duration) {
      refVersion.duration = ws.getDuration();
    }
    const metaEls = document.querySelectorAll(
      `.ref-version-row[data-ref-version-id="${refVersion.id}"] .ref-version-meta`
    );
    const dur = refVersion.duration ? formatTime(refVersion.duration) : "--:--";
    const base = `Audio · ${dur}`;
    metaEls.forEach(el => {
      el.textContent = base;
    });
    ws.drawBuffer();
  });
}

// =======================
// VIDEO THUMBNAIL HELPERS
// =======================
function generateVideoThumbnailRaw(url) {
  return new Promise(resolve => {
    if (!url) {
      console.log("[generateVideoThumbnailRaw] No URL provided");
      return resolve(null);
    }

    const startTs = Date.now();
    console.log("[generateVideoThumbnailRaw] Starting with URL:", url);

    const video = document.createElement("video");
    // Prefer anonymous CORS for canvas extraction; Supabase buckets should allow CORS for this to work.
    video.crossOrigin = "anonymous";
    video.src = getProxiedUrl(url);
    video.muted = true;
    // Preload only metadata to avoid downloading full video when generating a frame
    video.preload = "metadata";
    video.playsInline = true;
    video.style.position = "absolute";
    video.style.left = "-9999px";
    video.style.width = "320px";
    video.style.height = "180px";
    document.body.appendChild(video);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let resolved = false;
    let timeoutId;

    function cleanup() {
      clearTimeout(timeoutId);
      try {
        video.pause();
      } catch {}
      video.removeAttribute("src");
      try {
        video.load();
      } catch {}
      video.remove();
    }

    function resolve_once(result) {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(result);
      }
    }

    video.addEventListener("loadedmetadata", () => {
      console.log("[generateVideoThumbnailRaw] loadedmetadata event fired, duration:", video.duration);
      try {
        const t = Math.min(video.duration * 0.2, video.duration - 0.1);
        video.currentTime = isFinite(t) && t > 0 ? t : 0;
      } catch (e) {
        console.error("[generateVideoThumbnailRaw] Error setting currentTime:", e);
        resolve_once(null);
      }
    });

    video.addEventListener("seeked", () => {
      console.log("[generateVideoThumbnailRaw] seeked event fired");
      try {
        const w = video.videoWidth || 320;
        const h = video.videoHeight || 180;
        canvas.width = 320;
        canvas.height = Math.round((320 * h) / w);

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataURL = canvas.toDataURL("image/png");
        console.log("[generateVideoThumbnailRaw] Generated thumbnail in", Date.now() - startTs, "ms");
        resolve_once(dataURL);
      } catch (e) {
        console.error("[generateVideoThumbnailRaw] Error drawing canvas:", e);
        resolve_once(null);
      }
    });

    video.addEventListener("error", (e) => {
      const errMsg = e.target?.error?.message || "Unknown error";
      console.warn("[generateVideoThumbnailRaw] Video CORS/load error:", errMsg);
      console.log("[generateVideoThumbnailRaw] Failed in", Date.now() - startTs, "ms");
      resolve_once(null);
    });

    video.addEventListener("canplay", () => {
      console.log("[generateVideoThumbnailRaw] canplay event fired");
      // Try to seek if we haven't fired seeked yet
      if (!resolved) {
        try {
          const t = Math.min(video.duration * 0.2, video.duration - 0.1);
          video.currentTime = isFinite(t) && t > 0 ? t : 0;
        } catch {}
      }
    });

    // Set a timeout - if metadata isn't loaded in 4s, give up
    timeoutId = setTimeout(() => {
      console.log("[generateVideoThumbnailRaw] Timeout - video did not load metadata after", Date.now() - startTs, "ms");
      resolve_once(null);
    }, 4000);
  });
}

// Existing version video thumbs
function generateVideoThumbnailFromUrl(version) {
  const url = version.media?.url;
  return generateVideoThumbnailRaw(getProxiedUrl(url));
}

// =======================
// PLAYER AUDIO / VIDEO
// =======================
function destroyMainWave() {
  if (mainWave) {
    try {
      mainWave.destroy();
    } catch {}
    mainWave = null;
  }
  if (activeAudioEl) {
    try {
      activeAudioEl.pause();
      activeAudioEl.removeAttribute('src');
      activeAudioEl.load();
      activeAudioEl.remove();
    } catch (e) {}
    activeAudioEl = null;
  }
}

function stopVideo() {
  if (activeVideoEl) {
    try {
      activeVideoEl.pause();
    } catch {}
    activeVideoEl = null;
  }
}

function setCommentsEnabled(x) {
  commentInputEl.disabled = !x;
  addCommentBtn.disabled = !x;
}

function getCurrentMediaTime() {
  if (mainWave) return mainWave.getCurrentTime();
  if (activeVideoEl) return activeVideoEl.currentTime;
  return 0;
}

function loadAudioPlayer(project, cue, version) {
  const tStart = Date.now();
  destroyMainWave();
  stopVideo();
  
  playerMediaEl.innerHTML = '<div id="waveform"></div>';
  
  playPauseBtn.style.display = "inline-block";
  timeLabelEl.style.display = "inline-block";
  playPauseBtn.disabled = true;
  timeLabelEl.textContent = "00:00 / 00:00";

  // Use WebAudio backend to fetch and decode audio (better handling of CORS
  // and avoids MediaElement crossOrigin pitfalls). WaveSurfer will fetch the
  // proxied URL which already returns proper CORS headers.
  mainWave = WaveSurfer.create({
    container: "#waveform",
    backend: 'WebAudio',
    mediaControls: false,
    height: 80,
    waveColor: "rgba(148,163,184,0.8)",
    progressColor: "#38bdf8",
    cursorColor: "#f97316",
    barWidth: 2,
    barGap: 1,
    responsive: true,
    normalize: true
  });

  try {
    mainWave.load(getProxiedUrl(version.media.url));
  } catch (e) {
    console.warn('loadAudioPlayer: WaveSurfer load failed', e);
  }

  mainWave.on && mainWave.on("ready", () => {
    try {
      console.log("[loadAudioPlayer] WaveSurfer ready for version", version.id, "in", Date.now() - tStart, "ms");
    } catch (e) {}
  });

  setCommentsEnabled(true);

  mainWave.on("ready", () => {
    const dur = mainWave.getDuration();
    version.media.duration = dur;
    timeLabelEl.textContent = `00:00 / ${formatTime(dur)}`;
    playPauseBtn.disabled = false;

    if (volumeSlider) {
      const vol = parseFloat(volumeSlider.value || "1");
      mainWave.setVolume(isNaN(vol) ? 1 : vol);
      volumeSlider.style.display = "block";
      volumeSlider.disabled = false;
    }
  });

  mainWave.on("audioprocess", () => {
    if (!mainWave || mainWave.isDragging) return;
    const cur = mainWave.getCurrentTime();
    const tot = mainWave.getDuration();
    timeLabelEl.textContent = `${formatTime(cur)} / ${formatTime(tot)}`;
  });

  mainWave.on("seek", () => {
    const cur = mainWave.getCurrentTime();
    const tot = mainWave.getDuration();
    timeLabelEl.textContent = `${formatTime(cur)} / ${formatTime(tot)}`;
  });

  playPauseBtn.onclick = () => {
    mainWave.playPause();
    playPauseBtn.textContent = mainWave.isPlaying() ? "Pause" : "Play";
  };
}

function loadVideoPlayer(project, cue, version) {
  destroyMainWave();
  stopVideo();

  playerMediaEl.innerHTML = "";

  playPauseBtn.style.display = "none";
  timeLabelEl.style.display = "none";
  if (volumeSlider) {
    volumeSlider.style.display = "none";
  }

  const shell = document.createElement("div");
  shell.className = "video-shell";

  const inner = document.createElement("div");
  inner.className = "video-shell-inner";
  shell.appendChild(inner);

  const thumb = document.createElement("div");
  thumb.className = "video-thumb";

  if (version.media.thumbnailUrl) {
    thumb.style.backgroundImage = `url(${getProxiedUrl(version.media.thumbnailUrl)})`;
  }

  const playBtn = document.createElement("button");
  playBtn.className = "video-play-button";
  playBtn.textContent = "▶";

  thumb.appendChild(playBtn);
  inner.appendChild(thumb);
  playerMediaEl.appendChild(shell);

  setCommentsEnabled(true);

  playBtn.addEventListener("click", () => {
    inner.innerHTML = "";

    const video = document.createElement("video");
    video.className = "video-player";
    video.src = getProxiedUrl(version.media.url);
    video.controls = true;
    video.playsInline = true;
    inner.appendChild(video);

    activeVideoEl = video;

    video.addEventListener("loadedmetadata", () => {
      version.media.duration = video.duration;
    });

    video.play().catch(() => {});
  });
}

// =======================
// PLAYER REFERENCES (AUDIO/VIDEO/PDF/IMAGE)
// =======================
function renderReferencePlayer(project) {
  destroyMainWave();
  stopVideo();
  currentPlayerVersionId = null;
  currentPlayerMediaType = null;

  ensureProjectReferences(project);
  const refs = project.references || [];

  if (!refs.length) {
    playerTitleEl.textContent = "No reference selected";
    playerBadgeEl.textContent = "";
    playerBadgeEl.dataset.status = "";
    playerMediaEl.innerHTML =
      '<div class="player-placeholder">No reference files.</div>';
    playPauseBtn.style.display = "none";
    timeLabelEl.style.display = "none";
    if (volumeSlider) volumeSlider.style.display = "none";
    setCommentsEnabled(false);
    commentsListEl.innerHTML = "";
    commentsSummaryEl.textContent = "No comments";
    return;
  }

  let root =
    refs.find(r => r.id === project.activeReferenceId) || refs[0];
  project.activeReferenceId = root.id;

  const activeIndex =
    typeof root.activeVersionIndex === "number"
      ? root.activeVersionIndex
      : root.versions.length - 1;
  const active = root.versions[activeIndex];

  playerTitleEl.textContent = active.name;
  playerBadgeEl.textContent = "Reference";
  playerBadgeEl.dataset.status = "reference";

  // Comments OFF for references
  setCommentsEnabled(false);
  commentsListEl.innerHTML = "";
  commentsSummaryEl.textContent =
    "Comments only available on review versions";

  const type = active.type;

  // AUDIO REFERENCE → waveform like cue
  if (type === "audio") {
    destroyMainWave();
    stopVideo();

    playerMediaEl.innerHTML = '<div id="waveform"></div>';

    playPauseBtn.style.display = "inline-block";
    timeLabelEl.style.display = "inline-block";
    playPauseBtn.disabled = true;
    timeLabelEl.textContent = "00:00 / 00:00";

    mainWave = WaveSurfer.create({
      container: "#waveform",
      height: 80,
      waveColor: "rgba(148,163,184,0.8)",
      progressColor: "#38bdf8",
      cursorColor: "#f97316",
      barWidth: 2,
      barGap: 1,
      responsive: true,
      normalize: true
    });

    mainWave.load(getProxiedUrl(active.url));

    mainWave.on("ready", () => {
      const dur = mainWave.getDuration();
      active.duration = dur;
      timeLabelEl.textContent = `00:00 / ${formatTime(dur)}`;
      playPauseBtn.disabled = false;

      if (volumeSlider) {
        const vol = parseFloat(volumeSlider.value || "1");
        mainWave.setVolume(isNaN(vol) ? 1 : vol);
        volumeSlider.style.display = "block";
        volumeSlider.disabled = false;
      }
    });

    mainWave.on("audioprocess", () => {
      if (!mainWave || mainWave.isDragging) return;
      const cur = mainWave.getCurrentTime();
      const tot = mainWave.getDuration();
      timeLabelEl.textContent = `${formatTime(cur)} / ${formatTime(tot)}`;
    });

    mainWave.on("seek", () => {
      const cur = mainWave.getCurrentTime();
      const tot = mainWave.getDuration();
      timeLabelEl.textContent = `${formatTime(cur)} / ${formatTime(tot)}`;
    });

    playPauseBtn.onclick = () => {
      mainWave.playPause();
      playPauseBtn.textContent = mainWave.isPlaying() ? "Pause" : "Play";
    };

    return;
  }

  // VIDEO REFERENCE → video player
  if (type === "video") {
    destroyMainWave();
    stopVideo();

    playerMediaEl.innerHTML = "";

    playPauseBtn.style.display = "none";
    timeLabelEl.style.display = "none";
    if (volumeSlider) {
      volumeSlider.style.display = "none";
    }

    const shell = document.createElement("div");
    shell.className = "video-shell";

    const inner = document.createElement("div");
    inner.className = "video-shell-inner";
    shell.appendChild(inner);

    const thumb = document.createElement("div");
    thumb.className = "video-thumb";

    const playBtn = document.createElement("button");
    playBtn.className = "video-play-button";
    playBtn.textContent = "▶";

    thumb.appendChild(playBtn);
    inner.appendChild(thumb);
    playerMediaEl.appendChild(shell);

    playBtn.addEventListener("click", () => {
      inner.innerHTML = "";

      const video = document.createElement("video");
      video.className = "video-player";
      video.src = getProxiedUrl(active.url);
      video.controls = true;
      video.playsInline = true;
      inner.appendChild(video);

      activeVideoEl = video;
      video.play().catch(() => {});
    });

    return;
  }

  // PDF
  if (type === "pdf") {
    playPauseBtn.style.display = "none";
    timeLabelEl.style.display = "none";
    if (volumeSlider) volumeSlider.style.display = "none";

    playerMediaEl.innerHTML =
      `<div class="player-pdf"><iframe src="${active.url}"></iframe></div>`;
    return;
  }

  // IMAGE
  if (type === "image") {
    playPauseBtn.style.display = "none";
    timeLabelEl.style.display = "none";
    if (volumeSlider) volumeSlider.style.display = "none";

    playerMediaEl.innerHTML =
      `<div class="player-image"><img src="${active.url}" alt="${active.name}" /></div>`;
    return;
  }

  // OTHER TYPES
  playPauseBtn.style.display = "none";
  timeLabelEl.style.display = "none";
  if (volumeSlider) volumeSlider.style.display = "none";

  playerMediaEl.innerHTML =
    '<div class="player-placeholder">Reference file. Use the "Download" button in the left panel.</div>';
}

// =======================
// VOLUME SLIDER AUDIO ONLY
// =======================
if (volumeSlider) {
  volumeSlider.addEventListener("input", () => {
    const vol = parseFloat(volumeSlider.value || "1");
    if (mainWave) {
      mainWave.setVolume(isNaN(vol) ? 1 : vol);
    }
  });
}

// =======================
// COMMENTS
// =======================
// Small non-blocking alert/confirm helpers (returns Promises)
function showAlert(message) {
  return new Promise((resolve) => {
    try {
      const wrapper = document.createElement('div');
      wrapper.className = 'ap-overlay-alert';
      Object.assign(wrapper.style, {
        position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: '9999', background: 'rgba(0,0,0,0.45)'
      });

      const box = document.createElement('div');
      Object.assign(box.style, {
        background: '#020617', color: '#e5e7eb', padding: '12px 16px',
        borderRadius: '8px', boxShadow: '0 6px 18px rgba(0,0,0,0.6)',
        maxWidth: '90%', textAlign: 'center', border: '1px solid #1f2937'
      });

      const txt = document.createElement('div');
      txt.style.marginBottom = '12px';
      txt.textContent = message || '';

      const ok = document.createElement('button');
      ok.className = 'primary-btn tiny';
      ok.textContent = 'OK';

      // close on OK, click outside, or ESC
      const cleanup = () => {
        try { document.body.removeChild(wrapper); } catch (e) {}
        document.removeEventListener('keydown', onKey);
      };
      const onKey = (ev) => { if (ev.key === 'Escape') { cleanup(); resolve(); } };

      ok.addEventListener('click', () => { cleanup(); resolve(); });
      wrapper.addEventListener('click', (ev) => { if (ev.target === wrapper) { cleanup(); resolve(); } });
      document.addEventListener('keydown', onKey);

      box.appendChild(txt);
      box.appendChild(ok);
      wrapper.appendChild(box);
      document.body.appendChild(wrapper);
    } catch (e) {
      // fallback to native alert if something goes wrong
      try { alert(message); } catch (e2) {}
      resolve();
    }
  });
}

function showConfirm(message) {
  return new Promise((resolve) => {
    try {
      const wrapper = document.createElement('div');
      wrapper.className = 'ap-overlay-confirm';
      Object.assign(wrapper.style, {
        position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: '9999', background: 'rgba(0,0,0,0.45)'
      });

      const box = document.createElement('div');
      Object.assign(box.style, {
        background: '#020617', color: '#e5e7eb', padding: '14px 18px',
        borderRadius: '8px', boxShadow: '0 6px 18px rgba(0,0,0,0.6)',
        maxWidth: '90%', textAlign: 'center', border: '1px solid #1f2937'
      });

      const txt = document.createElement('div');
      txt.style.marginBottom = '12px';
      txt.textContent = message || '';

      const yes = document.createElement('button');
      yes.className = 'primary-btn tiny';
      yes.textContent = 'Yes';
      const no = document.createElement('button');
      no.className = 'ghost-btn tiny';
      no.style.marginLeft = '8px';
      no.textContent = 'No';

      const cleanup = (val) => {
        try { document.body.removeChild(wrapper); } catch (e) {}
        document.removeEventListener('keydown', onKey);
        resolve(val);
      };
      const onKey = (ev) => { if (ev.key === 'Escape') cleanup(false); };

      yes.addEventListener('click', () => cleanup(true));
      no.addEventListener('click', () => cleanup(false));
      wrapper.addEventListener('click', (ev) => { if (ev.target === wrapper) cleanup(false); });
      document.addEventListener('keydown', onKey);

      box.appendChild(txt);
      // action row container for consistent spacing
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'center';
      row.style.gap = '8px';
      row.appendChild(yes);
      row.appendChild(no);
      box.appendChild(row);
      wrapper.appendChild(box);
      document.body.appendChild(wrapper);
    } catch (e) {
      // fallback to native confirm
      try { resolve(confirm(message)); } catch (e2) { resolve(false); }
    }
  });
}

function renderComments() {
  const ctx = getActiveContext();
  if (!ctx || !ctx.version.media) {
    commentsListEl.innerHTML = "";
    commentsSummaryEl.textContent = "No comments";
    setCommentsEnabled(false);
    return;
  }

  const { version } = ctx;
  const arr = version.comments;

  commentsListEl.innerHTML = "";

  if (!arr.length) {
    commentsSummaryEl.textContent = "No comments";
    return;
  }

  commentsSummaryEl.textContent = `${arr.length} comments`;

  arr.forEach(c => {
    const li = document.createElement("li");
    li.style.position = 'relative';

    const tc = document.createElement("span");
    tc.className = "timecode";
    tc.textContent = formatTime(c.time);

    const author = document.createElement("span");
    author.className = "author";
    author.textContent = c.author || "Client";

    const text = document.createElement("p");
    text.textContent = c.text;

    // Actions (edit/delete) only visible to comment owner
    const actions = document.createElement('div');
    actions.className = 'comment-actions';
    try {
      const currentUser = window.flowAuth ? window.flowAuth.getUser() : null;
      const currentUid = currentUser ? currentUser.id : null;
      const isOwner = currentUid && c.actorId && currentUid === c.actorId;

      if (isOwner) {
        // Create menu-based actions (three-dot menu) instead of inline buttons
        const renderOwnerActions = () => {
          actions.innerHTML = '';
          const menuContainer = document.createElement('div');
          // reuse download-dropdown semantics so styling matches cue/refs menus
          menuContainer.className = 'download-dropdown comment-dropdown';
          menuContainer.style.position = 'absolute';
          menuContainer.style.top = '8px';
          menuContainer.style.right = '12px';

          const menuBtn = document.createElement('button');
          // use the same icon button classes as cue/refs three-dot menus
          menuBtn.type = 'button';
          menuBtn.className = 'icon-btn tiny download-toggle';
          menuBtn.setAttribute('aria-label', 'Comment actions');
          menuBtn.title = 'Comment actions';
          // three-dot horizontal glyph to match other menus
          menuBtn.textContent = '⋯';
          // ensure visibility in case inherited styles hide small icon buttons
          menuBtn.style.color = '#9ca3af';
          menuBtn.style.background = 'transparent';
          menuBtn.style.padding = '2px 6px';
          menuBtn.style.fontSize = '16px';
          menuBtn.style.lineHeight = '1';

          const menu = document.createElement('div');
          // reuse existing blue dropdown styles
          menu.className = 'download-menu';
          // we'll control visibility via CSS (.open) and position fixed to avoid clipping
          menu.style.position = 'fixed';
          menu.style.zIndex = 10000;

          const mEdit = document.createElement('button');
          mEdit.textContent = 'Edit';

          const mDelete = document.createElement('button');
          mDelete.textContent = 'Delete';

          // Edit handler (reuse existing edit flow)
          const startEdit = () => {
            // replace text with input
            const input = document.createElement('input');
            input.type = 'text';
            input.value = c.text || '';
            input.style.width = '60%';
            const save = document.createElement('button');
            save.className = 'primary-btn tiny';
            save.textContent = 'Save';
            const cancel = document.createElement('button');
            cancel.className = 'ghost-btn tiny';
            cancel.textContent = 'Cancel';

            // swap nodes
            li.replaceChild(input, text);
            actions.innerHTML = '';
            actions.appendChild(save);
            actions.appendChild(cancel);

            save.addEventListener('click', async (e) => {
              e.stopPropagation();
              const newText = input.value.trim();
              if (!newText) {
                await showAlert('Comment text cannot be empty');
                return;
              }
              try {
                const headers = window.flowAuth ? window.flowAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };
                const r = await fetch('/api/comments', {
                  method: 'PATCH',
                  headers,
                  body: JSON.stringify({ id: c.id, text: newText })
                });
                const j = await r.json();
                if (!r.ok || j.error) {
                  await showAlert('Errore aggiornamento commento: ' + (j.error || r.statusText));
                  return;
                }
                // update local model
                c.text = j.comment.text || newText;
                // restore UI
                text.textContent = c.text;
                li.replaceChild(text, input);
                renderOwnerActions();
              } catch (err) {
                console.error('Error updating comment', err);
                alert('Eccezione durante aggiornamento commento');
              }
            });

            cancel.addEventListener('click', (e) => {
              e.stopPropagation();
              // restore
              li.replaceChild(text, input);
              renderOwnerActions();
            });
          };

          // Delete handler
          const doDelete = async () => {
            if (!await showConfirm('Delete this comment?')) return;
            try {
              const r = await fetch(`/api/comments?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' });
              const j = await r.json();
              if (!r.ok || j.error) {
                await showAlert('Errore cancellazione commento: ' + (j.error || r.statusText));
                return;
              }
              // remove from local array
              const idx = version.comments.findIndex(x => x.id === c.id);
              if (idx >= 0) version.comments.splice(idx, 1);
              renderComments();
            } catch (err) {
              console.error('Error deleting comment', err);
              alert('Eccezione durante cancellazione commento');
            }
          };

          mEdit.addEventListener('click', (ev) => { ev.stopPropagation(); startEdit(); });
          mDelete.addEventListener('click', async (ev) => { ev.stopPropagation(); await doDelete(); });

          menu.appendChild(mEdit);
          menu.appendChild(mDelete);

          // append menu button and menu into the download-dropdown wrapper
          menuContainer.appendChild(menuBtn);
          menuContainer.appendChild(menu);
          actions.appendChild(menuContainer);

          // Toggle open class on wrapper (same behavior as cue/refs menus)
          menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = menuContainer.classList.contains('open');
            document
              .querySelectorAll('.download-dropdown.open')
              .forEach(x => x.classList.remove('open'));
            if (!open) {
              menuContainer.classList.add('open');
              // position relative to viewport using button rect
              const rect = menuBtn.getBoundingClientRect();
              // compute width (fallback if not yet rendered)
              const mW = menu.offsetWidth || 150;
              const left = Math.max(8, rect.right - mW);
              const top = Math.max(8, rect.bottom + 6);
              menu.style.left = left + 'px';
              menu.style.top = top + 'px';
            } else {
              menuContainer.classList.remove('open');
            }
          });

          // close menu when clicking an item
          menu.querySelectorAll('button').forEach(b => {
            b.addEventListener('click', (ev) => {
              ev.stopPropagation();
              menuContainer.classList.remove('open');
            });
          });
        };

        renderOwnerActions();
      }
    } catch (e) {
      // ignore
    }

    li.appendChild(tc);
    li.appendChild(author);
    li.appendChild(text);
    if (actions && actions.childNodes && actions.childNodes.length) li.appendChild(actions);

    li.addEventListener("click", () => {
      const t = c.time || 0;
      if (mainWave) {
        const tot = mainWave.getDuration();
        if (tot > 0) {
          mainWave.seekTo(t / tot);
          if (!mainWave.isPlaying()) mainWave.play();
        }
      }
      if (activeVideoEl) {
        activeVideoEl.currentTime = t;
        if (activeVideoEl.paused) activeVideoEl.play();
      }
    });

    commentsListEl.appendChild(li);
  });

  setCommentsEnabled(true);
}

// =======================
// LOAD PROJECT DATA FROM API
// =======================
async function loadProjectCues(projectId) {
  try {
    const project = getProjectById(projectId);
    if (!project) return;

    console.log("[Flow] Loading cues for project:", projectId);

    const response = await fetch(`/api/cues?projectId=${projectId}`);
    if (!response.ok) {
      console.error("[Flow] Failed to load cues:", response.statusText);
      return;
    }

    const data = await response.json();
    const cuesFromDb = data.cues || [];

    console.log("[Flow] Loaded cues:", cuesFromDb.length);

    // Load versions for each cue
    const cuesWithVersions = await Promise.all(
      cuesFromDb.map(async (dbCue) => {
        const versionResponse = await fetch(`/api/versions?cueId=${dbCue.id}`);
        const versionData = versionResponse.ok ? await versionResponse.json() : { versions: [] };
        const versions = versionData.versions || [];

        console.log(`[Flow] Loaded ${versions.length} versions for cue ${dbCue.id}`);

        return {
          id: dbCue.id,
          index: dbCue.index_in_project || 0,
          originalName: dbCue.name || "Untitled",
          name: dbCue.name || "Untitled",
          displayName: "",
          status: dbCue.status || "in-review",
            versions: await Promise.all(versions.map(async (v) => {
              const ver = {
                id: v.id,
                index: v.index_in_cue || 0,
                media: v.media_type ? {
                  type: v.media_type,
                  url: v.media_url,
                  originalName: v.media_filename || "Media",
                  displayName: v.media_filename || "Media",
                  duration: v.duration,
                  thumbnailUrl: v.thumbnail_url,
                  peaks: null
                } : null,
                comments: [],
                deliverables: [],
                status: v.status || "in-review"
              };
              try {
                const r = await fetch(`/api/comments?versionId=${encodeURIComponent(v.id)}`);
                if (r.ok) {
                  const d = await r.json();
                  const rows = d.comments || [];
                  ver.comments = (rows || []).map(rc => ({
                    id: rc.id,
                    time: rc.time_seconds !== undefined ? rc.time_seconds : (rc.time || 0),
                    author: rc.author || 'Client',
                    actorId: rc.actor_id || null,
                    text: rc.text || '',
                    created_at: rc.created_at
                  }));
                }
              } catch (e) {
                console.warn('[Flow] Failed to load comments for version', v.id, e);
                ver.comments = [];
              }
              return ver;
            })),
          isOpen: true
        };
      })
    );

    // Update project with loaded cues
    project.cues = cuesWithVersions;

    console.log('[Flow] cuesWithVersions sample:', cuesWithVersions.slice(0,5).map(c => ({ id: c.id, versions: c.versions.length, isOpen: c.isOpen })));

    // Set first cue/version as active if any exist
    if (cuesWithVersions.length > 0) {
      const firstCue = cuesWithVersions[0];
      project.activeCueId = firstCue.id;
      if (firstCue.versions.length > 0) {
        project.activeVersionId = firstCue.versions[0].id;
      }
    }

    console.log("[Flow] Project cues loaded successfully");
    refreshAllNames();
    await loadProjectReferences(projectId); // load references alongside cues
    renderAll();
  } catch (err) {
    console.error("[Flow] Error loading project cues:", err);
  }
}

// Load references (roots + versions) for a project
async function loadProjectReferences(projectId) {
  try {
    const project = getProjectById(projectId);
    if (!project) return;

    const res = await fetch(`/api/references?projectId=${projectId}`);
    if (!res.ok) {
      console.error("[Flow] Failed to load references", res.statusText);
      project.references = [];
      renderReferences();
      return;
    }

    const data = await res.json();
    const roots = data.references || [];

    // Sanitize references and versions to avoid undefined entries
    project.references = (roots || [])
      .filter(r => r && typeof r === 'object')
      .map((r) => ({
        id: r.id,
        name: r.name,
        activeVersionIndex: typeof r.active_version_index === "number" ? r.active_version_index : 0,
        versions: (r.versions || [])
          .filter(v => v && typeof v === 'object')
          .map((v) => ({
            id: v.id,
            name: v.name,
            type: v.type || 'other',
            url: v.url,
            size: v.size,
            duration: v.duration,
            thumbnailUrl: v.thumbnail_url || v.thumbnail_path || null,
          }))
          .filter(v => !!v)
      }))
      // Drop empty reference groups with no versions to prevent rendering errors
      .filter(r => Array.isArray(r.versions) && r.versions.length > 0);

    console.log('[Flow] References sanitized:', project.references.length);

    if (!project.activeReferenceId && project.references.length) {
      project.activeReferenceId = project.references[0].id;
    }

    renderReferences();
  } catch (err) {
    console.error("[Flow] Error loading references", err);
  }
}

function addCommentFromInput() {
  const ctx = getActiveContext();
  if (!ctx) return;

  const { version } = ctx;
  if (!version.media) return;

  const text = commentInputEl.value.trim();
  if (!text) return;

  const t = getCurrentMediaTime();
  const tc = formatTime(t);

  let final = text;
  if (text.startsWith(tc)) {
    final = text.slice(tc.length).trim().replace(/^,/, "").trim();
  }

  // determine author display (try client-side metadata), then optimistic UI
  const user = window.flowAuth ? window.flowAuth.getUser() : null;
  const meta = user && user.user_metadata ? user.user_metadata : {};
  const first = meta.first_name || meta.firstName || meta.first || '';
  const last = meta.last_name || meta.lastName || meta.last || '';
  const displayName = meta.full_name || meta.fullName || meta.display_name || `${first} ${last}`.trim() || user?.email || 'Client';

  const localId = uid();
  version.comments.push({
    id: localId,
    time: t,
    author: displayName,
    text: final,
    // optimistic actor id so owner actions (three-dot menu) show immediately
    actorId: user ? user.id : null
  });

  commentInputEl.value = "";
  renderComments();

  // persist to server
  (async () => {
    try {
      const headers = window.flowAuth ? window.flowAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };
      let resp;
      if (typeof apiCall === 'function') {
        resp = await apiCall('/api/comments', {
          method: 'POST',
          headers,
          body: JSON.stringify({ version_id: version.id, time_seconds: t, text: final, author: displayName })
        });
      } else {
        const r = await fetch('/api/comments', {
          method: 'POST',
          headers,
          body: JSON.stringify({ version_id: version.id, time_seconds: t, text: final, author: displayName })
        });
        try { resp = await r.json(); } catch(e) { resp = { error: 'invalid_json' }; }
      }

      console.log('[addComment] server response', resp);
      if (!resp || resp.error) {
        console.error('[addComment] failed to save', resp && resp.error);
        try { alert('Errore salvataggio commento: ' + (resp && resp.error ? resp.error : 'unknown')); } catch(e){}
        return;
      }

      // replace local optimistic id with server id if provided
      const saved = resp.comment;
      if (saved && saved.id) {
        for (let c of version.comments) {
          if (c.id === localId) {
            c.id = saved.id;
            c.created_at = saved.created_at || c.created_at;
            // ensure actorId is set from server if present, otherwise keep optimistic value
            if (saved.actorId) c.actorId = saved.actorId;
            else if (user && user.id) c.actorId = user.id;
            break;
          }
        }
        renderComments();
      }
    } catch (err) {
      console.error('[addComment] exception saving comment', err);
      try { alert('Eccezione durante il salvataggio del commento: ' + String(err)); } catch(e){}
    }
  })();
}

commentInputEl.addEventListener("focus", () => {
  const t = getCurrentMediaTime();
  const tc = formatTime(t);
  const base = `${tc}, `;
  if (!commentInputEl.value.startsWith(base)) {
    commentInputEl.value = base;
    commentInputEl.setSelectionRange(
      commentInputEl.value.length,
      commentInputEl.value.length
    );
  }
});

commentInputEl.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    addCommentFromInput();
  }
});

addCommentBtn.addEventListener("click", addCommentFromInput);

// =======================
// CUE LIST + VERSION PREVIEW
// =======================
function renderCueList() {
  const project = getActiveProject();
  console.log("renderCueList: project", project && project.id, "cuesCount", project && project.cues && project.cues.length);
  if (!project) {
    cueListEl.innerHTML = 'No project. Click "New project".';
    cueListSubtitleEl.textContent = "No project yet.";
    if (rightColEl) rightColEl.style.display = "none";
    return;
  }

  if (!project.cues.length) {
    cueListEl.innerHTML = "No cues yet. Drop a media file.";
    cueListSubtitleEl.textContent = "No cues yet.";
    const hasRefs = project.references && project.references.length;
    if (!hasRefs && rightColEl) rightColEl.style.display = "none";
    return;
  }

  cueListEl.innerHTML = "";
  cueListSubtitleEl.textContent = `${project.cues.length} cues`;

  project.cues.forEach(cue => {
    const details = document.createElement("details");
    details.className = "cue-block";
    details.dataset.cueId = cue.id;
    details.open = cue.isOpen !== false;

    const summary = document.createElement("summary");

    const header = document.createElement("div");
    header.className = "cue-header";

    const left = document.createElement("div");
    const nameEl = document.createElement("div");
    nameEl.className = "cue-name";
    nameEl.textContent = cue.displayName || cue.name;

    const metaEl = document.createElement("div");
    metaEl.className = "cue-meta";
    metaEl.textContent = `${cue.versions.length} versions`;

    left.appendChild(nameEl);
    left.appendChild(metaEl);

    const right = document.createElement("div");
    right.className = "cue-header-right";

    const status = document.createElement("span");
    const statusKey = cue.status || "in-review";
    status.className = `cue-status ${statusKey}`;
    status.textContent = VERSION_STATUSES[statusKey] || "In review";

    const dd = document.createElement("div");
    dd.className = "download-dropdown cue-dropdown";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-btn tiny download-toggle";
    btn.textContent = "⋯";

    const menu = document.createElement("div");
    menu.className = "download-menu";
    menu.innerHTML = `
      <button data-action="rename">Rename</button>
      <button data-action="delete">Delete</button>
    `;

    dd.appendChild(btn);
    dd.appendChild(menu);

    right.appendChild(status);
    right.appendChild(dd);

    header.appendChild(left);
    header.appendChild(right);

    summary.appendChild(header);
    details.appendChild(summary);

    // Ensure summary click toggles details even if other handlers exist
    summary.style.cursor = "pointer";
    summary.addEventListener("click", (e) => {
      // If click originated on a download-toggle or button inside header, don't toggle here
      if (e.target.closest && e.target.closest('.download-toggle')) return;
      // Let the browser perform the native toggle; sync our cue state on next tick
      setTimeout(() => {
        try {
          cue.isOpen = !!details.open;
        } catch (err) {
          console.error("renderCueList: failed to sync cue.isOpen", err, cue && cue.id);
        }
      }, 0);
    });

    // Also listen for native toggle events to keep state in sync
    details.addEventListener('toggle', () => {
      try {
        cue.isOpen = !!details.open;
        console.log('renderCueList: details.toggle', { cueId: cue.id, detailsOpen: details.open });
      } catch (err) {
        console.error('renderCueList: toggle handler failed', err, cue && cue.id);
      }
    });

    const versionsContainer = document.createElement("div");

    cue.versions.forEach(version => {
      const row = document.createElement("div");
      row.className = "version-row";
      row.dataset.cueId = cue.id;
      row.dataset.versionId = version.id;

      const statusKeyV = version.status || "in-review";
      row.dataset.status = statusKeyV;
      row.classList.add(`status-${statusKeyV}`);

      if (
        project.activeCueId === cue.id &&
        project.activeVersionId === version.id
      ) {
        row.classList.add("active");
      }

      const lab = document.createElement("div");
      lab.className = "version-label";
      lab.textContent = computeVersionLabel(version.index);

      const prev = document.createElement("div");
      prev.className = "version-preview";
      prev.id = `preview-${version.id}`;

      const main = document.createElement("div");
      main.className = "version-main";

      const title = document.createElement("div");
      title.className = "version-title";
      title.textContent =
        version.media?.displayName ||
        version.media?.originalName ||
        "Media";

      const meta = document.createElement("div");
      meta.className = "version-meta";
      const d = version.media?.duration
        ? formatTime(version.media.duration)
        : "--:--";
      meta.textContent = version.media
        ? (version.media.type === "audio"
            ? `Audio · ${d}`
            : `Video · ${d}`) +
          (version.deliverables.length
            ? ` · ${version.deliverables.length} tech files`
            : "")
        : version.deliverables.length
        ? `${version.deliverables.length} tech files`
        : "Only deliverables";

      main.appendChild(title);
      main.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "version-actions";

      const top = document.createElement("div");
      top.className = "version-actions-top";

      const dd2 = document.createElement("div");
      dd2.className = "download-dropdown";

      const ddBtn = document.createElement("button");
      ddBtn.type = "button";
      ddBtn.className = "ghost-btn tiny download-toggle";
      ddBtn.textContent = "Download ▾";

      const ddMenu = document.createElement("div");
      ddMenu.className = "download-menu";

      if (version.media) {
        const bMain = document.createElement("button");
        bMain.dataset.action = "download-main";
        bMain.textContent = "Download main media";
        ddMenu.appendChild(bMain);
      }

      if (version.deliverables.length) {
        version.deliverables.forEach(dv => {
          const b = document.createElement("button");
          b.dataset.action = "download-deliverable";
          b.dataset.deliverableId = dv.id;
          b.textContent = `Download ${dv.name}`;
          ddMenu.appendChild(b);
        });
      }

      if (!version.media && !version.deliverables.length) {
        const empty = document.createElement("button");
        empty.disabled = true;
        empty.textContent = "Nothing to download";
        ddMenu.appendChild(empty);
      }

      dd2.appendChild(ddBtn);
      dd2.appendChild(ddMenu);

      top.appendChild(dd2);
      actions.appendChild(top);

      row.appendChild(lab);
      row.appendChild(prev);
      row.appendChild(main);
      row.appendChild(actions);

      row.addEventListener("click", e => {
        if (e.target.closest(".download-toggle")) return;
        state.playerMode = "review";
        project.activeCueId = cue.id;
        project.activeVersionId = version.id;
        updatePlayerModeButtons();
        renderPlayer();
      });

      row.addEventListener("dragover", e => {
        if (!isFileDragEvent(e)) return;
        e.preventDefault();
        row.classList.add("drag-over");
      });

      row.addEventListener("dragleave", e => {
        if (!row.contains(e.relatedTarget)) {
          row.classList.remove("drag-over");
        }
      });

      row.addEventListener("drop", e => {
        if (!isFileDragEvent(e)) return;
        e.preventDefault();
        e.stopPropagation();
        row.classList.remove("drag-over");

        const projectNow = getActiveProject();
        if (!projectNow) return;

        const files = e.dataTransfer.files;
        if (!files || !files.length) return;

        handleFileDropOnVersion(projectNow, cue, version, files[0]);
      });

      ddBtn.addEventListener("click", e => {
        e.stopPropagation();
        const open = dd2.classList.contains("open");
        document
          .querySelectorAll(".download-dropdown.open")
          .forEach(x => x.classList.remove("open"));
        if (!open) dd2.classList.add("open");
      });

      ddMenu.querySelectorAll("button").forEach(b => {
        b.addEventListener("click", e => {
          e.stopPropagation();
          dd2.classList.remove("open");
          const action = b.dataset.action;
          if (action === "download-main") {
            if (version.media && version.media.url) {
              const name =
                version.media.displayName ||
                version.media.originalName ||
                "media";
              triggerDownload(getProxiedUrl(version.media.url), name);
            }
          }
          if (action === "download-deliverable") {
            const id = b.dataset.deliverableId;
            const dv = version.deliverables.find(d => d.id === id);
            if (dv && dv.url) {
              triggerDownload(getProxiedUrl(dv.url), dv.name || "file");
            }
          }
        });
      });

      versionsContainer.appendChild(row);
    });

    details.appendChild(versionsContainer);
    cueListEl.appendChild(details);

    // Debug: log cue/DOM open state after insertion
    try {
      console.log("renderCueList:", { cueId: cue.id, cueIsOpen: cue.isOpen, detailsOpen: details.open, versions: (cue.versions||[]).length, projectActiveCue: project.activeCueId });
    } catch (err) {
      console.log("renderCueList: debug log failed", err);
    }

    details.addEventListener("dragover", e => {
      if (!isFileDragEvent(e)) return;
      e.preventDefault();
      details.classList.add("drag-over");
    });

    details.addEventListener("dragleave", e => {
      if (!details.contains(e.relatedTarget)) {
        details.classList.remove("drag-over");
      }
    });

    details.addEventListener("drop", e => {
      if (!isFileDragEvent(e)) return;
      e.preventDefault();
      e.stopPropagation();
      details.classList.remove("drag-over");

      const projectNow = getActiveProject();
      if (!projectNow) return;

      const files = e.dataTransfer.files;
      if (!files || !files.length) return;

      handleFileDropOnCue(projectNow, cue, files[0]);
    });

    const cueBtn = details.querySelector("button.download-toggle");
    const cueMenu = details.querySelector(".download-menu");
    cueBtn.addEventListener("click", e => {
      e.stopPropagation();
      const open = cueBtn.parentElement.classList.contains("open");
      document
        .querySelectorAll(".download-dropdown.open")
        .forEach(x => x.classList.remove("open"));
      if (!open) cueBtn.parentElement.classList.add("open");
    });

      cueMenu.querySelectorAll("button").forEach(b => {
        b.addEventListener("click", async e => {
        e.stopPropagation();
        cueBtn.parentElement.classList.remove("open");
        const action = b.dataset.action;
        if (action === "rename") {
          const name = prompt("Rename cue", cue.name);
          if (name && name.trim()) {
            const newName = name.trim();
            try {
              const headers = window.flowAuth ? window.flowAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };
              const res = await fetch('/api/cues', {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ id: cue.id, name: newName })
              });
              if (!res.ok) {
                console.error('[FlowPreview] Failed to rename cue', await res.text());
                alert('Errore nel rinominare la cue');
                return;
              }
              cue.name = newName;
              refreshAllNames();
              renderAll();
            } catch (err) {
              console.error('[FlowPreview] Exception renaming cue', err);
              alert('Errore nel rinominare la cue');
            }
          }
        }
        if (action === "delete") {
          const ok = confirm(
            `Delete cue "${cue.displayName || cue.name}"?`
          );
          if (!ok) return;
          
          try {
            const res = await fetch(`/api/cues?id=${encodeURIComponent(cue.id)}`, { method: 'DELETE' });
            if (!res.ok) {
              console.error('[FlowPreview] Failed to delete cue', await res.text());
              alert('Errore nella cancellazione della cue');
              return;
            }
            
            const projectNow = getActiveProject();
            if (!projectNow) return;
            projectNow.cues = projectNow.cues.filter(c => c.id !== cue.id);
            if (projectNow.activeCueId === cue.id) {
              projectNow.activeCueId = projectNow.cues[0]?.id || null;
              projectNow.activeVersionId =
                projectNow.cues[0]?.versions[0]?.id || null;
            }
            renderAll();
          } catch (err) {
            console.error('[FlowPreview] Exception deleting cue', err);
            alert('Errore nella cancellazione della cue');
          }
        }
      });
    });
  });
}

function renderVersionPreviews() {
  const project = getActiveProject();
  if (!project) return;

  project.cues.forEach(cue => {
    cue.versions.forEach(version => {
      const prev = document.getElementById(`preview-${version.id}`);
      if (!prev) return;

      prev.classList.remove("video");
      prev.innerHTML = "";

      if (!version.media) return;

      if (version.media.type === "audio") {
        createMiniWave(version, prev);
      }

      if (version.media.type === "video") {
        prev.classList.add("video");

        // Preferred: show a lightweight <video> element with poster (thumbnail) so
        // the browser displays the thumbnail without loading full video data.
        const makeVideoEl = (videoUrl, posterUrl) => {
          const v = document.createElement("video");
          v.className = "version-thumb-video";
          v.muted = true;
          v.playsInline = true;
          v.preload = "metadata";
          if (posterUrl) v.poster = getProxiedUrl(posterUrl);
          if (videoUrl) {
            // set src but avoid forcing download of large files; browsers will
            // usually fetch only metadata until play is requested.
            v.src = getProxiedUrl(videoUrl);
          }

          // When metadata is loaded, update version duration and the meta text
          v.addEventListener('loadedmetadata', () => {
            try {
              if (!version.media) return;
              // prefer existing duration, otherwise take from video element
              if (!version.media.duration || !isFinite(version.media.duration)) {
                version.media.duration = v.duration;
              }
              const metaEl = document.querySelector(
                `.version-row[data-version-id="${version.id}"] .version-meta`
              );
              if (metaEl) {
                const d = version.media.duration ? formatTime(version.media.duration) : "--:--";
                const filesCount = (version.deliverables && version.deliverables.length) ? ` · ${version.deliverables.length} tech files` : "";
                metaEl.textContent = version.media
                  ? (version.media.type === "audio" ? `Audio · ${d}` : `Video · ${d}`) + filesCount
                  : filesCount || "Only deliverables";
              }
            } catch (e) {
              console.warn('video loadedmetadata handler failed', e);
            }
          });

          // overlay play icon for affordance
          const wrap = document.createElement("div");
          wrap.className = "version-thumb-wrap";
          wrap.appendChild(v);

          const playOverlay = document.createElement("div");
          playOverlay.className = "version-thumb-play";
          playOverlay.textContent = "▶";
          wrap.appendChild(playOverlay);

          // clicking the preview should open the player on that version
          wrap.addEventListener("click", (e) => {
            e.stopPropagation();
            activateVersionPreview(version);
          });

          return wrap;
        };

        // If we have a thumbnail URL, use it as poster on a video element.
        if (version.media.thumbnailUrl) {
          try {
            const el = makeVideoEl(version.media.url || null, version.media.thumbnailUrl);
            prev.appendChild(el);
          } catch (err) {
            console.error("renderVersionPreviews: failed to render poster video", err, version.id);
            // fallback to img
            const img = document.createElement("img");
            img.src = getProxiedUrl(version.media.thumbnailUrl);
            img.className = "version-thumb";
            img.onerror = () => { img.style.display = 'none'; };
            prev.appendChild(img);
          }
        } else if (version.media.url) {
          // No thumbnail: attempt to generate one asynchronously, show placeholder meanwhile
          prev.style.background = "radial-gradient(circle, #374151, #111827 70%)";
          const spinner = document.createElement("span");
          spinner.textContent = "↻";
          spinner.style.fontSize = "12px";
          spinner.style.opacity = "0.5";
          prev.appendChild(spinner);

          generateVideoThumbnailFromUrl(version).then(th => {
            const el = document.getElementById(`preview-${version.id}`);
            if (!el) return;
            el.innerHTML = "";
            el.classList.add("video");

            if (!th) {
              // If thumbnail generation failed, render a lightweight video element with no poster
              const fallback = makeVideoEl(version.media.url, null);
              el.appendChild(fallback);
              return;
            }

            version.media.thumbnailUrl = th;
            const wrapped = makeVideoEl(version.media.url || null, th);
            el.appendChild(wrapped);
          }).catch(err => {
            console.error('renderVersionPreviews: thumbnail generation error', err, version.id);
          });
        } else {
          // No media url nor thumbnail: show fallback icon
          const fallback = document.createElement("span");
          fallback.textContent = "▶";
          fallback.style.fontSize = "18px";
          fallback.style.opacity = "0.5";
          prev.appendChild(fallback);
        }
      }
    });
  });
}

// =======================
// DROP ON CUE / VERSION
// =======================
function handleFileDropOnCue(project, cue, file) {
  const version = createVersionForCue(project, cue, file);
  project.activeCueId = cue.id;
  project.activeVersionId = version.id;
  cue.status = computeCueStatus(cue);
  refreshAllNames();
  renderAll();
}

function handleFileDropOnVersion(project, cue, version, file) {
  const type = detectRawType(file.name);
  const url = URL.createObjectURL(file);

  version.deliverables.push({
    id: uid(),
    name: file.name,
    size: file.size,
    type,
    url
  });

  project.activeCueId = cue.id;
  project.activeVersionId = version.id;

  cue.status = computeCueStatus(cue);
  refreshAllNames();
  renderCueList();
  renderVersionPreviews();
}

// =======================
// REFERENCE LIST RENDER
// =======================
function renderReferences() {
  if (!refsDropzoneEl || !refsListEl || !refsSubtitleEl || !refsToggleBtn)
    return;

  const project = getActiveProject();

  if (!project) {
    refsSubtitleEl.textContent = "No active project.";
    refsListEl.innerHTML = "No reference files.";
    refsListEl.classList.add("refs-list-empty");
    refsDropzoneEl.classList.add("disabled");
    refsDropzoneEl.classList.remove("drag-over");
    refsDropzoneEl.style.pointerEvents = "none";
    refsToggleBtn.disabled = true;
    applyReferencesCollapsedState();
    return;
  }

  ensureProjectReferences(project);

  refsDropzoneEl.classList.remove("disabled");
  refsDropzoneEl.style.pointerEvents = "auto";
  refsDropzoneEl.style.opacity = "1";
  refsToggleBtn.disabled = false;

  const refs = project.references || [];

  if (!refs.length) {
    refsSubtitleEl.textContent =
      "No reference files for this project.";
    refsListEl.innerHTML = "No reference files for this project.";
    refsListEl.classList.add("refs-list-empty");
    applyReferencesCollapsedState();
    return;
  }

  refsSubtitleEl.textContent =
    refs.length === 1
      ? "1 reference (with versions)."
      : `${refs.length} references (with versions).`;

  refsListEl.classList.remove("refs-list-empty");
  refsListEl.innerHTML = "";

  refs.forEach(refRoot => {
    const activeIndex =
      typeof refRoot.activeVersionIndex === "number"
        ? refRoot.activeVersionIndex
        : refRoot.versions.length - 1;
    const active = refRoot.versions[activeIndex];

    const details = document.createElement("details");
    details.className = "ref-block";
    details.dataset.refId = refRoot.id;
    details.open = true;

    const summary = document.createElement("summary");
    summary.className = "ref-summary";

    const header = document.createElement("div");
    header.className = "ref-header";

    // Preview of active version
    const preview = document.createElement("div");
    preview.className = "ref-preview";
    preview.id = `ref-preview-${refRoot.id}`;

    // Fill group preview
    if (active.type === "audio") {
      preview.textContent = "";
      createRefMiniWave(active, preview);
    } else if (active.type === "image") {
      const img = document.createElement("img");
      img.src = getProxiedUrl(active.url);
      img.alt = active.name;
      preview.appendChild(img);
    } else if (active.type === "video") {
      if (active.thumbnailUrl) {
        const img = document.createElement("img");
        img.src = getProxiedUrl(active.thumbnailUrl);
        img.alt = active.name;
        preview.appendChild(img);
      } else {
        generateVideoThumbnailRaw(getProxiedUrl(active.url)).then(th => {
          const el = document.getElementById(
            `ref-preview-${refRoot.id}`
          );
          if (!el) return;
          el.innerHTML = "";
          if (!th) {
            el.textContent = "Preview non disponibile";
            return;
          }
          active.thumbnailUrl = th;
          const img = document.createElement("img");
          img.src = getProxiedUrl(th);
          img.alt = active.name;
          el.appendChild(img);
        });
      }
    } else {
      preview.textContent = getReferenceLabel(active.type);
    }

    // Main text
    const main = document.createElement("div");
    main.className = "ref-main";

    const titleEl = document.createElement("div");
    titleEl.className = "ref-title";
    titleEl.textContent = refRoot.name || active.name;

    const metaEl = document.createElement("div");
    metaEl.className = "ref-meta";
    const label = getReferenceLabel(active.type);
    const sizeLabel = formatFileSize(active.size);
    metaEl.textContent = sizeLabel ? `${label} · ${sizeLabel}` : label;

    main.appendChild(titleEl);
    main.appendChild(metaEl);

    const actions = document.createElement("div");
    actions.className = "ref-actions";

    const chip = document.createElement("div");
    chip.className = "refs-type-chip";
    chip.textContent =
      refRoot.versions.length > 1
        ? `Reference · ${refRoot.versions.length} versions`
        : "Reference";

    const dd = document.createElement("div");
    dd.className = "download-dropdown ref-group-dropdown";

    const ddBtn = document.createElement("button");
    ddBtn.type = "button";
    ddBtn.className = "ghost-btn tiny download-toggle";
    ddBtn.textContent = "⋯";

    const ddMenu = document.createElement("div");
    ddMenu.className = "download-menu";
    ddMenu.innerHTML = `
      <button data-action="rename-active-version">Rename active version</button>
      <button data-action="delete-active-version">Delete active version</button>
      <button data-action="delete-group">Delete reference group</button>
    `;

    dd.appendChild(ddBtn);
    dd.appendChild(ddMenu);

    actions.appendChild(chip);
    actions.appendChild(dd);

    header.appendChild(preview);
    header.appendChild(main);
    header.appendChild(actions);

    summary.appendChild(header);
    details.appendChild(summary);

    // Version list
    const versionList = document.createElement("div");
    versionList.className = "ref-version-list";

    refRoot.versions.forEach((ver, idx) => {
      const vRow = document.createElement("div");
      vRow.className = "ref-version-row";
      vRow.dataset.refId = refRoot.id;
      vRow.dataset.refVersionId = ver.id;
      if (idx === activeIndex) vRow.classList.add("active");

      const labelEl = document.createElement("div");
      labelEl.className = "ref-version-label";
      labelEl.textContent = `v${idx + 1}`;

      const vPrev = document.createElement("div");
      vPrev.className = "ref-version-preview";
      vPrev.id = `ref-version-preview-${ver.id}`;

      if (ver.type === "audio") {
        vPrev.textContent = "";
        createRefMiniWave(ver, vPrev);
      } else if (ver.type === "image") {
        const img = document.createElement("img");
        img.src = getProxiedUrl(ver.url);
        img.alt = ver.name;
        vPrev.appendChild(img);
      } else if (ver.type === "video") {
        if (ver.thumbnailUrl) {
          const img = document.createElement("img");
          img.src = getProxiedUrl(ver.thumbnailUrl);
          img.alt = ver.name;
          vPrev.appendChild(img);
        } else {
          generateVideoThumbnailRaw(getProxiedUrl(ver.url)).then(th => {
            const el = document.getElementById(
              `ref-version-preview-${ver.id}`
            );
            if (!el) return;
            el.innerHTML = "";
            if (!th) {
              el.textContent = "Preview non disponibile";
              return;
            }
            ver.thumbnailUrl = th;
            const img = document.createElement("img");
            img.src = getProxiedUrl(th);
            img.alt = ver.name;
            el.appendChild(img);
          });
        }
      } else {
        vPrev.textContent = getReferenceLabel(ver.type);
      }

      const vMain = document.createElement("div");
      vMain.className = "ref-version-main";

      const vTitle = document.createElement("div");
      vTitle.className = "ref-version-title";
      vTitle.textContent = ver.name;

      const vMeta = document.createElement("div");
      vMeta.className = "ref-version-meta";
      const vLabel = getReferenceLabel(ver.type);
      const vSizeLabel = formatFileSize(ver.size);
      vMeta.textContent = vSizeLabel
        ? `${vLabel} · ${vSizeLabel}`
        : vLabel;

      vMain.appendChild(vTitle);
      vMain.appendChild(vMeta);

      const vActions = document.createElement("div");
      vActions.className = "ref-version-actions";

      const vMenuWrap = document.createElement("div");
      vMenuWrap.className = "download-dropdown";

      const vMenuBtn = document.createElement("button");
      vMenuBtn.type = "button";
      vMenuBtn.className = "icon-btn tiny download-toggle";
      vMenuBtn.textContent = "⋯";

      const vMenu = document.createElement("div");
      vMenu.className = "download-menu";
      vMenu.innerHTML = `
        <button data-action="set-active">Set as active</button>
        <button data-action="rename-version">Rename version</button>
        <button data-action="delete-version">Delete version</button>
        <button data-action="download-version">Download version</button>
      `;

      vMenuWrap.appendChild(vMenuBtn);
      vMenuWrap.appendChild(vMenu);

      vActions.appendChild(vMenuWrap);

      vRow.appendChild(labelEl);
      vRow.appendChild(vPrev);
      vRow.appendChild(vMain);
      vRow.appendChild(vActions);

      // Click on row → set active + open refs player
      vRow.addEventListener("click", e => {
        if (e.target.closest(".download-dropdown")) return;
        const projectNow = getActiveProject();
        if (!projectNow) return;
        projectNow.activeReferenceId = refRoot.id;
        refRoot.activeVersionIndex = idx;
        state.playerMode = "refs";
        updatePlayerModeButtons();
        renderReferences();
        renderPlayer();
      });

      // Drag-over / drop on version: add new version
      vRow.addEventListener("dragover", e => {
        if (!isFileDragEvent(e)) return;
        const projectNow = getActiveProject();
        if (!projectNow) return;
        e.preventDefault();
        vRow.classList.add("drag-over");
      });

      vRow.addEventListener("dragleave", e => {
        if (!vRow.contains(e.relatedTarget)) {
          vRow.classList.remove("drag-over");
        }
      });

      vRow.addEventListener("drop", e => {
        if (!isFileDragEvent(e)) return;
        e.preventDefault();
        e.stopPropagation();
        vRow.classList.remove("drag-over");

        const projectNow = getActiveProject();
        if (!projectNow) return;

        const files = e.dataTransfer.files;
        if (!files || !files.length) return;

        createReferenceForProject(projectNow, files[0], refRoot);
        renderReferences();
        if (
          projectNow.activeReferenceId === refRoot.id &&
          state.playerMode === "refs"
        ) {
          renderPlayer();
        }
      });

      // Version 3-dot menu
      vMenuBtn.addEventListener("click", e => {
        e.stopPropagation();
        const open = vMenuWrap.classList.contains("open");
        document
          .querySelectorAll(".download-dropdown.open")
          .forEach(x => x.classList.remove("open"));
        if (!open) vMenuWrap.classList.add("open");
      });

      vMenu.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          vMenuWrap.classList.remove("open");
          const action = btn.dataset.action;
          const projectNow = getActiveProject();
          if (!projectNow) return;

          if (action === "set-active") {
            refRoot.activeVersionIndex = idx;
            projectNow.activeReferenceId = refRoot.id;
            state.playerMode = "refs";
            updatePlayerModeButtons();
            renderReferences();
            renderPlayer();
          }

          if (action === "rename-version") {
            const newName = prompt("Rename version", ver.name);
            if (newName && newName.trim()) {
              ver.name = newName.trim();
              renderReferences();
              if (
                projectNow.activeReferenceId === refRoot.id &&
                state.playerMode === "refs"
              ) {
                renderPlayer();
              }
            }
          }

          if (action === "delete-version") {
            const ok = confirm(`Delete version "${ver.name}"?`);
            if (!ok) return;
            const indexToRemove = refRoot.versions.findIndex(
              v => v.id === ver.id
            );
            if (indexToRemove >= 0) {
              refRoot.versions.splice(indexToRemove, 1);
            }
            if (!refRoot.versions.length) {
              projectNow.references = projectNow.references.filter(
                r => r.id !== refRoot.id
              );
              if (projectNow.activeReferenceId === refRoot.id) {
                projectNow.activeReferenceId =
                  projectNow.references[0]?.id || null;
              }
            } else {
              if (refRoot.activeVersionIndex >= refRoot.versions.length) {
                refRoot.activeVersionIndex = refRoot.versions.length - 1;
              }
            }
            renderReferences();
            renderPlayer();
          }

          if (action === "download-version") {
            triggerDownload(getProxiedUrl(ver.url), ver.name || "reference");
          }
        });
      });

      versionList.appendChild(vRow);
    });

    details.appendChild(versionList);
    refsListEl.appendChild(details);

    // Drop on group header → new version
    details.addEventListener("dragover", e => {
      if (!isFileDragEvent(e)) return;
      const projectNow = getActiveProject();
      if (!projectNow) return;
      e.preventDefault();
      details.classList.add("drag-over");
    });

    details.addEventListener("dragleave", e => {
      if (!details.contains(e.relatedTarget)) {
        details.classList.remove("drag-over");
      }
    });

    details.addEventListener("drop", e => {
      if (!isFileDragEvent(e)) return;
      e.preventDefault();
      e.stopPropagation();
      details.classList.remove("drag-over");

      const projectNow = getActiveProject();
      if (!projectNow) return;

      const files = e.dataTransfer.files;
      if (!files || !files.length) return;

      createReferenceForProject(projectNow, files[0], refRoot);
      renderReferences();
      if (
        projectNow.activeReferenceId === refRoot.id &&
        state.playerMode === "refs"
      ) {
        renderPlayer();
      }
    });

    // Group 3-dot menu
    ddBtn.addEventListener("click", e => {
      e.stopPropagation();
      const open = dd.classList.contains("open");
      document
        .querySelectorAll(".download-dropdown.open")
        .forEach(x => x.classList.remove("open"));
      if (!open) dd.classList.add("open");
    });

    ddMenu.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        dd.classList.remove("open");
        const action = btn.dataset.action;
        const projectNow = getActiveProject();
        if (!projectNow) return;

        if (action === "rename-active-version") {
          const avIndex = refRoot.activeVersionIndex ?? 0;
          const av = refRoot.versions[avIndex];
          const newName = prompt("Rename active version", av.name);
          if (newName && newName.trim()) {
            av.name = newName.trim();
            renderReferences();
            if (
              projectNow.activeReferenceId === refRoot.id &&
              state.playerMode === "refs"
            ) {
              renderPlayer();
            }
          }
        }

        if (action === "delete-active-version") {
          const avIndex = refRoot.activeVersionIndex ?? 0;
          const av = refRoot.versions[avIndex];
          const ok = confirm(
            `Delete active version "${av.name}" from this reference group?`
          );
          if (!ok) return;
          refRoot.versions.splice(avIndex, 1);
          if (!refRoot.versions.length) {
            projectNow.references = projectNow.references.filter(
              r => r.id !== refRoot.id
            );
            if (projectNow.activeReferenceId === refRoot.id) {
              projectNow.activeReferenceId =
                projectNow.references[0]?.id || null;
            }
          } else {
            refRoot.activeVersionIndex = Math.max(
              0,
              avIndex - 1
            );
          }
          renderReferences();
          renderPlayer();
        }

        if (action === "delete-group") {
          const ok = confirm(
            `Delete reference group "${refRoot.name || active.name}"?`
          );
          if (!ok) return;
          projectNow.references = projectNow.references.filter(
            r => r.id !== refRoot.id
          );
          if (projectNow.activeReferenceId === refRoot.id) {
            projectNow.activeReferenceId =
              projectNow.references[0]?.id || null;
          }
          renderReferences();
          renderPlayer();
        }
      });
    });

    // Clicking header selects active version for player
    summary.addEventListener("click", e => {
      if (e.target.closest(".download-dropdown")) return;
      const projectNow = getActiveProject();
      if (!projectNow) return;
      projectNow.activeReferenceId = refRoot.id;
      refRoot.activeVersionIndex =
        typeof refRoot.activeVersionIndex === "number"
          ? refRoot.activeVersionIndex
          : 0;
      state.playerMode = "refs";
      updatePlayerModeButtons();
      renderReferences();
      renderPlayer();
    });

    refsListEl.appendChild(details);
  });

  applyReferencesCollapsedState();
}

if (refsToggleBtn) {
  refsToggleBtn.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project) return;
    referencesCollapsed = !referencesCollapsed;
    applyReferencesCollapsedState();
  });
}

if (refsDropzoneEl) {
  refsDropzoneEl.addEventListener("dragover", e => {
    if (!isFileDragEvent(e)) return;
    const project = getActiveProject();
    if (!project) return;
    e.preventDefault();
    refsDropzoneEl.classList.add("drag-over");
  });

  refsDropzoneEl.addEventListener("dragleave", e => {
    if (!refsDropzoneEl.contains(e.relatedTarget)) {
      refsDropzoneEl.classList.remove("drag-over");
    }
  });

  refsDropzoneEl.addEventListener("drop", e => {
    if (!isFileDragEvent(e)) return;
    e.preventDefault();
    refsDropzoneEl.classList.remove("drag-over");

    const project = getActiveProject();
    if (!project) return;

    const files = e.dataTransfer.files;
    if (!files || !files.length) return;

    for (let i = 0; i < files.length; i++) {
      createReferenceForProject(project, files[i], null);
    }

    renderReferences();
  });

  refsDropzoneEl.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project) return;

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;

    input.addEventListener("change", () => {
      if (input.files && input.files.length) {
        Array.from(input.files).forEach(f =>
          createReferenceForProject(project, f, null)
        );
        renderReferences();
      }
    });

    input.click();
  });
}

// =======================
// PLAYER MODE BUTTONS
// =======================
function updatePlayerModeButtons() {
  if (!modeReviewBtn || !modeRefsBtn) return;
  if (state.playerMode === "review") {
    modeReviewBtn.classList.add("active");
    modeRefsBtn.classList.remove("active");
  } else {
    modeReviewBtn.classList.remove("active");
    modeRefsBtn.classList.add("active");
  }
}

if (modeReviewBtn && modeRefsBtn) {
  modeReviewBtn.addEventListener("click", () => {
    state.playerMode = "review";
    updatePlayerModeButtons();
    renderPlayer();
  });

  modeRefsBtn.addEventListener("click", () => {
    const project = getActiveProject();
    ensureProjectReferences(project || {});
    if (!project || !project.references || !project.references.length) return;
    state.playerMode = "refs";
    updatePlayerModeButtons();
    renderPlayer();
  });
}

// =======================
// PLAYER ROOT
// =======================
function renderPlayer() {
  const project = getActiveProject();
  if (!project) {
    if (rightColEl) rightColEl.style.display = "none";
    destroyMainWave();
    stopVideo();
    currentPlayerVersionId = null;
    currentPlayerMediaType = null;
    playerMediaEl.innerHTML =
      '<div class="player-placeholder">Create a project and drop a file.</div>';
    playPauseBtn.disabled = true;
    playPauseBtn.style.display = "inline-block";
    timeLabelEl.style.display = "inline-block";
    timeLabelEl.textContent = "--:-- / --:--";
    setCommentsEnabled(false);
    commentsListEl.innerHTML = "";
    commentsSummaryEl.textContent = "No comments";
    if (volumeSlider) {
      volumeSlider.style.display = "none";
    }
    return;
  }

  const hasCues = project.cues && project.cues.length > 0;
  ensureProjectReferences(project);
  const hasRefs = project.references && project.references.length > 0;

  if (!hasCues && !hasRefs) {
    if (rightColEl) rightColEl.style.display = "none";
    destroyMainWave();
    stopVideo();
    currentPlayerVersionId = null;
    currentPlayerMediaType = null;
    playerMediaEl.innerHTML =
      '<div class="player-placeholder">Create a project and drop a file.</div>';
    playPauseBtn.disabled = true;
    playPauseBtn.style.display = "inline-block";
    timeLabelEl.style.display = "inline-block";
    timeLabelEl.textContent = "--:-- / --:--";
    setCommentsEnabled(false);
    commentsListEl.innerHTML = "";
    commentsSummaryEl.textContent = "No comments";
    if (volumeSlider) {
      volumeSlider.style.display = "none";
    }
    return;
  }

  if (rightColEl) rightColEl.style.display = "flex";
  updatePlayerModeButtons();

  if (!hasCues && hasRefs) {
    state.playerMode = "refs";
    updatePlayerModeButtons();
  }

  if (state.playerMode === "refs" && hasRefs) {
    renderReferencePlayer(project);
    return;
  }

  const ctx = getActiveContext();
  if (!ctx) {
    destroyMainWave();
    stopVideo();
    currentPlayerVersionId = null;
    currentPlayerMediaType = null;
    playerTitleEl.textContent = "No version selected";
    playerBadgeEl.textContent = "";
    playerBadgeEl.dataset.status = "";
    playerMediaEl.innerHTML =
      '<div class="player-placeholder">Select a version.</div>';
    playPauseBtn.style.display = "none";
    timeLabelEl.style.display = "none";
    setCommentsEnabled(false);
    commentsListEl.innerHTML = "";
    commentsSummaryEl.textContent = "No comments";
    if (volumeSlider) {
      volumeSlider.style.display = "none";
    }
    return;
  }

  const { cue, version } = ctx;
  playerTitleEl.textContent =
    `${cue.displayName} · ${computeVersionLabel(version.index)}`;

  const statusKey = version.status || "in-review";
  playerBadgeEl.textContent = VERSION_STATUSES[statusKey];
  playerBadgeEl.dataset.status = statusKey;

  if (!version.media) {
    destroyMainWave();
    stopVideo();
    currentPlayerVersionId = null;
    currentPlayerMediaType = null;
    playerMediaEl.innerHTML =
      '<div class="player-placeholder">This version has no media.</div>';
    playPauseBtn.style.display = "none";
    timeLabelEl.style.display = "none";
    setCommentsEnabled(false);
    commentsListEl.innerHTML = "";
    commentsSummaryEl.textContent = "No comments";
    if (volumeSlider) {
      volumeSlider.style.display = "none";
    }
    return;
  }

  const sameVersion =
    currentPlayerVersionId === version.id &&
    currentPlayerMediaType === version.media.type;

  if (!sameVersion) {
    if (version.media.type === "audio") {
      loadAudioPlayer(project, cue, version);
    } else if (version.media.type === "video") {
      loadVideoPlayer(project, cue, version);
    }
    currentPlayerVersionId = version.id;
    currentPlayerMediaType = version.media.type;
  }

  renderComments();
}

// =======================
// PROJECT LIST + HEADER
// =======================

function showProjectMenu(event, project) {
  // Remove any existing menu
  const existingMenu = document.querySelector('.project-context-menu');
  if (existingMenu) existingMenu.remove();

  // Create menu
  const menu = document.createElement('div');
  menu.className = 'project-context-menu';
  menu.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    min-width: 150px;
    padding: 4px 0;
  `;

  const renameOption = document.createElement('div');
  renameOption.textContent = 'Rename';
  renameOption.style.cssText = 'padding:8px 16px;cursor:pointer;font-size:14px;color:#374151;';
  renameOption.addEventListener('mouseenter', () => { renameOption.style.background = '#f3f4f6'; });
  renameOption.addEventListener('mouseleave', () => { renameOption.style.background = 'transparent'; });
  renameOption.addEventListener('click', () => {
    menu.remove();
    renameProject(project);
  });

  const deleteOption = document.createElement('div');
  deleteOption.textContent = 'Delete';
  deleteOption.style.cssText = 'padding:8px 16px;cursor:pointer;font-size:14px;color:#dc2626;';
  deleteOption.addEventListener('mouseenter', () => { deleteOption.style.background = '#fef2f2'; });
  deleteOption.addEventListener('mouseleave', () => { deleteOption.style.background = 'transparent'; });
  deleteOption.addEventListener('click', () => {
    menu.remove();
    deleteProject(project.id);
  });

  menu.appendChild(renameOption);
  menu.appendChild(deleteOption);

  // Position menu near the click
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  let x = event.clientX;
  let y = event.clientY;

  // Adjust if menu goes off screen
  if (x + rect.width > window.innerWidth) {
    x = window.innerWidth - rect.width - 10;
  }
  if (y + rect.height > window.innerHeight) {
    y = window.innerHeight - rect.height - 10;
  }

  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  // Close menu on click outside
  setTimeout(() => {
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);
  }, 0);
}

function renderProjectList() {
  // Two lists: my projects (left) and shared-with-me (right)
  const myListEl = document.getElementById('projectList');
  const sharedListEl = document.getElementById('sharedProjectList');

  if (!myListEl || !sharedListEl) return;

  // Split projects into owned vs shared.
  // Prefer the server-provided `is_shared` flag when present (covers direct project_members).
  const userId = window.flowAuth?.getUser?.()?.id || null;
  const hasIsShared = state.projects.some(p => typeof p.is_shared !== 'undefined');
  let myProjects, sharedProjects;
  if (hasIsShared) {
    myProjects = state.projects.filter(p => !p.is_shared && (!p.owner_id || p.owner_id === userId));
    sharedProjects = state.projects.filter(p => p.is_shared || (p.owner_id && p.owner_id !== userId && (p.team_members || []).some(m => m.user_id === userId)));
  } else {
    myProjects = state.projects.filter(p => !p.owner_id || p.owner_id === userId);
    sharedProjects = state.projects.filter(p => {
      if (!p.owner_id) return false;
      if (p.owner_id === userId) return false;
      const members = p.team_members || [];
      return members.some(m => m.user_id === userId) || (p.shared && p.shared.length);
    });
  }

  // Helper to create project item with menu
  function createProjectItem(project, isOwned) {
    const li = document.createElement('li');
    li.className = 'project-item' + (project.id === state.activeProjectId ? ' active' : '');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.justifyContent = 'space-between';
    li.style.gap = '8px';

    const label = document.createElement('span');
    label.textContent = project.name;
    label.style.flex = '1';
    label.style.minWidth = '0'; // Allow text truncation if needed
    li.appendChild(label);

    if (isOwned) {
      // For owned projects: click on label, menu button for options
      label.style.cursor = 'pointer';
      label.addEventListener('click', () => selectProject(project.id));

      const menuBtn = document.createElement('button');
      menuBtn.innerHTML = '⋮';
      menuBtn.className = 'project-item-menu';
      menuBtn.style.cssText = 'background:none;border:none;font-size:18px;cursor:pointer;padding:4px 8px;color:#9ca3af;opacity:0.6;flex-shrink:0;';
      menuBtn.title = 'Project options';
      menuBtn.addEventListener('mouseenter', () => { menuBtn.style.opacity = '1'; });
      menuBtn.addEventListener('mouseleave', () => { menuBtn.style.opacity = '0.6'; });
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showProjectMenu(e, project);
      });
      li.appendChild(menuBtn);
    } else {
      // For shared projects: entire li and label are clickable (no menu)
      li.style.cursor = 'pointer';
      label.style.cursor = 'pointer';
      const clickHandler = () => selectProject(project.id);
      li.addEventListener('click', clickHandler);
      label.addEventListener('click', clickHandler);
    }

    return li;
  }

  myListEl.innerHTML = '';
  if (myProjects.length === 0) {
    const li = document.createElement('li');
    li.className = 'project-item empty';
    li.textContent = 'No projects yet. Click "New project".';
    myListEl.appendChild(li);
  } else {
    myProjects.forEach(project => {
      myListEl.appendChild(createProjectItem(project, true));
    });
  }

  sharedListEl.innerHTML = '';
  if (sharedProjects.length === 0) {
    const li = document.createElement('li');
    li.className = 'project-item empty';
    if (!userId) {
      // If not logged in, prompt to login so shared projects (which require auth) become visible
      const a = document.createElement('a');
      a.href = '/login';
      a.textContent = 'Log in to see shared projects.';
      a.style.color = '#9ca3af';
      a.style.textDecoration = 'underline';
      li.appendChild(a);
    } else {
      li.textContent = 'No shared projects yet.';
    }
    sharedListEl.appendChild(li);
  } else {
    sharedProjects.forEach(project => {
      sharedListEl.appendChild(createProjectItem(project, false));
    });
  }

}

function renderProjectHeader() {
  const project = getActiveProject();
  if (!project) {
    projectTitleEl.textContent = "No project";
    projectMetaEl.textContent = 'Click "New project".';
    projectMenuBtn.style.display = "none";
    return;
  }

  projectTitleEl.textContent = project.name;

  const cues = project.cues.length;
  const versions = project.cues.reduce((a, c) => a + c.versions.length, 0);

  projectMetaEl.textContent = `${cues} cues · ${versions} versions`;

  projectTitleEl.onclick = () => renameProject(project);
  projectMenuBtn.onclick = () => deleteProject(project.id);
  projectMenuBtn.style.display = "inline-flex";
}

function updateVisibility() {
  const project = getActiveProject();
  if (project) {
    if (uploadStripEl) uploadStripEl.style.display = "flex";
    if (contentEl) contentEl.style.display = "grid";
    if (dropzoneEl) dropzoneEl.classList.remove("disabled");
    if (shareBtn) shareBtn.disabled = false;
    if (deliverBtn) deliverBtn.disabled = false;
    if (copyLinkBtn) copyLinkBtn.disabled = false;
  } else {
    if (uploadStripEl) uploadStripEl.style.display = "none";
    if (contentEl) contentEl.style.display = "none";
    if (dropzoneEl) dropzoneEl.classList.add("disabled");
    if (shareBtn) shareBtn.disabled = true;
    if (deliverBtn) deliverBtn.disabled = true;
    if (copyLinkBtn) copyLinkBtn.disabled = true;
  }
}

// =======================
// GLOBAL DRAG & DROP
// =======================
window.addEventListener("dragover", e => {
  if (isFileDragEvent(e)) {
    e.preventDefault();
  }
});

window.addEventListener("drop", e => {
  if (isFileDragEvent(e)) {
    e.preventDefault();
  }
});

dropzoneEl.addEventListener("dragover", e => {
  if (!isFileDragEvent(e)) return;
  if (!getActiveProject()) return;
  e.preventDefault();
  dropzoneEl.classList.add("drag-over");
});

dropzoneEl.addEventListener("dragleave", e => {
  if (!dropzoneEl.contains(e.relatedTarget)) {
    dropzoneEl.classList.remove("drag-over");
  }
});

dropzoneEl.addEventListener("drop", e => {
  if (!isFileDragEvent(e)) return;
  e.preventDefault();
  dropzoneEl.classList.remove("drag-over");

  const project = getActiveProject();
  if (!project) return;

  const files = e.dataTransfer.files;
  if (!files || !files.length) return;

  createCueFromFile(files[0]);
});

dropzoneEl.addEventListener("click", () => {
  const project = getActiveProject();
  if (!project) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "audio/*,video/*,application/zip";
  input.multiple = false;

  input.addEventListener("change", () => {
    if (input.files && input.files.length) {
      createCueFromFile(input.files[0]);
    }
  });

  input.click();
});

// =======================
// AUTO RENAME
// =======================
autoRenameToggle.addEventListener("change", () => {
  state.autoRename = autoRenameToggle.checked;
  namingLevelsEl.classList.toggle("visible", state.autoRename);
  refreshAllNames();
  updateNamesInDOM();
});

namingLevelRadios.forEach(r => {
  r.addEventListener("change", () => {
    const checked = document.querySelector(
      "input[name='namingLevel']:checked"
    );
    state.namingMode = checked.value;
    refreshAllNames();
    updateNamesInDOM();
  });
});

// =======================
// GLOBAL EVENTS
// =======================

// Tab switching for sidebar
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    // Remove active class from all buttons and contents
    tabButtons.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));

    // Add active class to clicked button and corresponding content
    btn.classList.add("active");
    const tabName = btn.dataset.tab;
    const tabContent = document.getElementById(`${tabName}-tab`);
    if (tabContent) {
      tabContent.classList.add("active");
    }
  });
});

if (newProjectBtn) {
  newProjectBtn.addEventListener("click", createNewProject);
} else {
  console.error("[FlowPreview] newProjectBtn not found in DOM");
}

if (statusInReviewBtn && statusApprovedBtn && statusChangesBtn) {
  statusInReviewBtn.addEventListener("click", () => {
    const ctx = getActiveContext();
    if (!ctx) return;
    setVersionStatus(ctx.project, ctx.cue, ctx.version, "in-review");
  });

  statusApprovedBtn.addEventListener("click", () => {
    const ctx = getActiveContext();
    if (!ctx) return;
    setVersionStatus(ctx.project, ctx.cue, ctx.version, "approved");
  });

  statusChangesBtn.addEventListener("click", () => {
    const ctx = getActiveContext();
    if (!ctx) return;
    setVersionStatus(ctx.project, ctx.cue, ctx.version, "changes-requested");
  });
}

// Copy demo link -> create invite if authenticated, otherwise prompt/register or copy temporary link
if (copyLinkBtn) {
  copyLinkBtn.addEventListener('click', async () => {
    const project = window.getActiveProject ? window.getActiveProject() : null;
    if (!project) {
      alert('No project selected');
      return;
    }

    // Try to detect supabase client + current user
    const sup = window.supabaseClient || window.supabaseClient || null;
    let user = null;
    try {
      if (sup && sup.auth) {
        try {
          if (typeof sup.auth.getUser === 'function') {
            const { data } = await sup.auth.getUser();
            user = data?.user || null;
          }
          // Try to fetch session to get an access token for server-verified requests
          if (typeof sup.auth.getSession === 'function') {
            const { data: sessionData } = await sup.auth.getSession();
            user = user || sessionData?.session?.user || null;
            // attach access token for later use
            if (sessionData?.session?.access_token) user._access_token = sessionData.session.access_token;
          }
        } catch (e) {
          console.warn('[FlowPreview] sup.auth getUser/getSession failed', e);
        }
      }
    } catch (err) {
      console.warn('[FlowPreview] Could not get user session', err);
    }

    // If user authenticated -> prefer server-side API to create a Drive-like share (uses service role)
    if (user) {
      try {
        copyLinkBtn.disabled = true;

        // Try server-side endpoint first (reliable, uses service role)
        try {
          // Migliora: sempre includi x-actor-id e Authorization se disponibili
          const headers = { 'Content-Type': 'application/json' };
          if (user && user.id) headers['x-actor-id'] = user.id;
          if (user && user._access_token) headers['authorization'] = 'Bearer ' + user._access_token;

          const resp = await fetch('/api/projects/share', {
            method: 'POST',
            headers,
            body: JSON.stringify({ project_id: project.id, role: 'viewer', expires_at: null, max_uses: 5 })
          });

          if (resp.ok) {
            const body = await resp.json();
            if (body && body.link) {
              await navigator.clipboard.writeText(body.link);
              alert('Link copiato negli appunti: ' + body.link);
              return;
            }
          } else {
            const text = await resp.text();
            console.warn('[FlowPreview] /api/projects/share returned', resp.status, text);
            if (resp.status === 403) {
              // Try to create an invite link instead (users who are not owners may be allowed to create invites)
              try {
                const invResp = await fetch('/api/invites', {
                  method: 'POST',
                  headers: { ...headers, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ project_id: project.id, team_id: project.team_id, role: 'viewer', is_link_invite: true })
                });

                const invBody = await invResp.json().catch(() => ({}));
                if (invResp.ok && invBody.invite_url) {
                  await navigator.clipboard.writeText(invBody.invite_url);
                  alert('Link invito copiato negli appunti: ' + invBody.invite_url);
                  return;
                }

                console.warn('[FlowPreview] /api/invites failed or not allowed', invResp.status, invBody);
                alert('Non sei autorizzato a creare link di condivisione per questo progetto. Verrà copiato un link temporaneo.');
              } catch (ie) {
                console.warn('[FlowPreview] create invite fallback failed', ie);
                alert('Non sei autorizzato a creare link di condivisione per questo progetto. Verrà copiato un link temporaneo.');
              }
            }
          }
        } catch (err) {
          console.warn('[FlowPreview] Server /api/projects/share failed, will try RPC fallbacks', err);
        }

        // If server API failed, try RPCs as fallback (older flow)
        if (sup && typeof sup.rpc === 'function') {
          // Prefer new create_project_share RPC (Drive-like). If it fails, fall back to create_invite.
          let shareToken = null;
          try {
            const { data: shareData, error: shareError } = await sup.rpc('create_project_share', {
              p_project_id: project.id || null,
              p_role: 'viewer',
              p_expires_in_days: 7,
              p_created_by: user.id
            });
            if (shareError) throw shareError;
            if (shareData && shareData.token) shareToken = shareData.token;
          } catch (err) {
            console.warn('[FlowPreview] create_project_share not available or failed, falling back to create_invite', err);
          }

          let inviteUrl = null;
          const base = window.location.origin;
          if (shareToken) {
            inviteUrl = `${base}/share/${shareToken}`;
          } else {
            // Fallback to existing create_invite RPC
            const { data: rpcData, error: rpcError } = await sup.rpc('create_invite', {
              p_team_id: project.team_id,
              p_project_id: project.id || null,
              p_email: null,
              p_role: 'viewer',
              p_is_link_invite: true,
              p_invited_by: user.id,
              p_expires_in_days: 7
            });

            if (rpcError) {
              console.error('[FlowPreview] create_invite RPC error', rpcError);
              throw rpcError;
            }

            const created = rpcData || null;
            if (!created || created.success === false) {
              console.warn('[FlowPreview] create_invite returned no invite', created);
              throw new Error(created?.error || 'No invite created');
            }

            const inviteId = created.invite_id || (Array.isArray(created) ? created[0]?.invite_id : null);
            if (!inviteId) {
              console.warn('[FlowPreview] invite_id missing in RPC result', created);
              throw new Error('invite_id missing');
            }

            inviteUrl = `${base}/invite/${inviteId}`;
          }

          await navigator.clipboard.writeText(inviteUrl);
          alert('Link copiato negli appunti: ' + inviteUrl);
          return;
        }
      } catch (err) {
        console.error('[FlowPreview] Failed to create/copy invite via server/RPC', err);
        // Fallback: copy a temporary project link so user can still share something
        try {
          const temp = `${window.location.origin}/?shared_project=${encodeURIComponent(project.id)}`;
          await navigator.clipboard.writeText(temp);
          alert('Impossibile generare link definitivo. Link temporaneo copiato negli appunti: ' + temp);
        } catch (clipErr) {
          console.error('[FlowPreview] Fallback clipboard write failed', clipErr);
          alert('Errore creando il link di condivisione');
        }
      } finally {
        copyLinkBtn.disabled = false;
      }

      return;
    }

    // Not authenticated: ask the user whether to register or copy a temporary project link
    const shouldRegister = confirm("Non sei autenticato. Registrarsi ora permette di creare un link condivisibile. Premi OK per registrarti, Annulla per copiare un link temporaneo da incollare.");
    if (shouldRegister) {
      window.location.href = '/register';
      return;
    }

    // Copy a simple temporary link (project id) so user can paste it elsewhere — note: this may not grant access without invite
    try {
      const temp = `${window.location.origin}/?shared_project=${encodeURIComponent(project.id)}`;
      await navigator.clipboard.writeText(temp);
      alert('Link temporaneo copiato negli appunti');
    } catch (err) {
      console.error('[FlowPreview] Clipboard write failed', err);
      alert('Impossibile copiare il link.');
    }
  });
}

document.addEventListener("click", e => {
  document.querySelectorAll(".download-dropdown.open").forEach(dd => {
    if (!dd.contains(e.target)) dd.classList.remove("open");
  });
});

// =======================
// INITIALIZE FROM SUPABASE
// =======================
async function initializeFromSupabase() {
  if (hasInitializedFromSupabase) {
    console.log("[Flow] initializeFromSupabase already ran - skipping");
    return;
  }
  hasInitializedFromSupabase = true;
  console.log("[Flow] initializeFromSupabase() called");
  
  try {
    // Fetch projects from API (include auth headers when available)
    let fetchHeaders = { 'Content-Type': 'application/json' };
    try {
      if (window.flowAuth && typeof window.flowAuth.getAuthHeaders === 'function') {
        // Ensure flowAuth has run its bootstrap (some hosts may have a session
        // stored in Supabase but flowAuth.initAuth wasn't awaited before we
        // initialize). Call initAuth() if available and no session is present.
        try {
          const s = window.flowAuth.getSession && window.flowAuth.getSession();
          if (!s && typeof window.flowAuth.initAuth === 'function') {
            await window.flowAuth.initAuth();
          }
        } catch (e) {
          // ignore init errors and fall back to other detection below
        }
        const fh = window.flowAuth.getAuthHeaders();
        if (fh && typeof fh === 'object') fetchHeaders = { ...fetchHeaders, ...fh };
      } else if (window.supabaseClient && window.supabaseClient.auth) {
        try {
          const sessionRes = await window.supabaseClient.auth.getSession();
          const session = sessionRes?.data?.session;
          if (session && session.user && session.user.id) {
            fetchHeaders['x-actor-id'] = session.user.id;
          }
          if (session && session.access_token) {
            fetchHeaders['Authorization'] = 'Bearer ' + session.access_token;
          }
        } catch (e) {
          // ignore session read errors and fall back to anonymous fetch
        }
      }

    } catch (e) {
      // ignore header detection errors and proceed anonymously
    }

    // Fetch projects (allow one retry after attempting client auth bootstrap)
    let response = await fetch("/api/projects", { headers: fetchHeaders });
    let didRetry = false;
    if (!response.ok) {
      console.error("[Flow] Failed to fetch projects:", response.statusText);
      renderAll(); // Fallback to empty UI
      return;
    }

    let data = await response.json();

    // If the initial fetch returned the public all-projects list (no actor info)
    // and we have a client `flowAuth` available, try to initAuth() then retry once.
    try {
      const looksAnonymous = !data.my_projects && !data.shared_with_me;
      if (looksAnonymous && window.flowAuth && typeof window.flowAuth.initAuth === 'function' && !didRetry) {
        const boot = await window.flowAuth.initAuth().catch(() => false);
        if (boot) {
          // After initAuth we may be in a demo fallback (demo token/local id).
          // Avoid retrying the fetch if initAuth produced a demo token — that
          // would overwrite a server-resolved actor response (e.g. when the
          // server already returned shared_with_me for the true authenticated user).
          try {
            const fh = window.flowAuth.getAuthHeaders && window.flowAuth.getAuthHeaders();
            const authVal = fh && (fh.Authorization || fh.authorization || '');
            const actorVal = fh && (fh['x-actor-id'] || fh['X-Actor-Id'] || '');
            const isDemoToken = typeof authVal === 'string' && authVal.includes('demo');
            const isDemoActor = typeof actorVal === 'string' && actorVal.startsWith('demo');
            if (isDemoToken || isDemoActor) {
              console.log('[Flow] flowAuth initialized into demo mode; skipping retry to avoid overriding actor-resolved data');
            } else {
              let newHeaders = { 'Content-Type': 'application/json' };
              if (fh && typeof fh === 'object') newHeaders = { ...newHeaders, ...fh };
              response = await fetch('/api/projects', { headers: newHeaders });
              data = await response.json();
              didRetry = true;
              console.log('[Flow] Retried /api/projects after flowAuth.initAuth()');
            }
          } catch (e) {
            // ignore retry errors
          }
        }
      }
    } catch (e) {
      // ignore
    }
    // Normalize project list: accept either `projects` (combined) or
    // `my_projects` + `shared_with_me` shapes coming from the server.
    let projects = [];
    if (Array.isArray(data.projects)) {
      projects = data.projects;
    } else {
      const my = Array.isArray(data.my_projects) ? data.my_projects : [];
      const shared = Array.isArray(data.shared_with_me) ? data.shared_with_me : [];
      projects = [...my, ...shared];
    }

    console.log("[Flow] Loaded projects:", projects.length);

    // Populate state with projects from DB
    // Preserve owner and team_members so we can split "my" vs "shared" projects in the UI
    // Also mark projects returned in server `shared_with_me` so direct project_members are respected
    const sharedIds = new Set((Array.isArray(data.shared_with_me) ? data.shared_with_me : []).map(p => p.id));
    state.projects = projects.map(p => ({
      id: p.id,
      name: p.name || "Untitled",
      team_id: p.team_id,
      owner_id: p.owner_id || null,
      team_members: p.team_members || [],
      is_shared: sharedIds.has(p.id),
      cues: [], // Load on demand if needed
      activeCueId: null,
      activeVersionId: null,
      references: p.references || [],
      activeReferenceId: null
    }));

    // If a specific project was requested (open_project), prefer it
    try {
      const openProject = localStorage.getItem('open_project');
      if (openProject) {
        const found = state.projects.find(p => p.id === openProject);
        if (found) {
          state.activeProjectId = found.id;
          // Clean up the flag so subsequent loads don't reopen it
          localStorage.removeItem('open_project');
          await loadProjectCues(found.id);
        }
      }
    } catch (e) {
      console.warn('[Flow] Error reading open_project from localStorage', e);
    }

    // Set first project as active if none selected
    if (!state.activeProjectId && state.projects.length > 0) {
      state.activeProjectId = state.projects[0].id;
      await loadProjectCues(state.projects[0].id);
    }

    renderAll();
  } catch (err) {
    console.error("[Flow] initializeFromSupabase error:", err);
    renderAll(); // Fallback to empty UI
  }
}

// =======================
// ROOT RENDER
// =======================
function renderAll() {
  renderProjectList();
  renderProjectHeader();
  updateVisibility();
  refreshAllNames();
  renderReferences();
  renderCueList();
  renderVersionPreviews();
  renderPlayer();
}

// Export for page.tsx to call after auth
window.initializeFromSupabase = initializeFromSupabase;
window.getActiveProject = getActiveProject; // Export for share-handler.js

// Don't auto-initialize - wait for page.tsx to call initializeFromSupabase
console.log("[Flow] Script loaded, waiting for page.tsx to initialize...");

// Fallback auto-init if the page never calls us (e.g. auth bootstrap fails silently)
window.addEventListener("DOMContentLoaded", () => {
  if (!hasInitializedFromSupabase) {
    console.log("[Flow] Auto-init fallback triggered");
    initializeFromSupabase().catch(err => {
      console.error("[Flow] Auto-init fallback error", err);
    });
  }
});

// Extra safety: delayed auto-init in case DOMContentLoaded already fired before script load
setTimeout(() => {
  if (!hasInitializedFromSupabase) {
    console.log("[Flow] Delayed auto-init fallback");
    initializeFromSupabase().catch(err => {
      console.error("[Flow] Delayed auto-init error", err);
    });
  }
}, 800);
