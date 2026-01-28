// app/page.tsx
"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import ShareModal from "./components/ShareModal";

// Force rebuild - Jan 8 2026 - v8 - Enhanced error logging for Supabase Storage

export default function Page() {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState<{
    projectId: string;
    projectName: string;
    teamId: string;
  } | null>(null);

  useEffect(() => {
    console.log("Home page mounted - initializing Supabase client");
    // Reset sign-out flag on fresh page load to allow bootstrap
    (window as any).__isSigningOut = false;

    // Initialize supabase client immediately
    const initSupabase = async () => {
      const { getSupabaseClient } = await import("@/lib/supabaseClient");
      const client = getSupabaseClient();
      (window as any).supabaseClient = client;
      console.log('[HomePage] Supabase client ready:', !!client);
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
  }, []);

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
        <button id="cueSheetBtn" class="ghost-btn" data-i18n="header.cueSheet">
          Cue sheet
        </button>
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
                <span class="level-label">Scenario:</span>
                <div class="preset-pills">
                  <button type="button" class="scheme-btn active" data-naming-scheme="media">Media</button>
                  <button type="button" class="scheme-btn" data-naming-scheme="cinema">Cinema</button>
              </div>
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

      <!-- ONBOARDING OVERLAY -->
      <div id="onboardingOverlay" class="onboarding-overlay" style="display: none;">
        <div class="onboarding-card">
          <div id="onboardingStepTitle" class="onboarding-title">Welcome</div>
          <div id="onboardingStepText" class="onboarding-text">Step content</div>
          <div class="onboarding-actions">
            <button id="onboardingPrevBtn" class="ghost-btn tiny">Back</button>
            <button id="onboardingNextBtn" class="primary-btn tiny">Next</button>
            <button id="onboardingDismissBtn" class="ghost-btn tiny">Skip</button>
          </div>
          <label class="onboarding-checkbox">
            <input id="onboardingDontShow" type="checkbox" />
            <span>Non mostrare più</span>
          </label>
          <button id="onboardingShowAgainBtn" class="ghost-btn tiny">Mostra di nuovo</button>
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
                <button id="exportMarkersBtn" class="ghost-btn tiny" data-i18n="comments.exportMarkers">Export markers</button>
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

          <div class="delivery-card">
            <div class="delivery-header">
              <h3 data-i18n="delivery.title">Delivery</h3>
              <span id="deliveryTemplateBadge" class="tag small" data-i18n="delivery.noTemplate">No template</span>
            </div>
            <div class="delivery-body">
              <select id="deliveryTemplateSelect" class="delivery-select">
                <option value="">Select template…</option>
                <option value="adv">ADV / Advertising</option>
                <option value="film_tv">Film / TV</option>
                <option value="social">Social</option>
              </select>
              <div id="deliveryChecklist" class="delivery-checklist"></div>
              <div class="delivery-naming">
                <div class="delivery-naming-title" data-i18n="delivery.naming">Naming helper</div>
                <div id="deliveryNamingList" class="delivery-naming-list"></div>
              </div>
              <button id="generateManifestBtn" class="ghost-btn small" data-i18n="delivery.generateManifest">Generate manifest</button>
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
                    They can listen, comment and approve without an account.
                  </div>
                </div>
                <button id="copyLinkBtn" class="ghost-btn small" disabled data-i18n="share.copyLink">
                  Copy demo link
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

  return (
    <>
      <Script
        id="initialize-stub"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            // Ensure initializer stubs exist early to avoid race when scripts load
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
      <div dangerouslySetInnerHTML={{ __html: html }} />
      
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

      <Script
        src="https://unpkg.com/@supabase/supabase-js@2"
        strategy="beforeInteractive"
      />
      <Script
        src="https://unpkg.com/wavesurfer.js@6"
        strategy="beforeInteractive"
      />
      <Script src="/i18n.js?v=8" strategy="afterInteractive" />
      <Script src="/flow-auth.js?v=8" strategy="afterInteractive" />
      <Script src="/share-handler.js?v=8" strategy="afterInteractive" />
      <Script
        src="/flow.js?v=8"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('[PageInit] Scripts loaded');
          
          // Wait for supabaseClient to be ready, then init auth
          const waitForSupabase = setInterval(async () => {
            if ((window as any).supabaseClient) {
              clearInterval(waitForSupabase);
              console.log('[PageInit] Supabase ready, initializing auth...');
              
              if ((window as any).flowAuth && typeof (window as any).flowAuth.initAuth === 'function') {
                const ready = await (window as any).flowAuth.initAuth();
                if (!ready) {
                  console.log('[PageInit] Auth failed - will redirect to login');
                } else {
                  console.log('[PageInit] ✅ Auth successful, app loaded');

                  // If there's a pending share/invite from login redirect, consume it first
                  try {
                    const pendingShare = localStorage.getItem('pending_share');
                    if (pendingShare) {
                      localStorage.removeItem('pending_share');
                      try {
                        const p = JSON.parse(pendingShare);
                        if (p && p.share_id) {
                          const t = p.token ? `?token=${encodeURIComponent(p.token)}` : '';
                          window.location.href = `/share/${p.share_id}${t}`;
                          return;
                        }
                      } catch {
                        window.location.href = `/share/${pendingShare}`;
                        return;
                      }
                    }
                    const pendingInvite = localStorage.getItem('pending_invite');
                    if (pendingInvite) {
                      localStorage.removeItem('pending_invite');
                      window.location.href = `/invite/${pendingInvite}`;
                      return;
                    }
                  } catch (e) {
                    console.warn('[PageInit] Error checking pending share/invite', e);
                  }

                  // Defer heavy bootstrap until auth is ready
                  // Try to call the main initializer; if not present, attempt
                  // the safe fallback exposed by `flow-init.js`. If neither is
                  // available yet, wait briefly and retry for robustness.
                  const callInitOrFallback = async () => {
                    if (typeof (window as any).initializeFromSupabase === 'function') {
                      console.log('[PageInit] Calling initializeFromSupabase...');
                      (window as any).initializeFromSupabase();
                      return;
                    }

                    if (typeof (window as any).safeFetchProjectsFallback === 'function') {
                      console.log('[PageInit] initializeFromSupabase not found - calling safeFetchProjectsFallback');
                      try {
                        await (window as any).safeFetchProjectsFallback();
                        return;
                      } catch (e) {
                        console.warn('[PageInit] safeFetchProjectsFallback failed', e);
                      }
                    }

                    // Retry a couple of times in case scripts are still loading
                    for (let i = 0; i < 6; i++) {
                      await new Promise(r => setTimeout(r, 250));
                      if (typeof (window as any).initializeFromSupabase === 'function') {
                        console.log('[PageInit] initializeFromSupabase became available - calling it');
                        (window as any).initializeFromSupabase();
                        return;
                      }
                    }

                    console.warn('[PageInit] initializeFromSupabase NOT FOUND after retries');
                  };

                  callInitOrFallback().catch(e => console.error('[PageInit] init/fallback error', e));
                }
              } else {
                console.error('[PageInit] flowAuth.initAuth not found');
              }
            }
          }, 50);
          
          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(waitForSupabase);
            if (!(window as any).supabaseClient) {
              console.error('[PageInit] Supabase client not ready after 5s');
            }
          }, 5000);
        }}
      />
      <Script src="/flow-init.js" strategy="afterInteractive" />
    </>
  );
}
