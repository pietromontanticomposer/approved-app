// app/page.tsx
"use client";

import Script from "next/script";
import { memo, useEffect, useState } from "react";
import ShareModal from "./components/ShareModal";
import DisplayNamePrompt from "./components/DisplayNamePrompt";
import { LandingContent } from "./landing/page";

// Force rebuild - Jan 8 2026 - v8 - Enhanced error logging for Supabase Storage

function readCachedBrowserSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("approved-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session = parsed?.currentSession || parsed?.session || parsed;
    if (!session?.user || !session?.access_token) return null;
    const expiresAtMs =
      typeof session.expires_at === "number" ? session.expires_at * 1000 : null;
    if (expiresAtMs && expiresAtMs < (Date.now() - 60_000) && !session.refresh_token) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

const LegacyAppShell = memo(function LegacyAppShell({ html }: { html: string }) {
  // flow.js mutates this DOM imperatively; React must not recreate it on unrelated state updates.
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
});

export default function Page() {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState<{
    projectId: string;
    projectName: string;
    teamId: string;
  } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [displayNamePromptOpen, setDisplayNamePromptOpen] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const cachedSession = readCachedBrowserSession();
      if (cachedSession?.user) {
        (window as any).__approvedSession = cachedSession;
        setIsLoggedIn(true);
        setCheckingAuth(false);
      }

      try {
        const { getSupabaseClient } = await import("@/lib/supabaseClient");
        const client = getSupabaseClient();

        // Timeout di sicurezza: se getSession() non risponde entro 5s mostra landing
        const { data } = await Promise.race([
          client.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Auth check timeout')), 5000)
          ),
        ]) as any;

        if (data?.session?.user) {
          // Cache session for flow-auth.js — evita un secondo getSession() ridondante
          (window as any).__approvedSession = data.session;
          // Signal scripts that a fresh session is now available
          // (the cached one from readCachedBrowserSession may have been expired)
          if ((window as any).flowAuth && typeof (window as any).flowAuth.getSession === 'function') {
            // flowAuth already has it — no action needed
          } else {
            // Dispatch event so flow.js retry logic can pick up the fresh token
            try { window.dispatchEvent(new Event('approved-session-refreshed')); } catch {}
          }
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } catch (e: any) {
        console.warn('[HomePage] Auth check failed', e);
        // Timeout = sessione corrotta in localStorage: pulisci SOLO il localStorage
        // NON chiamare signOut() (userebbe lo stesso lock interno di getSession() → deadlock)
        if (e?.message === 'Auth check timeout') {
          try {
            Object.keys(localStorage).forEach(key => {
              if (key === 'approved-auth' || key.startsWith('sb-')) {
                localStorage.removeItem(key);
              }
            });
          } catch {}
        }
        setIsLoggedIn(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    // Only run app initialization if logged in
    if (isLoggedIn !== true) return;

    console.log("Home page mounted - initializing Supabase client");
    // Reset sign-out flag on fresh page load to allow bootstrap
    (window as any).__isSigningOut = false;

    // Expose public storage base URL so flow.js can build direct CDN URLs (bucket is public)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const storageBucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media';
    (window as any).SUPABASE_PUBLIC_STORAGE_URL = `${supabaseUrl}/storage/v1/object/public/${storageBucket}`;

    // Initialize supabase client and signal readiness via event (no polling)
    const initSupabase = async () => {
      const { getSupabaseClient } = await import("@/lib/supabaseClient");
      const client = getSupabaseClient();
      (window as any).supabaseClient = client;
      window.dispatchEvent(new Event('supabase-client-ready'));
    };

    initSupabase();

    // Listen for share modal events
    const handleOpenShareModal = (event: any) => {
      const { projectId, projectName, teamId } = event.detail;
      setShareData({ projectId, projectName, teamId });
      setShareModalOpen(true);
    };

    window.addEventListener('open-share-modal', handleOpenShareModal);

    return () => {
      window.removeEventListener('open-share-modal', handleOpenShareModal);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn !== true) return;

    let cancelled = false;

    const checkDisplayName = async () => {
      try {
        const { getSupabaseClient } = await import("@/lib/supabaseClient");
        const client = getSupabaseClient();
        const { data } = await client.auth.getUser();
        const user = data?.user || null;
        const meta = user?.user_metadata || {};
        const first = meta.first_name || meta.firstName || "";
        const last = meta.last_name || meta.lastName || "";
        const currentDisplayName = typeof meta.display_name === "string" ? meta.display_name.trim() : "";
        const suggestedName =
          currentDisplayName ||
          meta.full_name ||
          `${first} ${last}`.trim() ||
          user?.email?.split("@")[0] ||
          "";

        if (cancelled) return;
        setDisplayNameDraft(suggestedName);
        setDisplayNamePromptOpen(!currentDisplayName);
        setDisplayNameError(null);
      } catch (error) {
        console.warn("[HomePage] Unable to check display name", error);
      }
    };

    checkDisplayName();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const handleDisplayNameSubmit = async () => {
    const trimmed = displayNameDraft.trim();
    if (trimmed.length < 2) {
      setDisplayNameError("Inserisci almeno 2 caratteri.");
      return;
    }

    try {
      setDisplayNameSaving(true);
      setDisplayNameError(null);
      const { getSupabaseClient } = await import("@/lib/supabaseClient");
      const client = getSupabaseClient();
      const { data } = await client.auth.getUser();
      const user = data?.user || null;
      if (!user) {
        setDisplayNameError("Sessione non valida. Ricarica la pagina.");
        return;
      }

      const meta = user.user_metadata || {};
      const first = meta.first_name || meta.firstName || "";
      const last = meta.last_name || meta.lastName || "";
      const fullName = meta.full_name || `${first} ${last}`.trim() || null;

      const { error } = await client.auth.updateUser({
        data: {
          ...meta,
          display_name: trimmed,
          full_name: fullName,
        },
      });

      if (error) {
        setDisplayNameError(error.message || "Errore nel salvataggio del nome utente.");
        return;
      }

      const refreshed = await client.auth.getUser();
      const nextUser = refreshed.data?.user || {
        ...user,
        user_metadata: {
          ...meta,
          display_name: trimmed,
          full_name: fullName,
        },
      };

      if ((window as any).__approvedSession) {
        (window as any).__approvedSession = {
          ...(window as any).__approvedSession,
          user: nextUser,
        };
      }
      if ((window as any).flowAuth?.setUserMetadata) {
        (window as any).flowAuth.setUserMetadata(nextUser.user_metadata || {});
      }

      setDisplayNamePromptOpen(false);
      setDisplayNameError(null);
    } catch (error: any) {
      console.warn("[HomePage] Unable to save display name", error);
      setDisplayNameError(error?.message || "Errore nel salvataggio del nome utente.");
    } finally {
      setDisplayNameSaving(false);
    }
  };

  const html = `<div class="app">
  <aside class="sidebar">
    <div class="logo" data-i18n="app.name">Approved</div>
    <button id="newProjectBtn" class="primary-btn full" data-i18n="sidebar.newProject">+ New project</button>

    <div class="sidebar-section">
      <div class="tabs">
        <button class="tab-btn active" data-tab="my-projects" data-i18n="sidebar.myProjects">
          My projects
        </button>
        <button class="tab-btn" data-tab="shared-with-me" data-i18n="sidebar.sharedWithMe">
          Shared with me
        </button>
      </div>

      <div id="my-projects-tab" class="tab-content active">
        <ul id="projectList" class="project-list">
          <li class="project-item empty" data-i18n="sidebar.noProjects">
            No projects yet. Click "New project".
          </li>
        </ul>
      </div>

      <div id="shared-with-me-tab" class="tab-content">
        <ul id="sharedProjectList" class="project-list">
          <li class="project-item empty" data-i18n="sidebar.noSharedProjects">
            No shared projects yet.
          </li>
        </ul>
      </div>
    </div>

    <!-- Language Selector -->
    <div class="sidebar-section small">
      <div class="language-selector">
        <label for="languageSelect" class="language-label" data-i18n="lang.select">Language</label>
        <select id="languageSelect" class="language-select">
          <option value="en" data-i18n="lang.en">English</option>
          <option value="it" data-i18n="lang.it">Italiano</option>
        </select>
      </div>
    </div>
  </aside>

  <div id="sidebarResizer" class="panel-resizer sidebar-resizer"></div>

  <main class="main">
    <header class="topbar">
      <div class="project-header-left">
        <div class="project-title-row">
          <div id="projectTitle" class="project-title" data-i18n-default="header.noProject">No project</div>
          <button
            id="projectMenuBtn"
            class="icon-btn"
            type="button"
            title="Project options"
            data-i18n-title="header.projectOptions"
            style="display: none"
          >
            ⋯
          </button>
        </div>
        <div id="projectMeta" class="project-meta" data-i18n-default="header.getStarted">
          Click "New project" to get started
        </div>
      </div>
      <div class="topbar-actions">
        <!-- NOTIFICATION BELL -->
        <div id="notifBellWrap" class="download-dropdown notif-dropdown">
          <button id="notifBellBtn" class="ghost-btn icon-btn notif-bell-btn" type="button">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span id="notifBadge" class="notif-badge" style="display:none">0</span>
          </button>
          <div id="notifPanel" class="download-menu notif-panel" style="display:none">
            <div id="notifList"></div>
          </div>
        </div>
        <button id="myAccountBtn" class="ghost-btn" data-i18n="header.myAccount" onclick="window.location.href='/account'">
          My account
        </button>
      </div>
    </header>

    <section class="content notes-panel-container">
      <!-- LEFT COLUMN -->
      <div class="left-column">
        <!-- PROJECT REFERENCES -->
        <div class="section-stack">
          <div class="naming-options standalone">
            <label class="rename-toggle">
              <input type="checkbox" id="autoRenameToggle" />
                <span data-i18n="upload.autoRename">Auto rename files</span>
            </label>
            <div class="naming-presets-container">
              <div class="preset-group">
                <span class="level-label" data-i18n="upload.scheme">Scheme:</span>
                <div class="preset-pills">
                  <button type="button" class="scheme-btn active" data-naming-scheme="media" data-i18n="upload.media">Media</button>
                  <button type="button" class="scheme-btn" data-naming-scheme="cinema" data-i18n="upload.cinema">Cinema</button>
              </div>
            </div>
          </div>
          <div class="preset-group" id="videoQualitySettingGroup" style="display:none">
            <span class="level-label" data-i18n="upload.videoQualityLabel">Video:</span>
            <div class="preset-pills">
              <span id="videoQualityCurrentLabel" style="font-size:12px;color:var(--text);margin-right:4px">—</span>
              <button type="button" class="scheme-btn" id="videoQualityResetBtn" data-i18n="upload.changeQuality" style="font-size:11px;padding:4px 10px">Modifica</button>
            </div>
          </div>
        </div>

          <!-- PROJECT REFERENCES -->
          <div class="section-card refs-section">
            <div class="section-card-header">
              <div class="section-card-top">
                <h2 data-i18n="refs.title">Project references</h2>
                <div class="section-card-actions">
                  <span id="refsCountBadge" class="section-badge muted">--</span>
                  <button id="refsToggleBtn" class="ghost-btn tiny" data-i18n="refs.show">
                    Show
                  </button>
                </div>
              </div>
              <div id="refsSubtitle" class="section-subtitle" data-i18n="refs.subtitle">
                Upload script, storyboard, temp tracks, brief...
              </div>
            </div>
            <div id="refsBody" class="refs-body section-card-body">
              <div id="refsDropzone" class="card-dropzone disabled" data-drop-type="refs">
                <span class="dropzone-icon">📎</span>
                <span data-i18n="refs.dropHere">Drop reference files here</span>
              </div>
              <div
                id="refsList"
                class="cue-list cue-list-empty"
                data-i18n-default="refs.noFiles"
              >
                No reference files for this project.
              </div>
            </div>
          </div>

          <!-- CUE LIST -->
          <div class="section-card cues-section">
            <div class="section-card-header">
              <div class="section-card-top">
                <h2 data-i18n="cues.title">Project cues</h2>
                <div class="section-card-actions">
                  <span id="cuesCountBadge" class="section-badge muted">--</span>
                  <button id="cuesToggleBtn" class="ghost-btn tiny" data-i18n="cues.show">
                    Show
                  </button>
                </div>
              </div>
              <div
                id="cueListSubtitle"
                class="section-subtitle"
                data-i18n="cues.subtitle"
              >
                Manage cues and versions for each deliverable.
              </div>
            </div>
            <div id="cuesBody" class="section-card-body">
              <div id="cuesDropzone" class="card-dropzone disabled" data-drop-type="cues">
                <span class="dropzone-icon">🎵</span>
                <span data-i18n="upload.dropHere">Drop media here</span>
              </div>
              <div id="cueList" class="cue-list cue-list-empty" data-i18n-default="cues.noCues">
                No project. Click "New project" to get started.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PROJECT NOTES MODAL -->
      <div id="projectNotesModal" class="modal-overlay" style="display: none;">
        <div class="modal-content notes-modal">
          <div class="modal-header">
            <h2 data-i18n="modal.projectNotes">Project Notes</h2>
            <button id="closeProjectNotesModal" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div id="projectNotesList" class="project-notes-list">
              <div class="notes-empty-state" data-i18n="notes.noNotes">No notes for this project</div>
            </div>
            <form id="projectNoteForm" class="project-note-form">
              <textarea
                id="projectNoteInput"
                data-i18n-placeholder="modal.addNotePlaceholder"
                placeholder="Write a note for the team..."
                rows="3"
              ></textarea>
              <button type="submit" class="primary-btn small" data-i18n="notes.addNote">Add note</button>
            </form>
          </div>
        </div>
      </div>

      <!-- MARKERS EXPORT MODAL -->
      <div id="markersExportModal" class="modal-overlay" style="display: none;">
        <div class="modal-content markers-modal">
          <div class="modal-header">
            <h2 data-i18n="markers.title">Export markers</h2>
            <button id="closeMarkersExportModal" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <label class="modal-field">
              <span data-i18n="markers.format">Format</span>
              <select id="markersFormatSelect" class="modal-select">
                <option value="universal_csv">Universal CSV</option>
                <option value="reaper_tsv">Reaper (TXT/TSV)</option>
                <option value="audition_tsv">Audition (TSV)</option>
              </select>
            </label>
            <label class="modal-field">
              <span data-i18n="markers.fps">FPS</span>
              <select id="markersFpsSelect" class="modal-select">
                <option value="24">24</option>
                <option value="25" selected>25</option>
                <option value="29.97">29.97</option>
                <option value="30">30</option>
              </select>
            </label>
            <label class="modal-field">
              <span data-i18n="markers.startTc">Start timecode</span>
              <input id="markersStartTcInput" type="text" value="00:00:00.000" />
            </label>
            <label class="modal-checkbox">
              <input id="markersIncludeVoice" type="checkbox" />
              <span data-i18n="markers.includeVoice">Include voice comment links</span>
            </label>
          </div>
          <div class="modal-footer">
            <button id="exportMarkersConfirmBtn" class="primary-btn small" data-i18n="markers.export">Export</button>
          </div>
        </div>
      </div>

      <!-- APPROVAL MODAL -->
      <div id="approvalModal" class="modal-overlay" style="display: none;">
        <div class="modal-content approval-modal">
          <div class="modal-header">
            <h2 data-i18n="approval.title">Approve version</h2>
            <button id="closeApprovalModal" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <label class="modal-field">
              <span data-i18n="approval.note">Approval note</span>
              <textarea id="approvalNoteInput" rows="3" placeholder="Optional note..."></textarea>
            </label>
            <label class="modal-field">
              <span data-i18n="approval.changelog">Changelog (vs previous)</span>
              <textarea id="approvalChangelogInput" rows="3" placeholder="What changed since the previous version?"></textarea>
            </label>
          </div>
          <div class="modal-footer">
            <button id="confirmApprovalBtn" class="primary-btn small" data-i18n="approval.confirm">Approve</button>
          </div>
        </div>
      </div>

      <!-- APPROVAL PACK MODAL -->
      <div id="approvalPackModal" class="modal-overlay" style="display: none;">
        <div class="modal-content approval-pack-modal">
          <div class="modal-header">
            <h2 data-i18n="approval.packTitle">Approval pack</h2>
            <button id="closeApprovalPackModal" class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <label class="modal-checkbox">
              <input id="approvalPackIncludeMedia" type="checkbox" />
              <span data-i18n="approval.includeMedia">Include media file in zip</span>
            </label>
            <label class="modal-checkbox">
              <input id="approvalPackIncludeVoice" type="checkbox" />
              <span data-i18n="approval.includeVoice">Include voice comment links</span>
            </label>
            <label class="modal-field">
              <span data-i18n="approval.fps">FPS</span>
              <select id="approvalPackFpsSelect" class="modal-select">
                <option value="24">24</option>
                <option value="25" selected>25</option>
                <option value="29.97">29.97</option>
                <option value="30">30</option>
              </select>
            </label>
            <label class="modal-field">
              <span data-i18n="approval.startTc">Start timecode</span>
              <input id="approvalPackStartTcInput" type="text" value="00:00:00.000" />
            </label>
          </div>
          <div class="modal-footer">
            <button id="downloadApprovalPackConfirmBtn" class="primary-btn small" data-i18n="approval.download">Download pack</button>
          </div>
        </div>
      </div>

      <!-- CUE SHEET MODAL -->
      <div id="cueSheetModal" class="modal-overlay" style="display: none;">
        <div class="modal-content cue-sheet-modal">
          <div class="modal-header">
            <h2 data-i18n="cueSheet.title">Cue sheet</h2>
            <button id="closeCueSheetModal" class="modal-close">&times;</button>
          </div>
          <div class="modal-body cue-sheet-body">
            <div class="cue-sheet-section">
              <h4 data-i18n="cueSheet.projectMeta">Project metadata</h4>
              <label class="modal-field">
                <span data-i18n="cueSheet.production">Production</span>
                <input id="cueSheetProduction" type="text" />
              </label>
              <label class="modal-field">
                <span data-i18n="cueSheet.client">Client</span>
                <input id="cueSheetClient" type="text" />
              </label>
              <label class="modal-field">
                <span data-i18n="cueSheet.episode">Episode</span>
                <input id="cueSheetEpisode" type="text" />
              </label>
            </div>
            <div class="cue-sheet-section">
              <h4 data-i18n="cueSheet.cueMeta">Cue data</h4>
              <label class="modal-field">
                <span data-i18n="cueSheet.selectCue">Cue</span>
                <select id="cueSheetCueSelect" class="modal-select"></select>
              </label>
              <label class="modal-field">
                <span data-i18n="cueSheet.workTitle">Work title</span>
                <input id="cueSheetWorkTitle" type="text" />
              </label>
              <label class="modal-field">
                <span data-i18n="cueSheet.composers">Composer(s)</span>
                <input id="cueSheetComposers" type="text" />
              </label>
              <label class="modal-field">
                <span data-i18n="cueSheet.publishers">Publisher(s)</span>
                <input id="cueSheetPublishers" type="text" />
              </label>
              <label class="modal-field">
                <span data-i18n="cueSheet.pro">PRO</span>
                <input id="cueSheetPro" type="text" />
              </label>
              <label class="modal-field">
                <span data-i18n="cueSheet.usage">Usage type</span>
                <input id="cueSheetUsage" type="text" />
              </label>
              <label class="modal-field">
                <span data-i18n="cueSheet.startTc">Start timecode</span>
                <input id="cueSheetStartTc" type="text" />
              </label>
              <label class="modal-field">
                <span data-i18n="cueSheet.duration">Duration</span>
                <input id="cueSheetDuration" type="text" />
              </label>
              <label class="modal-field">
                <span data-i18n="cueSheet.notes">Notes</span>
                <textarea id="cueSheetNotes" rows="3"></textarea>
              </label>
            </div>
          </div>
          <div class="modal-footer cue-sheet-footer">
            <button id="cueSheetSaveBtn" class="primary-btn small" data-i18n="cueSheet.save">Save</button>
            <button id="cueSheetExportCsvBtn" class="ghost-btn small" data-i18n="cueSheet.exportCsv">Export CSV</button>
            <button id="cueSheetExportPdfBtn" class="ghost-btn small" data-i18n="cueSheet.exportPdf">Export PDF</button>
          </div>
        </div>
      </div>


      <!-- RIGHT COLUMN -->
      <div class="right-column">
        <div class="player-card">
          <div class="player-title-row">
            <div id="playerTitle" class="player-title" data-i18n-default="player.noVersion">
              No version selected
            </div>
            <span id="playerBadge" class="player-badge" data-status="" data-i18n-default="player.noMedia">
              No media
            </span>
          </div>

          <div id="playerMedia" class="player-preview">
            <div class="player-placeholder" data-i18n="player.placeholder">
              Create a project and drop a file to see the player.
            </div>
          </div>

          <div class="player-controls">
            <button id="playPauseBtn" class="primary-btn small" disabled data-i18n="player.play">
              Play
            </button>
            <!-- VOLUME SLIDER AUDIO ONLY -->
            <input
              id="volumeSlider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="1"
              class="volume-slider"
            />
            <span id="timeLabel" class="time">--:-- / --:--</span>
          </div>

          <!-- VERSION STATUS BUTTONS -->
          <div class="status-controls">
            <button id="statusInReviewBtn" class="ghost-btn tiny" data-i18n="player.inReview">
              In review
            </button>
            <button id="statusApprovedBtn" class="ghost-btn tiny" data-i18n="player.approved">
              Approved
            </button>
          </div>

        </div>

          <div class="comments-card">
            <div class="comments-header">
              <h3 data-i18n="comments.title">Comments</h3>
              <div class="comments-header-actions">
                <span id="commentsSummary" class="tag small" data-i18n="comments.noComments">No comments</span>
              </div>
            </div>
            <div id="reviewStatusMessage" class="review-status-message"></div>
            <ul id="commentsList" class="comments-list"></ul>

            <div class="review-actions">
              <button id="reviewCompleteBtn" class="ghost-btn small" data-i18n="review.completeCta">
                Ho finito di commentare
              </button>
              <button id="startRevisionBtn" class="ghost-btn small" data-i18n="review.startRevisionCta">
                Start revision
              </button>
            </div>

            <div class="decision-actions">
              <button id="approveVersionBtn" class="primary-btn small" data-i18n="review.approveCta">
                Approva
              </button>
              <button id="requestChangesBtn" class="ghost-btn small" data-i18n="review.requestChangesCta">
                Richiedi modifiche
              </button>
            </div>
            <div class="approval-pack-actions">
              <button id="downloadApprovalPackBtn" class="ghost-btn small" data-i18n="review.downloadApprovalPack" style="display: none;">
                Download Approval Pack
              </button>
            </div>

            <div class="comment-input">
              <input
                id="commentInput"
                type="text"
                data-i18n-placeholder="comments.addPlaceholder"
                placeholder="Add a comment (auto timecode)…"
              />
              <button id="voiceRecordBtn" class="icon-btn small" title="Record voice comment" aria-label="Record voice comment">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
              <button id="addCommentBtn" class="primary-btn small" disabled data-i18n="comments.send">
                Send
              </button>
            </div>
          </div>

          <div class="delivery-card final-delivery-card">
            <div class="delivery-header">
              <h3 data-i18n="finalDelivery.title">Final delivery</h3>
              <span id="finalDeliveryStatusBadge" class="tag small" data-i18n="finalDelivery.emptyBadge">No files</span>
            </div>
            <div class="delivery-body">
              <div id="finalDeliveryOwner" class="final-delivery-owner">
                <div id="finalDeliveryDropzone" class="card-dropzone disabled">
                  <span class="dropzone-icon">📦</span>
                  <span data-i18n="finalDelivery.dropHere">Drop final delivery files here</span>
                </div>
                <div id="finalDeliveryList" class="final-delivery-list"></div>
              </div>
              <div id="finalDeliveryCollaborator" class="final-delivery-collab" style="display: none;">
                <button id="finalDeliveryDownloadBtn" class="primary-btn small" disabled data-i18n="finalDelivery.download">
                  Download final delivery
                </button>
                <div id="finalDeliveryEmptyHint" class="final-delivery-empty" data-i18n="finalDelivery.emptyHint">
                  No final delivery yet.
                </div>
              </div>
            </div>
          </div>

          <div class="share-card">
            <div class="share-tabs">
              <button class="share-tab-btn active" data-share-tab="link" data-i18n="share.tabLink">
                Link
              </button>
              <button class="share-tab-btn" data-share-tab="people" data-i18n="share.tabPeople">
                Shared with
              </button>
            </div>
            <div id="share-link-panel" class="share-tab-panel active">
              <div class="share-row">
                <div>
                  <strong data-i18n="share.clientLink">Client link</strong>
                  <div class="share-meta" data-i18n="share.clientHint">
                    Only the project owner can generate this link. Recipients can listen, comment and approve without an account.
                  </div>
                </div>
                <button id="copyLinkBtn" class="ghost-btn small" disabled data-i18n="share.copyLink">
                  Copy client link
                </button>
              </div>
            </div>
            <div id="share-people-panel" class="share-tab-panel">
              <div id="sharePeopleHint" class="share-meta" data-i18n="share.peopleHint">
                Only project owners can see this list.
              </div>
              <div class="share-invite-row">
                <input
                  id="shareInviteEmail"
                  class="share-invite-input"
                  type="email"
                  placeholder="name@email.com"
                  data-i18n-placeholder="share.invitePlaceholder"
                />
                <select id="shareInviteRole" class="share-invite-select">
                  <option value="viewer" data-i18n="share.inviteRoleViewer">Viewer</option>
                  <option value="editor" data-i18n="share.inviteRoleEditor">Editor</option>
                </select>
                <button id="shareInviteBtn" class="ghost-btn small" type="button" data-i18n="share.inviteSend">
                  Send invite
                </button>
              </div>
              <div id="shareInviteMessage" class="share-meta"></div>
              <ul id="sharedWithList" class="share-people-list">
                <li class="share-empty" data-i18n="share.peopleEmpty">Not shared yet.</li>
              </ul>
            </div>
          </div>
        </div>
        <div id="columnResizer" class="panel-resizer column-resizer"></div>
      </section>
    </main>
  </div>
  `;

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f8f9ff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid #e5e7eb',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Show landing page if not logged in
  if (!isLoggedIn) {
    return <LandingContent />;
  }

  // Show app if logged in
  return (
    <>
      <Script
        id="initialize-stub"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            // Ensure initializer stubs exist early to avoid race when scripts load.
            // Set __flowInitializing = true immediately so flow-init.js never
            // calls initializeFromSupabase before page.tsx boot() runs initAuth.
            window.__flowInitializing = true;
            window.initializeFromSupabase = window.initializeFromSupabase || (async function(){
              console.warn('[InitStub] initializeFromSupabase called before implementation');
            });
            window.safeFetchProjectsFallback = window.safeFetchProjectsFallback || (async function(){
              console.warn('[InitStub] safeFetchProjectsFallback called before implementation');
              try {
                const res = await fetch('/api/projects?debug=1', { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
                if (res.ok) return res.json();
              } catch (e) {
                console.warn('[InitStub] fallback fetch failed', e);
              }
            });
          `,
        }}
      />
      <LegacyAppShell html={html} />
      
      {/* Share Modal */}
      {shareData && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          projectId={shareData.projectId}
          projectName={shareData.projectName}
          teamId={shareData.teamId}
        />
      )}

      <DisplayNamePrompt
        isOpen={displayNamePromptOpen}
        value={displayNameDraft}
        saving={displayNameSaving}
        error={displayNameError}
        onChange={setDisplayNameDraft}
        onSubmit={handleDisplayNameSubmit}
      />

      <Script src="/vendor/wavesurfer.min.js?v=6.6.4" strategy="afterInteractive" />
      <Script src="/i18n.js?v=13" strategy="afterInteractive" />
      <Script src="/flow-auth.js?v=10" strategy="afterInteractive" />
      <Script src="/share-handler.js?v=9" strategy="afterInteractive" />
      <Script
        src="/flow.js?v=16"
        strategy="afterInteractive"
        onLoad={() => {
          const boot = async () => {
            // Gestisci pending share/invite
            try {
              const pendingShare = localStorage.getItem('pending_share');
              if (pendingShare) {
                localStorage.removeItem('pending_share');
                try {
                  const p = JSON.parse(pendingShare);
                  if (p?.share_id) {
                    const t = p.token ? `?token=${encodeURIComponent(p.token)}` : '';
                    window.location.href = `/share/${p.share_id}${t}`;
                    return;
                  }
                } catch { window.location.href = `/share/${pendingShare}`; return; }
              }
              const pendingInvite = localStorage.getItem('pending_invite');
              if (pendingInvite) {
                localStorage.removeItem('pending_invite');
                window.location.href = `/invite/${pendingInvite}`;
                return;
              }
            } catch {}

            // Avvia bootstrap — flag per evitare doppio fetch da flow-init.js
            (window as any).__flowInitializing = true;

            // Completa auth prima di caricare i progetti — il token in cache potrebbe
            // essere scaduto e initializeFromSupabase ha bisogno di un token fresco.
            if (typeof (window as any).flowAuth?.initAuth === 'function') {
              try {
                await (window as any).flowAuth.initAuth((window as any).__approvedSession);
              } catch (error: any) {
                console.warn('[PageInit] flowAuth.initAuth failed', error);
              }
            } else {
              console.warn('[PageInit] flowAuth.initAuth not found');
            }

            if (typeof (window as any).initializeFromSupabase === 'function') {
              (window as any).initializeFromSupabase();
            } else if (typeof (window as any).safeFetchProjectsFallback === 'function') {
              (window as any).safeFetchProjectsFallback();
            }
          };

          // Avvia subito se supabaseClient è già pronto, altrimenti aspetta l'evento
          if ((window as any).supabaseClient) {
            boot();
          } else {
            window.addEventListener('supabase-client-ready', () => boot(), { once: true });
            setTimeout(() => {
              if (!(window as any).supabaseClient) {
                console.error('[PageInit] supabase-client-ready mai ricevuto dopo 5s');
              }
            }, 5000);
          }
        }}
      />
      <Script src="/flow-init.js" strategy="afterInteractive" />
    </>
  );
}
