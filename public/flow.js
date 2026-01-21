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
let draggedCueId = null;
let mainWaveLayer = null;
let playerWaveLoadToken = 0;
const PLAYER_WAVE_FADE_MS = 140;
const miniWaves = {};
const waveformParseCache = new Map();
const staticWaveformCache = new Map(); // Cache for static waveform canvases
const waveformPersisted = new Set();
const waveformPersistInFlight = new Set();
const waveformComputeInFlight = new Set();
const waveformRenderCache = new Map();
const WAVEFORM_PEAKS_COUNT = 2048;
const WAVEFORM_IMAGE_WIDTH = 200;
const WAVEFORM_IMAGE_HEIGHT = 40;
const waveformDecodeQueue = [];
let waveformDecoding = 0;
const MAX_CONCURRENT_WAVEFORM_DECODES = 4;
const waveformRetryState = new Map();
const MAX_WAVEFORM_RETRIES = 2;
const WAVEFORM_RETRY_DELAY_MS = 1200;

// Waveform generation queue - limit concurrent generation to avoid overwhelming the browser
const waveformQueue = [];
let waveformGenerating = 0;
const MAX_CONCURRENT_WAVEFORMS = 4; // Generate up to 4 waveforms at a time

function processWaveformQueue() {
  while (waveformQueue.length > 0 && waveformGenerating < MAX_CONCURRENT_WAVEFORMS) {
    const task = waveformQueue.shift();
    if (task && typeof task.execute === 'function') {
      waveformGenerating++;
      task.execute().finally(() => {
        waveformGenerating--;
        processWaveformQueue();
      });
    }
  }
}

function queueWaveformGeneration(version, container, execute) {
  // Skip if already queued or generating
  const existingIdx = waveformQueue.findIndex(t => t.versionId === version.id);
  if (existingIdx >= 0) return;
  if (miniWaves[version.id]) return;

  waveformQueue.push({ versionId: version.id, version, container, execute });
  processWaveformQueue();
}

function processWaveformDecodeQueue() {
  while (waveformDecodeQueue.length > 0 && waveformDecoding < MAX_CONCURRENT_WAVEFORM_DECODES) {
    const job = waveformDecodeQueue.shift();
    if (!job || typeof job.task !== "function") continue;
    waveformDecoding++;
    Promise.resolve()
      .then(job.task)
      .then(result => {
        job.resolve(result || null);
      })
      .catch(err => {
        console.warn('[Waveform] Decode task failed:', err);
        job.resolve(null);
      })
      .finally(() => {
        waveformDecoding--;
        processWaveformDecodeQueue();
      });
  }
}

function queueWaveformDecode(task) {
  return new Promise(resolve => {
    waveformDecodeQueue.push({ task, resolve });
    processWaveformDecodeQueue();
  });
}

function getWaveCacheId(kind, id) {
  return `${kind}:${id}`;
}

function getWaveformRenderKeyFromPeaks(peaks) {
  if (!peaks) return "none";
  if (Array.isArray(peaks[0]) && Array.isArray(peaks[1])) {
    const left = peaks[0] || [];
    const len = left.length || 0;
    const first = len ? left[0] : 0;
    const last = len ? left[len - 1] : 0;
    return `peaks:${len}:${Math.round(first * 1000)}:${Math.round(last * 1000)}`;
  }
  if (Array.isArray(peaks)) {
    const len = peaks.length || 0;
    const first = len ? peaks[0] : 0;
    const last = len ? peaks[len - 1] : 0;
    return `peaks:${len}:${Math.round(first * 1000)}:${Math.round(last * 1000)}`;
  }
  return "none";
}

function getWaveformRenderKeyFromMedia(media) {
  if (!media) return "none";
  if (media.waveformImageUrl) return `img:${media.waveformImageUrl}`;
  const peaks = getWaveformPeaks(media.waveform);
  return getWaveformRenderKeyFromPeaks(peaks);
}

function getWaveformRenderKeyFromVersion(version) {
  if (!version || !version.media) return "none";
  if (version.media.waveformImageUrl) return `img:${version.media.waveformImageUrl}`;
  let peaks = getWaveformPeaks(version.media.waveform);
  if (!peaks && waveformParseCache.has(version.id)) {
    peaks = waveformParseCache.get(version.id);
  }
  return getWaveformRenderKeyFromPeaks(peaks);
}

function getWaveformContainerWidth(container) {
  return Math.max(1, container.clientWidth || container.offsetWidth || 0);
}

function setWaveformRenderCache(cacheId, key, container, height) {
  waveformRenderCache.set(cacheId, {
    key,
    width: getWaveformContainerWidth(container),
    height
  });
}

async function persistWaveformPeaks(version, peaks) {
  if (!version || !version.id || !peaks || !peaks.length) return;
  if (waveformPersisted.has(version.id) || waveformPersistInFlight.has(version.id)) return;
  if (version.media && version.media.waveformSaved) {
    waveformPersisted.add(version.id);
    return;
  }

  const project = getActiveProject();
  if (!project) return;

  waveformPersistInFlight.add(version.id);

  try {
    const headers =
      (window.flowAuth && typeof window.flowAuth.getAuthHeaders === 'function')
        ? window.flowAuth.getAuthHeaders()
        : { 'Content-Type': 'application/json' };

    const resp = await fetch('/api/versions/update', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        versionId: version.id,
        projectId: project.id,
        updates: { media_waveform_data: JSON.stringify(peaks) }
      })
    });

    if (!resp.ok) {
      console.warn('[Waveform] Failed to persist peaks', version.id, resp.status);
      waveformPersistInFlight.delete(version.id);
      return;
    }

    waveformPersistInFlight.delete(version.id);
    waveformPersisted.add(version.id);
    if (version.media) {
      version.media.waveformSaved = true;
    }
  } catch (err) {
    waveformPersistInFlight.delete(version.id);
    console.warn('[Waveform] Persist error', version.id, err);
  }
}

async function ensureWaveformPeaksForVersion(version) {
  const mediaUrl = resolveVersionMediaUrl(version);
  if (!mediaUrl || !version || !version.media) return null;
  const existing = getWaveformPeaks(version.media.waveform);
  if (existing && existing.length) return existing;
  if (waveformComputeInFlight.has(version.id)) return null;

  waveformComputeInFlight.add(version.id);
  try {
    const result = await computeWaveformPeaksFromUrl(
      mediaUrl,
      WAVEFORM_PEAKS_COUNT
    );
    const peaks = result && result.peaks;
    if (!peaks || !peaks.length) return null;
    if (result && typeof result.duration === "number" && !version.media.duration) {
      version.media.duration = result.duration;
    }
    version.media.waveform = peaks;
    waveformParseCache.set(version.id, peaks);
    staticWaveformCache.delete(version.id);
    persistWaveformPeaks(version, peaks);
    return peaks;
  } finally {
    waveformComputeInFlight.delete(version.id);
  }
}
let currentPlayerCueId = null;

// Player cache to avoid flicker
let currentPlayerVersionId = null;
let currentPlayerMediaType = null;

// Notes cache keyed by project id
const projectNotesStore = Object.create(null);

// UI state for reference panel
let referencesCollapsed = false;
let cuesCollapsed = false;
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
let uploadProgressPanel = null;
let uploadProgressList = null;
const uploadJobRows = new Map();
let uploadHideTimer = null;
let activeUploads = 0;
const MAX_UPLOAD_SIZE = 500 * 1024 * 1024;
const MAX_PREVIEW_SIZE = 2 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "video/x-matroska",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/x-pn-wav",
  "audio/aiff",
  "audio/x-aiff",
  "audio/aac",
  "audio/mp4",
  "audio/ogg",
  "audio/flac",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/octet-stream"
];
const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".mkv",
  ".avi",
  ".webm",
  ".m4v",
  ".mp3",
  ".wav",
  ".aif",
  ".aiff",
  ".flac",
  ".aac",
  ".m4a",
  ".ogg",
  ".oga",
  ".opus",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".pdf",
  ".txt",
  ".zip",
  ".rar",
  ".7z"
]);
const UPLOAD_MIME_BY_EXTENSION = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".aif": "audio/aiff",
  ".aiff": "audio/aiff",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".opus": "audio/ogg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".zip": "application/zip",
  ".rar": "application/vnd.rar",
  ".7z": "application/x-7z-compressed"
};
const UPLOAD_EXTENSION_BY_MIME = Object.entries(UPLOAD_MIME_BY_EXTENSION).reduce((acc, entry) => {
  const ext = entry[0];
  const mime = entry[1];
  if (!acc[mime]) acc[mime] = ext;
  return acc;
}, {});

function getUploadExtension(fileName) {
  if (!fileName) return "";
  const idx = fileName.lastIndexOf(".");
  if (idx === -1) return "";
  return fileName.substring(idx).toLowerCase();
}

function resolveUploadContentType(contentType, fileName) {
  const rawType = contentType || "";
  let ext = getUploadExtension(fileName);
  if (!ext && rawType && UPLOAD_EXTENSION_BY_MIME[rawType]) {
    ext = UPLOAD_EXTENSION_BY_MIME[rawType];
  }
  if (rawType && ALLOWED_UPLOAD_MIME_TYPES.includes(rawType)) {
    return { contentType: rawType, ext };
  }
  if (ext && ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
    return { contentType: UPLOAD_MIME_BY_EXTENSION[ext] || "application/octet-stream", ext };
  }
  return { contentType: "", ext };
}

async function getUploadAuthHeaders() {
  try {
    if (window.flowAuth && typeof window.flowAuth.getAuthHeaders === "function") {
      return window.flowAuth.getAuthHeaders();
    }
  } catch (e) {}

  const headers = {};
  try {
    if (window.supabaseClient && window.supabaseClient.auth) {
      const sessionRes = await window.supabaseClient.auth.getSession();
      const session = sessionRes && sessionRes.data ? sessionRes.data.session : null;
      if (session && session.access_token) {
        headers.Authorization = "Bearer " + session.access_token;
      }
      if (session && session.user && session.user.id) {
        headers["x-actor-id"] = session.user.id;
      }
    }
  } catch (e) {}
  return headers;
}

async function readUploadError(res) {
  try {
    const data = await res.json();
    if (data && data.error) return data.error;
    return JSON.stringify(data);
  } catch (e) {
    try {
      return await res.text();
    } catch (err) {
      return "Unknown error";
    }
  }
}
let hasAutoSelectedProject = false;
let sharedWithCache = { projectId: null, items: null };
let sharedWithLoading = false;

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

const sidebarEl = document.querySelector(".sidebar");
if (!sidebarEl) console.error('[FlowPreview] sidebarEl not found in DOM');
const contentEl = document.querySelector(".content");
const rightColEl = document.querySelector(".right-column");
const cuesDropzoneEl = document.getElementById("cuesDropzone");
const refsDropzoneEl = document.getElementById("refsDropzone");

// Add buttons for cues and references
const addCueBtn = document.getElementById("addCueBtn");
const addReferenceBtn = document.getElementById("addReferenceBtn");

// Auto-rename controls
const autoRenameToggle = document.getElementById("autoRenameToggle");
const namingControlsWrapper = document.querySelector(".naming-presets-container");
const namingSchemeButtons = document.querySelectorAll("[data-naming-scheme]");

const cueListEl = document.getElementById("cueList");
if (!cueListEl) console.error('[FlowPreview] cueListEl not found in DOM');
const cueListSubtitleEl = document.getElementById("cueListSubtitle");
if (!cueListSubtitleEl) console.error('[FlowPreview] cueListSubtitleEl not found in DOM');

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
const statusInRevisionBtn = document.getElementById("statusInRevisionBtn");
const statusApprovedBtn = document.getElementById("statusApprovedBtn");
if (!statusApprovedBtn) console.error('[FlowPreview] statusApprovedBtn not found in DOM');

const reviewStatusMessageEl = document.getElementById("reviewStatusMessage");
const reviewCompleteBtn = document.getElementById("reviewCompleteBtn");
const startRevisionBtn = document.getElementById("startRevisionBtn");
const approveVersionBtn = document.getElementById("approveVersionBtn");
const requestChangesBtn = document.getElementById("requestChangesBtn");
const reviewActionsEl = document.querySelector(".review-actions");
const decisionActionsEl = document.querySelector(".decision-actions");

const shareBtn = document.getElementById("shareBtn");
// shareBtn and deliverBtn are optional - not all pages have them
const deliverBtn = document.getElementById("deliverBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
if (!copyLinkBtn) console.error('[FlowPreview] copyLinkBtn not found in DOM');
const shareTabButtons = document.querySelectorAll(".share-tab-btn");
const shareTabPanels = document.querySelectorAll(".share-tab-panel");
const sharedWithListEl = document.getElementById("sharedWithList");
const sharePeopleHintEl = document.getElementById("sharePeopleHint");
const shareInviteEmailEl = document.getElementById("shareInviteEmail");
const shareInviteRoleEl = document.getElementById("shareInviteRole");
const shareInviteBtn = document.getElementById("shareInviteBtn");
const shareInviteMessageEl = document.getElementById("shareInviteMessage");


// Project References DOM
const refsBodyEl = document.getElementById("refsBody");
if (!refsBodyEl) console.error('[FlowPreview] refsBodyEl not found in DOM');
const refsListEl = document.getElementById("refsList");
if (!refsListEl) console.error('[FlowPreview] refsListEl not found in DOM');
const refsSubtitleEl = document.getElementById("refsSubtitle");
if (!refsSubtitleEl) console.error('[FlowPreview] refsSubtitleEl not found in DOM');
const refsToggleBtn = document.getElementById("refsToggleBtn");
if (!refsToggleBtn) console.error('[FlowPreview] refsToggleBtn not found in DOM');
const cuesToggleBtn = document.getElementById("cuesToggleBtn");
if (!cuesToggleBtn) console.error('[FlowPreview] cuesToggleBtn not found in DOM');
const refsCountBadgeEl = document.getElementById("refsCountBadge");
const cuesCountBadgeEl = document.getElementById("cuesCountBadge");
const refsSubtitleKey =
  (refsSubtitleEl && refsSubtitleEl.getAttribute("data-i18n")) || "refs.subtitle";
const cuesSubtitleKey =
  (cueListSubtitleEl && cueListSubtitleEl.getAttribute("data-i18n")) || "cues.subtitle";
const refsSubtitleFallback = refsSubtitleEl ? refsSubtitleEl.textContent : "";
const cuesSubtitleFallback = cueListSubtitleEl ? cueListSubtitleEl.textContent : "";

// Notes panel elements (removed from UI - keeping refs for backwards compatibility)
const generalNotesListEl = document.getElementById("generalNotesList");
const cueNotesListEl = document.getElementById("cueNotesList");
const generalNoteForm = document.getElementById("generalNoteForm");
const cueNoteForm = document.getElementById("cueNoteForm");

if (shareTabButtons && shareTabButtons.length) {
  shareTabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-share-tab") || "link";
      setActiveShareTab(tab);
      if (tab === "people") {
        refreshSharedWithPanel(true);
      }
    });
  });
}
if (shareInviteBtn) {
  shareInviteBtn.addEventListener("click", async () => {
    await handleShareInvite();
  });
}

// =======================
// UI HELPERS
// =======================
function tr(key, params, fallback) {
  const t = window.i18n && typeof window.i18n.t === "function" ? window.i18n.t : null;
  if (t) return t(key, params || {});
  if (fallback !== undefined) return fallback;
  return key;
}

function showConfirmDialog(options = {}) {
  const {
    title = tr("action.confirmDefaultTitle", {}, "Sei sicuro?"),
    message = tr("action.confirmDefaultMessage", {}, "Confermi questa azione?"),
    confirmLabel = tr("action.confirm", {}, "Conferma"),
    cancelLabel = tr("action.cancel", {}, "Annulla")
  } = options || {};

  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.setAttribute("role", "presentation");

    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const titleEl = document.createElement("div");
    titleEl.className = "confirm-title";
    titleEl.textContent = title;

    const messageEl = document.createElement("div");
    messageEl.className = "confirm-message";
    messageEl.textContent = message;

    const actionsEl = document.createElement("div");
    actionsEl.className = "confirm-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "ghost-btn tiny confirm-cancel";
    cancelBtn.textContent = cancelLabel;

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "danger-btn tiny confirm-confirm";
    confirmBtn.textContent = confirmLabel;

    actionsEl.appendChild(cancelBtn);
    actionsEl.appendChild(confirmBtn);

    dialog.appendChild(titleEl);
    dialog.appendChild(messageEl);
    dialog.appendChild(actionsEl);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const previousActive = document.activeElement;
    const cleanup = result => {
      overlay.classList.remove("visible");
      const removeOverlay = () => overlay.remove();
      overlay.addEventListener("transitionend", removeOverlay, { once: true });
      setTimeout(removeOverlay, 200);
      document.removeEventListener("keydown", handleKey);
      if (previousActive && typeof previousActive.focus === "function") {
        try {
          previousActive.focus();
        } catch (_) {}
      }
      resolve(result);
    };

    const handleKey = e => {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup(false);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        cleanup(true);
      }
    };

    document.addEventListener("keydown", handleKey);

    cancelBtn.addEventListener("click", e => {
      e.preventDefault();
      cleanup(false);
    });

    confirmBtn.addEventListener("click", e => {
      e.preventDefault();
      cleanup(true);
    });

    overlay.addEventListener("click", e => {
      if (e.target === overlay) {
        cleanup(false);
      }
    });

    requestAnimationFrame(() => {
      overlay.classList.add("visible");
      setTimeout(() => {
        try {
          confirmBtn.focus();
        } catch (_) {}
      }, 30);
    });
  });
}

function showPromptDialog(options = {}) {
  const {
    title = tr("action.confirmDefaultTitle"),
    message = "",
    confirmLabel = tr("action.confirm"),
    cancelLabel = tr("action.cancel"),
    defaultValue = "",
    placeholder = "",
    inputType = "text"
  } = options || {};

  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.setAttribute("role", "presentation");

    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const titleEl = document.createElement("div");
    titleEl.className = "confirm-title";
    titleEl.textContent = title;

    const messageEl = document.createElement("div");
    messageEl.className = "confirm-message";
    messageEl.textContent = message || "";

    const input = document.createElement("input");
    input.type = inputType;
    input.className = "confirm-input";
    input.value = defaultValue || "";
    input.placeholder = placeholder || "";

    const actionsEl = document.createElement("div");
    actionsEl.className = "confirm-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "ghost-btn tiny confirm-cancel";
    cancelBtn.textContent = cancelLabel;

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "primary-btn tiny confirm-confirm";
    confirmBtn.textContent = confirmLabel;

    actionsEl.appendChild(cancelBtn);
    actionsEl.appendChild(confirmBtn);

    dialog.appendChild(titleEl);
    if (message) dialog.appendChild(messageEl);
    dialog.appendChild(input);
    dialog.appendChild(actionsEl);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const previousActive = document.activeElement;
    const cleanup = result => {
      overlay.classList.remove("visible");
      const removeOverlay = () => overlay.remove();
      overlay.addEventListener("transitionend", removeOverlay, { once: true });
      setTimeout(removeOverlay, 200);
      document.removeEventListener("keydown", handleKey);
      if (previousActive && typeof previousActive.focus === "function") {
        try {
          previousActive.focus();
        } catch (_) {}
      }
      resolve(result);
    };

    const handleKey = e => {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup(null);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        cleanup(input.value);
      }
    };

    document.addEventListener("keydown", handleKey);

    cancelBtn.addEventListener("click", e => {
      e.preventDefault();
      cleanup(null);
    });

    confirmBtn.addEventListener("click", e => {
      e.preventDefault();
      cleanup(input.value);
    });

    overlay.addEventListener("click", e => {
      if (e.target === overlay) {
        cleanup(null);
      }
    });

    requestAnimationFrame(() => {
      overlay.classList.add("visible");
      setTimeout(() => {
        try {
          input.focus();
          input.select();
        } catch (_) {}
      }, 30);
    });
  });
}
const generalNoteInput = document.getElementById("generalNoteInput");
const cueNoteInput = document.getElementById("cueNoteInput");
const generalNoteSubmitBtn = document.getElementById("generalNoteSubmit");
const cueNoteSubmitBtn = document.getElementById("cueNoteSubmit");
const cueNotesHeadingEl = document.getElementById("cueNotesHeading");

if (generalNoteForm) {
  generalNoteForm.addEventListener("submit", async e => {
    e.preventDefault();
    const text = generalNoteInput?.value?.trim();
    if (!text) return;
    await saveProjectNote(text);
    if (generalNoteInput) generalNoteInput.value = "";
    renderNotesPanel();
  });
}

if (cueNoteForm) {
  cueNoteForm.addEventListener("submit", async e => {
    e.preventDefault();
    const text = cueNoteInput?.value?.trim();
    if (!text) return;
    const project = getActiveProject();
    const cueId = project?.activeCueId;
    if (!cueId) return;
    await saveCueNote(cueId, text);
    if (cueNoteInput) cueNoteInput.value = "";
    renderNotesPanel();
  });
}

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
        const prevCueId = project.activeCueId;
        const prevVersionId = project.activeVersionId;
        const prevMode = state.playerMode;
        project.activeCueId = cue.id;
        project.activeVersionId = version.id;
        if (prevMode !== "review") {
          state.playerMode = "review";
          updatePlayerModeButtons();
        }
        // ensure UI reflects selection without full re-render
        if (
          prevCueId !== cue.id ||
          prevVersionId !== version.id ||
          prevMode !== "review"
        ) {
          renderPlayer();
          if (prevCueId !== cue.id) renderNotesPanel();
        }
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
  try {
    if (typeof crypto !== "undefined") {
      if (crypto.randomUUID) return crypto.randomUUID();
      if (crypto.getRandomValues) {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0"));
        return (
          hex.slice(0, 4).join("") + "-" +
          hex.slice(4, 6).join("") + "-" +
          hex.slice(6, 8).join("") + "-" +
          hex.slice(8, 10).join("") + "-" +
          hex.slice(10).join("")
        );
      }
    }
  } catch (err) {
    console.warn("uid(): crypto unavailable, falling back to pseudo-random id", err);
  }
  // Fallback still returns UUID-looking string so API validators accept it
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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

function storeCueMaxRevisions(cueId, value) {
  if (!cueId || typeof value !== "number" || !Number.isFinite(value)) return;
  localStorage.setItem(`cue-max-revisions:${cueId}`, String(value));
}

function loadCueMaxRevisions(cueId) {
  if (!cueId) return null;
  const raw = localStorage.getItem(`cue-max-revisions:${cueId}`);
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function migrateCueMaxRevisionsKey(oldId, newId) {
  if (!oldId || !newId || oldId === newId) return;
  const raw = localStorage.getItem(`cue-max-revisions:${oldId}`);
  if (raw) {
    localStorage.setItem(`cue-max-revisions:${newId}`, raw);
    localStorage.removeItem(`cue-max-revisions:${oldId}`);
  }
}

async function promptForMaxRevisions() {
  const stored = localStorage.getItem("cue-max-revisions");
  const fallback = stored && !Number.isNaN(parseInt(stored, 10)) ? stored : "5";
  while (true) {
    const input = await showPromptDialog({
      title: tr("cues.maxRevisionsPrompt", {}, "Numero massimo revisioni per questa cue"),
      defaultValue: fallback,
      inputType: "number"
    });
    if (input === null) return null;
    const value = parseInt(String(input).trim(), 10);
    if (Number.isFinite(value) && value > 0) {
      localStorage.setItem("cue-max-revisions", String(value));
      return value;
    }
    showAlert("Inserisci un numero valido (minimo 1).");
  }
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

function getFileExtension(fileName) {
  if (!fileName) return ".wav";
  const idx = fileName.lastIndexOf(".");
  if (idx === -1) return ".wav";
  return fileName.substring(idx).toLowerCase() || ".wav";
}

function deriveCueIndex(project, cue) {
  if (typeof cue?.index === "number") return cue.index + 1;
  if (!project || !project.cues) return 1;
  const idx = project.cues.findIndex(c => c.id === cue?.id);
  return idx >= 0 ? idx + 1 : 1;
}
function buildComposerName(project, cue, version, ext) {
  const projectName = project?.name || "Project";
  const title =
    projectName.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12) ||
    "PROJECT";
  const cueIndex = deriveCueIndex(project, cue);
  const code =
    state.namingMode === "cinema"
      ? `1m${pad2(cueIndex)}`
      : `Cue_${pad2(cueIndex)}`;
  const ver = pad2((version?.index || 0) + 1);
  let type = "MIX";
  const lowerExt = (ext || "").toLowerCase();
  if (lowerExt.match(/\.(mp3|m4a|ogg|aac)$/)) type = "PREVIEW";
  return `${title}_${code}_v${ver}_${type}${ext}`;
}

// Return a proxied URL on our domain when media comes from Supabase/storage
function extractStoragePathFromUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/api/media/stream")) {
    try {
      const u = new URL(trimmed, window.location.origin);
      const rawPath = u.searchParams.get("path");
      if (rawPath) return rawPath;
      const rawUrl = u.searchParams.get("url");
      if (rawUrl) return extractStoragePathFromUrl(rawUrl);
    } catch (e) {
      return null;
    }
  }

  try {
    const u = new URL(trimmed);
    const parts = u.pathname.split("/").filter(Boolean);
    const objIdx = parts.findIndex(p => p === "object");
    if (objIdx >= 0) {
      const after = parts.slice(objIdx + 1);
      if (after.length >= 3 && (after[0] === "public" || after[0] === "sign") && after[1]) {
        const bucket = after[1];
        const pathParts = after.slice(2);
        return `${bucket}/${pathParts.join("/")}`;
      }
    }
  } catch (e) {
    // ignore parse errors
  }

  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return null;
  if (trimmed.includes("://")) return null;
  return trimmed.replace(/^\/+/, "");
}

/**
 * Get direct URL for media playback (audio/video elements).
 * Returns Supabase signed URLs directly without proxy for faster loading.
 * Use this for <audio src>, <video src>, <img src> - these don't need CORS.
 */
function getDirectUrl(raw) {
  if (!raw) return raw;
  // Already a proxy URL - extract and return the underlying URL if signed
  if (typeof raw === "string" && raw.startsWith("/api/media/stream")) {
    try {
      const u = new URL(raw, window.location.origin);
      const rawUrl = u.searchParams.get("url");
      // If it has a signed URL embedded, use it directly
      if (rawUrl && (rawUrl.includes("token=") || rawUrl.includes("/object/sign/"))) {
        return rawUrl;
      }
    } catch (e) {}
    // Otherwise keep proxy URL
    return raw;
  }
  try {
    const u = new URL(raw);
    const host = u.hostname || "";
    // If it's our domain, return as-is
    if (host === window.location.hostname) return raw;
    // If it's a signed Supabase URL, use it directly (no proxy needed for playback)
    if ((host.includes("supabase.co") || raw.includes("/storage/v1/object/")) &&
        (raw.includes("token=") || raw.includes("/object/sign/"))) {
      return raw; // Direct access - faster!
    }
    // Public Supabase URLs can also be used directly
    if (host.includes("supabase.co") && raw.includes("/object/public/")) {
      return raw;
    }
    // Other URLs - return as-is
    return raw;
  } catch (e) {
    // Storage path needs proxy to sign
    return `/api/media/stream?path=${encodeURIComponent(raw)}`;
  }
}

/**
 * Get proxied URL for operations requiring CORS (fetch, canvas, Web Audio).
 * Use this for waveform generation, thumbnail extraction, downloads.
 */
function getProxiedUrl(raw) {
  if (!raw) return raw;
  if (typeof raw === "string" && raw.startsWith("/api/media/stream")) {
    try {
      const u = new URL(raw, window.location.origin);
      const rawPath = u.searchParams.get("path");
      if (rawPath) return raw;
      const rawUrl = u.searchParams.get("url");
      if (rawUrl) {
        const storagePath = extractStoragePathFromUrl(rawUrl);
        if (storagePath) {
          return `/api/media/stream?path=${encodeURIComponent(storagePath)}`;
        }
      }
    } catch (e) {}
    return raw;
  }
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
      // Fall back to proxying the whole signed URL so we keep a same-origin request
      return `/api/media/stream?url=${encodeURIComponent(raw)}`;
    }
    // Otherwise return original
    return raw;
  } catch (e) {
    // Likely a storage path like "projects/..." → proxy by path
    return `/api/media/stream?path=${encodeURIComponent(raw)}`;
  }
}

function resolveVersionMediaUrl(version) {
  if (!version || !version.media) return null;
  const storagePath =
    typeof version.media.storagePath === "string"
      ? version.media.storagePath.trim()
      : null;
  if (storagePath) return getProxiedUrl(storagePath);
  const mediaUrl =
    typeof version.media.url === "string"
      ? version.media.url.trim()
      : null;
  if (!mediaUrl) return null;
  return getProxiedUrl(mediaUrl);
}

function getWaveformPeaks(raw) {
  if (!raw) return null;
  let data = raw;
  if (typeof raw === "string") {
    if (waveformParseCache.has(raw)) {
      data = waveformParseCache.get(raw);
    } else {
      try {
        data = JSON.parse(raw);
        waveformParseCache.set(raw, data);
      } catch (e) {
        return null;
      }
    }
  }
  if (Array.isArray(data)) return data;
  if (typeof data === "object") {
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.samples)) return data.samples;
    if (Array.isArray(data.peaks)) return data.peaks;
    if (Array.isArray(data.left) && Array.isArray(data.right)) {
      return [data.left, data.right];
    }
  }
  return null;
}

function renderStaticWaveform(container, peaks, opts = {}) {
  const versionId = opts.versionId;
  const height = opts.height || 36;
  const color = opts.color || "rgba(148,163,184,0.8)";
  const bg = opts.background || "transparent";
  const width = Math.max(1, container.clientWidth || container.offsetWidth || 240);

  // Check if we have a cached canvas for this version
  if (versionId && staticWaveformCache.has(versionId)) {
    const cached = staticWaveformCache.get(versionId);
    const cachedCanvas = cached && cached.canvas ? cached.canvas : cached;
    const cachedWidth = cached && cached.width ? cached.width : cachedCanvas?.width;
    const cachedHeight = cached && cached.height ? cached.height : cachedCanvas?.height;
    if (cachedCanvas && cachedWidth === width && cachedHeight === height) {
      container.innerHTML = "";
      container.appendChild(cachedCanvas.cloneNode(true));
      return;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.className = "waveform-canvas";
  canvas.dataset.waveWidth = String(width);
  canvas.dataset.waveHeight = String(height);
  container.innerHTML = "";
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const normalized =
    Array.isArray(peaks[0]) && Array.isArray(peaks[1])
      ? peaks.map(arr => (Array.isArray(arr) ? arr : []))
      : [Array.isArray(peaks) ? peaks : []];

  const combined = normalized.length === 1 ? normalized[0] : normalized[0].map((val, idx) => {
    const left = Math.abs(val || 0);
    const right = Math.abs(normalized[1][idx] || 0);
    return Math.max(left, right);
  });

  const samples = combined.length;
  const step = Math.max(1, Math.floor(samples / width));

  ctx.fillStyle = color;
  for (let x = 0; x < width; x++) {
    const idx = Math.min(samples - 1, x * step);
    const amp = Math.max(0, Math.min(1, Math.abs(combined[idx] || 0)));
    const barHeight = Math.max(1, amp * (height - 4));
    const y = (height - barHeight) / 2;
    ctx.fillRect(x, y, 1, barHeight);
  }

  // Cache the canvas for future use
  if (versionId) {
    staticWaveformCache.set(versionId, {
      canvas: canvas.cloneNode(true),
      width,
      height
    });
  }
}

function renderWavePlaceholder(container, waveformData, opts = {}) {
  if (!container) return false;
  const peaks = getWaveformPeaks(waveformData);
  if (!peaks) {
    container.innerHTML = "";
    return false;
  }
  renderStaticWaveform(container, peaks, opts);
  const canvas = container.querySelector(".waveform-canvas");
  if (canvas) {
    canvas.dataset.wavePlaceholder = "1";
  }
  return true;
}

function renderNeutralWavePlaceholder(container, opts = {}) {
  if (!container) return false;
  const height = opts.height || 36;
  const color = opts.color || "rgba(148,163,184,0.45)";
  const width = Math.max(1, container.clientWidth || container.offsetWidth || 240);
  const samples = Math.max(8, width * 4);
  const peaks = new Array(samples);
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const amp = 0.18 + 0.12 * Math.sin(t * Math.PI * 6);
    peaks[i] = Math.max(0.05, Math.min(0.4, amp));
  }
  renderStaticWaveform(container, peaks, { height, color });
  const canvas = container.querySelector(".waveform-canvas");
  if (canvas) {
    canvas.dataset.wavePlaceholder = "1";
  }
  return true;
}

function renderWaveImagePlaceholder(container, imageUrl, opts = {}) {
  if (!container || !imageUrl) return false;
  const height = opts.height || 36;
  container.innerHTML = "";
  const img = document.createElement("img");
  img.src = getDirectUrl(imageUrl);
  img.alt = "";
  img.style.width = "100%";
  img.style.height = `${height}px`;
  img.style.objectFit = "cover";
  img.dataset.wavePlaceholder = "1";
  container.appendChild(img);
  return true;
}

function removeWavePlaceholder(container) {
  if (!container) return;
  const placeholders = container.querySelectorAll('[data-wave-placeholder="1"]');
  placeholders.forEach(el => el.remove());
}

function updateActiveVersionRowStyles() {
  const project = getActiveProject();
  if (!project) return;
  const activeCueId = project.activeCueId;
  const activeVersionId = project.activeVersionId;
  document.querySelectorAll(".version-row").forEach(row => {
    const isActive =
      row.dataset.cueId === (activeCueId || "") &&
      row.dataset.versionId === (activeVersionId || "");
    row.classList.toggle("active", !!isActive);
  });
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

function getVersionMetaText(version) {
  if (!version) return "";
  if (version.media) {
    const d = version.media.duration
      ? formatTime(version.media.duration)
      : "--:--";
    const typeLabel =
      version.media.type === "audio"
        ? tr("media.audio")
        : version.media.type === "video"
        ? tr("media.video")
        : tr("media.file");
    let text = `${typeLabel} · ${d}`;
    if (version.deliverables?.length) {
      text += ` · ${tr("media.techFiles", { n: version.deliverables.length })}`;
    }
    return text;
  }
  if (version.deliverables?.length) {
    return tr("media.techFiles", { n: version.deliverables.length });
  }
  return tr("media.onlyDeliverables");
}

// =======================
// VERSION / CUE STATUS
// =======================
const STATUS_LABEL_KEYS = {
  in_review: "player.inReview",
  review_completed: "status.reviewCompleted",
  in_revision: "status.inRevision",
  approved: "player.approved",
  changes_requested: "player.changesRequested",
  "in-review": "player.inReview",
  "changes-requested": "player.changesRequested"
};

function getStatusLabel(status) {
  const key = STATUS_LABEL_KEYS[status] || STATUS_LABEL_KEYS.in_review;
  return tr(key);
}

const REVIEW_CLOSED_MESSAGE = () =>
  tr(
    "comments.closedMessage",
    {},
    "Questa versione è chiusa. I nuovi commenti andranno sulla prossima versione."
  );

function normalizeVersionStatus(status) {
  if (!status) return "in_review";
  if (status === "in-review") return "in_review";
  if (status === "changes-requested") return "changes_requested";
  return status;
}

function getStatusClassKey(status) {
  return normalizeVersionStatus(status).replace(/_/g, "-");
}

function isOwnerOfProject(project) {
  const user = window.flowAuth && typeof window.flowAuth.getUser === "function"
    ? window.flowAuth.getUser()
    : null;
  if (!user || !project || !project.owner_id) return false;
  return user.id === project.owner_id;
}

// Check if current user is a collaborator (project shared with them, not owner)
function isCollaboratorOfProject(project) {
  if (!project) return false;
  // If project has is_shared flag and user is logged in but not owner
  if (project.is_shared && !isOwnerOfProject(project)) return true;
  return false;
}

function canAddCommentsForVersion(status) {
  return normalizeVersionStatus(status) === "in_review";
}

function toggleActionContainer(container, buttons) {
  if (!container) return;
  const hasVisible = buttons.some(btn => btn && btn.style.display !== "none");
  container.style.display = hasVisible ? "inline-flex" : "none";
}

function updateReviewUI(project, version) {
  const status = normalizeVersionStatus(version.status);
  const isOwner = isOwnerOfProject(project);
  const isCollaborator = isCollaboratorOfProject(project);
  const canComment = canAddCommentsForVersion(status);

  // Collaborators (clients) can mark review complete and approve
  const canCollaboratorAct = isCollaborator && (status === "in_review" || status === "review_completed");

  if (reviewCompleteBtn) {
    // Collaborators CAN mark review as complete when status is in_review
    const showReviewComplete = isCollaborator && status === "in_review";
    reviewCompleteBtn.style.display = showReviewComplete ? "inline-flex" : "none";
  }

  // Hide Start revision button - no longer needed, owner just uploads new version
  if (startRevisionBtn) {
    startRevisionBtn.style.display = "none";
  }

  if (statusInReviewBtn) {
    statusInReviewBtn.style.display = "none";
  }
  if (statusApprovedBtn) {
    statusApprovedBtn.style.display = "none";
  }

  if (approveVersionBtn) {
    // Collaborators CAN approve when status is in_review or review_completed
    const showApprove = isCollaborator && (status === "in_review" || status === "review_completed");
    approveVersionBtn.style.display = showApprove ? "inline-flex" : "none";
    approveVersionBtn.disabled = !showApprove;
  }

  // Hide Request changes button - removed from flow
  if (requestChangesBtn) {
    requestChangesBtn.style.display = "none";
  }

  toggleActionContainer(reviewActionsEl, [reviewCompleteBtn]);
  toggleActionContainer(decisionActionsEl, [approveVersionBtn]);

  setCommentsEnabled(canComment);
  if (commentInputEl) {
    if (canComment) {
      commentInputEl.placeholder = tr("comments.addPlaceholder");
    } else {
      commentInputEl.placeholder = tr("comments.closedPlaceholder");
    }
  }

  if (reviewStatusMessageEl) {
    let message = "";
    if (status === "in_review") {
      message = isOwner
        ? tr("review.messageInReviewOwner")
        : tr("review.messageInReviewClient");
    } else if (status === "review_completed") {
      message = tr("review.messageCompleted");
    } else if (status === "in_revision") {
      message = tr("review.messageInRevision");
    } else if (status === "changes_requested") {
      message = tr("review.messageChangesRequested");
    } else if (status === "approved") {
      message = tr("review.messageApproved");
    }
    reviewStatusMessageEl.textContent = message;
    reviewStatusMessageEl.style.display = message ? "block" : "none";
  }
}

function resetReviewUI() {
  if (reviewCompleteBtn) reviewCompleteBtn.style.display = "none";
  if (startRevisionBtn) startRevisionBtn.style.display = "none";
  if (approveVersionBtn) approveVersionBtn.style.display = "none";
  if (requestChangesBtn) requestChangesBtn.style.display = "none";
  if (statusInReviewBtn) statusInReviewBtn.style.display = "none";
  if (statusApprovedBtn) statusApprovedBtn.style.display = "none";
  if (reviewActionsEl) reviewActionsEl.style.display = "none";
  if (decisionActionsEl) decisionActionsEl.style.display = "none";
  if (reviewStatusMessageEl) {
    reviewStatusMessageEl.textContent = "";
    reviewStatusMessageEl.style.display = "none";
  }
  setCommentsEnabled(false);
}

function computeCueStatus(cue) {
  if (!cue.versions.length) return "in_review";
  const statuses = cue.versions.map(v => normalizeVersionStatus(v.status));
  if (statuses.includes("in_revision")) return "in_revision";
  if (statuses.includes("changes_requested")) return "changes_requested";
  if (statuses.includes("review_completed")) return "review_completed";
  if (statuses.includes("approved")) return "approved";
  return "in_review";
}

async function setVersionStatus(project, cue, version, status) {
  if (!STATUS_LABEL_KEYS[status]) return;

  try {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetch('/api/versions/update', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        versionId: version.id,
        projectId: project.id,
        updates: { status: status }
      })
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = payload?.error || 'Errore nell\'aggiornare lo stato della versione';
      console.error('[FlowPreview] Failed to update version status', msg);
    showAlert(msg);
      return;
    }
    version.status = payload?.version?.status || status;
    cue.status = computeCueStatus(cue);
    renderCueList();
    renderVersionPreviews();
    renderPlayer();
  } catch (err) {
    console.error('[FlowPreview] Exception updating version status', err);
    showAlert('Errore nell\'aggiornare lo stato della versione');
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

async function selectProject(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;

  state.activeProjectId = projectId;

  // If project cues are not loaded yet (shouldn't happen with /api/projects/full)
  // load them now
  if (!project.cues || project.cues.length === 0) {
    await loadProjectCues(projectId);
  }

  renderAll();
  loadProjectNotes(projectId).catch(err => {
    console.warn('[Flow] Failed to load notes for project selection', err);
  });
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
  const original = cleanFileName(cue.originalName) || "";
  const manualName =
    cue.name && cue.name.trim() && cue.name.trim() !== original;

  if (manualName) {
    return cue.name.trim();
  }

  if (!state.autoRename) {
    return cue.name || original || `Cue ${idx}`;
  }

  if (state.namingMode === "media") return `Cue ${pad2(idx)}`;
  return `1m${pad2(idx)}`;
}

function computeVersionLabel(i) {
  return `v${i + 1}`;
}

function computeMediaDisplayName(project, cue, version, fileName) {
  const original = fileName || "";
  const manualName =
    version?.media?.manualName &&
    version.media.displayName &&
    version.media.displayName.trim();

  if (manualName) {
    return version.media.displayName.trim();
  }

  if (!state.autoRename) return original;
  const ext = getFileExtension(fileName);

  return buildComposerName(project, cue, version, ext);
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
  const name = await showPromptDialog({
    title: tr("project.createPrompt", {}, "Project name"),
    defaultValue: defaultName
  });
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
        showAlert('Errore nella creazione del progetto:\n' + (text || 'unknown'));
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
    showAlert('Errore nella creazione del progetto');
  }
}

async function renameProject(project) {
  const name = await showPromptDialog({
    title: tr("project.renamePrompt", {}, "Rename project"),
    defaultValue: project.name
  });
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
      showAlert('Errore nel rinominare il progetto');
      return;
    }
    project.name = newName;
    renderAll();
  } catch (err) {
    console.error('[FlowPreview] Exception renaming project', err);
    showAlert('Errore nel rinominare il progetto');
  }
}

async function deleteProject(id) {
  const p = getProjectById(id);
  if (!p) return;
  const ok = await showConfirmDialog({
    title: tr("action.delete"),
    message: `Delete project "${p.name}"?`,
    confirmLabel: tr("action.delete"),
    cancelLabel: tr("action.cancel")
  });
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
      showAlert('Errore nella cancellazione del progetto');
      return;
    }
  } catch (err) {
    console.error('[FlowPreview] Exception deleting project', err);
    showAlert('Errore nella cancellazione del progetto');
    return;
  }

  state.projects = state.projects.filter(x => x.id !== id);
  state.activeProjectId =
    state.projects.length ? state.projects[state.projects.length - 1].id : null;

  currentPlayerVersionId = null;
  currentPlayerMediaType = null;
  currentPlayerCueId = null;
  state.playerMode = "review";

  renderAll();
}

// =======================
// CUE / VERSION CRUD
// =======================
async function createCueFromFile(file) {
  const project = getActiveProject();
  if (!project) return;

  const maxRevisions = await promptForMaxRevisions();
  if (maxRevisions === null) return;

  const cue = {
    id: uid(),
    index: project.cues.length,
    originalName: file.name,
    name: cleanFileName(file.name),
    displayName: "",
    maxRevisions,
    max_revisions: maxRevisions,
    status: "in_review",
    versions: [],
    isOpen: true
  };

  storeCueMaxRevisions(cue.id, maxRevisions);
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
          status: cue.status,
          max_revisions: cue.maxRevisions
        }
      })
    });
    
    if (!res.ok) {
      console.error('[Flow] Failed to save cue to database', await res.text());
      showAlert('Errore nel salvataggio della cue. Riprova.');
      project.cues = project.cues.filter(c => c.id !== cue.id);
      localStorage.removeItem(`cue-max-revisions:${cue.id}`);
      renderCueList();
      return;
    } else {
      const payload = await res.json().catch(() => null);
      const serverCueId = payload && (payload.cueId || (payload.cue && payload.cue.id));
      if (serverCueId) {
        // Replace the temporary client id with server-generated UUID so future calls use the correct id
        console.log('[Flow] Cue saved to database (server id):', serverCueId, 'clientTempId:', cue.id);
        // Update cue object and project references
        const oldId = cue.id;
        cue.id = serverCueId;
        migrateCueMaxRevisionsKey(oldId, serverCueId);
        const ci = project.cues.findIndex(c => c.id === oldId);
        if (ci >= 0) project.cues[ci].id = serverCueId;
      } else {
        console.log('[Flow] Cue saved to database (no server id returned), client id kept:', cue.id);
      }
    }
  } catch (err) {
    console.error('[Flow] Exception saving cue:', err);
    showAlert('Errore nel salvataggio della cue. Riprova.');
    project.cues = project.cues.filter(c => c.id !== cue.id);
    localStorage.removeItem(`cue-max-revisions:${cue.id}`);
    renderCueList();
    return;
  }

  const version = createVersionForCue(project, cue, file, { isNewCue: true });

  project.activeCueId = cue.id;
  project.activeVersionId = version.id;

  cue.status = computeCueStatus(cue);
  refreshAllNames();
  renderAll();
}

// =======================
// UPLOAD TO SUPABASE
// =======================
function ensureUploadProgressPanel() {
  if (uploadProgressPanel) return;

  uploadProgressPanel = document.createElement("div");
  uploadProgressPanel.id = "uploadProgressPanel";
  uploadProgressPanel.className = "upload-progress-panel";

  const header = document.createElement("div");
  header.className = "upload-progress-header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "upload-progress-title";
  titleWrap.innerHTML = `<strong>${tr("upload.panelTitle")}</strong><small id="uploadProgressCount"></small>`;

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "upload-progress-close";
  closeBtn.innerHTML = "×";
  closeBtn.addEventListener("click", () => {
    if (uploadProgressPanel) uploadProgressPanel.style.display = "none";
  });

  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  uploadProgressList = document.createElement("div");
  uploadProgressList.className = "upload-progress-list";

  uploadProgressPanel.appendChild(header);
  uploadProgressPanel.appendChild(uploadProgressList);
  document.body.appendChild(uploadProgressPanel);
}

function showUploadProgressPanel() {
  ensureUploadProgressPanel();
  if (uploadProgressPanel) {
    uploadProgressPanel.style.display = "flex";
  }
  if (uploadHideTimer) {
    clearTimeout(uploadHideTimer);
    uploadHideTimer = null;
  }
  updateUploadCountLabel();
}

function updateUploadCountLabel() {
  const countEl = document.getElementById("uploadProgressCount");
  if (!countEl) return;
  const count = uploadJobRows.size;
  countEl.textContent = count > 0 ? tr("upload.countLabel", { n: count }) : "";
}

function scheduleHideUploadPanel() {
  if (uploadJobRows.size > 0 || activeUploads > 0) return;
  if (uploadHideTimer) clearTimeout(uploadHideTimer);
  uploadHideTimer = setTimeout(() => {
    if (uploadJobRows.size === 0 && activeUploads === 0 && uploadProgressPanel) {
      uploadProgressPanel.style.display = "none";
    }
  }, 1200);
}

function registerUploadJob(jobId, fileName, fileSize) {
  showUploadProgressPanel();
  if (!uploadProgressList) return;

  if (uploadJobRows.has(jobId)) {
    updateUploadCountLabel();
    return uploadJobRows.get(jobId);
  }

  const row = document.createElement("div");
  row.className = "upload-progress-item";

  const top = document.createElement("div");
  top.className = "upload-progress-top";

  const nameEl = document.createElement("span");
  nameEl.className = "upload-progress-name";
  nameEl.textContent = fileName || tr("upload.fileLabel");

  const percentEl = document.createElement("span");
  percentEl.className = "upload-progress-percent";
  percentEl.textContent = "0%";

  top.appendChild(nameEl);
  top.appendChild(percentEl);

  const sizeEl = document.createElement("div");
  sizeEl.className = "upload-progress-size";
  sizeEl.textContent = formatFileSize(fileSize);

  const bar = document.createElement("div");
  bar.className = "upload-progress-bar";
  const fill = document.createElement("span");
  bar.appendChild(fill);

  const statusEl = document.createElement("div");
  statusEl.className = "upload-progress-status";
  statusEl.textContent = tr("upload.preparing");

  row.appendChild(top);
  row.appendChild(sizeEl);
  row.appendChild(bar);
  row.appendChild(statusEl);

  uploadProgressList.appendChild(row);

  const job = {
    row,
    fill,
    percentEl,
    statusEl,
    percent: 0
  };

  uploadJobRows.set(jobId, job);
  updateUploadCountLabel();
  return job;
}

function updateUploadJob(jobId, percent, status) {
  const job = uploadJobRows.get(jobId);
  if (!job) return;
  const safePercent = Math.max(0, Math.min(100, Math.round(percent || 0)));
  job.percent = safePercent;
  if (job.fill) {
    job.fill.style.width = safePercent + "%";
  }
  if (job.percentEl) {
    job.percentEl.textContent = `${safePercent}%`;
  }
  if (status && job.statusEl) {
    job.statusEl.textContent = status;
  }
}

function gentlyAdvanceUpload(jobId, targetPercent, status) {
  const job = uploadJobRows.get(jobId);
  if (!job) return;
  const capped = Math.min(90, Math.max(0, Math.round(targetPercent || 0)));
  const prev = job.percent || 0;
  if (capped <= prev) return;
  const delta = capped - prev;
  const easing = Math.max(1, Math.round(delta * 0.35));
  const next = Math.min(capped, prev + easing);
  updateUploadJob(jobId, next, status);
}

function startSimulatedUploadProgress(jobId, size, maxPercent = 95) {
  const start = Date.now();
  const expectedMs = Math.max(2000, Math.min(60000, (size / (1.5 * 1024 * 1024)) * 1000));
  const tick = () => {
    const elapsed = Date.now() - start;
    const ratio = Math.min(1, elapsed / expectedMs);
    const target = Math.min(maxPercent, 20 + Math.round(ratio * (maxPercent - 20)));
    gentlyAdvanceUpload(jobId, target, tr("upload.uploading"));
  };
  tick();
  const timer = setInterval(tick, 400);
  return () => clearInterval(timer);
}

function markUploadJobComplete(jobId, message) {
  const job = uploadJobRows.get(jobId);
  if (!job) return;
  job.row.classList.remove("is-error");
  job.row.classList.add("is-complete");
  updateUploadJob(jobId, 100, message || tr("upload.completed"));
  removeUploadJob(jobId, 1200);
}

function markUploadJobError(jobId, message) {
  const job = uploadJobRows.get(jobId);
  if (!job) return;
  job.row.classList.remove("is-complete");
  job.row.classList.add("is-error");
  updateUploadJob(jobId, job.percent || 0, message || tr("upload.error"));
  removeUploadJob(jobId, 5000);
}

function removeUploadJob(jobId, delay = 1000) {
  const job = uploadJobRows.get(jobId);
  if (!job) {
    scheduleHideUploadPanel();
    return;
  }
  setTimeout(() => {
    if (uploadProgressList && job.row.parentElement === uploadProgressList) {
      uploadProgressList.removeChild(job.row);
    }
    uploadJobRows.delete(jobId);
    updateUploadCountLabel();
    scheduleHideUploadPanel();
  }, delay);
}

async function uploadFileToSupabase(file, projectId, cueId, versionId, options = {}) {
  const jobId = options.jobId || options.deliverableId || versionId;
  activeUploads++;
  registerUploadJob(jobId, file.name, file.size);
  updateUploadJob(jobId, 0, tr("upload.preparing"));

  try {
    if (file.size > MAX_UPLOAD_SIZE) {
      alert(`ERRORE UPLOAD: file troppo grande (max ${Math.round(MAX_UPLOAD_SIZE / 1024 / 1024)}MB)`);
      markUploadJobError(jobId, tr("upload.error"));
      return;
    }

    const resolved = resolveUploadContentType(file.type, file.name);
    const contentType = resolved.contentType;
    if (!contentType) {
      alert("ERRORE UPLOAD: tipo file non consentito");
      markUploadJobError(jobId, tr("upload.error"));
      return;
    }

    const authHeaders = await getUploadAuthHeaders();
    const hasAuth = !!(authHeaders.Authorization || authHeaders.authorization);
    if (!hasAuth) {
      alert("ERRORE: Non sei autenticato! Ricarica la pagina e fai login.");
      markUploadJobError(jobId, "Non autenticato");
      return;
    }

    const headers = Object.assign({}, authHeaders, { "Content-Type": "application/json" });

    const signRes = await fetch("/api/upload-url", {
      method: "POST",
      headers,
      body: JSON.stringify({ projectId, filename: file.name, contentType })
    });

    if (!signRes.ok) {
      const errorDetail = await readUploadError(signRes);
      alert(`ERRORE UPLOAD ${signRes.status}:\n${errorDetail}`);
      markUploadJobError(jobId, `Errore ${signRes.status}`);
      return;
    }

    const signData = await signRes.json().catch(() => null);
    const uploadPath = signData && signData.path;
    const uploadToken = signData && signData.token;
    const signedUrl = signData && signData.signedUrl;

    if (!uploadPath || !uploadToken || !signedUrl) {
      alert("ERRORE UPLOAD: risposta upload-url non valida");
      markUploadJobError(jobId, tr("upload.invalidResponse"));
      return;
    }

    updateUploadJob(jobId, 20, tr("upload.uploading"));

    if (!window.supabaseClient || !window.supabaseClient.storage) {
      alert("ERRORE UPLOAD: Supabase client non disponibile");
      markUploadJobError(jobId, tr("upload.error"));
      return;
    }

    const stopProgress = startSimulatedUploadProgress(jobId, file.size, 97);
    const uploadRes = await window.supabaseClient.storage
      .from("media")
      .uploadToSignedUrl(uploadPath, uploadToken, file, { contentType });

    if (uploadRes.error) {
      stopProgress();
      console.error("[Upload] Storage error:", uploadRes.error);
      alert(`ERRORE UPLOAD:\n${uploadRes.error.message || "Upload fallito"}`);
      markUploadJobError(jobId, tr("upload.error"));
      return;
    }

    updateUploadJob(jobId, 98, tr("upload.finalizing"));

    const completeRes = await fetch("/api/upload-complete", {
      method: "POST",
      headers,
      body: JSON.stringify({
        projectId,
        path: uploadPath,
        filename: file.name,
        contentType,
        size: file.size
      })
    });

    if (!completeRes.ok) {
      stopProgress();
      const errorDetail = await readUploadError(completeRes);
      alert(`ERRORE UPLOAD ${completeRes.status}:\n${errorDetail}`);
      markUploadJobError(jobId, `Errore ${completeRes.status}`);
      return;
    }
    stopProgress();

    const completeData = await completeRes.json().catch(() => null);
    const storedPath = completeData && completeData.path ? completeData.path : uploadPath;

    const project = getProjectById(projectId);
    if (project) {
      const cue = project.cues.find(c => c.id === cueId);
      if (cue) {
        const version = cue.versions.find(v => v.id === versionId);
        if (version) {
          if (options.deliverableId) {
            const deliverable = version.deliverables.find(d => d.id === options.deliverableId);
            if (deliverable) {
              deliverable.url = getProxiedUrl(storedPath);
              await saveDeliverableToDatabase(project.id, version.id, deliverable, storedPath);
              markUploadJobComplete(jobId, tr("upload.completed"));
              renderVersionPreviews();
            }
          } else if (version.media) {
            version.media.url = getProxiedUrl(storedPath);
            version.media.storagePath = storedPath;
            version.isUploading = false;
            version.uploadProgress = 100;

            const saved = await saveVersionToDatabase(project.id, cue.id, version, storedPath);
            if (saved) {
              markUploadJobComplete(jobId, tr("upload.completed"));
              if (version.media.type) {
                generateAndUploadPreviews(project.id, cue.id, version.id, version.media.type, version.media.url)
                  .catch(err => console.warn("[Preview] Failed:", err));
              }
            } else {
              markUploadJobError(jobId, tr("upload.error"));
            }
            renderVersionPreviews();
            renderPlayer();
          }
        }
      }
    }
  } catch (err) {
    console.error("[Upload] Exception:", err);
    markUploadJobError(jobId, tr("upload.unexpectedError"));
  } finally {
    activeUploads = Math.max(0, activeUploads - 1);
    scheduleHideUploadPanel();
  }
}

async function saveVersionToDatabase(projectId, cueId, version, storagePath) {
  try {
    // Don't save blob: URLs to database - they are temporary browser URLs
    let mediaUrl = version.media && version.media.url ? version.media.url : null;
    if (mediaUrl && mediaUrl.startsWith('blob:')) {
      mediaUrl = null; // Will be resolved from storage_path
    }

    const versionData = {
      id: version.id,
      index: version.index,
      status: version.status,
      media_type: version.media && version.media.type ? version.media.type : null,
      media_storage_path: storagePath || null,
      media_url: mediaUrl,
      media_original_name: version.media && version.media.originalName ? version.media.originalName : null,
      media_display_name: version.media && (version.media.displayName || version.media.originalName) ? (version.media.displayName || version.media.originalName) : null,
      media_duration: version.media && version.media.duration ? version.media.duration : null,
      media_thumbnail_path: null,
      media_thumbnail_url: version.media && version.media.thumbnailUrl ? version.media.thumbnailUrl : null
    };

    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';
    const res = await fetch('/api/versions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        cue_id: cueId,
        version: versionData,
        projectId
      })
    });

    if (!res.ok) {
      console.error('[Flow] Failed to save version to database', await res.text());
      return false;
    }

    console.log('[Flow] Version saved to database:', version.id);
    return true;
  } catch (err) {
    console.error('[Flow] Exception saving version:', err);
    return false;
  }
}

async function saveDeliverableToDatabase(projectId, versionId, deliverable, storageOrPublicUrl) {
  try {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';

    const res = await fetch('/api/versions/update', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        versionId,
        projectId,
        updates: {},
        versionFiles: [{
          name: deliverable.name,
          type: deliverable.type || null,
          size: deliverable.size || null,
          url: storageOrPublicUrl || null
        }]
      })
    });

    if (!res.ok) {
      console.error('[Deliverables] Failed to persist file', await res.text());
      throw new Error('Salvataggio deliverable non riuscito');
    }

    const data = await res.json().catch(() => null);
    const inserted = data?.files?.[0];
    if (inserted?.id) {
      deliverable.id = inserted.id;
      deliverable.url = inserted.url || publicUrl || deliverable.url;
    }
    return inserted;
  } catch (err) {
    console.error('[Deliverables] Exception saving file', err);
    throw err;
  }
}

function createVersionForCue(project, cue, file, options = {}) {
  const isNewCue = options.isNewCue || false;
  const version = {
    id: uid(),
    index: cue.versions.length,
    media: null,
    comments: [],
    deliverables: [],
    status: "in_review",
    uploadProgress: 0,
    isUploading: true
  };

  const type = detectRawType(file.name);
  const url = URL.createObjectURL(file);

  // Determine upload type for email notifications
  const uploadType = type === "audio" || type === "video"
    ? (isNewCue ? 'new_cue' : 'new_version')
    : 'deliverable';
  const cueName = cue.name || cue.title || '';

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
    const deliverableId = uid();
    version.deliverables.push({
      id: deliverableId,
      name: file.name,
      size: file.size,
      type,
      url
    });
    (async () => {
      const saved = await saveVersionToDatabase(project.id, cue.id, version, null);
      if (!saved) {
        console.error('[Flow] Failed to save version metadata for deliverable file');
        return;
      }
      uploadFileToSupabase(file, project.id, cue.id, version.id, { deliverableId, uploadType, cueName });
    })();
  }

  cue.versions.push(version);
  cue.status = computeCueStatus(cue);

  // Start async upload to Supabase for media files
  if (version.media) {
    (async () => {
      // Save version to database BEFORE uploading file
      const saved = await saveVersionToDatabase(project.id, cue.id, version, null);
      if (!saved) {
        console.error('[Flow] Failed to save version metadata');
        return;
      }
      // Then upload the file
      uploadFileToSupabase(file, project.id, cue.id, version.id, { uploadType, cueName });
    })();
  }

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
      return tr("refs.labelPdf");
    case "image":
      return tr("refs.labelImage");
    case "audio":
      return tr("refs.labelAudio");
    case "video":
      return tr("refs.labelVideo");
    case "zip":
      return tr("refs.labelArchive");
    default:
      return tr("refs.labelFile");
  }
}

function applyReferencesCollapsedState() {
  if (!refsBodyEl || !refsToggleBtn) return;
  var t = window.i18n && window.i18n.t ? window.i18n.t : function(k) { return k; };
  if (referencesCollapsed) {
    refsBodyEl.classList.add("collapsed");
    refsToggleBtn.textContent = t('refs.show');
  } else {
    refsBodyEl.classList.remove("collapsed");
    refsToggleBtn.textContent = t('refs.hide');
  }
}

function applyCuesCollapsedState() {
  const cuesBodyEl = document.getElementById('cuesBody');
  if (!cuesBodyEl || !cuesToggleBtn) return;
  var t = window.i18n && window.i18n.t ? window.i18n.t : function(k) { return k; };
  if (cuesCollapsed) {
    cuesBodyEl.classList.add("collapsed");
    cuesToggleBtn.textContent = t('cues.show');
  } else {
    cuesBodyEl.classList.remove("collapsed");
    cuesToggleBtn.textContent = t('cues.hide');
  }
}

// =======================
// MINI WAVEFORM (CUE VERSIONS)
// =======================
function createMiniWave(version, container) {
  if (!version.media || version.media.type !== "audio") return;
  const cacheId = getWaveCacheId("v", version.id);
  const waveKey = getWaveformRenderKeyFromVersion(version);
  const mediaUrl = resolveVersionMediaUrl(version);
  if (!mediaUrl) {
    container.classList.add("is-placeholder");
    container.innerHTML = `<span class="preview-label uploading">Upload…</span>`;
    setWaveformRenderCache(cacheId, waveKey, container, 36);
    return;
  }

  container.style.position = "relative";
  container.style.overflow = "hidden";

  // PRIORITY 1: Check if we have a saved waveform IMAGE (fastest - just load the image)
  if (version.media.waveformImageUrl) {
    container.innerHTML = "";
    const img = document.createElement("img");
    img.src = getDirectUrl(version.media.waveformImageUrl);
    img.style.width = "100%";
    img.style.height = "36px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "4px";
    img.onerror = () => {
      // If image fails to load, fall back to waveform generation
      version.media.waveformImageUrl = null;
      createMiniWave(version, container);
    };
    container.appendChild(img);
    setWaveformRenderCache(cacheId, waveKey, container, 36);
    return;
  }

  // PRIORITY 2: Check if we have peaks in version.media.waveform
  let peaks = getWaveformPeaks(version.media.waveform);

  // Also check if peaks were extracted by WaveSurfer and cached
  if (!peaks && waveformParseCache.has(version.id)) {
    peaks = waveformParseCache.get(version.id);
  }

  // If peaks exist, render a static waveform immediately (no audio load needed)
  if (peaks) {
    renderStaticWaveform(container, peaks, {
      height: 36,
      color: "rgba(56,189,248,0.9)",
      versionId: version.id
    });
    waveformRetryState.delete(version.id);
    setWaveformRenderCache(cacheId, waveKey, container, 36);
    return;
  }

  // Destroy any existing WaveSurfer instance
  if (miniWaves[version.id]) {
    try {
      miniWaves[version.id].destroy();
    } catch (e) {}
    delete miniWaves[version.id];
  }

  container.innerHTML = "";
  renderNeutralWavePlaceholder(container, {
    height: 36,
    color: "rgba(148,163,184,0.45)"
  });
  setWaveformRenderCache(cacheId, waveKey, container, 36);

  queueWaveformGeneration(version, container, async () => {
    const computed = await ensureWaveformPeaksForVersion(version);
    if (!computed) {
      const retry = waveformRetryState.get(version.id) || { count: 0 };
      if (retry.count < MAX_WAVEFORM_RETRIES && resolveVersionMediaUrl(version)) {
        retry.count += 1;
        waveformRetryState.set(version.id, retry);
        setTimeout(() => {
          const liveContainer = document.getElementById(`preview-${version.id}`);
          if (!liveContainer || !liveContainer.isConnected) return;
          waveformRenderCache.delete(cacheId);
          createMiniWave(version, liveContainer);
        }, WAVEFORM_RETRY_DELAY_MS * retry.count);
      }
      return;
    }

    waveformRetryState.delete(version.id);
    const liveContainer = document.getElementById(`preview-${version.id}`);
    const target = (liveContainer && liveContainer.isConnected)
      ? liveContainer
      : (container && container.isConnected ? container : null);
    if (!target) return;
    target.innerHTML = "";
    renderStaticWaveform(target, computed, {
      height: 36,
      color: "rgba(56,189,248,0.9)",
      versionId: version.id
    });
    const updatedKey = getWaveformRenderKeyFromVersion(version);
    setWaveformRenderCache(cacheId, updatedKey, target, 36);
    const metaEl = document.querySelector(
      `.version-row[data-version-id="${version.id}"] .version-meta`
    );
    if (metaEl) {
      metaEl.textContent = getVersionMetaText(version);
    }
  });
}

// =======================
// MINI WAVEFORM (REFERENCE VERSIONS)
// =======================
function createRefMiniWave(refVersion, container) {
  if (refVersion.type !== "audio" || !refVersion.url) return;

  const cacheId = getWaveCacheId("r", refVersion.id);
  const waveKey = getWaveformRenderKeyFromPeaks(getWaveformPeaks(refVersion.waveform));
  const cached = waveformRenderCache.get(cacheId);
  const targetWidth = getWaveformContainerWidth(container);
  const hasExisting = !!container.querySelector("canvas, img");
  if (cached && cached.width === targetWidth && cached.key === waveKey && hasExisting) {
    return;
  }

  container.innerHTML = "";
  container.style.position = "relative";
  container.style.overflow = "hidden";

  const refPeaks = getWaveformPeaks(refVersion.waveform);
  if (refPeaks) {
    renderStaticWaveform(container, refPeaks, { height: 32 });
    setWaveformRenderCache(cacheId, waveKey, container, 32);
    if (miniWaves[refVersion.id]) {
      try {
        miniWaves[refVersion.id].destroy();
      } catch (e) {}
      delete miniWaves[refVersion.id];
    }
    return;
  }

  if (miniWaves[refVersion.id]) {
    try {
      miniWaves[refVersion.id].destroy();
    } catch (e) {}
    delete miniWaves[refVersion.id];
  }

  // Check if WaveSurfer is available
  if (typeof WaveSurfer === 'undefined') {
    console.warn('[createRefMiniWave] WaveSurfer not loaded yet');
    return;
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
  setWaveformRenderCache(cacheId, waveKey, container, 32);

  const durationHint = typeof refVersion.duration === "number" ? refVersion.duration : undefined;
  ws.load(getDirectUrl(refVersion.url), undefined, durationHint);

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
  const url = resolveVersionMediaUrl(version);
  return generateVideoThumbnailRaw(url);
}

// =======================
// PREVIEW GENERATION & UPLOAD
// =======================

/**
 * Deterministic waveform peaks used across previews and the player.
 */
function computeWaveformPeaksFromBuffer(audioBuffer, sampleCount) {
  if (!audioBuffer || !audioBuffer.length) return null;
  const samples = Math.max(1, sampleCount || 0);
  const channels = [];
  const channelCount = audioBuffer.numberOfChannels || 1;
  for (let ch = 0; ch < channelCount; ch++) {
    try {
      channels.push(audioBuffer.getChannelData(ch));
    } catch (e) {
      // ignore invalid channel reads
    }
  }
  if (!channels.length) return null;

  const length = audioBuffer.length;
  const samplesPerBucket = Math.max(1, Math.floor(length / samples));
  const peaks = new Array(samples).fill(0);
  let globalMax = 0;

  for (let i = 0; i < samples; i++) {
    const start = i * samplesPerBucket;
    const end = Math.min(start + samplesPerBucket, length);
    let bucketMax = 0;
    for (let ch = 0; ch < channels.length; ch++) {
      const data = channels[ch];
      for (let j = start; j < end; j++) {
        const val = Math.abs(data[j] || 0);
        if (val > bucketMax) bucketMax = val;
      }
    }
    peaks[i] = bucketMax;
    if (bucketMax > globalMax) globalMax = bucketMax;
  }

  if (globalMax > 0) {
    for (let i = 0; i < peaks.length; i++) {
      peaks[i] = peaks[i] / globalMax;
    }
  }

  return {
    peaks,
    duration: typeof audioBuffer.duration === "number" ? audioBuffer.duration : null
  };
}

function downsamplePeaks(peaks, targetCount) {
  if (!Array.isArray(peaks) || !peaks.length) return null;
  const target = Math.max(1, targetCount || 0);
  if (peaks.length <= target) return peaks.slice();
  const out = new Array(target);
  const bucketSize = peaks.length / target;
  for (let i = 0; i < target; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucketSize));
    let max = 0;
    for (let j = start; j < end && j < peaks.length; j++) {
      const val = Math.abs(peaks[j] || 0);
      if (val > max) max = val;
    }
    out[i] = max;
  }
  return out;
}

async function computeWaveformPeaksFromUrlInternal(audioUrl, sampleCount, retryCount = 0) {
  if (!audioUrl) return null;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1500; // 1.5 seconds between retries
  let audioContext = null;
  try {
    const proxiedUrl = getProxiedUrl(audioUrl);
    console.log('[Waveform] Fetching audio from:', proxiedUrl, 'attempt:', retryCount + 1);
    const response = await fetch(proxiedUrl);
    if (!response.ok) {
      console.warn('[Waveform] Failed to fetch audio for peaks, status:', response.status);
      // Retry if file might not be available yet (404 or 5xx)
      if (retryCount < MAX_RETRIES && (response.status === 404 || response.status >= 500)) {
        console.log('[Waveform] Retrying in', RETRY_DELAY, 'ms...');
        await new Promise(r => setTimeout(r, RETRY_DELAY));
        return computeWaveformPeaksFromUrlInternal(audioUrl, sampleCount, retryCount + 1);
      }
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return computeWaveformPeaksFromBuffer(audioBuffer, sampleCount);
  } catch (err) {
    console.warn('[Waveform] Failed to compute peaks:', err);
    // Retry on network errors
    if (retryCount < MAX_RETRIES) {
      console.log('[Waveform] Retrying after error in', RETRY_DELAY, 'ms...');
      await new Promise(r => setTimeout(r, RETRY_DELAY));
      return computeWaveformPeaksFromUrlInternal(audioUrl, sampleCount, retryCount + 1);
    }
    return null;
  } finally {
    try {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    } catch (e) {
      // ignore
    }
  }
}

async function computeWaveformPeaksFromUrl(audioUrl, sampleCount) {
  if (!audioUrl) return null;
  return queueWaveformDecode(() => computeWaveformPeaksFromUrlInternal(audioUrl, sampleCount));
}

/**
 * Generate waveform as PNG image data URL
 * Uses Web Audio API to analyze audio and render to canvas
 */
async function generateWaveformImage(
  audioUrl,
  width = WAVEFORM_IMAGE_WIDTH,
  height = WAVEFORM_IMAGE_HEIGHT
) {
  return new Promise(async (resolve) => {
    try {
      console.log('[Waveform] Generating image from:', audioUrl);
      const startTs = Date.now();

      const result = await computeWaveformPeaksFromUrl(
        audioUrl,
        WAVEFORM_PEAKS_COUNT
      );
      const peaks = result && result.peaks;
      const duration = result && typeof result.duration === "number" ? result.duration : null;
      if (!peaks || !peaks.length) {
        console.warn('[Waveform] Failed to compute peaks');
        return resolve(null);
      }

      const imagePeaks = downsamplePeaks(peaks, width) || peaks;

      // Render to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);

      // Waveform bars - cyan color
      ctx.fillStyle = '#38bdf8';
      const barWidth = 2;
      const gap = 1;
      const centerY = height / 2;

      for (let i = 0; i < imagePeaks.length; i++) {
        const x = i * (barWidth + gap);
        if (x >= width) break;
        const barHeight = Math.max(2, (imagePeaks[i] || 0) * (height - 4));
        ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
      }

      const dataUrl = canvas.toDataURL('image/png');
      console.log('[Waveform] Generated in', Date.now() - startTs, 'ms');
      resolve({ dataUrl, peaks, duration });
    } catch (err) {
      console.error('[Waveform] Error generating image:', err);
      resolve(null);
    }
  });
}

/**
 * Upload a preview image (waveform or thumbnail) to storage
 */
async function uploadPreviewImage(projectId, versionId, previewType, imageData, extraUpdates) {
  if (!projectId || !versionId || !imageData) return null;

  try {
    console.log('[Preview] Uploading', previewType, 'for version', versionId);
    const blobRes = await fetch(imageData);
    const blob = await blobRes.blob();

    if (blob.size > MAX_PREVIEW_SIZE) {
      console.warn('[Preview] File too large:', blob.size);
      return null;
    }

    const ext = UPLOAD_EXTENSION_BY_MIME[blob.type] || '.png';
    const filename = `${previewType}-${versionId}${ext}`;
    const resolved = resolveUploadContentType(blob.type, filename);
    const contentType = resolved.contentType;

    if (!contentType) {
      console.warn('[Preview] Unsupported content type:', blob.type);
      return null;
    }

    const authHeaders = await getUploadAuthHeaders();
    const headers = Object.assign({}, authHeaders, { 'Content-Type': 'application/json' });

    const signRes = await fetch('/api/upload-url', {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectId, filename, contentType })
    });

    if (!signRes.ok) {
      console.warn('[Preview] upload-url failed:', signRes.status, await readUploadError(signRes));
      return null;
    }

    const signData = await signRes.json().catch(() => null);
    const uploadPath = signData && signData.path;
    const uploadToken = signData && signData.token;
    const signedUrl = signData && signData.signedUrl;

    if (!uploadPath || !uploadToken || !signedUrl) {
      console.warn('[Preview] upload-url invalid response');
      return null;
    }

    if (!window.supabaseClient || !window.supabaseClient.storage) {
      console.warn('[Preview] Supabase client missing');
      return null;
    }

    const uploadRes = await window.supabaseClient.storage
      .from('media')
      .uploadToSignedUrl(uploadPath, uploadToken, blob, { contentType });

    if (uploadRes.error) {
      console.warn('[Preview] Upload error:', uploadRes.error);
      return null;
    }

    const updates = previewType === 'waveform'
      ? { media_waveform_image_url: uploadPath }
      : { media_thumbnail_url: uploadPath, media_thumbnail_path: uploadPath };
    const finalUpdates = extraUpdates ? { ...updates, ...extraUpdates } : updates;

    const updateRes = await fetch('/api/versions/update', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        versionId,
        projectId,
        updates: finalUpdates
      })
    });

    if (!updateRes.ok) {
      console.warn('[Preview] DB update failed:', updateRes.status, await readUploadError(updateRes));
    }

    console.log('[Preview] Uploaded successfully:', uploadPath);
    return uploadPath;
  } catch (err) {
    console.error('[Preview] Upload error:', err);
    return null;
  }
}

/**
 * Generate and upload all previews for a version after media upload completes
 */
async function generateAndUploadPreviews(projectId, cueId, versionId, mediaType, mediaUrl) {
  console.log('[Preview] Starting preview generation for', mediaType, versionId);

  if (mediaType === 'video') {
    // Generate and upload video thumbnail
    const thumbnailData = await generateVideoThumbnailRaw(mediaUrl);
    if (thumbnailData) {
      const savedPath = await uploadPreviewImage(projectId, versionId, 'thumbnail', thumbnailData);
      if (savedPath) {
        // Update local version data
        const project = getProjectById(projectId);
        if (project) {
          const cue = project.cues.find(c => c.id === cueId);
          if (cue) {
            const version = cue.versions.find(v => v.id === versionId);
            if (version && version.media) {
              version.media.thumbnailUrl = savedPath;
              version.media.thumbnailSaved = true;
            }
          }
        }
        renderVersionPreviews();
      }
    }
  } else if (mediaType === 'audio') {
    // Generate and upload waveform image
    const waveformResult = await generateWaveformImage(mediaUrl);
    if (waveformResult && waveformResult.dataUrl) {
      const peaks = Array.isArray(waveformResult.peaks) ? waveformResult.peaks : null;
      const extraUpdates = {};
      if (peaks && peaks.length) {
        extraUpdates.media_waveform_data = JSON.stringify(peaks);
      }
      if (typeof waveformResult.duration === "number" && isFinite(waveformResult.duration)) {
        extraUpdates.media_duration = waveformResult.duration;
      }
      const extraUpdatesPayload =
        Object.keys(extraUpdates).length > 0 ? extraUpdates : null;
      const savedPath = await uploadPreviewImage(
        projectId,
        versionId,
        'waveform',
        waveformResult.dataUrl,
        extraUpdatesPayload
      );
      if (savedPath) {
        // Update local version data
        const project = getProjectById(projectId);
        if (project) {
          const cue = project.cues.find(c => c.id === cueId);
          if (cue) {
            const version = cue.versions.find(v => v.id === versionId);
            if (version && version.media) {
              version.media.waveformImageUrl = savedPath;
              version.media.waveformSaved = true;
              if (peaks && peaks.length) {
                version.media.waveform = peaks;
                version.media.waveformSaved = true;
                waveformParseCache.set(version.id, peaks);
              }
              if (
                typeof waveformResult.duration === "number" &&
                isFinite(waveformResult.duration) &&
                !version.media.duration
              ) {
                version.media.duration = waveformResult.duration;
              }
              // Refresh player if this version is currently active
              const active = getActiveContext();
              if (active && active.version && active.version.id === versionId) {
                console.log('[Preview] Waveform ready, refreshing player for version', versionId);
                renderPlayer();
              }
            }
          }
        }
        renderVersionPreviews();
      }
    }
  }
}

// =======================
// PLAYER AUDIO / VIDEO
// =======================
function destroyMainWave() {
  playerWaveLoadToken += 1;
  if (mainWave) {
    try {
      mainWave.destroy();
    } catch (e) {
      console.warn('[Flow] Failed to destroy mainWave:', e);
    }
    mainWave = null;
  }
  mainWaveLayer = null;
  clearPlayerWaveShell();
  if (activeAudioEl) {
    try {
      activeAudioEl.pause();
      activeAudioEl.removeAttribute('src');
      activeAudioEl.load();
      activeAudioEl.remove();
    } catch (e) {
      console.warn('[Flow] Failed to cleanup activeAudioEl:', e);
    }
    activeAudioEl = null;
  }
}

function stopVideo() {
  if (activeVideoEl) {
    try {
      activeVideoEl.pause();
    } catch (e) {
      console.warn('[Flow] Failed to pause video:', e);
    }
    activeVideoEl = null;
  }
}

function ensurePlayerWaveShell() {
  if (!playerMediaEl) return null;
  let waveformEl = playerMediaEl.querySelector("#waveform");
  if (!waveformEl) {
    playerMediaEl.innerHTML = "";
    waveformEl = document.createElement("div");
    waveformEl.id = "waveform";
    playerMediaEl.appendChild(waveformEl);
  }
  waveformEl.classList.add("player-wave-shell");
  return waveformEl;
}

function clearPlayerWaveShell() {
  if (!playerMediaEl) return;
  const waveformEl = playerMediaEl.querySelector("#waveform");
  if (!waveformEl) return;
  waveformEl.classList.remove("is-loading");
  waveformEl.innerHTML = "";
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
  const loadToken = ++playerWaveLoadToken;
  stopVideo();

  // Destroy previous waveform immediately to prevent double waveform flash
  if (mainWave) {
    try {
      mainWave.destroy();
    } catch (e) {}
    mainWave = null;
  }
  if (mainWaveLayer && mainWaveLayer.isConnected) {
    mainWaveLayer.remove();
  }
  mainWaveLayer = null;

  playPauseBtn.style.display = "inline-block";
  timeLabelEl.style.display = "inline-block";
  playPauseBtn.disabled = true;
  playPauseBtn.textContent = "Play";
  timeLabelEl.textContent = "00:00 / 00:00";

  const mediaUrl = resolveVersionMediaUrl(version);
  if (!mediaUrl || !version || !version.media) return;

  const waveformEl = ensurePlayerWaveShell();
  if (!waveformEl) return;

  waveformEl.classList.add("is-loading");

  // Get peaks if available, otherwise use placeholder peaks for instant display
  let peaks = getWaveformPeaks(version.media.waveform);
  if (!peaks || !peaks.length) {
    // Generate instant placeholder peaks (simple sine-like pattern)
    peaks = new Array(256).fill(0).map((_, i) => {
      const x = i / 256;
      return 0.3 + 0.4 * Math.sin(x * Math.PI * 8) * Math.sin(x * Math.PI);
    });
  }

  // Clear container and create single layer for WaveSurfer
  waveformEl.innerHTML = "";

  const waveBackend = "MediaElement";

  // Check if WaveSurfer is available
  if (typeof WaveSurfer === 'undefined') {
    console.warn('[loadAudioPlayer] WaveSurfer not loaded yet');
    return;
  }

  // Create single layer - WaveSurfer will render directly into it
  const nextLayer = document.createElement("div");
  nextLayer.className = "waveform-layer active";
  waveformEl.appendChild(nextLayer);
  mainWaveLayer = nextLayer;

  const ws = WaveSurfer.create({
    container: nextLayer,
    backend: waveBackend,
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

  const syncPlayState = () => {
    if (!playPauseBtn || mainWave !== ws || playerWaveLoadToken !== loadToken) return;
    playPauseBtn.textContent = ws.isPlaying() ? "Pause" : "Play";
  };

  const finalizeSwap = () => {
    if (playerWaveLoadToken !== loadToken) {
      try {
        ws.destroy();
      } catch (e) {}
      if (nextLayer.isConnected) nextLayer.remove();
      return false;
    }

    mainWave = ws;
    mainWaveLayer = nextLayer;
    waveformEl.classList.remove("is-loading");

    return true;
  };

  try {
    const durationHint = typeof version.media.duration === "number" ? version.media.duration : undefined;
    ws.load(mediaUrl, peaks, durationHint);
  } catch (e) {
    console.warn('loadAudioPlayer: WaveSurfer load failed', e);
  }

  ws.on && ws.on("ready", () => {
    if (playerWaveLoadToken !== loadToken) return;
    try {
      console.log("[loadAudioPlayer] WaveSurfer ready for version", version.id, "in", Date.now() - tStart, "ms");
    } catch (e) {}
  });

  ws.on("ready", () => {
    if (playerWaveLoadToken !== loadToken) {
      try {
        ws.destroy();
      } catch (e) {}
      if (nextLayer.isConnected) nextLayer.remove();
      return;
    }
    const dur = ws.getDuration();
    version.media.duration = dur;
    timeLabelEl.textContent = `00:00 / ${formatTime(dur)}`;
    playPauseBtn.disabled = false;

    if (volumeSlider) {
      const vol = parseFloat(volumeSlider.value || "1");
      ws.setVolume(isNaN(vol) ? 1 : vol);
      volumeSlider.style.display = "block";
      volumeSlider.disabled = false;
    }
    finalizeSwap();
    syncPlayState();

    // Extract and save real peaks for future use
    if (!version.media.waveformSaved) {
      try {
        let realPeaks = null;
        if (ws.backend && typeof ws.backend.getPeaks === 'function') {
          realPeaks = ws.backend.getPeaks(256);
        } else if (ws.getDecodedData && typeof ws.getDecodedData === 'function') {
          const decoded = ws.getDecodedData();
          if (decoded) {
            realPeaks = computeWaveformPeaksFromBuffer(decoded, 256)?.peaks;
          }
        }
        if (realPeaks && realPeaks.length) {
          version.media.waveform = realPeaks;
          version.media.waveformSaved = true;
          waveformParseCache.set(version.id, realPeaks);
          persistWaveformPeaks(version);
          // Redraw with real peaks
          if (ws.drawer && typeof ws.drawer.drawPeaks === 'function') {
            ws.drawer.drawPeaks(realPeaks, ws.getDuration(), 0, ws.getDuration());
          }
        }
      } catch (e) {
        // Ignore peak extraction errors
      }
    }
  });

  ws.on("audioprocess", () => {
    if (mainWave !== ws || ws.isDragging || playerWaveLoadToken !== loadToken) return;
    const cur = ws.getCurrentTime();
    const tot = ws.getDuration();
    timeLabelEl.textContent = `${formatTime(cur)} / ${formatTime(tot)}`;
  });

  ws.on("seek", () => {
    if (mainWave !== ws || playerWaveLoadToken !== loadToken) return;
    const cur = ws.getCurrentTime();
    const tot = ws.getDuration();
    timeLabelEl.textContent = `${formatTime(cur)} / ${formatTime(tot)}`;
  });

  ws.on("play", syncPlayState);
  ws.on("pause", syncPlayState);
  ws.on("finish", syncPlayState);

  playPauseBtn.onclick = () => {
    if (mainWave !== ws) return;
    ws.playPause();
    syncPlayState();
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

  const mediaUrl = resolveVersionMediaUrl(version);
  if (!mediaUrl) {
    playerMediaEl.innerHTML =
      '<div class="player-placeholder">' + tr("player.noMediaForVersion") + "</div>";
    return;
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

  playBtn.addEventListener("click", () => {
    inner.innerHTML = "";

    const video = document.createElement("video");
    video.className = "video-player";
    video.src = mediaUrl;
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
    var t = window.i18n && window.i18n.t ? window.i18n.t : function(k) { return k; };
    playerTitleEl.textContent = t('player.noVersion');
    playerBadgeEl.textContent = "";
    playerBadgeEl.dataset.status = "";
    playerMediaEl.innerHTML =
      '<div class="player-placeholder">' + t('refs.noFiles') + '</div>';
    playPauseBtn.style.display = "none";
    timeLabelEl.style.display = "none";
    if (volumeSlider) volumeSlider.style.display = "none";
    setCommentsEnabled(false);
    commentsListEl.innerHTML = "";
    commentsSummaryEl.textContent = t('comments.noComments');
    resetReviewUI();
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
  playerBadgeEl.textContent = tr("player.referenceBadge");
  playerBadgeEl.dataset.status = "reference";

  // Comments OFF for references
  setCommentsEnabled(false);
  commentsListEl.innerHTML = "";
  commentsSummaryEl.textContent =
    tr("comments.referencesOnly");
  resetReviewUI();

  const type = active.type;

  // AUDIO REFERENCE → waveform like cue
  if (type === "audio") {
    destroyMainWave();
    stopVideo();

    playerMediaEl.innerHTML = '<div id="waveform"></div>';

    playPauseBtn.style.display = "inline-block";
    timeLabelEl.style.display = "inline-block";
    playPauseBtn.disabled = true;
    playPauseBtn.textContent = "Play";
    timeLabelEl.textContent = "00:00 / 00:00";

    // Check if WaveSurfer is available
    if (typeof WaveSurfer === 'undefined') {
      console.warn('[showReferenceInPlayer] WaveSurfer not loaded yet');
      return;
    }

    const ws = WaveSurfer.create({
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
    mainWave = ws;

    const syncPlayState = () => {
      if (!playPauseBtn || mainWave !== ws) return;
      playPauseBtn.textContent = ws.isPlaying() ? "Pause" : "Play";
    };

    ws.load(getDirectUrl(active.url));

    ws.on("ready", () => {
      if (mainWave !== ws) return;
      const dur = ws.getDuration();
      active.duration = dur;
      timeLabelEl.textContent = `00:00 / ${formatTime(dur)}`;
      playPauseBtn.disabled = false;

      if (volumeSlider) {
        const vol = parseFloat(volumeSlider.value || "1");
        ws.setVolume(isNaN(vol) ? 1 : vol);
        volumeSlider.style.display = "block";
        volumeSlider.disabled = false;
      }
      syncPlayState();
    });

    ws.on("audioprocess", () => {
      if (mainWave !== ws || ws.isDragging) return;
      const cur = ws.getCurrentTime();
      const tot = ws.getDuration();
      timeLabelEl.textContent = `${formatTime(cur)} / ${formatTime(tot)}`;
    });

    ws.on("seek", () => {
      if (mainWave !== ws) return;
      const cur = ws.getCurrentTime();
      const tot = ws.getDuration();
      timeLabelEl.textContent = `${formatTime(cur)} / ${formatTime(tot)}`;
    });

    ws.on("play", syncPlayState);
    ws.on("pause", syncPlayState);
    ws.on("finish", syncPlayState);

    playPauseBtn.onclick = () => {
      if (mainWave !== ws) return;
      ws.playPause();
      syncPlayState();
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
      video.src = getDirectUrl(active.url);
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
    '<div class="player-placeholder">' + tr("refs.referenceDownloadHint") + '</div>';
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
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.setAttribute('role', 'presentation');

      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const title = document.createElement('div');
      title.className = 'confirm-title';
      title.textContent = tr('modal.alertTitle', {}, 'Notice');

      const txt = document.createElement('div');
      txt.className = 'confirm-message';
      txt.textContent = message || '';

      const actions = document.createElement('div');
      actions.className = 'confirm-actions center';

      const ok = document.createElement('button');
      ok.className = 'primary-btn small';
      ok.textContent = tr('action.ok', {}, 'OK');

      actions.appendChild(ok);
      dialog.appendChild(title);
      dialog.appendChild(txt);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const cleanup = () => {
        overlay.classList.remove('visible');
        const removeOverlay = () => overlay.remove();
        overlay.addEventListener('transitionend', removeOverlay, { once: true });
        setTimeout(removeOverlay, 200);
        document.removeEventListener('keydown', onKey);
      };

      const onKey = (ev) => {
        if (ev.key === 'Escape') {
          cleanup();
          resolve();
        }
      };

      ok.addEventListener('click', () => { cleanup(); resolve(); });
      overlay.addEventListener('click', (ev) => { if (ev.target === overlay) { cleanup(); resolve(); } });
      document.addEventListener('keydown', onKey);

      requestAnimationFrame(() => {
        overlay.classList.add('visible');
        setTimeout(() => {
          try { ok.focus(); } catch (_) {}
        }, 30);
      });
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
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.setAttribute('role', 'presentation');

      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const title = document.createElement('div');
      title.className = 'confirm-title';
      title.textContent = tr('action.confirmDefaultTitle', {}, 'Are you sure?');

      const txt = document.createElement('div');
      txt.className = 'confirm-message';
      txt.textContent = message || '';

      const actions = document.createElement('div');
      actions.className = 'confirm-actions center';

      const yes = document.createElement('button');
      yes.className = 'primary-btn small';
      yes.textContent = tr("action.yes", {}, "Yes");
      const no = document.createElement('button');
      no.className = 'ghost-btn small';
      no.textContent = tr("action.no", {}, "No");

      actions.appendChild(yes);
      actions.appendChild(no);
      dialog.appendChild(title);
      dialog.appendChild(txt);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const cleanup = (val) => {
        overlay.classList.remove('visible');
        const removeOverlay = () => overlay.remove();
        overlay.addEventListener('transitionend', removeOverlay, { once: true });
        setTimeout(removeOverlay, 200);
        document.removeEventListener('keydown', onKey);
        resolve(val);
      };
      const onKey = (ev) => { if (ev.key === 'Escape') cleanup(false); };

      yes.addEventListener('click', () => cleanup(true));
      no.addEventListener('click', () => cleanup(false));
      overlay.addEventListener('click', (ev) => { if (ev.target === overlay) cleanup(false); });
      document.addEventListener('keydown', onKey);

      requestAnimationFrame(() => {
        overlay.classList.add('visible');
        setTimeout(() => {
          try { yes.focus(); } catch (_) {}
        }, 30);
      });
    } catch (e) {
      // fallback to native confirm
      try { resolve(confirm(message)); } catch (e2) { resolve(false); }
    }
  });
}

function renderComments() {
  const ctx = getActiveContext();
  if (!ctx || !ctx.version.media) {
    if (commentsListEl) commentsListEl.replaceChildren();
    commentsSummaryEl.textContent = tr("comments.noComments");
    setCommentsEnabled(false);
    return;
  }

  const { version } = ctx;
  const arr = version.comments;

  if (!arr.length) {
    if (commentsListEl) commentsListEl.replaceChildren();
    commentsSummaryEl.textContent = tr("comments.noComments");
    return;
  }

  commentsSummaryEl.textContent = tr("comments.count", { n: arr.length });

  const frag = document.createDocumentFragment();
  arr.forEach(c => {
    const li = document.createElement("li");
    li.style.position = 'relative';

    const tc = document.createElement("span");
    tc.className = "timecode";
    tc.textContent = formatTime(c.time);

    const author = document.createElement("span");
    author.className = "author";
    author.textContent = c.author || tr("misc.client", {}, "Client");

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
            cancel.textContent = tr("action.cancel");

            // swap nodes
            li.replaceChild(input, text);
            actions.innerHTML = '';
            actions.appendChild(save);
            actions.appendChild(cancel);

            save.addEventListener('click', async (e) => {
              e.stopPropagation();
              const newText = input.value.trim();
              if (!newText) {
                await showAlert(tr('comments.emptyError'));
                return;
              }
              try {
                const headers = window.flowAuth ? window.flowAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };
                const r = await fetch('/api/comments', {
                  method: 'PATCH',
                  headers,
                  body: JSON.stringify({ id: c.id, text: newText, projectId: state.activeProjectId })
                });
                const j = await r.json();
                if (!r.ok || j.error) {
                  await showAlert(tr('comments.updateError', { error: (j.error || r.statusText) }));
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
              showAlert('Eccezione durante aggiornamento commento');
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
              const headers = window.flowAuth ? window.flowAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };
              const r = await fetch(`/api/comments?id=${encodeURIComponent(c.id)}&projectId=${state.activeProjectId}`, {
                method: 'DELETE',
                headers
              });
              const j = await r.json();
              if (!r.ok || j.error) {
                await showAlert(tr('comments.deleteError', { error: (j.error || r.statusText) }));
                return;
              }
              // remove from local array
              const idx = version.comments.findIndex(x => x.id === c.id);
              if (idx >= 0) version.comments.splice(idx, 1);
              renderComments();
            } catch (err) {
              console.error('Error deleting comment', err);
            showAlert('Eccezione durante cancellazione commento');
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

    frag.appendChild(li);
  });

  if (commentsListEl) commentsListEl.replaceChildren(frag);

  // comment enablement handled by review state
}

// =======================
// LOAD PROJECT DATA FROM API
// =======================
async function loadProjectCues(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;

  const headers =
    (window.flowAuth && typeof window.flowAuth.getAuthHeaders === 'function')
      ? window.flowAuth.getAuthHeaders()
      : { 'Content-Type': 'application/json' };

  try {
    console.log("[Flow] Loading cues for project via aggregated endpoint:", projectId);
    const response = await fetch(`/api/projects/full?projectId=${encodeURIComponent(projectId)}`, { headers });
    if (!response.ok) throw new Error(response.statusText || 'Failed to load aggregated data');

    const payload = await response.json();
    const projectData = (payload.projects || []).find(p => p.id === projectId);
    if (!projectData) throw new Error('Project missing in aggregated response');

    project.cues = projectData.cues || [];
    project.cues.forEach(cue => {
      if (typeof cue.maxRevisions !== "number" || cue.maxRevisions <= 0) {
        const localMax = loadCueMaxRevisions(cue.id);
        if (localMax) cue.maxRevisions = localMax;
      }
      if (Array.isArray(cue.versions)) {
        cue.versions.forEach(version => {
          if (version && version.media && version.media.waveform) {
            version.media.waveformSaved = true;
          }
          if (version && version.media) {
            const original = (version.media.originalName || "").trim();
            const display = (version.media.displayName || "").trim();
            if (display && (!original || display !== original)) {
              version.media.manualName = true;
            }
          }
        });
      }
    });
    if (project.cues.length > 0) {
      project.activeCueId = project.cues[0].id;
      const firstVersion = project.cues[0].versions && project.cues[0].versions[0];
      project.activeVersionId = firstVersion ? firstVersion.id : null;
    } else {
      project.activeCueId = null;
      project.activeVersionId = null;
    }

    project.references = sanitizeProjectReferences(projectData.references);
    project.cueNotes = projectData.cueNotes || {};
    project.notes = projectData.notes || [];
    if (!project.activeReferenceId && project.references.length) {
      project.activeReferenceId = project.references[0].id;
    }

    refreshAllNames();
    renderReferences();
    renderAll();
    console.log("[Flow] Project cues loaded successfully via /api/projects/full");
    loadProjectNotes(projectId).catch(err => {
      console.warn('[Flow] Failed to preload notes', err);
    });
    return;
  } catch (err) {
    console.warn("[Flow] Aggregated project load failed, falling back to legacy N+1 loader:", err);
  }

  await loadProjectCuesLegacy(projectId, headers);
}

async function loadProjectCuesLegacy(projectId, headers) {
  const project = getProjectById(projectId);
  if (!project) return;

  try {
    console.log("[Flow] Legacy cue loader running for project:", projectId);
    const response = await fetch(`/api/cues?projectId=${encodeURIComponent(projectId)}`, { headers });
    if (!response.ok) {
      console.error("[Flow] Legacy loader failed to fetch cues:", response.statusText);
      return;
    }

    const data = await response.json();
    const cuesFromDb = data.cues || [];

    const cuesWithVersions = await Promise.all(
      cuesFromDb.map(async (dbCue) => {
        const versionResponse = await fetch(
          `/api/versions?cueId=${encodeURIComponent(dbCue.id)}&projectId=${encodeURIComponent(projectId)}`,
          { headers }
        );
        const versionData = versionResponse.ok ? await versionResponse.json() : { versions: [] };
        const versions = versionData.versions || [];

        const versionsWithComments = await Promise.all(
          versions.map(async (v) => {
            const mediaOriginalName = v.media_original_name || v.media_filename || "Media";
            const mediaDisplayName = v.media_display_name || mediaOriginalName;
            const ver = {
              id: v.id,
              index: v.index_in_cue || 0,
              media: v.media_type
                ? {
                    type: v.media_type,
                    url: v.media_url,
                    originalName: mediaOriginalName,
                    displayName: mediaDisplayName,
                    manualName: mediaDisplayName && mediaDisplayName !== mediaOriginalName,
                    duration: v.duration || v.media_duration || null,
                    thumbnailUrl: v.thumbnail_url,
                    waveform: v.waveform || v.media_waveform_data || null,
                    waveformSaved: !!(v.waveform || v.media_waveform_data)
                  }
                : null,
              comments: [],
              deliverables: [],
              status: v.status || "in_review"
            };
            try {
              const commentResp = await fetch(
                `/api/comments?versionId=${encodeURIComponent(v.id)}&projectId=${encodeURIComponent(projectId)}`,
                { headers }
              );
              if (commentResp.ok) {
                const commentData = await commentResp.json();
                const rows = commentData.comments || [];
                ver.comments = rows.map(rc => ({
                  id: rc.id,
                  time: rc.time_seconds !== undefined ? rc.time_seconds : (rc.time || 0),
                  author: rc.author || 'Client',
                  actorId: rc.actor_id || null,
                  text: rc.text || '',
                  created_at: rc.created_at
                }));
              }
            } catch (e) {
              console.warn('[Flow] Failed to load comments for version (legacy)', v.id, e);
            }
            return ver;
          })
        );

        return {
          id: dbCue.id,
          index: dbCue.index_in_project || 0,
          originalName: dbCue.name || "Untitled",
          name: dbCue.name || "Untitled",
          displayName: "",
          maxRevisions: typeof dbCue.max_revisions === "number" ? dbCue.max_revisions : loadCueMaxRevisions(dbCue.id),
          status: dbCue.status || "in_review",
          versions: versionsWithComments,
          isOpen: true
        };
      })
    );

    project.cues = cuesWithVersions;
    if (cuesWithVersions.length > 0) {
      project.activeCueId = cuesWithVersions[0].id;
      project.activeVersionId = cuesWithVersions[0].versions[0]?.id || null;
    } else {
      project.activeCueId = null;
      project.activeVersionId = null;
    }

    await loadProjectReferencesLegacy(projectId, headers);
    refreshAllNames();
    renderAll();
    loadProjectNotes(projectId).catch(err => {
      console.warn('[Flow] Failed to preload notes (legacy path)', err);
    });
    console.log("[Flow] Project cues loaded via legacy path");
  } catch (err) {
    console.error("[Flow] Legacy cue loader failed:", err);
  }
}

async function loadProjectReferencesLegacy(projectId, headers) {
  try {
    const project = getProjectById(projectId);
    if (!project) return;

    const res = await fetch(`/api/references?projectId=${encodeURIComponent(projectId)}`, { headers });
    if (!res.ok) {
      console.error("[Flow] Failed to load references", res.statusText);
      project.references = [];
      renderReferences();
      return;
    }

    const data = await res.json();
    project.references = sanitizeProjectReferences(data.references);
    if (!project.activeReferenceId && project.references.length) {
      project.activeReferenceId = project.references[0].id;
    }

    renderReferences();
  } catch (err) {
    console.error("[Flow] Error loading references", err);
  }
}

function sanitizeProjectReferences(rawReferences) {
  return (rawReferences || [])
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
          waveform: v.waveform || null
        }))
        .filter(v => !!v)
    }))
    .filter(r => Array.isArray(r.versions) && r.versions.length > 0);
}

function addCommentFromInput() {
  const ctx = getActiveContext();
  if (!ctx) return;

  const { version } = ctx;
  if (!version.media) return;
  if (!canAddCommentsForVersion(version.status)) {
    showAlert(REVIEW_CLOSED_MESSAGE());
    return;
  }

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
          body: JSON.stringify({ version_id: version.id, time_seconds: t, text: final, author: displayName, projectId: state.activeProjectId })
        });
        try { resp = await r.json(); } catch(e) { resp = { error: 'invalid_json' }; }
      }

      console.log('[addComment] server response', resp);
      if (!resp || resp.error) {
        console.error('[addComment] failed to save', resp && resp.error);
        try { showAlert('Errore salvataggio commento: ' + (resp && resp.error ? resp.error : 'unknown')); } catch(e){}
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
      try { showAlert('Eccezione durante il salvataggio del commento: ' + String(err)); } catch(e){}
    }
  })();
}

const commentInputWrap = commentInputEl.closest(".comment-input");
if (commentInputWrap) {
  commentInputWrap.addEventListener("click", () => {
    if (commentInputEl.disabled) {
      showAlert(REVIEW_CLOSED_MESSAGE());
    }
  });
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

// Helper to clean up old WaveSurfer instances before re-rendering
function cleanupMiniWaves() {
  Object.keys(miniWaves).forEach(id => {
    try {
      if (miniWaves[id]) {
        miniWaves[id].destroy();
      }
    } catch (e) {}
    delete miniWaves[id];
  });
}

async function persistCueOrder(project) {
  if (!project || !isOwnerOfProject(project)) return;
  const headers =
    (window.flowAuth && typeof window.flowAuth.getAuthHeaders === 'function')
      ? window.flowAuth.getAuthHeaders()
      : { 'Content-Type': 'application/json' };

  await Promise.all(
    project.cues.map((cue, idx) =>
      fetch('/api/cues', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          id: cue.id,
          index_in_project: idx
        })
      }).catch(err => {
        console.warn('[CueOrder] Failed to persist cue index', cue.id, err);
      })
    )
  );
}

function renderCueList(options = {}) {
  const project = getActiveProject();
  console.log("renderCueList: project", project && project.id, "cuesCount", project && project.cues && project.cues.length);

  // Clean up WaveSurfer instances since their containers will be destroyed
  cleanupMiniWaves();

  if (!project) {
    // Use i18n translations for empty state
    var t = window.i18n && window.i18n.t ? window.i18n.t : function(k) { return k; };
    cueListEl.innerHTML = t('cues.noCues');
    setSectionSubtitle(cueListSubtitleEl, cuesSubtitleKey, cuesSubtitleFallback);
    cueListEl.classList.add("cue-list-empty");
    updateCountBadge(
      cuesCountBadgeEl,
      null,
      "cues.countSingle",
      "cues.countPlural",
      "cue",
      "cues"
    );
    if (rightColEl) rightColEl.style.display = "none";
    return;
  }

  updateCountBadge(
    cuesCountBadgeEl,
    project.cues.length || 0,
    "cues.countSingle",
    "cues.countPlural",
    "cue",
    "cues"
  );
  setSectionSubtitle(cueListSubtitleEl, cuesSubtitleKey, cuesSubtitleFallback);

  if (!project.cues.length) {
    var t2 = window.i18n && window.i18n.t ? window.i18n.t : function(k) { return k; };
    cueListEl.innerHTML = t2('cues.noCues');
    setSectionSubtitle(cueListSubtitleEl, cuesSubtitleKey, cuesSubtitleFallback);
    cueListEl.classList.add("cue-list-empty");
    const hasRefs = project.references && project.references.length;
    if (!hasRefs && rightColEl) rightColEl.style.display = "none";
    return;
  }

  cueListEl.innerHTML = "";
  cueListEl.classList.remove("cue-list-empty");
  // Keep subtitle as static translated text from data-i18n attribute
  // Badge already shows the count via updateCountBadge above

  project.cues.forEach(cue => {
    console.log("[FlowPreview] Creating cue element with menu for:", cue.id, cue.name);
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
    const cueVersionsLabel =
      cue.versions.length === 1 ? tr("misc.version") : tr("misc.versions");

    // Show version count and max revisions
    const maxRevisions = typeof cue.maxRevisions === "number" ? cue.maxRevisions : (typeof cue.max_revisions === "number" ? cue.max_revisions : null);
    if (maxRevisions !== null && maxRevisions > 0) {
      metaEl.textContent = `${cue.versions.length} ${cueVersionsLabel} · ${maxRevisions} ${maxRevisions === 1 ? 'revisione' : 'revisioni'}`;
    } else {
      metaEl.textContent = `${cue.versions.length} ${cueVersionsLabel}`;
    }

    left.appendChild(nameEl);
    left.appendChild(metaEl);

    const right = document.createElement("div");
    right.className = "cue-header-right";

    const status = document.createElement("span");
  const statusKey = normalizeVersionStatus(cue.status || "in_review");
  const cueStatusClass = getStatusClassKey(statusKey);
  status.className = `cue-status ${cueStatusClass}`;
  status.textContent = getStatusLabel(statusKey);

    const dd = document.createElement("div");
    dd.className = "download-dropdown cue-dropdown";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-btn tiny download-toggle";
    btn.textContent = "⋯";

    const menu = document.createElement("div");
    menu.className = "download-menu";
    const canOwnerActions = isOwnerOfProject(project);
    const canClientApprove = !canOwnerActions;
    menu.innerHTML = `
      <button data-action="rename">${tr("action.rename")}</button>
      <button data-action="delete">${tr("action.delete")}</button>
      ${
        canClientApprove
          ? `<div class="menu-sep"></div>
      <button data-action="set-approved">${tr("cues.setApproved")}</button>`
          : ""
      }
    `;

    dd.appendChild(btn);
    dd.appendChild(menu);

    // IMPORTANT: Add event listeners immediately while dd, btn, menu are in scope for this cue
    btn.addEventListener("click", e => {
      console.log("[FlowPreview] Cue menu button clicked for cue:", cue.id);
      e.preventDefault();
      e.stopPropagation();
      const wasOpen = dd.classList.contains("open");
      document
        .querySelectorAll(".download-dropdown.open")
        .forEach(x => x.classList.remove("open"));
      if (!wasOpen) {
        dd.classList.add("open");
        console.log("[FlowPreview] Cue menu opened");
      }
    });

    menu.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", async e => {
        console.log("[FlowPreview] Cue menu action clicked:", b.dataset.action, "for cue:", cue.id);
        e.preventDefault();
        e.stopPropagation();
        dd.classList.remove("open");
        const action = b.dataset.action;
        if (action === "rename") {
          const name = await showPromptDialog({
            title: tr("action.renameCue"),
            defaultValue: cue.name
          });
          if (name && name.trim()) {
            const newName = name.trim();
            try {
              const headers = window.flowAuth ? window.flowAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };
              const res = await fetch('/api/cues', {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ id: cue.id, name: newName, projectId: state.activeProjectId })
              });
              if (!res.ok) {
                console.error('[FlowPreview] Failed to rename cue', await res.text());
                showAlert('Errore nel rinominare la cue');
                return;
              }
              cue.name = newName;
              refreshAllNames();
              renderAll();
            } catch (err) {
              console.error('[FlowPreview] Exception renaming cue', err);
              showAlert('Errore nel rinominare la cue');
            }
          }
        }
        if (action === "delete") {
          const cueLabel = cue.displayName || cue.name || "Cue";
          const confirmed = await showConfirmDialog({
            title: tr("action.deleteCueTitle"),
            message: tr("action.deleteCueMessage", { name: cueLabel }),
            confirmLabel: tr("action.delete"),
            cancelLabel: tr("action.cancel")
          });
          if (!confirmed) return;
          console.log("[FlowPreview] Delete cue action triggered for:", cue.id);
          try {
            console.log("[FlowPreview] Sending DELETE request for cue:", cue.id);
            const headers = window.flowAuth ? window.flowAuth.getAuthHeaders() : { 'Content-Type': 'application/json' };
            const res = await fetch(`/api/cues?id=${encodeURIComponent(cue.id)}&projectId=${state.activeProjectId}`, {
              method: 'DELETE',
              headers
            });
            console.log("[FlowPreview] DELETE response status:", res.status);
            if (!res.ok) {
              console.error('[FlowPreview] Failed to delete cue', await res.text());
              showAlert('Errore nella cancellazione della cue');
              return;
            }

            const projectNow = getActiveProject();
            if (!projectNow) return;

            // Remove miniWaves for this cue's versions only
            cue.versions.forEach(v => {
              if (miniWaves[v.id]) {
                try { miniWaves[v.id].destroy(); } catch(e) {}
                delete miniWaves[v.id];
              }
            });

            // Remove the cue element from DOM directly (no full re-render)
            const cueElement = document.querySelector(`details[data-cue-id="${cue.id}"]`);
            if (cueElement) {
              cueElement.remove();
            }

            // Update state
            projectNow.cues = projectNow.cues.filter(c => c.id !== cue.id);

            // Update active cue if needed
            if (projectNow.activeCueId === cue.id) {
              projectNow.activeCueId = projectNow.cues[0]?.id || null;
              projectNow.activeVersionId = projectNow.cues[0]?.versions[0]?.id || null;
              // Only re-render player if active cue changed
              renderPlayer();
            }

            // Update cue count badge
            const countBadge = document.getElementById('cuesCountBadge');
            if (countBadge) {
              const count = projectNow.cues.length;
              countBadge.textContent = count > 0 ? count : '--';
            }

            // Show empty state if no cues left
            if (projectNow.cues.length === 0) {
              const cueList = document.getElementById('cueList');
              if (cueList) {
                cueList.classList.add('cue-list-empty');
                const t = window.i18n && window.i18n.t ? window.i18n.t : (k) => k;
                cueList.innerHTML = `<div class="empty-state">${t('cues.noCues')}</div>`;
              }
            }
          } catch (err) {
            console.error('[FlowPreview] Exception deleting cue', err);
            showAlert('Errore nella cancellazione della cue');
          }
        }
        if (action === "set-in-review" || action === "set-approved") {
          const latestVersion = cue.versions[cue.versions.length - 1];
          if (!latestVersion) {
            showAlert(tr("cues.noVersionsForStatus"));
            return;
          }
          const nextStatus = action === "set-approved" ? "approved" : "in_review";
          if (action === "set-in-review" && !isOwnerOfProject(project)) return;
          if (action === "set-approved" && isOwnerOfProject(project)) return;
          if (nextStatus === "approved") {
            const confirmed = await showConfirmDialog({
              title: tr("cues.approveConfirmTitle"),
              message: tr("cues.approveConfirmMessage"),
              confirmLabel: tr("action.confirm"),
              cancelLabel: tr("action.cancel")
            });
            if (!confirmed) return;
          }
          await setVersionStatus(project, cue, latestVersion, nextStatus);
        }
      });
    });

    console.log("[FlowPreview] Event listeners added for cue menu:", cue.id, "btn:", btn, "menu:", menu);

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

    const canReorder = isOwnerOfProject(project);
    if (canReorder) {
      summary.draggable = true;
      summary.classList.add("cue-draggable");
      summary.addEventListener("dragstart", e => {
        draggedCueId = cue.id;
        try {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("application/x-approved-cue", cue.id);
          e.dataTransfer.setData("text/plain", cue.id);
        } catch (err) {}
        details.classList.add("dragging");
      });
      summary.addEventListener("dragend", () => {
        draggedCueId = null;
        details.classList.remove("dragging");
        document
          .querySelectorAll("details.cue-block.drag-over")
          .forEach(el => el.classList.remove("drag-over"));
      });
    }

    // Also listen for native toggle events to keep state in sync
    details.addEventListener('toggle', () => {
      try {
        const wasOpen = cue.isOpen;
        cue.isOpen = !!details.open;
        console.log('renderCueList: details.toggle', { cueId: cue.id, detailsOpen: details.open, wasOpen });

        // Only auto-select first version when opening a previously closed cue
        if (details.open && !wasOpen) {
          state.playerMode = "review";
          const prevCueId = project.activeCueId;
          const prevVersionId = project.activeVersionId;
          project.activeCueId = cue.id;
          const firstVersion = cue.versions && cue.versions[0];
          const nextVersionId = firstVersion ? firstVersion.id : null;
          project.activeVersionId = nextVersionId;
          if (firstVersion) {
            waveformRenderCache.delete(getWaveCacheId("v", firstVersion.id));
          }
          cue.versions.forEach(v => waveformRenderCache.delete(getWaveCacheId("v", v.id)));
          if (prevVersionId !== nextVersionId || prevCueId !== cue.id) {
            currentPlayerVersionId = null;
            currentPlayerMediaType = null;
            currentPlayerCueId = null;
          }
          updatePlayerModeButtons();
          updateActiveVersionRowStyles();
          if (prevVersionId !== nextVersionId || prevCueId !== cue.id) {
            renderPlayer();
          }
          renderVersionPreviews();
          requestAnimationFrame(renderVersionPreviews);
          renderNotesPanel();
        } else if (!details.open) {
          renderNotesPanel();
        }
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

      const statusKeyV = version.status || "in_review";
      const normalizedStatusKey = normalizeVersionStatus(statusKeyV);
      const statusClassKey = getStatusClassKey(normalizedStatusKey);
      row.dataset.status = statusClassKey;
      row.classList.add(`status-${statusClassKey}`);
      const maxRevisions =
        typeof cue.maxRevisions === "number"
          ? cue.maxRevisions
          : typeof cue.max_revisions === "number"
          ? cue.max_revisions
          : null;
      const isExtraRevision =
        maxRevisions !== null && version.index + 1 > maxRevisions;

      if (
        project.activeCueId === cue.id &&
        project.activeVersionId === version.id
      ) {
        row.classList.add("active");
      }

      const lab = document.createElement("div");
      lab.className = "version-label";
      lab.textContent = computeVersionLabel(version.index);
      const extraSlot = document.createElement("div");
      extraSlot.className = "revision-extra-slot";
      if (isExtraRevision) {
        row.classList.add("revision-extra");
        const warn = document.createElement("span");
        warn.className = "revision-extra-indicator";
        warn.textContent = "▲";
        warn.title = "Revisione extra";
        extraSlot.appendChild(warn);
      }

      const prev = document.createElement("div");
      prev.className = "version-preview";
      prev.id = `preview-${version.id}`;
      if (version.media?.thumbnailUrl) {
        const thumbUrl = getProxiedUrl(version.media.thumbnailUrl);
        if (thumbUrl) {
          prev.style.backgroundImage = `url(${thumbUrl})`;
          prev.classList.add("has-thumbnail");
        } else {
          prev.innerHTML = `<span class="preview-label placeholder">${version.media?.type === "audio" ? "Audio" : version.media?.type === "video" ? "Video" : "File"}</span>`;
        }
      } else {
        prev.innerHTML = `<span class="preview-label placeholder">${version.media?.type === "audio" ? "Audio" : version.media?.type === "video" ? "Video" : "File"}</span>`;
      }

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
      meta.textContent = getVersionMetaText(version);

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
      ddBtn.textContent = `${tr("action.download")} ▾`;

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

      const manageMenuWrap = document.createElement("div");
      manageMenuWrap.className = "download-dropdown version-manage-dropdown";

      const manageMenuBtn = document.createElement("button");
      manageMenuBtn.type = "button";
      manageMenuBtn.className = "icon-btn tiny download-toggle";
      manageMenuBtn.textContent = "⋯";

      const manageMenu = document.createElement("div");
      manageMenu.className = "download-menu";
      manageMenu.innerHTML = `
        <button data-action="rename-version">${tr("action.rename")}</button>
        <button data-action="delete-version">${tr("action.delete")}</button>
      `;

      manageMenuWrap.appendChild(manageMenuBtn);
      manageMenuWrap.appendChild(manageMenu);

      // IMPORTANT: Add event listeners immediately while variables are in scope for this version
      // Download menu button
      ddBtn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        const open = dd2.classList.contains("open");
        document
          .querySelectorAll(".download-dropdown.open")
          .forEach(x => x.classList.remove("open"));
        if (!open) dd2.classList.add("open");
      });

      // Download menu actions
      ddMenu.querySelectorAll("button").forEach(b => {
        b.addEventListener("click", e => {
          e.preventDefault();
          e.stopPropagation();
          dd2.classList.remove("open");
          const action = b.dataset.action;
          if (action === "download-main") {
            const mediaUrl = resolveVersionMediaUrl(version);
            if (mediaUrl) {
              const name =
                version.media.displayName ||
                version.media.originalName ||
                "media";
              triggerDownload(mediaUrl, name);
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

      // Manage menu button (⋯)
      manageMenuBtn.addEventListener("click", e => {
        console.log("[FlowPreview] Version manage menu clicked for version:", version.id);
        e.preventDefault();
        e.stopPropagation();
        const wasOpen = manageMenuWrap.classList.contains("open");
        document
          .querySelectorAll(".download-dropdown.open")
          .forEach(x => x.classList.remove("open"));
        if (!wasOpen) {
          manageMenuWrap.classList.add("open");
          console.log("[FlowPreview] Version manage menu opened");
        }
      });

      // Manage menu actions (rename/delete)
      manageMenu.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", async e => {
          console.log("[FlowPreview] Version action clicked:", btn.dataset.action, "for version:", version.id);
          e.preventDefault();
          e.stopPropagation();
          manageMenuWrap.classList.remove("open");
          const action = btn.dataset.action;
          if (action === "rename-version") {
            const currentName =
              version.media?.displayName ||
              version.media?.originalName ||
              version.media?.name ||
              "Version";
            const proposed = await showPromptDialog({
              title: tr("action.renameVersion"),
              defaultValue: currentName
            });
            if (!proposed) return;
            const trimmed = proposed.trim();
            if (!trimmed) return;
            try {
              const authHeaders =
                window.flowAuth && typeof window.flowAuth.getAuthHeaders === "function"
                  ? window.flowAuth.getAuthHeaders()
                  : {};
              const headers = { ...authHeaders, "Content-Type": "application/json" };
              const res = await fetch("/api/versions/rename", {
                method: "PATCH",
                headers,
                body: JSON.stringify({
                  versionId: version.id,
                  media_display_name: trimmed,
                  projectId: (project && project.id) ? project.id : state.activeProjectId
                })
              });
              if (!res.ok) {
                console.error("[FlowPreview] Failed to rename version", await res.text());
                showAlert("Errore nel rinominare la versione");
                return;
              }
              version.media = version.media || {};
              version.media.displayName = trimmed;
              version.media.manualName = true;
              renderAll();
            } catch (err) {
              console.error("[FlowPreview] Exception renaming version", err);
              showAlert("Errore nel rinominare la versione");
            }
          }
          if (action === "delete-version") {
            const nameForConfirm =
              version.media?.displayName ||
              version.media?.originalName ||
              version.media?.name ||
              "Version";
            const confirmed = await showConfirmDialog({
              title: tr("action.delete"),
              message: tr("action.deleteVersionMessage", { name: nameForConfirm }),
              confirmLabel: tr("action.delete"),
              cancelLabel: tr("action.cancel")
            });
            if (!confirmed) return;
            console.log("[FlowPreview] Delete version triggered for:", version.id);
            try {
              console.log("[FlowPreview] Sending DELETE request for version:", version.id);
              const authHeaders =
                window.flowAuth && typeof window.flowAuth.getAuthHeaders === "function"
                  ? window.flowAuth.getAuthHeaders()
                  : {};
              const headers = { ...authHeaders, "Content-Type": "application/json" };
              const res = await fetch("/api/versions/delete", {
                method: "DELETE",
                headers,
                body: JSON.stringify({
                  versionId: version.id,
                  projectId: state.activeProjectId
                })
              });
              console.log("[FlowPreview] DELETE version response status:", res.status);
              if (!res.ok) {
                console.error("[FlowPreview] Failed to delete version", await res.text());
                showAlert("Errore nella cancellazione della versione");
                return;
              }
              const projectNow = getActiveProject();
              if (!projectNow) return;
              const cueInState = projectNow.cues.find(c => c.id === cue.id);
              if (!cueInState) return;

              // Remove miniWave for this version only
              if (miniWaves[version.id]) {
                try { miniWaves[version.id].destroy(); } catch(e) {}
                delete miniWaves[version.id];
              }

              // Remove the version element from DOM directly (no full re-render)
              const versionElement = document.querySelector(`.version-row[data-version-id="${version.id}"]`);
              if (versionElement) {
                versionElement.remove();
              }

              // Update state
              cueInState.versions = cueInState.versions.filter(v => v.id !== version.id);

              // Update active version if needed
              let needPlayerUpdate = false;
              if (projectNow.activeVersionId === version.id) {
                if (cueInState.versions.length) {
                  projectNow.activeCueId = cueInState.id;
                  projectNow.activeVersionId = cueInState.versions[0].id;
                } else {
                  const fallbackCue = projectNow.cues.find(c => c.versions && c.versions.length);
                  projectNow.activeCueId = fallbackCue ? fallbackCue.id : null;
                  projectNow.activeVersionId = fallbackCue?.versions?.[0]?.id || null;
                }
                currentPlayerVersionId = null;
                currentPlayerMediaType = null;
                currentPlayerCueId = null;
                needPlayerUpdate = true;
              }

              // Only re-render player if active version changed
              if (needPlayerUpdate) {
                renderPlayer();
              }
            } catch (err) {
              console.error("[FlowPreview] Exception deleting version", err);
              showAlert("Errore nella cancellazione della versione");
            }
          }
        });
      });

      console.log("[FlowPreview] Event listeners added for version menu:", version.id, "manageMenuBtn:", manageMenuBtn);

      top.appendChild(dd2);
      top.appendChild(manageMenuWrap);
      actions.appendChild(top);

      row.appendChild(lab);
      row.appendChild(extraSlot);
      row.appendChild(prev);
      row.appendChild(main);
      row.appendChild(actions);

      row.addEventListener("click", e => {
        if (e.target.closest(".download-toggle")) return;
        const prevCueId = project.activeCueId;
        const prevVersionId = project.activeVersionId;
        const prevMode = state.playerMode;
        if (
          prevMode === "review" &&
          prevCueId === cue.id &&
          prevVersionId === version.id
        ) {
          updateActiveVersionRowStyles();
          return;
        }
        state.playerMode = "review";
        project.activeCueId = cue.id;
        project.activeVersionId = version.id;
        updatePlayerModeButtons();
        renderPlayer();
        updateActiveVersionRowStyles();
        if (prevCueId !== cue.id) renderNotesPanel();
      });

      row.addEventListener("dragover", e => {
        if (!isFileDragEvent(e)) return;
        const projectNow = getActiveProject();
        if (!projectNow || !isOwnerOfProject(projectNow)) return;
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
        if (!projectNow || !isOwnerOfProject(projectNow)) return;

      const files = e.dataTransfer.files;
      if (!files || !files.length) return;
      Array.from(files).forEach(file => {
        handleFileDropOnVersion(projectNow, cue, version, file);
      });
      });

      versionsContainer.appendChild(row);
    });

    details.appendChild(versionsContainer);

    // Add cue notes section
    const cueNotesSection = document.createElement('div');
    cueNotesSection.className = 'cue-notes-section';
    const canEditCueNotes = isOwnerOfProject(project);
    cueNotesSection.innerHTML = `
      <div class="cue-notes-header">
        <span class="cue-notes-title">NOTE GENERALI</span>
      </div>
      <div class="cue-notes-list" data-cue-id="${cue.id}"></div>
      ${
        canEditCueNotes
          ? `<button class="add-cue-note-btn" data-cue-id="${cue.id}">+ Aggiungi nota</button>
      <div class="cue-note-form" data-cue-id="${cue.id}">
        <textarea placeholder="Scrivi una nota..."></textarea>
        <div class="cue-note-form-actions">
          <button class="ghost-btn tiny cancel-cue-note">${tr("action.cancel")}</button>
          <button class="primary-btn tiny save-cue-note">Salva</button>
        </div>
      </div>`
          : ""
      }
    `;
    details.appendChild(cueNotesSection);

    // Render existing cue notes
    renderCueNotesInline(cue.id, cueNotesSection.querySelector('.cue-notes-list'));

    // Add cue note button handler
    if (canEditCueNotes) {
      cueNotesSection.querySelector('.add-cue-note-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const form = cueNotesSection.querySelector('.cue-note-form');
        form.classList.add('active');
        form.querySelector('textarea').focus();
        e.target.style.display = 'none';
      });

      // Cancel cue note
      cueNotesSection.querySelector('.cancel-cue-note').addEventListener('click', (e) => {
        e.stopPropagation();
        const form = cueNotesSection.querySelector('.cue-note-form');
        form.classList.remove('active');
        form.querySelector('textarea').value = '';
        cueNotesSection.querySelector('.add-cue-note-btn').style.display = '';
      });

      // Save cue note
      cueNotesSection.querySelector('.save-cue-note').addEventListener('click', async (e) => {
        e.stopPropagation();
        const form = cueNotesSection.querySelector('.cue-note-form');
        const textarea = form.querySelector('textarea');
        const text = textarea.value.trim();
        if (!text) return;

        await saveCueNote(cue.id, text);

        form.classList.remove('active');
        textarea.value = '';
        cueNotesSection.querySelector('.add-cue-note-btn').style.display = '';
        renderCueNotesInline(cue.id, cueNotesSection.querySelector('.cue-notes-list'));
      });
    }

    cueListEl.appendChild(details);

    // Debug: log cue/DOM open state after insertion
    try {
      console.log("renderCueList:", { cueId: cue.id, cueIsOpen: cue.isOpen, detailsOpen: details.open, versions: (cue.versions||[]).length, projectActiveCue: project.activeCueId });
    } catch (err) {
      console.log("renderCueList: debug log failed", err);
    }

    details.addEventListener("dragover", e => {
      const projectNow = getActiveProject();
      if (!projectNow || !isOwnerOfProject(projectNow)) return;
      if (isFileDragEvent(e)) {
        e.preventDefault();
        details.classList.add("drag-over");
        return;
      }
      if (!draggedCueId || draggedCueId === cue.id) return;
      e.preventDefault();
      details.classList.add("drag-over");
    });

    details.addEventListener("dragleave", e => {
      if (!details.contains(e.relatedTarget)) {
        details.classList.remove("drag-over");
      }
    });

    details.addEventListener("drop", e => {
      const projectNow = getActiveProject();
      if (!projectNow || !isOwnerOfProject(projectNow)) return;
      if (isFileDragEvent(e)) {
        e.preventDefault();
        e.stopPropagation();
        details.classList.remove("drag-over");

        const files = e.dataTransfer.files;
        if (!files || !files.length) return;
        Array.from(files).forEach(file => {
          handleFileDropOnCue(projectNow, cue, file);
        });
        return;
      }

      if (!draggedCueId || draggedCueId === cue.id) return;
      e.preventDefault();
      e.stopPropagation();
      details.classList.remove("drag-over");

      const fromIndex = projectNow.cues.findIndex(c => c.id === draggedCueId);
      const toIndex = projectNow.cues.findIndex(c => c.id === cue.id);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      const rect = details.getBoundingClientRect();
      const insertAfter = e.clientY > rect.top + rect.height / 2;
      const [moved] = projectNow.cues.splice(fromIndex, 1);
      let insertIndex = toIndex + (insertAfter ? 1 : 0);
      if (fromIndex < insertIndex) insertIndex -= 1;
      projectNow.cues.splice(insertIndex, 0, moved);

      projectNow.cues.forEach((c, idx) => {
        c.index = idx;
        c.index_in_project = idx;
      });

      renderCueList();
      persistCueOrder(projectNow).catch(err => {
        console.warn('[CueOrder] Persist failed', err);
      });
    });
  });

  applyCuesCollapsedState();
}

function renderVersionPreviews() {
  if (renderVersionPreviews.inFlight) {
    renderVersionPreviews.queued = true;
    return;
  }
  renderVersionPreviews.inFlight = true;

  try {
    const project = getActiveProject();
    if (!project || cuesCollapsed) return;

    project.cues.forEach(cue => {
      const details = document.querySelector(`details[data-cue-id="${cue.id}"]`);
      if (details && !details.open) return;
      cue.versions.forEach(version => {
      const prev = document.getElementById(`preview-${version.id}`);
      if (!prev) {
        return;
      }
      const targetWidth = Math.max(
        0,
        prev.clientWidth || prev.offsetWidth || 0
      );
      if (targetWidth < 30) {
        if (!prev.dataset.waveRetry) {
          prev.dataset.waveRetry = "1";
          setTimeout(() => {
            if (!prev.isConnected) return;
            delete prev.dataset.waveRetry;
            renderVersionPreviews();
          }, 60);
        }
        return;
      }

      // Skip if waveform already exists for this version (audio) and is valid
      if (version.media?.type === "audio") {
        const cacheId = getWaveCacheId("v", version.id);
        const waveKey = getWaveformRenderKeyFromVersion(version);
        const cached = waveformRenderCache.get(cacheId);
        const hasWaveVisual = !!prev.querySelector("canvas, img");
        if (cached && cached.width === targetWidth && cached.key === waveKey && hasWaveVisual) {
          return;
        }
        const existingCanvas = prev.querySelector("canvas");
        if (existingCanvas && existingCanvas.width > 0) {
          const canvasWidth = existingCanvas.width || 0;
          if (targetWidth && Math.abs(canvasWidth - targetWidth) > 2) {
            existingCanvas.remove();
          } else {
            return;
          }
        }
        if (miniWaves[version.id] && !existingCanvas) {
          try {
            miniWaves[version.id].destroy();
          } catch (e) {}
          delete miniWaves[version.id];
        }
      }

      // Skip if video element already exists
      if (version.media?.type === "video" && prev.querySelector("video")) {
        return;
      }

      prev.classList.remove("video", "has-thumbnail", "is-placeholder");
      prev.style.backgroundImage = "";
      prev.innerHTML = "";

      if (!version.media) {
        const label = document.createElement("span");
        label.className = "preview-label placeholder";
        label.textContent = version.deliverables.length
          ? `${version.deliverables.length} file`
          : "File";
        prev.classList.add("is-placeholder");
        prev.appendChild(label);
        return;
      }

      if (version.media.type === "audio") {
        createMiniWave(version, prev);
      }

      if (version.media.type === "video") {
        prev.classList.add("video");
        const mediaUrl = resolveVersionMediaUrl(version);

        // Preferred: show a lightweight <video> element with poster (thumbnail) so
        // the browser displays the thumbnail without loading full video data.
        const makeVideoEl = (videoUrl, posterUrl) => {
          const v = document.createElement("video");
          v.className = "version-thumb-video";
          v.muted = true;
          v.playsInline = true;
          v.preload = "metadata";
          if (posterUrl) v.poster = getDirectUrl(posterUrl);
          if (videoUrl) {
            // set src but avoid forcing download of large files; browsers will
            // usually fetch only metadata until play is requested.
            v.src = getDirectUrl(videoUrl);
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
                metaEl.textContent = getVersionMetaText(version);
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
            const el = makeVideoEl(mediaUrl || null, version.media.thumbnailUrl);
            prev.appendChild(el);
            prev.classList.add("has-thumbnail");
          } catch (err) {
            console.error("renderVersionPreviews: failed to render poster video", err, version.id);
            // fallback to img
            const img = document.createElement("img");
            img.src = getDirectUrl(version.media.thumbnailUrl);
            img.className = "version-thumb";
            img.onerror = () => { img.style.display = 'none'; };
            prev.appendChild(img);
            prev.classList.add("has-thumbnail");
          }
        } else if (mediaUrl) {
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
              const fallback = makeVideoEl(mediaUrl, null);
              el.appendChild(fallback);
              return;
            }

            version.media.thumbnailUrl = th;
            const wrapped = makeVideoEl(mediaUrl || null, th);
            el.appendChild(wrapped);
          }).catch(err => {
            console.error('renderVersionPreviews: thumbnail generation error', err, version.id);
            const el = document.getElementById(`preview-${version.id}`);
            if (!el) return;
            el.innerHTML = "";
            const fallback = document.createElement("span");
            fallback.className = "preview-label placeholder";
            fallback.textContent = "Video";
            el.appendChild(fallback);
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

  } finally {
    renderVersionPreviews.inFlight = false;
    if (renderVersionPreviews.queued) {
      renderVersionPreviews.queued = false;
      requestAnimationFrame(renderVersionPreviews);
    }
  }
}

renderVersionPreviews.inFlight = false;
renderVersionPreviews.queued = false;

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

  const deliverableId = uid();
  version.deliverables.push({
    id: deliverableId,
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
  renderNotesPanel();

  const cueName = cue.name || cue.title || '';
  uploadFileToSupabase(file, project.id, cue.id, version.id, { deliverableId, uploadType: 'deliverable', cueName });
}

// =======================
// NOTES PANEL RENDER
// =======================
function renderNotesPanel() {
  if (!generalNotesListEl && !cueNotesListEl && !cueNotesHeadingEl) return;

  const project = getActiveProject();

  const setGeneralState = message => {
    if (generalNotesListEl) {
      generalNotesListEl.innerHTML = `<div class="notes-empty-state">${message}</div>`;
    }
  };

  const setCueState = message => {
    if (cueNotesListEl) {
      cueNotesListEl.innerHTML = `<div class="notes-empty-state">${message}</div>`;
    }
  };

  const toggleGeneralForm = enabled => {
    if (generalNoteInput) {
      generalNoteInput.disabled = !enabled;
      if (!enabled) generalNoteInput.value = "";
      generalNoteInput.placeholder = enabled
        ? "Scrivi una nota generale..."
        : "Seleziona un progetto per aggiungere note";
    }
    if (generalNoteSubmitBtn) {
      generalNoteSubmitBtn.disabled = !enabled;
    }
  };

  const toggleCueForm = (enabled, placeholderText) => {
    if (cueNoteInput) {
      cueNoteInput.disabled = !enabled;
      if (!enabled) cueNoteInput.value = "";
      cueNoteInput.placeholder = placeholderText;
    }
    if (cueNoteSubmitBtn) {
      cueNoteSubmitBtn.disabled = !enabled;
    }
  };

  if (!project) {
    toggleGeneralForm(false);
    toggleCueForm(false, "Seleziona una cue per aggiungere note");
    setGeneralState("Seleziona un progetto per vedere le note");
    if (cueNotesHeadingEl) cueNotesHeadingEl.textContent = "Note cue";
    setCueState("Seleziona una cue per vedere le note");
    return;
  }

  toggleGeneralForm(true);

  const generalNotes = Array.isArray(project.notes) ? project.notes : [];
  if (!generalNotes.length) {
    setGeneralState("Nessuna nota generale");
  } else if (generalNotesListEl) {
    generalNotesListEl.innerHTML = generalNotes
      .map(note => {
        const noteId = note.id || note.note_id || "";
        const noteAttr = noteId ? ` data-note-id="${noteId}"` : "";
        const noteMeta = `
          <div class="note-meta">
            <span class="note-author">${escapeHtml(note.author_name || note.author || "Utente")}</span>
            <span>${formatNoteTimestamp(note.created_at || note.createdAt)}</span>
          </div>
        `;
        const actions = noteId ? noteActionsTemplate(noteId, "") : "";
        return `
          <div class="note-item project-note-item"${noteAttr}>
            <div class="note-text">${escapeHtml(note.body || note.text || "")}</div>
            ${noteMeta}
            ${actions}
          </div>
        `;
      })
      .join("");
    attachProjectNoteActions(generalNotesListEl);
  }

  const activeCue =
    project.activeCueId &&
    project.cues?.find(c => c.id === project.activeCueId);

  if (!activeCue) {
    toggleCueForm(false, "Seleziona una cue per aggiungere note");
    if (cueNotesHeadingEl) cueNotesHeadingEl.textContent = "Note cue";
    setCueState("Seleziona una cue per vedere le note");
    return;
  }

  toggleCueForm(true, "Scrivi una nota sulla cue...");
  if (cueNotesHeadingEl) {
    cueNotesHeadingEl.textContent = `Note · ${activeCue.displayName || activeCue.name || "Cue"}`;
  }

  if (cueNotesListEl) {
    renderCueNotesInline(activeCue.id, cueNotesListEl);
    if (!cueNotesListEl.children.length) {
      setCueState("Nessuna nota per questa cue");
    }
  }
}

// =======================
// REFERENCE LIST RENDER
// =======================
function renderReferences() {
  if (!refsListEl || !refsSubtitleEl || !refsToggleBtn) return;

  const project = getActiveProject();

  if (!project) {
    var t = window.i18n && window.i18n.t ? window.i18n.t : function(k) { return k; };
    setSectionSubtitle(refsSubtitleEl, refsSubtitleKey, refsSubtitleFallback);
    refsListEl.innerHTML = t('refs.noFiles');
    refsListEl.classList.add("cue-list-empty");
    refsListEl.classList.remove("drag-over");
    refsToggleBtn.disabled = true;
    updateCountBadge(refsCountBadgeEl, null, "refs.countSingle", "refs.countPlural", "file", "files");
    applyReferencesCollapsedState();
    return;
  }

  ensureProjectReferences(project);
  setSectionSubtitle(refsSubtitleEl, refsSubtitleKey, refsSubtitleFallback);
  refsToggleBtn.disabled = false;

  const refs = project.references || [];
  updateCountBadge(
    refsCountBadgeEl,
    refs.length,
    "refs.countSingle",
    "refs.countPlural",
    "file",
    "files"
  );

  if (referencesCollapsed) {
    applyReferencesCollapsedState();
    return;
  }

  if (!refs.length) {
    var t2 = window.i18n && window.i18n.t ? window.i18n.t : function(k) { return k; };
    refsListEl.innerHTML = t2('refs.noFiles');
    refsListEl.classList.add("cue-list-empty");
    refsListEl.classList.remove("drag-over");
    applyReferencesCollapsedState();
    return;
  }

  // Keep subtitle as static translated text from data-i18n attribute
  // Badge already shows the count via updateCountBadge above

  refsListEl.classList.remove("cue-list-empty", "drag-over");
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
      img.src = getDirectUrl(active.url);
      img.alt = active.name;
      preview.appendChild(img);
    } else if (active.type === "video") {
      if (active.thumbnailUrl) {
        const img = document.createElement("img");
        img.src = getDirectUrl(active.thumbnailUrl);
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
            el.textContent = "Preview non disponibile";
            return;
          }
          active.thumbnailUrl = th;
          const img = document.createElement("img");
          img.src = getDirectUrl(th);
          img.alt = active.name;
          el.appendChild(img);
        }).catch(err => {
          console.error('renderReferences: failed to build video thumbnail', err, active.id);
          const el = document.getElementById(`ref-preview-${refRoot.id}`);
          if (!el) return;
          el.innerHTML = "";
          el.textContent = getReferenceLabel(active.type);
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
        ? tr("refs.groupLabel", { n: refRoot.versions.length })
        : tr("refs.groupLabelSingle");

    const dd = document.createElement("div");
    dd.className = "download-dropdown ref-group-dropdown";

    const ddBtn = document.createElement("button");
    ddBtn.type = "button";
    ddBtn.className = "ghost-btn tiny download-toggle";
    ddBtn.textContent = "⋯";

    const ddMenu = document.createElement("div");
    ddMenu.className = "download-menu";
    ddMenu.innerHTML = `
      <button data-action="rename-active-version">${tr("refs.menuRenameActive")}</button>
      <button data-action="delete-active-version">${tr("refs.menuDeleteActive")}</button>
      <button data-action="delete-group">${tr("refs.menuDeleteGroup")}</button>
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
        img.src = getDirectUrl(ver.url);
        img.alt = ver.name;
        vPrev.appendChild(img);
      } else if (ver.type === "video") {
        if (ver.thumbnailUrl) {
          const img = document.createElement("img");
          img.src = getDirectUrl(ver.thumbnailUrl);
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
              el.textContent = "Preview non disponibile";
              return;
            }
            ver.thumbnailUrl = th;
            const img = document.createElement("img");
            img.src = getDirectUrl(th);
            img.alt = ver.name;
            el.appendChild(img);
          }).catch(err => {
            console.error('renderReferences: failed to build version thumbnail', err, ver.id);
            const el = document.getElementById(`ref-version-preview-${ver.id}`);
            if (!el) return;
            el.innerHTML = "";
            el.textContent = getReferenceLabel(ver.type);
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
        <button data-action="set-active">${tr("refs.menuSetActive")}</button>
        <button data-action="rename-version">${tr("action.renameVersion")}</button>
        <button data-action="delete-version">${tr("action.deleteVersion")}</button>
        <button data-action="download-version">${tr("action.download")}</button>
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
        e.preventDefault();
        e.stopPropagation();
        const open = vMenuWrap.classList.contains("open");
        document
          .querySelectorAll(".download-dropdown.open")
          .forEach(x => x.classList.remove("open"));
        if (!open) vMenuWrap.classList.add("open");
      });

      vMenu.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", async e => {
          e.preventDefault();
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
            const newName = await showPromptDialog({
              title: tr("action.renameVersion"),
              defaultValue: ver.name
            });
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
            triggerDownload(getProxiedUrl(ver.url), ver.name || tr("refs.groupLabelSingle"));
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
      if (!projectNow || !isOwnerOfProject(projectNow)) return;
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
      if (!projectNow || !isOwnerOfProject(projectNow)) return;

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
      e.preventDefault();
      e.stopPropagation();
      const open = dd.classList.contains("open");
      document
        .querySelectorAll(".download-dropdown.open")
        .forEach(x => x.classList.remove("open"));
      if (!open) dd.classList.add("open");
    });

    ddMenu.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.preventDefault();
        e.stopPropagation();
        dd.classList.remove("open");
        const action = btn.dataset.action;
        const projectNow = getActiveProject();
        if (!projectNow) return;

        if (action === "rename-active-version") {
          const avIndex = refRoot.activeVersionIndex ?? 0;
          const av = refRoot.versions[avIndex];
          const newName = await showPromptDialog({
            title: tr("refs.renameActivePrompt"),
            defaultValue: av.name
          });
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
          const ok = await showConfirmDialog({
            title: tr("action.delete"),
            message: tr("refs.deleteActiveConfirm", { name: av.name }),
            confirmLabel: tr("action.delete"),
            cancelLabel: tr("action.cancel")
          });
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
          const ok = await showConfirmDialog({
            title: tr("action.delete"),
            message: tr("refs.deleteGroupConfirm", { name: refRoot.name || active.name }),
            confirmLabel: tr("action.delete"),
            cancelLabel: tr("action.cancel")
          });
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

if (cueListEl) {
  cueListEl.addEventListener("dragover", e => {
    if (!isFileDragEvent(e)) return;
    const project = getActiveProject();
    if (!project) return;
    e.preventDefault();
    cueListEl.classList.add("drag-over");
  });

  cueListEl.addEventListener("dragleave", e => {
    if (!cueListEl.contains(e.relatedTarget)) {
      cueListEl.classList.remove("drag-over");
    }
  });

  cueListEl.addEventListener("drop", e => {
    if (!isFileDragEvent(e)) return;
    e.preventDefault();
    cueListEl.classList.remove("drag-over");
    if (!e.dataTransfer?.files?.length) return;
    handleCueFiles(Array.from(e.dataTransfer.files));
  });
}

if (refsToggleBtn) {
  refsToggleBtn.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project) return;
    referencesCollapsed = !referencesCollapsed;
    applyReferencesCollapsedState();
    if (!referencesCollapsed) {
      renderReferences();
    }
  });
}

if (cuesToggleBtn) {
  cuesToggleBtn.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project) return;
    cuesCollapsed = !cuesCollapsed;
    applyCuesCollapsedState();
    if (!cuesCollapsed) {
      renderCueList();
      renderVersionPreviews();
    }
  });
}

if (refsListEl) {
  refsListEl.addEventListener("dragover", e => {
    if (!isFileDragEvent(e)) return;
    const project = getActiveProject();
    if (!project) return;
    e.preventDefault();
    refsListEl.classList.add("drag-over");
  });

  refsListEl.addEventListener("dragleave", e => {
    if (!refsListEl.contains(e.relatedTarget)) {
      refsListEl.classList.remove("drag-over");
    }
  });

  refsListEl.addEventListener("drop", e => {
    if (!isFileDragEvent(e)) return;
    e.preventDefault();
    refsListEl.classList.remove("drag-over");

    const files = e.dataTransfer.files;
    if (!files || !files.length) return;
    handleReferenceFiles(Array.from(files));
  });
}

// =======================
// PLAYER MODE BUTTONS
// =======================
function updatePlayerModeButtons() {}

// =======================
// PLAYER ROOT
// =======================
function renderPlayer() {
  const project = getActiveProject();
  if (!project) {
    if (rightColEl) rightColEl.style.display = "none";
    if (columnResizer) columnResizer.style.display = "none";
    resetReviewUI();
    destroyMainWave();
    stopVideo();
    currentPlayerVersionId = null;
    currentPlayerMediaType = null;
    currentPlayerCueId = null;
    playerMediaEl.innerHTML =
      '<div class="player-placeholder">' + tr("player.placeholder") + '</div>';
    playPauseBtn.disabled = true;
    playPauseBtn.textContent = "Play";
    playPauseBtn.style.display = "inline-block";
    timeLabelEl.style.display = "inline-block";
    timeLabelEl.textContent = "--:-- / --:--";
    setCommentsEnabled(false);
    commentsListEl.innerHTML = "";
    commentsSummaryEl.textContent = tr("comments.noComments");
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
    if (columnResizer) columnResizer.style.display = "none";
    resetReviewUI();
    destroyMainWave();
    stopVideo();
    currentPlayerVersionId = null;
    currentPlayerMediaType = null;
    currentPlayerCueId = null;
    playerMediaEl.innerHTML =
      '<div class="player-placeholder">' + tr("player.placeholder") + '</div>';
    playPauseBtn.disabled = true;
    playPauseBtn.textContent = "Play";
    playPauseBtn.style.display = "inline-block";
    timeLabelEl.style.display = "inline-block";
    timeLabelEl.textContent = "--:-- / --:--";
    setCommentsEnabled(false);
    commentsListEl.innerHTML = "";
    commentsSummaryEl.textContent = tr("comments.noComments");
    if (volumeSlider) {
      volumeSlider.style.display = "none";
    }
    return;
  }

  if (rightColEl) rightColEl.style.display = "flex";
  if (columnResizer) {
    columnResizer.style.display = "block";
    requestAnimationFrame(updateColumnResizerPosition);
  }
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
    currentPlayerCueId = null;
    resetReviewUI();
    playerTitleEl.textContent = tr("player.noVersion");
    playerBadgeEl.textContent = tr("player.noMedia");
    playerBadgeEl.dataset.status = "";
    playerMediaEl.innerHTML =
      '<div class="player-placeholder">' + tr("player.placeholder") + '</div>';
    playPauseBtn.style.display = "none";
    playPauseBtn.textContent = "Play";
    timeLabelEl.style.display = "none";
    setCommentsEnabled(false);
    commentsListEl.innerHTML = "";
    commentsSummaryEl.textContent = tr("comments.noComments");
    if (volumeSlider) {
      volumeSlider.style.display = "none";
    }
    return;
  }

  const { cue, version } = ctx;
  playerTitleEl.textContent =
    `${cue.displayName} · ${computeVersionLabel(version.index)}`;

  const statusKey = normalizeVersionStatus(version.status || "in_review");
  playerBadgeEl.textContent = getStatusLabel(statusKey);
  playerBadgeEl.dataset.status = getStatusClassKey(statusKey);

  if (!version.media) {
    destroyMainWave();
    stopVideo();
    currentPlayerVersionId = null;
    currentPlayerMediaType = null;
    currentPlayerCueId = null;
    playerMediaEl.innerHTML =
      '<div class="player-placeholder">' + tr("player.noMediaForVersion") + '</div>';
    playPauseBtn.style.display = "none";
    playPauseBtn.textContent = "Play";
    timeLabelEl.style.display = "none";
    setCommentsEnabled(false);
    commentsListEl.innerHTML = "";
    commentsSummaryEl.textContent = tr("comments.noComments");
    if (volumeSlider) {
      volumeSlider.style.display = "none";
    }
    return;
  }

  const sameVersion =
    currentPlayerVersionId === version.id &&
    currentPlayerMediaType === version.media.type &&
    currentPlayerCueId === cue.id;

  if (!sameVersion) {
    console.log('[renderPlayer] Loading version:', {
      versionId: version.id,
      mediaType: version.media.type,
      mediaUrl: version.media.url,
      cueId: cue.id,
      cueName: cue.name
    });

    if (version.media.type === "audio") {
      loadAudioPlayer(project, cue, version);
    } else if (version.media.type === "video") {
      loadVideoPlayer(project, cue, version);
    } else {
      console.warn('[renderPlayer] Unknown media type:', version.media.type);
    }
    currentPlayerVersionId = version.id;
    currentPlayerMediaType = version.media.type;
    currentPlayerCueId = cue.id;
  }

  renderComments();
  updateReviewUI(project, version);
  updateActiveVersionRowStyles();
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

      // Reuse the same dropdown markup used by cues so styling/behavior is consistent
      const dd = document.createElement('div');
      dd.className = 'download-dropdown project-dropdown';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'icon-btn tiny download-toggle';
      btn.textContent = '⋯';
      btn.title = tr("header.projectOptions", {}, "Project options");

      const menu = document.createElement('div');
      menu.className = 'download-menu';
      menu.innerHTML = `
        <button data-action="rename">Rename</button>
        <button data-action="delete">Delete</button>
      `;

      dd.appendChild(btn);
      dd.appendChild(menu);

      // Toggle open/close
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = dd.classList.contains('open');
        document.querySelectorAll('.download-dropdown.open').forEach(x => x.classList.remove('open'));
        if (!open) dd.classList.add('open');
      });

      // Menu actions
      menu.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          dd.classList.remove('open');
          const action = b.dataset.action;
          if (action === 'rename') renameProject(project);
          if (action === 'delete') deleteProject(project.id);
        });
      });

      li.appendChild(dd);
    } else {
      // For shared projects: keep li clickable, but also show the three-dot menu
      li.style.cursor = 'pointer';
      label.style.cursor = 'pointer';
      const clickHandler = () => selectProject(project.id);
      li.addEventListener('click', clickHandler);
      label.addEventListener('click', clickHandler);

      // For shared projects show the same dropdown markup/behavior as owned projects
      const ddShared = document.createElement('div');
      ddShared.className = 'download-dropdown project-dropdown';

      const btnShared = document.createElement('button');
      btnShared.type = 'button';
      btnShared.className = 'icon-btn tiny download-toggle';
      btnShared.textContent = '⋯';
      btnShared.title = tr("header.projectOptions", {}, "Project options");

      const menuShared = document.createElement('div');
      menuShared.className = 'download-menu';
      menuShared.innerHTML = `
        <button data-action="rename">${tr("action.rename")}</button>
        <button data-action="delete">${tr("action.delete")}</button>
      `;

      ddShared.appendChild(btnShared);
      ddShared.appendChild(menuShared);

      // Toggle open/close for shared project menu
      btnShared.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = ddShared.classList.contains('open');
        document.querySelectorAll('.download-dropdown.open').forEach(x => x.classList.remove('open'));
        if (!open) ddShared.classList.add('open');
      });

      // Menu actions for shared projects (same as owned)
      menuShared.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          ddShared.classList.remove('open');
          const action = b.dataset.action;
          if (action === 'rename') renameProject(project);
          if (action === 'delete') deleteProject(project.id);
        });
      });

      li.appendChild(ddShared);
    }

    return li;
  }

  myListEl.innerHTML = '';
  if (myProjects.length === 0) {
    const li = document.createElement('li');
    li.className = 'project-item empty';
    li.textContent = tr("sidebar.noProjects");
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
      a.textContent = tr("sidebar.loginToSeeShared");
      a.style.color = '#9ca3af';
      a.style.textDecoration = 'underline';
      li.appendChild(a);
    } else {
      li.textContent = tr("sidebar.noSharedProjects");
    }
    sharedListEl.appendChild(li);
  } else {
    sharedProjects.forEach(project => {
      sharedListEl.appendChild(createProjectItem(project, false));
    });
  }

  if (!hasAutoSelectedProject && myProjects.length === 0 && sharedProjects.length === 1) {
    const sharedId = sharedProjects[0].id;
    const activeInShared = state.activeProjectId === sharedId;
    if (!activeInShared) {
      setActiveSidebarTab("shared-with-me");
      selectProject(sharedId);
    } else {
      setActiveSidebarTab("shared-with-me");
    }
    hasAutoSelectedProject = true;
  }

}

function renderProjectHeader() {
  const project = getActiveProject();
  if (!project) {
    // Use i18n translations for empty state
    var t = window.i18n && window.i18n.t ? window.i18n.t : function(k) { return k; };
    projectTitleEl.textContent = t('header.noProject');
    projectMetaEl.textContent = t('header.getStarted');
    projectMenuBtn.style.display = "none";
    return;
  }

  projectTitleEl.textContent = project.name;

  const cues = project.cues.length;
  const versions = project.cues.reduce((a, c) => a + c.versions.length, 0);

  const cuesLabel =
    cues === 1 ? tr("cues.countSingle") : tr("cues.countPlural");
  const versionsLabel =
    versions === 1 ? tr("misc.version") : tr("misc.versions");
  projectMetaEl.textContent = `${cues} ${cuesLabel} · ${versions} ${versionsLabel}`;

  projectTitleEl.onclick = () => renameProject(project);
  projectMenuBtn.onclick = () => deleteProject(project.id);
  projectMenuBtn.style.display = "inline-flex";
}

function setActiveShareTab(tab) {
  if (!shareTabButtons || !shareTabPanels) return;
  shareTabButtons.forEach((btn) => {
    const isActive = (btn.getAttribute("data-share-tab") || "link") === tab;
    btn.classList.toggle("active", isActive);
  });
  shareTabPanels.forEach((panel) => {
    const isLink = tab === "link" && panel.id === "share-link-panel";
    const isPeople = tab === "people" && panel.id === "share-people-panel";
    panel.classList.toggle("active", isLink || isPeople);
  });
}

function setShareInviteMessage(text, isError) {
  if (!shareInviteMessageEl) return;
  shareInviteMessageEl.textContent = text || "";
  shareInviteMessageEl.style.color = isError ? "#fca5a5" : "#9ca3af";
}

async function handleShareInvite() {
  const project = getActiveProject();
  if (!project) {
    setShareInviteMessage(tr("share.inviteNoProject"), true);
    return;
  }

  const userId = window.flowAuth?.getUser?.()?.id || null;
  const isOwner = userId && project.owner_id && project.owner_id === userId;
  if (!isOwner) {
    setShareInviteMessage(tr("share.inviteForbidden"), true);
    return;
  }

  if (!project.team_id) {
    setShareInviteMessage(tr("share.inviteNoTeam"), true);
    return;
  }

  const email = (shareInviteEmailEl && shareInviteEmailEl.value || "").trim();
  if (!email) {
    setShareInviteMessage(tr("share.inviteEmailRequired"), true);
    return;
  }

  const role = (shareInviteRoleEl && shareInviteRoleEl.value) || "viewer";
  if (shareInviteBtn) shareInviteBtn.disabled = true;

  try {
    const headers = await getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch("/api/invites", {
      method: "POST",
      headers,
      body: JSON.stringify({
        team_id: project.team_id,
        project_id: project.id,
        email,
        role,
        is_link_invite: false
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data && data.error ? data.error : tr("share.inviteError");
      setShareInviteMessage(msg, true);
      return;
    }

    if (shareInviteEmailEl) shareInviteEmailEl.value = "";

    // Check if email was actually sent
    if (data.email_sent === true) {
      setShareInviteMessage("✅ Email inviata a " + email, false);
    } else if (data.email_sent === false) {
      const errMsg = data.email_error || "errore SMTP";
      const smtpStatus = data.smtp_configured ? "SMTP configurato" : "SMTP NON configurato";
      setShareInviteMessage("❌ Invito creato ma email non inviata (" + errMsg + "). " + smtpStatus + ". Link: " + (data.invite_url || ""), true);
    } else {
      setShareInviteMessage(tr("share.inviteSuccess"), false);
    }
  } catch (err) {
    console.warn("[Share] Invite error", err);
    setShareInviteMessage(tr("share.inviteError"), true);
  } finally {
    if (shareInviteBtn) shareInviteBtn.disabled = false;
  }
}

function renderSharedWithList(items, opts) {
  if (!sharedWithListEl) return;
  sharedWithListEl.innerHTML = "";

  const messageKey = opts && opts.messageKey;
  if (messageKey) {
    const li = document.createElement("li");
    li.className = "share-empty";
    li.textContent = tr(messageKey);
    sharedWithListEl.appendChild(li);
    return;
  }

  if (opts && opts.loading) {
    const li = document.createElement("li");
    li.className = "share-empty";
    li.textContent = tr("share.peopleLoading");
    sharedWithListEl.appendChild(li);
    return;
  }

  if (!items || items.length === 0) {
    const li = document.createElement("li");
    li.className = "share-empty";
    li.textContent = tr("share.peopleEmpty");
    sharedWithListEl.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "share-person";
    const name = item.display_name || item.email || item.member_id || tr("misc.user");
    const role = item.role || "viewer";
    li.innerHTML = `
      <span class="share-person-name">${escapeHtml(name)}</span>
      <span class="share-person-role">${escapeHtml(role)}</span>
    `;
    sharedWithListEl.appendChild(li);
  });
}

async function refreshSharedWithPanel(force) {
  if (!sharedWithListEl) return;
  const project = getActiveProject();
  if (!project) {
    renderSharedWithList([], { messageKey: "share.inviteNoProject" });
    if (sharePeopleHintEl) {
      sharePeopleHintEl.textContent = tr("share.inviteNoProject");
      sharePeopleHintEl.style.display = "block";
    }
    if (shareInviteBtn) shareInviteBtn.disabled = true;
    return;
  }

  const userId = window.flowAuth?.getUser?.()?.id || null;
  const isOwner = userId && project.owner_id && project.owner_id === userId;

  if (sharePeopleHintEl) {
    if (!isOwner) {
      sharePeopleHintEl.textContent = tr("share.inviteForbidden");
      sharePeopleHintEl.style.display = "block";
    } else if (!project.team_id) {
      sharePeopleHintEl.textContent = tr("share.inviteNoTeam");
      sharePeopleHintEl.style.display = "block";
    } else {
      sharePeopleHintEl.style.display = "none";
    }
  }

  if (!isOwner) {
    renderSharedWithList([], { messageKey: "share.peopleForbidden" });
    if (shareInviteBtn) shareInviteBtn.disabled = true;
    return;
  }

  if (shareInviteBtn) {
    shareInviteBtn.disabled = !project.team_id;
  }

  if (!force && sharedWithCache.projectId === project.id && sharedWithCache.items !== null) {
    renderSharedWithList(sharedWithCache.items);
    return;
  }

  if (sharedWithLoading) return;
  sharedWithLoading = true;
  renderSharedWithList([], { loading: true });

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/projects/shared-with?project_id=${encodeURIComponent(project.id)}`, { headers });
    if (!res.ok) {
      renderSharedWithList([], { messageKey: "share.peopleEmpty" });
      sharedWithLoading = false;
      return;
    }
    const data = await res.json();
    const items = Array.isArray(data.shared_with) ? data.shared_with : [];
    sharedWithCache = { projectId: project.id, items };
    renderSharedWithList(items);
  } catch (err) {
    console.warn("[Share] Failed to load shared-with list", err);
    renderSharedWithList([], { messageKey: "share.peopleEmpty" });
  } finally {
    sharedWithLoading = false;
  }
}

function refreshTranslationsOnly() {
  const project = getActiveProject();
  renderProjectHeader();

  if (project) {
    updateCountBadge(
      cuesCountBadgeEl,
      project.cues.length || 0,
      "cues.countSingle",
      "cues.countPlural",
      "cue",
      "cues"
    );
    updateCountBadge(
      refsCountBadgeEl,
      (project.references || []).length,
      "refs.countSingle",
      "refs.countPlural",
      "file",
      "files"
    );
  }

  if (project && cueListEl && project.cues.length) {
    project.cues.forEach(cue => {
      const details = document.querySelector(`details[data-cue-id="${cue.id}"]`);
      if (!details) return;
      const metaEl = details.querySelector(".cue-meta");
      if (metaEl) {
        const label = cue.versions.length === 1 ? tr("misc.version") : tr("misc.versions");
        metaEl.textContent = `${cue.versions.length} ${label}`;
      }
      const statusEl = details.querySelector(".cue-status");
      if (statusEl) {
        statusEl.textContent = getStatusLabel(normalizeVersionStatus(cue.status || "in_review"));
      }
      const menu = details.querySelector(".cue-dropdown .download-menu");
      if (menu) {
        const renameBtn = menu.querySelector('button[data-action="rename"]');
        const deleteBtn = menu.querySelector('button[data-action="delete"]');
        if (renameBtn) renameBtn.textContent = tr("action.rename");
        if (deleteBtn) deleteBtn.textContent = tr("action.delete");
      }
      cue.versions.forEach(version => {
        const row = document.querySelector(`.version-row[data-version-id="${version.id}"]`);
        if (!row) return;
        const meta = row.querySelector(".version-meta");
        if (meta) meta.textContent = getVersionMetaText(version);
        const downloadBtn = row.querySelector(".download-dropdown .download-toggle");
        if (downloadBtn) downloadBtn.textContent = `${tr("action.download")} ▾`;
      });
    });
  } else if (cueListEl && (!project || !project.cues.length)) {
    if (cueListEl.classList.contains("cue-list-empty")) {
      cueListEl.textContent = tr("cues.noCues");
    }
  }

  if (project && refsListEl) {
    const refs = project.references || [];
    if (!refs.length) {
      refsListEl.textContent = tr("refs.noFiles");
    } else {
      refs.forEach(refRoot => {
        const details = document.querySelector(`details[data-ref-id="${refRoot.id}"]`);
        if (!details) return;
        const activeIndex =
          typeof refRoot.activeVersionIndex === "number"
            ? refRoot.activeVersionIndex
            : refRoot.versions.length - 1;
        const active = refRoot.versions[activeIndex];
        const metaEl = details.querySelector(".ref-meta");
        if (metaEl && active) {
          const label = getReferenceLabel(active.type);
          const sizeLabel = formatFileSize(active.size);
          metaEl.textContent = sizeLabel ? `${label} · ${sizeLabel}` : label;
        }
        const chip = details.querySelector(".refs-type-chip");
        if (chip) {
          chip.textContent =
            refRoot.versions.length > 1
              ? tr("refs.groupLabel", { n: refRoot.versions.length })
              : tr("refs.groupLabelSingle");
        }
        const menu = details.querySelector(".ref-group-dropdown .download-menu");
        if (menu) {
          const renameActive = menu.querySelector('button[data-action="rename-active-version"]');
          const deleteActive = menu.querySelector('button[data-action="delete-active-version"]');
          const deleteGroup = menu.querySelector('button[data-action="delete-group"]');
          if (renameActive) renameActive.textContent = tr("refs.menuRenameActive");
          if (deleteActive) deleteActive.textContent = tr("refs.menuDeleteActive");
          if (deleteGroup) deleteGroup.textContent = tr("refs.menuDeleteGroup");
        }
      });
      refs.forEach(refRoot => {
        (refRoot.versions || []).forEach((ver) => {
          const row = document.querySelector(`.ref-version-row[data-ref-version-id="${ver.id}"]`);
          if (!row) return;
          const meta = row.querySelector(".ref-version-meta");
          if (meta) {
            const label = getReferenceLabel(ver.type);
            const sizeLabel = formatFileSize(ver.size);
            meta.textContent = sizeLabel ? `${label} · ${sizeLabel}` : label;
          }
          const menu = row.querySelector(".download-menu");
          if (menu) {
            const setActive = menu.querySelector('button[data-action="set-active"]');
            const rename = menu.querySelector('button[data-action="rename-version"]');
            const del = menu.querySelector('button[data-action="delete-version"]');
            const download = menu.querySelector('button[data-action="download-version"]');
            if (setActive) setActive.textContent = tr("refs.menuSetActive");
            if (rename) rename.textContent = tr("action.renameVersion");
            if (del) del.textContent = tr("action.deleteVersion");
            if (download) download.textContent = tr("action.download");
          }
        });
      });
    }
  }

  const ctx = getActiveContext();
  if (project && ctx && ctx.version) {
    updateReviewUI(project, ctx.version);
    const statusKey = normalizeVersionStatus(ctx.version.status || "in_review");
    playerBadgeEl.textContent = getStatusLabel(statusKey);
    const commentCount = ctx.version.comments.length;
    commentsSummaryEl.textContent = commentCount
      ? tr("comments.count", { n: commentCount })
      : tr("comments.noComments");
  } else {
    renderComments();
    if (playerBadgeEl && playerBadgeEl.dataset.status === "reference") {
      playerBadgeEl.textContent = tr("player.referenceBadge");
    }
  }

  updateUploadCountLabel();
  if (uploadProgressPanel) {
    const titleEl = uploadProgressPanel.querySelector(".upload-progress-title strong");
    if (titleEl) titleEl.textContent = tr("upload.panelTitle");
  }
}

function updateVisibility() {
  const project = getActiveProject();
  const isOwner = project ? isOwnerOfProject(project) : false;
  if (contentEl) contentEl.style.display = project ? "grid" : "none";
  if (shareBtn) shareBtn.disabled = !project;
  if (deliverBtn) deliverBtn.disabled = !project;
  if (copyLinkBtn) copyLinkBtn.disabled = !project;
  if (addCueBtn) addCueBtn.disabled = !project || !isOwner;
  if (addReferenceBtn) addReferenceBtn.disabled = !project;
  setDropzoneEnabled(cuesDropzoneEl, !!project && isOwner);
  setDropzoneEnabled(refsDropzoneEl, !!project);
}

function setSectionSubtitle(el, key, fallback) {
  if (!el) return;
  const t =
    window.i18n && typeof window.i18n.t === "function" ? window.i18n.t : null;
  el.textContent = t ? t(key) : fallback;
}

function openFilePicker({ accept, multiple = true, onFiles }) {
  const input = document.createElement("input");
  input.type = "file";
  if (accept) input.accept = accept;
  if (multiple) input.multiple = true;
  input.addEventListener("change", () => {
    if (!input.files || !input.files.length) return;
    onFiles(Array.from(input.files));
  });
  input.click();
}

function handleCueFiles(files) {
  const project = getActiveProject();
  if (!project) return;
  files.forEach(file => createCueFromFile(file));
}

function handleReferenceFiles(files) {
  const project = getActiveProject();
  if (!project) return;
  files.forEach(file => createReferenceForProject(project, file, null));
  renderReferences();
}


function updateNamingControlsVisibility() {
  const shouldShow = !!state.autoRename;
  if (namingControlsWrapper) namingControlsWrapper.classList.toggle("visible", shouldShow);
  updateNamingModeButtons();
}

function updateNamingModeButtons() {
  namingSchemeButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.namingScheme === state.namingMode);
  });
}

function setDropzoneEnabled(el, enabled) {
  if (!el) return;
  el.classList.toggle("disabled", !enabled);
  el.style.display = enabled ? "" : "none";
}

function updateCountBadge(el, count, singularKey, pluralKey, fallbackSingular, fallbackPlural) {
  if (!el) return;
  const t =
    window.i18n && typeof window.i18n.t === "function" ? window.i18n.t : null;
  const singular = t ? t(singularKey) : fallbackSingular;
  const plural = t ? t(pluralKey) : fallbackPlural;
  if (count === null || count === undefined) {
    el.textContent = "--";
    el.classList.add("muted");
    return;
  }
  const label = count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
  el.textContent = label;
  if (count === 0) {
    el.classList.add("muted");
  } else {
    el.classList.remove("muted");
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

// =======================
// AUTO-RENAME CONTROLS
// =======================
if (autoRenameToggle) {
  // Load saved preference
  const savedAutoRename = localStorage.getItem("auto-rename");
  if (savedAutoRename === "true") {
    state.autoRename = true;
    autoRenameToggle.checked = true;
  }
  updateNamingControlsVisibility();

  autoRenameToggle.addEventListener("change", e => {
    state.autoRename = e.target.checked;
    localStorage.setItem("auto-rename", state.autoRename ? "true" : "false");
    console.log("[AutoRename] Toggle:", state.autoRename);
    updateNamingControlsVisibility();
    refreshAllNames();
    updateNamesInDOM();
  });
} else {
  updateNamingControlsVisibility();
}

const allowedNamingModes = ["media", "cinema"];
const savedNamingMode = localStorage.getItem("naming-mode");
if (savedNamingMode && allowedNamingModes.includes(savedNamingMode)) {
  state.namingMode = savedNamingMode;
}

if (namingSchemeButtons && namingSchemeButtons.length) {
  namingSchemeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const scheme = btn.dataset.namingScheme;
      if (!scheme || scheme === state.namingMode || !allowedNamingModes.includes(scheme)) return;
      state.namingMode = scheme;
      localStorage.setItem("naming-mode", scheme);
      updateNamingModeButtons();
      refreshAllNames();
      updateNamesInDOM();
    });
  });
}

updateNamingModeButtons();

// =======================
// LAYOUT RESIZERS
// =======================
const sidebarResizer = document.getElementById("sidebarResizer");
const columnResizer = document.getElementById("columnResizer");
const leftColumn = document.querySelector(".left-column");
const rightColumn = document.querySelector(".right-column");

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 500;

function updateSidebarResizerPosition() {
  if (!sidebarResizer || !sidebarEl) return;
  const handleWidth = sidebarResizer.offsetWidth || 12;
  sidebarResizer.style.left = `${sidebarEl.offsetWidth - handleWidth / 2}px`;
}

function updateColumnResizerPosition() {
  if (!columnResizer || !leftColumn || !contentEl) return;
  const handleWidth = columnResizer.offsetWidth || 12;
  const leftPos = leftColumn.offsetLeft + leftColumn.offsetWidth - handleWidth / 2;
  columnResizer.style.left = `${leftPos}px`;
}

function applySidebarWidth(widthPx) {
  if (!sidebarEl) return;
  const width = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, widthPx));
  sidebarEl.style.width = `${width}px`;
  sidebarEl.style.flex = `0 0 ${width}px`;
  document.documentElement.style.setProperty("--sidebar-width", `${width}px`);
  updateSidebarResizerPosition();
}

if (sidebarResizer && sidebarEl) {
  const storedSidebarWidth = parseInt(localStorage.getItem("sidebar-width") || "", 10);
  if (!Number.isNaN(storedSidebarWidth)) {
    applySidebarWidth(storedSidebarWidth);
  } else {
    applySidebarWidth(sidebarEl.offsetWidth || SIDEBAR_MIN_WIDTH);
  }

  let isSidebarResizing = false;
  let startSidebarX = 0;
  let startSidebarWidth = sidebarEl.offsetWidth;

  sidebarResizer.addEventListener("mousedown", e => {
    isSidebarResizing = true;
    startSidebarX = e.clientX;
    startSidebarWidth = sidebarEl.offsetWidth;
    sidebarResizer.classList.add("dragging");
    document.body.classList.add("resizing");
    e.preventDefault();
  });

  document.addEventListener("mousemove", e => {
    if (!isSidebarResizing) return;
    const delta = e.clientX - startSidebarX;
    applySidebarWidth(startSidebarWidth + delta);
    updateColumnResizerPosition();
  });

  document.addEventListener("mouseup", () => {
    if (!isSidebarResizing) return;
    isSidebarResizing = false;
    sidebarResizer.classList.remove("dragging");
    document.body.classList.remove("resizing");
    localStorage.setItem("sidebar-width", `${sidebarEl.offsetWidth}`);
  });

  window.addEventListener("resize", () => {
    if (!isSidebarResizing) {
      updateSidebarResizerPosition();
      updateColumnResizerPosition();
    }
  });
} else {
  updateSidebarResizerPosition();
}

if (columnResizer && contentEl && leftColumn) {
  let isResizing = false;
  let startX = 0;
  let startLeftWidth = 0;

  const savedLeftWidth = localStorage.getItem("column-left-width");
  if (savedLeftWidth) {
    contentEl.style.setProperty("--left-column-width", savedLeftWidth);
    contentEl.style.setProperty("--right-column-width", `calc(100% - ${savedLeftWidth})`);
  }
  updateColumnResizerPosition();

  columnResizer.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startLeftWidth = leftColumn.offsetWidth;

    columnResizer.classList.add("dragging");
    document.body.classList.add("resizing");

    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;

    const contentRect = contentEl.getBoundingClientRect();
    const styles = window.getComputedStyle(contentEl);
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    const usableWidth = Math.max(1, contentRect.width - paddingLeft - paddingRight);
    const minWidth = 300;
    const maxWidth = Math.max(minWidth, usableWidth - minWidth);

    const deltaX = e.clientX - startX;
    let newLeftWidth = startLeftWidth + deltaX;

    newLeftWidth = Math.max(minWidth, Math.min(maxWidth, newLeftWidth));

    const leftPercent = (newLeftWidth / usableWidth) * 100;
    const rightPercent = 100 - leftPercent;

    contentEl.style.setProperty("--left-column-width", `${leftPercent}%`);
    contentEl.style.setProperty("--right-column-width", `${rightPercent}%`);

    updateColumnResizerPosition();
  });

  document.addEventListener("mouseup", () => {
    if (!isResizing) return;

    isResizing = false;
    columnResizer.classList.remove("dragging");
    document.body.classList.remove("resizing");

    const leftWidth = getComputedStyle(contentEl).getPropertyValue("--left-column-width");
    if (leftWidth) {
      localStorage.setItem("column-left-width", leftWidth.trim());
    }
    updateColumnResizerPosition();
  });

  window.addEventListener("resize", () => {
    if (!isResizing) {
      updateColumnResizerPosition();
    }
  });
}

// =======================
// GLOBAL EVENTS
// =======================

// Tab switching for sidebar
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

function setActiveSidebarTab(tabName) {
  tabButtons.forEach(b => b.classList.remove("active"));
  tabContents.forEach(c => c.classList.remove("active"));
  const btn = Array.from(tabButtons).find(b => b.dataset.tab === tabName);
  const tabContent = document.getElementById(`${tabName}-tab`);
  if (btn) btn.classList.add("active");
  if (tabContent) tabContent.classList.add("active");
}

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const tabName = btn.dataset.tab;
    setActiveSidebarTab(tabName);
  });
});

if (newProjectBtn) {
  newProjectBtn.addEventListener("click", createNewProject);
} else {
  console.error("[FlowPreview] newProjectBtn not found in DOM");
}

if (reviewCompleteBtn) {
  reviewCompleteBtn.addEventListener("click", async () => {
    const ctx = getActiveContext();
    if (!ctx) return;
    const confirmed = await showConfirmDialog({
      title: tr('review.confirmReviewCompleteTitle') || 'Conferma',
      message: tr('review.confirmReviewCompleteMessage') || 'Sei sicuro di aver finito di commentare questa versione?',
      confirmText: tr('review.confirmReviewCompleteBtn') || 'Sì, ho finito',
      cancelText: tr('common.cancel') || 'Annulla'
    });
    if (!confirmed) return;
    setVersionStatus(ctx.project, ctx.cue, ctx.version, "review_completed");
  });
}

if (startRevisionBtn) {
  startRevisionBtn.addEventListener("click", () => {
    const ctx = getActiveContext();
    if (!ctx) return;
    setVersionStatus(ctx.project, ctx.cue, ctx.version, "in_revision");
  });
}

if (approveVersionBtn) {
  approveVersionBtn.addEventListener("click", async () => {
    const ctx = getActiveContext();
    if (!ctx) return;
    const confirmed = await showConfirmDialog({
      title: tr('review.confirmApproveTitle') || 'Conferma approvazione',
      message: tr('review.confirmApproveMessage') || 'Sei sicuro di voler approvare questa versione?',
      confirmText: tr('review.confirmApproveBtn') || 'Sì, approva',
      cancelText: tr('common.cancel') || 'Annulla'
    });
    if (!confirmed) return;
    setVersionStatus(ctx.project, ctx.cue, ctx.version, "approved");
  });
}

if (requestChangesBtn) {
  requestChangesBtn.addEventListener("click", () => {
    const ctx = getActiveContext();
    if (!ctx) return;
    setVersionStatus(ctx.project, ctx.cue, ctx.version, "changes_requested");
  });
}

if (statusInReviewBtn) {
  statusInReviewBtn.addEventListener("click", () => {
    const ctx = getActiveContext();
    if (!ctx) return;
    setVersionStatus(ctx.project, ctx.cue, ctx.version, "in_review");
  });
}

// statusInRevisionBtn removed from UI

if (statusApprovedBtn) {
  statusApprovedBtn.addEventListener("click", () => {
    const ctx = getActiveContext();
    if (!ctx) return;
    setVersionStatus(ctx.project, ctx.cue, ctx.version, "approved");
  });
}

// Copy demo link -> create invite if authenticated, otherwise prompt/register or copy temporary link
if (copyLinkBtn) {
  copyLinkBtn.addEventListener('click', async () => {
    const project = window.getActiveProject ? window.getActiveProject() : null;
    if (!project) {
      showAlert('No project selected');
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
              showAlert('Link copiato negli appunti: ' + body.link);
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
                  showAlert('Link invito copiato negli appunti: ' + invBody.invite_url);
                  return;
                }

                console.warn('[FlowPreview] /api/invites failed or not allowed', invResp.status, invBody);
                showAlert('Non sei autorizzato a creare link di condivisione per questo progetto. Verrà copiato un link temporaneo.');
              } catch (ie) {
                console.warn('[FlowPreview] create invite fallback failed', ie);
                showAlert('Non sei autorizzato a creare link di condivisione per questo progetto. Verrà copiato un link temporaneo.');
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
          showAlert('Link copiato negli appunti: ' + inviteUrl);
          return;
        }
      } catch (err) {
        console.error('[FlowPreview] Failed to create/copy invite via server/RPC', err);
        // Fallback: copy a temporary project link so user can still share something
        try {
          const temp = `${window.location.origin}/?shared_project=${encodeURIComponent(project.id)}`;
          await navigator.clipboard.writeText(temp);
          showAlert('Impossibile generare link definitivo. Link temporaneo copiato negli appunti: ' + temp);
        } catch (clipErr) {
          console.error('[FlowPreview] Fallback clipboard write failed', clipErr);
          showAlert('Errore creando il link di condivisione');
        }
      } finally {
        copyLinkBtn.disabled = false;
      }

      return;
    }

    // Not authenticated: ask the user whether to register or copy a temporary project link
    const shouldRegister = await showConfirmDialog({
      title: tr("action.confirmDefaultTitle"),
      message: tr(
        "share.registerPrompt",
        {},
        "Non sei autenticato. Registrarsi ora permette di creare un link condivisibile. Premi OK per registrarti, Annulla per copiare un link temporaneo da incollare."
      ),
      confirmLabel: tr("action.confirm"),
      cancelLabel: tr("action.cancel")
    });
    if (shouldRegister) {
      window.location.href = '/register';
      return;
    }

    // Copy a simple temporary link (project id) so user can paste it elsewhere — note: this may not grant access without invite
    try {
      const temp = `${window.location.origin}/?shared_project=${encodeURIComponent(project.id)}`;
      await navigator.clipboard.writeText(temp);
      showAlert('Link temporaneo copiato negli appunti');
    } catch (err) {
      console.error('[FlowPreview] Clipboard write failed', err);
      showAlert('Impossibile copiare il link.');
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

    console.log("[Flow] Fetching project list via /api/projects...");
    const listStartTime = Date.now();

    let response = await fetch("/api/projects", { headers: fetchHeaders });
    let didRetry = false;
    if (!response.ok) {
      console.error("[Flow] Failed to fetch projects:", response.statusText);
      renderAll(); // Fallback to empty UI
      return;
    }

    let data = await response.json();
    const listElapsed = Date.now() - listStartTime;
    console.log(`[Flow] Loaded project list in ${listElapsed}ms`);

    // If the initial fetch returned the public all-projects list (no actor info)
    // and we have a client `flowAuth` available, try to initAuth() then retry once.
    try {
      const looksAnonymous = !Array.isArray(data.my_projects) && !Array.isArray(data.shared_with_me) && !Array.isArray(data.projects);
      const shouldRetry = looksAnonymous || data.public === true;
      if (shouldRetry && window.flowAuth && typeof window.flowAuth.initAuth === 'function' && !didRetry) {
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
    // Build combined project list (owned + shared) with empty cues to be loaded lazily
    const myProjects = Array.isArray(data.my_projects) ? data.my_projects : [];
    const sharedProjects = Array.isArray(data.shared_with_me) ? data.shared_with_me : [];
    let projects = [];
    if (Array.isArray(data.projects) && data.projects.length > 0) {
      projects = data.projects;
    } else {
      projects = [...myProjects, ...sharedProjects];
    }

    console.log("[Flow] Loaded projects:", projects.length);

    const sharedIds = new Set(sharedProjects.map(p => p.id));
    if (sharedIds.size === 0 && projects.some(p => p.is_shared)) {
      projects
        .filter(p => p.is_shared)
        .forEach(p => sharedIds.add(p.id));
    }

    state.projects = projects.map(p => ({
      id: p.id,
      name: p.name || "Untitled",
      team_id: p.team_id,
      owner_id: p.owner_id || null,
      team_members: p.team_members || [],
      is_shared: sharedIds.has(p.id),
      cues: [],
      activeCueId: null,
      activeVersionId: null,
      references: [],
      activeReferenceId: null
    }));

    // If a specific project was requested (open_project), prefer it
    let bootProjectId = null;
    try {
      const openProject = localStorage.getItem('open_project');
      if (openProject) {
        const found = state.projects.find(p => p.id === openProject);
        if (found) {
          state.activeProjectId = found.id;
          bootProjectId = found.id;
          // Clean up the flag so subsequent loads don't reopen it
          localStorage.removeItem('open_project');
        }
      }
    } catch (e) {
      console.warn('[Flow] Error reading open_project from localStorage', e);
    }

    // Set first project as active if none selected
    if (!state.activeProjectId && state.projects.length > 0) {
      state.activeProjectId = state.projects[0].id;
      bootProjectId = state.projects[0].id;
    }

    // Refresh names and render immediately
    refreshAllNames();
    renderAll();
    console.log("[Flow] Project list ready. Active project:", state.activeProjectId);

    // Immediately load cues/versions/comments for the active project
    if (bootProjectId) {
      await loadProjectCues(bootProjectId);
    } else {
      console.log("[Flow] No projects found for this user.");
    }

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
  renderNotesPanel();
  refreshSharedWithPanel(false);
  updateProjectNotesButton();
}

// Export for page.tsx to call after auth
window.initializeFromSupabase = initializeFromSupabase;
window.getActiveProject = getActiveProject; // Export for share-handler.js

// Don't auto-initialize - wait for page.tsx to call initializeFromSupabase
// ==========================================
// NOTES FUNCTIONALITY (Modal + Inline Cue Notes)
// ==========================================

// Note: projectNotesStore is already declared at the top of the file
function cloneCueNotesMap(source = {}) {
  const clone = {};
  for (const key of Object.keys(source)) {
    const arr = source[key];
    clone[key] = Array.isArray(arr) ? [...arr] : [];
  }
  return clone;
}

function noteActionsTemplate(noteId, cueId) {
  const cueAttr = cueId ? ` data-cue-id="${cueId}"` : "";
  return `
    <div class="download-dropdown note-actions"${cueAttr} data-note-id="${noteId}">
      <button type="button" class="icon-btn tiny download-toggle" aria-label="Azioni nota">⋯</button>
      <div class="download-menu">
        <button class="note-edit" data-note-id="${noteId}"${cueAttr}>Modifica</button>
        <button class="note-delete" data-note-id="${noteId}"${cueAttr}>Elimina</button>
      </div>
    </div>
  `;
}

function initNotesUI() {
  // Project notes button in header
  const projectNotesBtn = document.getElementById('projectNotesBtn');
  const projectNotesModal = document.getElementById('projectNotesModal');
  const closeProjectNotesModal = document.getElementById('closeProjectNotesModal');
  const projectNoteForm = document.getElementById('projectNoteForm');

  if (projectNotesBtn) {
    projectNotesBtn.addEventListener('click', () => {
      if (projectNotesModal) {
        projectNotesModal.style.display = 'flex';
        loadAndRenderProjectNotes();
      }
    });
  }

  if (closeProjectNotesModal) {
    closeProjectNotesModal.addEventListener('click', () => {
      if (projectNotesModal) projectNotesModal.style.display = 'none';
    });
  }

  if (projectNotesModal) {
    projectNotesModal.addEventListener('click', (e) => {
      if (e.target === projectNotesModal) {
        projectNotesModal.style.display = 'none';
      }
    });
  }

  if (projectNoteForm) {
    projectNoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('projectNoteInput');
      const text = input?.value?.trim();
      if (!text) return;

      await saveProjectNote(text);
      if (input) input.value = '';
      loadAndRenderProjectNotes();
    });
  }
}

async function loadAndRenderProjectNotes() {
  const project = getActiveProject();
  if (!project) return;

  const listEl = document.getElementById('projectNotesList');
  if (!listEl) return;

  listEl.innerHTML = '<div class="notes-empty-state">Caricamento...</div>';

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/notes?projectId=${project.id}&type=general`, { headers });

    if (!res.ok) {
      throw new Error('Errore caricamento note');
    }

    const data = await res.json();
    const notes = data.notes || [];
    project.notes = notes;
    if (!projectNotesStore[project.id]) {
      projectNotesStore[project.id] = { general: [...notes], cue: {}, loadedAt: Date.now() };
    } else {
      projectNotesStore[project.id].general = [...notes];
    }
    renderNotesPanel();

    if (notes.length === 0) {
      listEl.innerHTML = '<div class="notes-empty-state">Nessuna nota per questo progetto</div>';
      return;
    }

    listEl.innerHTML = notes.map(note => `
      <div class="project-note-item" data-note-id="${note.id}">
        <div class="note-text">${escapeHtml(note.body)}</div>
        <div class="note-meta">
          <span class="note-author">${escapeHtml(note.author_name || 'Utente')}</span>
          <span>${formatNoteTimestamp(note.created_at)}</span>
        </div>
        ${noteActionsTemplate(note.id, '')}
      </div>
    `).join('');
    attachProjectNoteActions(listEl);

  } catch (err) {
    console.error('[Notes] Error loading project notes:', err);
    listEl.innerHTML = '<div class="notes-empty-state">Errore caricamento note</div>';
  }
}

async function loadProjectNotes(projectId, options = {}) {
  const project = getProjectById(projectId);
  if (!project) return;
  const cached = projectNotesStore[projectId];
  if (cached && !options.force) {
    project.notes = [...(cached.general || [])];
    project.cueNotes = cloneCueNotesMap(cached.cue || {});
    renderCueList();
    renderVersionPreviews();
    renderNotesPanel();
    return;
  }

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/notes?projectId=${projectId}`, { headers });
    if (!res.ok) {
      throw new Error(`Failed to load project notes (${res.status})`);
    }
    const data = await res.json();
    const notes = Array.isArray(data.notes) ? data.notes : [];
    const general = [];
    const cueMap = {};
    notes.forEach((note) => {
      if (note.cue_id) {
        if (!cueMap[note.cue_id]) cueMap[note.cue_id] = [];
        cueMap[note.cue_id].push(note);
      } else {
        general.push(note);
      }
    });
    project.notes = general;
    project.cueNotes = cueMap;
    projectNotesStore[projectId] = {
      general: [...general],
      cue: cloneCueNotesMap(cueMap),
      loadedAt: Date.now()
    };
    renderCueList();
    renderVersionPreviews();
    renderNotesPanel();
  } catch (err) {
    console.error('[Notes] Error loading project notes:', err);
    throw err;
  }
}

async function saveProjectNote(text) {
  const project = getActiveProject();
  if (!project || !text) return;

  try {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';

    const res = await fetch('/api/notes', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        projectId: project.id,
        body: text,
        type: 'general',
        authorName: getCurrentUserDisplayName()
      })
    });

    if (!res.ok) {
      throw new Error('Errore salvataggio nota');
    }

    const data = await res.json().catch(() => null);
    const createdNote = data?.note || {
      id: uid(),
      body: text,
      author_name: getCurrentUserDisplayName(),
      created_at: new Date().toISOString()
    };
    if (projectNotesStore[project.id]) {
      const storeEntry = projectNotesStore[project.id];
      storeEntry.general = [createdNote, ...(storeEntry.general || [])];
    }
    if (!project.notes) project.notes = [];
    project.notes.unshift(createdNote);
    renderNotesPanel();
    console.log('[Notes] Project note saved');
  } catch (err) {
    console.error('[Notes] Error saving project note:', err);
    showAlert('Errore durante il salvataggio della nota');
  }
}

// Render cue notes inline (inside each cue)
function renderCueNotesInline(cueId, container) {
  if (!container) return;

  const project = getActiveProject();
  if (!project) {
    container.innerHTML = '';
    return;
  }

  // Get notes for this cue from project's cueNotes
  const cueNotes = project.cueNotes?.[cueId] || [];

  if (cueNotes.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = cueNotes.map(note => `
    <div class="cue-note-item" data-note-id="${note.id}" data-cue-id="${cueId}">
      <div class="note-text">${escapeHtml(note.body || note.text)}</div>
      <div class="note-meta">
        ${escapeHtml(note.author_name || 'Utente')} · ${formatNoteTimestamp(note.created_at)}
      </div>
      ${noteActionsTemplate(note.id, cueId)}
    </div>
  `).join('');
  attachCueNoteActions(container, cueId);
}

async function saveCueNote(cueId, text) {
  const project = getActiveProject();
  if (!project || !cueId || !text) return;

  try {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';

    const res = await fetch('/api/notes', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        projectId: project.id,
        cueId: cueId,
        body: text,
        type: 'cue',
        authorName: getCurrentUserDisplayName()
      })
    });

    if (!res.ok) {
      throw new Error('Errore salvataggio nota');
    }

    const data = await res.json();
    const createdNote = data.note;

    // Add to local state
    if (!project.cueNotes) project.cueNotes = {};
    if (!project.cueNotes[cueId]) project.cueNotes[cueId] = [];
    if (createdNote) {
      project.cueNotes[cueId].unshift(createdNote);
    }
    if (projectNotesStore[project.id]) {
      const storeEntry = projectNotesStore[project.id];
      if (!storeEntry.cue) storeEntry.cue = {};
      const existing = storeEntry.cue[cueId] || [];
      storeEntry.cue[cueId] = createdNote ? [createdNote, ...existing] : existing;
    }

    renderNotesPanel();
    console.log('[Notes] Cue note saved');
  } catch (err) {
    console.error('[Notes] Error saving cue note:', err);
    showAlert('Errore durante il salvataggio della nota');
  }
}

async function getAuthHeaders() {
  const headers = {};
  try {
    if (window.supabaseClient?.auth) {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      if (session?.user?.id) {
        headers['x-actor-id'] = session.user.id;
      }
    }
  } catch (err) {
    console.warn('[Notes] Could not get auth headers:', err);
  }
  return headers;
}

function formatNoteTimestamp(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ora';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;

    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  } catch (err) {
    return '';
  }
}

function getCurrentUserDisplayName() {
  try {
    if (window.flowAuth?.getUser) {
      const user = window.flowAuth.getUser();
      if (user?.full_name) return user.full_name;
      if (user?.displayName) return user.displayName;
      if (user?.email) return user.email;
    }
    if (window.flowAuth?.getSession) {
      const session = window.flowAuth.getSession();
      if (session?.user?.email) return session.user.email;
    }
  } catch (err) {}
  return 'Utente';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function attachProjectNoteActions(listEl) {
  const project = getActiveProject();
  if (!project) return;
  listEl.querySelectorAll('.project-note-item').forEach(item => {
    const noteId = item.dataset.noteId;
    const dropdown = item.querySelector('.note-actions');
    setupNoteDropdown(dropdown);
    const editBtn = item.querySelector('.note-edit');
    const deleteBtn = item.querySelector('.note-delete');
    if (editBtn) {
      editBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown?.classList.remove('open');
        await handleEditNote(noteId, null);
      });
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown?.classList.remove('open');
        await handleDeleteNote(noteId, null);
      });
    }
  });
}

function attachCueNoteActions(container, cueId) {
  container.querySelectorAll('.cue-note-item').forEach(item => {
    const noteId = item.dataset.noteId;
    const dropdown = item.querySelector('.note-actions');
    setupNoteDropdown(dropdown);
    const editBtn = item.querySelector('.note-edit');
    const deleteBtn = item.querySelector('.note-delete');
    if (editBtn) {
      editBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown?.classList.remove('open');
        await handleEditNote(noteId, cueId);
      });
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown?.classList.remove('open');
        await handleDeleteNote(noteId, cueId);
      });
    }
  });
}

function setupNoteDropdown(dropdown) {
  if (!dropdown) return;
  const toggle = dropdown.querySelector('.download-toggle');
  if (!toggle) return;
  const closeHandler = (event) => {
    if (!dropdown.contains(event.target)) {
      dropdown.classList.remove('open');
      document.removeEventListener('click', closeHandler);
    }
  };
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    document
      .querySelectorAll('.download-dropdown.open')
      .forEach(el => {
        if (el !== dropdown) el.classList.remove('open');
      });
    const willOpen = !dropdown.classList.contains('open');
    dropdown.classList.toggle('open');
    if (willOpen) {
      document.addEventListener('click', closeHandler);
    }
  });
}

async function handleEditNote(noteId, cueId) {
  const project = getActiveProject();
  if (!project || !noteId) return;
  const list = cueId ? (project.cueNotes?.[cueId] || []) : (project.notes || []);
  const note = list.find(n => n.id === noteId);
  if (!note) return;
  const currentText = note.body || note.text || '';
  const edited = await showPromptDialog({
    title: tr("notes.editPrompt", {}, "Modifica nota"),
    defaultValue: currentText
  });
  if (edited === null) return;
  const trimmed = edited.trim();
  if (!trimmed || trimmed === currentText.trim()) return;
  try {
    await updateNoteRequest(noteId, trimmed);
    if (cueId) {
      const cueListEl = document.querySelector(`.cue-notes-list[data-cue-id="${cueId}"]`);
      if (cueListEl) renderCueNotesInline(cueId, cueListEl);
    } else {
      loadAndRenderProjectNotes();
    }
  } catch (err) {
    console.error('[Notes] Failed to edit note', err);
    showAlert('Errore durante la modifica della nota');
  }
}

async function handleDeleteNote(noteId, cueId) {
  const project = getActiveProject();
  if (!project || !noteId) return;
  const list = cueId ? (project.cueNotes?.[cueId] || []) : (project.notes || []);
  const note = list.find(n => n.id === noteId);
  if (!note) return;
  const ok = await showConfirmDialog({
    title: tr("action.delete"),
    message: tr("notes.deleteConfirm", {}, "Eliminare questa nota?"),
    confirmLabel: tr("action.delete"),
    cancelLabel: tr("action.cancel")
  });
  if (!ok) return;
  try {
    await deleteNoteRequest(noteId);
    removeNoteFromState(project.id, noteId, cueId);
    if (cueId) {
      const cueListEl = document.querySelector(`.cue-notes-list[data-cue-id="${cueId}"]`);
      if (cueListEl) renderCueNotesInline(cueId, cueListEl);
    } else {
      loadAndRenderProjectNotes();
    }
  } catch (err) {
    console.error('[Notes] Failed to delete note', err);
    showAlert('Errore durante la cancellazione della nota');
  }
}

async function updateNoteRequest(noteId, text) {
  const headers = await getAuthHeaders();
  headers['Content-Type'] = 'application/json';
  const res = await fetch('/api/notes', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ noteId, body: text })
  });
  if (!res.ok) {
    throw new Error('Failed to update note');
  }
  const data = await res.json();
  if (data.note) {
    applyNoteUpdate(data.note);
  }
  return data.note;
}

async function deleteNoteRequest(noteId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/notes?noteId=${encodeURIComponent(noteId)}`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) {
    throw new Error('Failed to delete note');
  }
}

function applyNoteUpdate(note) {
  if (!note) return;
  const project = getProjectById(note.project_id) || getActiveProject();
  if (!project) return;
  if (note.cue_id) {
    if (!project.cueNotes) project.cueNotes = {};
    if (!project.cueNotes[note.cue_id]) project.cueNotes[note.cue_id] = [];
    const idx = project.cueNotes[note.cue_id].findIndex(n => n.id === note.id);
    if (idx >= 0) {
      project.cueNotes[note.cue_id][idx] = note;
    } else {
      project.cueNotes[note.cue_id].unshift(note);
    }
  } else {
    if (!project.notes) project.notes = [];
    const idx = project.notes.findIndex(n => n.id === note.id);
    if (idx >= 0) {
      project.notes[idx] = note;
    } else {
      project.notes.unshift(note);
    }
  }
  const storeEntry = projectNotesStore[note.project_id];
  if (storeEntry) {
    if (note.cue_id) {
      if (!storeEntry.cue) storeEntry.cue = {};
      if (!storeEntry.cue[note.cue_id]) storeEntry.cue[note.cue_id] = [];
      const idx = storeEntry.cue[note.cue_id].findIndex(n => n.id === note.id);
      if (idx >= 0) {
        storeEntry.cue[note.cue_id][idx] = note;
      } else {
        storeEntry.cue[note.cue_id].unshift(note);
      }
    } else if (storeEntry.general) {
      const idx = storeEntry.general.findIndex(n => n.id === note.id);
      if (idx >= 0) {
        storeEntry.general[idx] = note;
      }
    }
  }
  renderNotesPanel();
}

function removeNoteFromState(projectId, noteId, cueId) {
  const project = getProjectById(projectId) || getActiveProject();
  if (!project) return;
  if (cueId) {
    if (!project.cueNotes) project.cueNotes = {};
    if (project.cueNotes[cueId]) {
      project.cueNotes[cueId] = project.cueNotes[cueId].filter(n => n.id !== noteId);
    }
  } else if (project.notes) {
    project.notes = project.notes.filter(n => n.id !== noteId);
  }
  const storeEntry = projectNotesStore[projectId];
  if (storeEntry) {
    if (cueId) {
      if (storeEntry.cue && storeEntry.cue[cueId]) {
        storeEntry.cue[cueId] = storeEntry.cue[cueId].filter(n => n.id !== noteId);
      }
    } else if (storeEntry.general) {
      storeEntry.general = storeEntry.general.filter(n => n.id !== noteId);
    }
  }
  renderNotesPanel();
}

// Show/hide project notes button based on active project
function updateProjectNotesButton() {
  const btn = document.getElementById('projectNotesBtn');
  const project = getActiveProject();
  if (btn) {
    btn.style.display = project ? '' : 'none';
  }
}

// Initialize notes UI after DOM is ready
setTimeout(initNotesUI, 100);

// ==========================================
// END NOTES FUNCTIONALITY
// ==========================================

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

// =======================
// LANGUAGE CHANGE HANDLER
// =======================
// Re-render dynamic content when language changes
window.addEventListener("language-changed", (e) => {
  console.log("[Flow] Language changed to:", e.detail && e.detail.language);
  // Re-render all dynamic UI components with new translations
  renderProjectList();
  refreshTranslationsOnly();
});
if (addCueBtn) {
  addCueBtn.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project) return;
    openFilePicker({
      accept: "audio/*,video/*,application/zip",
      multiple: true,
      onFiles: handleCueFiles
    });
  });
}

if (addReferenceBtn) {
  addReferenceBtn.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project) return;
    openFilePicker({
      multiple: true,
      onFiles: files => handleReferenceFiles(files)
    });
  });
}

if (cuesDropzoneEl) {
  cuesDropzoneEl.addEventListener("dragover", e => {
    if (!isFileDragEvent(e)) return;
    const project = getActiveProject();
    if (!project || !isOwnerOfProject(project)) return;
    e.preventDefault();
    cuesDropzoneEl.classList.add("drag-over");
  });

  cuesDropzoneEl.addEventListener("dragleave", e => {
    if (!cuesDropzoneEl.contains(e.relatedTarget)) {
      cuesDropzoneEl.classList.remove("drag-over");
    }
  });

  cuesDropzoneEl.addEventListener("drop", e => {
    if (!isFileDragEvent(e)) return;
    const project = getActiveProject();
    if (!project || !isOwnerOfProject(project)) return;
    e.preventDefault();
    cuesDropzoneEl.classList.remove("drag-over");
    if (!e.dataTransfer?.files?.length) return;
    handleCueFiles(Array.from(e.dataTransfer.files));
  });

  cuesDropzoneEl.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project || !isOwnerOfProject(project)) return;
    openFilePicker({
      accept: "audio/*,video/*,application/zip",
      multiple: true,
      onFiles: handleCueFiles
    });
  });
}

if (refsDropzoneEl) {
  refsDropzoneEl.addEventListener("dragover", e => {
    if (!isFileDragEvent(e)) return;
    if (!getActiveProject()) return;
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
    if (!e.dataTransfer?.files?.length) return;
    handleReferenceFiles(Array.from(e.dataTransfer.files));
  });

  refsDropzoneEl.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project) return;
    openFilePicker({
      multiple: true,
      onFiles: files => handleReferenceFiles(files)
    });
  });
}

// =======================
// ADD CUE BUTTON
// =======================
if (addCueBtn) {
  addCueBtn.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project) return;
    openFilePicker({
      accept: "audio/*,video/*",
      multiple: true,
      onFiles: files => {
        files.forEach(file => createCueFromFile(file));
      }
    });
  });
}

// =======================
// ADD REFERENCE BUTTON
// =======================
if (addReferenceBtn) {
  addReferenceBtn.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project) return;
    openFilePicker({
      multiple: true,
      onFiles: files => handleReferenceFiles(files)
    });
  });
}
