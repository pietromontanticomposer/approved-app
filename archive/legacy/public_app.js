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
const miniWaves = {};

// Player cache to avoid flicker
let currentPlayerVersionId = null;
let currentPlayerMediaType = null;

// UI state for reference panel
let referencesCollapsed = false;

// =======================
// DOM
// =======================
const newProjectBtn = document.getElementById("newProjectBtn");
const projectListEl = document.getElementById("projectList");
const projectTitleEl = document.getElementById("projectTitle");
const projectMetaEl = document.getElementById("projectMeta");
const projectMenuBtn = document.getElementById("projectMenuBtn");

const uploadStripEl = document.querySelector(".upload-strip");
const contentEl = document.querySelector(".content");
const rightColEl = document.querySelector(".right-column");

const dropzoneEl = document.getElementById("globalDropzone");

const cueListEl = document.getElementById("cueList");
const cueListSubtitleEl = document.getElementById("cueListSubtitle");

const autoRenameToggle = document.getElementById("autoRenameToggle");
const namingLevelRadios = document.querySelectorAll(
  "input[name='namingLevel']"
);
const namingLevelsEl = document.querySelector(".naming-levels");

const commentsListEl = document.getElementById("commentsList");
const commentsSummaryEl = document.getElementById("commentsSummary");
const commentInputEl = document.getElementById("commentInput");
const addCommentBtn = document.getElementById("addCommentBtn");

const playerTitleEl = document.getElementById("playerTitle");
const playerBadgeEl = document.getElementById("playerBadge");
const playerMediaEl = document.getElementById("playerMedia");
const playPauseBtn = document.getElementById("playPauseBtn");
const timeLabelEl = document.getElementById("timeLabel");
const volumeSlider = document.getElementById("volumeSlider");
const statusInReviewBtn = document.getElementById("statusInReviewBtn");
const statusApprovedBtn = document.getElementById("statusApprovedBtn");
const statusChangesBtn = document.getElementById("statusChangesBtn");

const shareBtn = document.getElementById("shareBtn");
const deliverBtn = document.getElementById("deliverBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");

// Player mode buttons
const modeReviewBtn = document.getElementById("modeReviewBtn");
const modeRefsBtn = document.getElementById("modeRefsBtn");

// Project References DOM
const refsBodyEl = document.getElementById("refsBody");
const refsDropzoneEl = document.getElementById("refsDropzone");
const refsListEl = document.getElementById("refsList");
const refsSubtitleEl = document.getElementById("refsSubtitle");
const refsToggleBtn = document.getElementById("refsToggleBtn");

if (volumeSlider) {
  volumeSlider.style.display = "none";
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

function isFileDragEvent(e) {
  const dt = e.dataTransfer;
  if (!dt) return false;
  if (!dt.types) return false;
  return Array.from(dt.types).includes("Files");
}

// =======================
// UPLOAD HELPERS (client-side wrappers)
// =======================
async function uploadFileToServer(file, projectId) {
  try {
    const fd = new FormData();
    fd.append("file", file);
    if (projectId) fd.append("projectId", projectId);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd
    });

    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url;
  } catch (err) {
    console.warn("[uploadFileToServer] upload failed", err);
    throw err;
  }
}

async function uploadDataUrlThumbnail(dataUrl, projectId, filename) {
  try {
    const resp = await fetch(dataUrl);
    const blob = await resp.blob();
    const file = new File([blob], filename, { type: blob.type || "image/png" });
    return await uploadFileToServer(file, projectId);
  } catch (err) {
    console.warn("[uploadDataUrlThumbnail] failed", err);
    throw err;
  }
}

async function saveProjectToServer(project) {
  try {
    const res = await fetch('/api/projects/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project })
    });
    if (!res.ok) throw new Error('Save project failed');
    return await res.json();
  } catch (err) {
    console.warn('[saveProjectToServer] failed', err);
    throw err;
  }
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

function setVersionStatus(project, cue, version, status) {
  if (!VERSION_STATUSES[status]) return;
  version.status = status;
  cue.status = computeCueStatus(cue);

  // Update DOM in-place to avoid re-rendering the whole list (prevents
  // mini waveform flicker). Update cue status badge and version row classes.
  try {
    const cueBlock = document.querySelector(`.cue-block[data-cue-id="${cue.id}"]`);
    if (cueBlock) {
      const cueStatusEl = cueBlock.querySelector('.cue-status');
      if (cueStatusEl) {
        cueStatusEl.className = `cue-status ${cue.status}`;
        cueStatusEl.textContent = VERSION_STATUSES[cue.status] || 'In review';
      }
    }

    // Update any version rows for this version
    document.querySelectorAll(`.version-row[data-version-id="${version.id}"]`).forEach(row => {
      // remove known status-* classes then add the new one
      row.classList.remove('status-in-review', 'status-approved', 'status-changes-requested');
      row.classList.add(`status-${status}`);
      row.dataset.status = status;
    });
  } catch (e) {
    // fallback to full render if anything unexpected occurs
    console.warn('[setVersionStatus] partial update failed, falling back to full render', e);
    renderAll();
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
function createNewProject() {
  console.log("[FlowPreview] createNewProject");
  const defaultName = "New project";
  const name = prompt("Project name", defaultName);
  if (name === null) return;

  const projectPayload = {
    title: name.trim() || defaultName,
    description: null
  };

  // Try to persist to backend; fall back to local state on error
  (async () => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectPayload)
      });

      if (!res.ok) throw new Error('API create project failed');

      const data = await res.json();
      const project = data.project;

      // Ensure cues, references fields exist for compatibility
      project.cues = project.cues || [];
      project.references = project.references || [];
      project.activeCueId = project.activeCueId || null;
      project.activeVersionId = project.activeVersionId || null;

      state.projects.unshift(project);
      state.activeProjectId = project.id;
      renderAll();
    } catch (err) {
      console.warn('[createNewProject] backend unavailable, using local state', err);

      const project = {
        id: uid(),
        name: name.trim() || defaultName,
        cues: [],
        activeCueId: null,
        activeVersionId: null,
        references: [],
        activeReferenceId: null
      };

      state.projects.unshift(project);
      state.activeProjectId = project.id;
      renderAll();
    }
  })();
}

function renameProject(project) {
  const name = prompt("Rename project", project.name);
  if (name === null) return;
  if (!name.trim()) return;

  const newName = name.trim();

  (async () => {
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, title: newName })
      });

      if (!res.ok) throw new Error('API rename failed');

      // update local copy with returned project if provided
      const data = await res.json();
      if (data && data.project) {
        const p = data.project;
        const local = getProjectById(p.id);
        if (local) local.name = p.title;
      } else {
        project.name = newName;
      }
      renderAll();
    } catch (err) {
      console.warn('[renameProject] backend unavailable, renaming locally', err);
      project.name = newName;
      renderAll();
    }
  })();
}

function deleteProject(id) {
  const p = getProjectById(id);
  if (!p) return;
  const ok = confirm(`Delete project "${p.name}"?`);
  if (!ok) return;

  (async () => {
    try {
      const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('API delete failed');

      state.projects = state.projects.filter(x => x.id !== id);
      state.activeProjectId =
        state.projects.length ? state.projects[state.projects.length - 1].id : null;

      currentPlayerVersionId = null;
      currentPlayerMediaType = null;
      state.playerMode = "review";

      renderAll();
    } catch (err) {
      console.warn('[deleteProject] backend unavailable, deleting locally', err);
      state.projects = state.projects.filter(x => x.id !== id);
      state.activeProjectId =
        state.projects.length ? state.projects[state.projects.length - 1].id : null;

      currentPlayerVersionId = null;
      currentPlayerMediaType = null;
      state.playerMode = "review";

      renderAll();
    }
  })();
}

// =======================
// CUE / VERSION CRUD
// =======================
function createCueFromFile(file) {
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

  const version = createVersionForCue(project, cue, file);

  project.activeCueId = cue.id;
  project.activeVersionId = version.id;

  cue.status = computeCueStatus(cue);
  refreshAllNames();
  renderAll();
}

function createVersionForCue(project, cue, file) {
  const version = {
    id: uid(),
    index: cue.versions.length,
    media: null,
    comments: [],
    deliverables: [],
    status: "in-review"
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

  ws.load(version.media.url);

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

  ws.load(refVersion.url);

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
    if (!url) return resolve(null);

    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.preload = "auto";
    video.playsInline = true;
    video.style.position = "absolute";
    video.style.left = "-9999px";
    document.body.appendChild(video);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    function cleanup() {
      try {
        video.pause();
      } catch {}
      video.removeAttribute("src");
      try {
        video.load();
      } catch {}
      video.remove();
    }

    video.addEventListener("loadedmetadata", () => {
      try {
        const t = Math.min(video.duration * 0.2, video.duration - 0.1);
        video.currentTime = isFinite(t) && t > 0 ? t : 0;
      } catch {
        cleanup();
        resolve(null);
      }
    });

    video.addEventListener("seeked", () => {
      const w = video.videoWidth || 320;
      const h = video.videoHeight || 180;
      canvas.width = 320;
      canvas.height = Math.round((320 * h) / w);

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataURL = canvas.toDataURL("image/png");
      cleanup();
      resolve(dataURL);
    });

    video.addEventListener("error", () => {
      cleanup();
      resolve(null);
    });

    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 3000);
  });
}

// Existing version video thumbs
function generateVideoThumbnailFromUrl(version) {
  const url = version.media?.url;
  return generateVideoThumbnailRaw(url);
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

  mainWave.load(version.media.url);

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
    thumb.style.backgroundImage = `url(${version.media.thumbnailUrl})`;
  }
  else {
    // Asynchronously generate a thumbnail for the player if not already present.
    generateVideoThumbnailFromUrl(version).then(th => {
      if (!th) return;
      try {
        // show immediate data-URL
        version.media.thumbnailUrl = th;
        thumb.style.backgroundImage = `url(${th})`;
      } catch (e) {
        console.warn('[loadVideoPlayer] failed to apply generated thumbnail', e);
      }

      // upload the generated thumbnail and persist
      (async () => {
        try {
          const uploaded = await uploadDataUrlThumbnail(th, project.id, `${version.id}-thumb.png`);
          if (uploaded) {
            version.media.thumbnailUrl = uploaded;
            thumb.style.backgroundImage = `url(${uploaded})`;
            try { await saveProjectToServer(project); } catch (e) {}
          }
        } catch (err) {
          console.warn('[loadVideoPlayer] thumbnail upload failed', err);
        }
      })();
    });
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
    video.src = version.media.url;
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

    mainWave.load(active.url);

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
      video.src = active.url;
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

    const tc = document.createElement("span");
    tc.className = "timecode";
    tc.textContent = formatTime(c.time);

    const author = document.createElement("span");
    author.className = "author";
    author.textContent = c.author || "Client";

    const text = document.createElement("p");
    text.textContent = c.text;

    li.appendChild(tc);
    li.appendChild(author);
    li.appendChild(text);

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

  version.comments.push({
    id: uid(),
    time: t,
    author: "Client",
    text: final
  });

  commentInputEl.value = "";
  renderComments();
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
              triggerDownload(version.media.url, name);
            }
          }
          if (action === "download-deliverable") {
            const id = b.dataset.deliverableId;
            const dv = version.deliverables.find(d => d.id === id);
            if (dv && dv.url) {
              triggerDownload(dv.url, dv.name || "file");
            }
          }
        });
      });

      versionsContainer.appendChild(row);
    });

    details.appendChild(versionsContainer);
    cueListEl.appendChild(details);

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
      b.addEventListener("click", e => {
        e.stopPropagation();
        cueBtn.parentElement.classList.remove("open");
        const action = b.dataset.action;
        if (action === "rename") {
          const name = prompt("Rename cue", cue.name);
          if (name && name.trim()) {
            cue.name = name.trim();
            refreshAllNames();
            renderAll();
          }
        }
        if (action === "delete") {
          const ok = confirm(
            `Delete cue "${cue.displayName || cue.name}"?`
          );
          if (!ok) return;
          const projectNow = getActiveProject();
          if (!projectNow) return;
          projectNow.cues = projectNow.cues.filter(c => c.id !== cue.id);
          if (projectNow.activeCueId === cue.id) {
            projectNow.activeCueId = projectNow.cues[0]?.id || null;
            projectNow.activeVersionId =
              projectNow.cues[0]?.versions[0]?.id || null;
          }
          renderAll();
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

        if (version.media.thumbnailUrl) {
          const img = document.createElement("img");
          img.src = version.media.thumbnailUrl;
          img.className = "version-thumb";
          prev.appendChild(img);
        } else {
          generateVideoThumbnailFromUrl(version).then(th => {
            const el = document.getElementById(`preview-${version.id}`);
            if (!el) return;

            el.innerHTML = "";
            el.classList.add("video");

            if (!th) {
              el.style.background =
                "radial-gradient(circle, #111827, #020617 70%)";
              return;
            }

            version.media.thumbnailUrl = th;

            const img = document.createElement("img");
            img.src = th;
            img.className = "version-thumb";
            el.appendChild(img);
          });
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

  // If the dropped file is a video, generate a thumbnail immediately from the
  // local object URL and apply it to the preview so the thumbnail appears
  // right after upload finishes (backend persistence can follow later).
  try {
    if (version.media && version.media.type === "video") {
      generateVideoThumbnailFromUrl(version).then(th => {
        if (!th) return;

        // Use immediate data-URL for UI responsiveness
        version.media.thumbnailUrl = th;

        const prev = document.getElementById(`preview-${version.id}`);
        if (prev) {
          prev.innerHTML = "";
          prev.classList.add("video");
          const img = document.createElement("img");
          img.src = th;
          img.className = "version-thumb";
          prev.appendChild(img);
        }

        try {
          if (currentPlayerVersionId === version.id) {
            const playerThumb = document.querySelector(".video-thumb");
            if (playerThumb) playerThumb.style.backgroundImage = `url(${th})`;
          }
        } catch (e) {}

        // Upload generated thumbnail and persist project state
        (async () => {
          try {
            const uploaded = await uploadDataUrlThumbnail(th, project.id, `${version.id}-thumb.png`);
            if (uploaded) {
              version.media.thumbnailUrl = uploaded;
              try { await saveProjectToServer(project); } catch (e) {}

              // Update preview and player to use persistent URL
              const el = document.getElementById(`preview-${version.id}`);
              if (el) {
                el.innerHTML = "";
                el.classList.add("video");
                const img2 = document.createElement("img");
                img2.src = uploaded;
                img2.className = "version-thumb";
                el.appendChild(img2);
              }

              try {
                if (currentPlayerVersionId === version.id) {
                  const playerThumb = document.querySelector(".video-thumb");
                  if (playerThumb) playerThumb.style.backgroundImage = `url(${uploaded})`;
                }
              } catch (e) {}
            }
          } catch (err) {
            console.warn('[handleFileDropOnCue] thumbnail upload failed', err);
          }
        })();
      });
    }
  } catch (e) {
    console.warn('[handleFileDropOnCue] thumbnail generation failed', e);
  }

  // Upload the raw file to storage in background so the media URL becomes persistent.
  (async () => {
    try {
      if (version.media && (version.media.type === 'audio' || version.media.type === 'video')) {
        const uploadedUrl = await uploadFileToServer(file, project.id);
        version.media.url = uploadedUrl;
        // Save project JSON so the persisted URL is stored.
        try { await saveProjectToServer(project); } catch (e) {}
        // Re-render previews/player to use the uploaded URL.
        renderVersionPreviews();
      }
    } catch (err) {
      console.warn('[handleFileDropOnCue] background upload failed', err);
    }
  })();
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

  // Upload the deliverable file to persist it and replace the temporary URL.
  (async () => {
    try {
      const uploadedUrl = await uploadFileToServer(file, project.id);
      // find the deliverable and update its url
      const d = version.deliverables.find(x => x.name === file.name && x.size === file.size);
      if (d) d.url = uploadedUrl;
      try { await saveProjectToServer(project); } catch (e) {}
      renderVersionPreviews();
    } catch (err) {
      console.warn('[handleFileDropOnVersion] deliverable upload failed', err);
    }
  })();
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
      img.src = active.url;
      img.alt = active.name;
      preview.appendChild(img);
    } else if (active.type === "video") {
      if (active.thumbnailUrl) {
        const img = document.createElement("img");
        img.src = active.thumbnailUrl;
        img.alt = active.name;
        preview.appendChild(img);
      } else {
        generateVideoThumbnailRaw(active.url).then(th => {
          const el = document.getElementById(
            `ref-preview-${refRoot.id}`
          );
          if (!el) return;
          el.innerHTML = "";
          if (!th) {
            el.textContent = getReferenceLabel(active.type);
            return;
          }
          active.thumbnailUrl = th;
          const img = document.createElement("img");
          img.src = th;
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
        img.src = ver.url;
        img.alt = ver.name;
        vPrev.appendChild(img);
      } else if (ver.type === "video") {
        if (ver.thumbnailUrl) {
          const img = document.createElement("img");
          img.src = ver.thumbnailUrl;
          img.alt = ver.name;
          vPrev.appendChild(img);
        } else {
          generateVideoThumbnailRaw(ver.url).then(th => {
            const el = document.getElementById(
              `ref-version-preview-${ver.id}`
            );
            if (!el) return;
            el.innerHTML = "";
            if (!th) {
              el.textContent = getReferenceLabel(ver.type);
              return;
            }
            ver.thumbnailUrl = th;
            const img = document.createElement("img");
            img.src = th;
            img.alt = ver.name;
            vPrev.appendChild(img);
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
            triggerDownload(ver.url, ver.name || "reference");
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
function renderProjectList() {
  projectListEl.innerHTML = "";

  if (!state.projects.length) {
    const li = document.createElement("li");
    li.className = "project-item empty";
    li.textContent = 'No projects yet. Click "New project".';
    projectListEl.appendChild(li);
    return;
  }

  state.projects.forEach(project => {
    const li = document.createElement("li");
    li.className =
      "project-item" + (project.id === state.activeProjectId ? " active" : "");

    const label = document.createElement("span");
    label.textContent = project.name;

    const dd = document.createElement("div");
    dd.className = "download-dropdown project-dropdown";

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

    li.appendChild(label);
    li.appendChild(dd);

    li.addEventListener("click", e => {
      if (e.target.closest(".download-dropdown")) return;
      state.activeProjectId = project.id;
      renderAll();
    });

    btn.addEventListener("click", e => {
      e.stopPropagation();
      const open = dd.classList.contains("open");
      document
        .querySelectorAll(".download-dropdown.open")
        .forEach(x => x.classList.remove("open"));
      if (!open) dd.classList.add("open");
    });

    menu.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", e => {
        e.stopPropagation();
        dd.classList.remove("open");
        const action = b.dataset.action;
        if (action === "rename") renameProject(project);
        if (action === "delete") deleteProject(project.id);
      });
    });

    projectListEl.appendChild(li);
  });
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

if (dropzoneEl) {
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
} else {
  console.warn("[FlowPreview] globalDropzone element not found, skipping dropzone wiring");
}

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

document.addEventListener("click", e => {
  document.querySelectorAll(".download-dropdown.open").forEach(dd => {
    if (!dd.contains(e.target)) dd.classList.remove("open");
  });
});

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

// Try to load persisted projects from backend on startup.
async function loadProjectsFromServer() {
  try {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Failed to fetch projects');
    const data = await res.json();
    const list = (data.projects || []).map(p => ({
      id: p.id,
      name: p.title || p.name || 'Project',
      cues: p.cues || [],
      activeCueId: p.activeCueId || null,
      activeVersionId: p.activeVersionId || null,
      references: p.references || [],
      activeReferenceId: p.activeReferenceId || null
    }));

    if (list.length) state.projects = list;
    if (!state.activeProjectId && state.projects.length) {
      state.activeProjectId = state.projects[0].id;
    }
  } catch (err) {
    console.warn('[loadProjectsFromServer] could not load projects', err);
  }
}

(async function init() {
  await loadProjectsFromServer();
  renderAll();
})();
