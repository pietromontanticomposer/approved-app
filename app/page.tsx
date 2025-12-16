// app/page.tsx
"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import ShareModal from "./components/ShareModal";

// Force rebuild - Dec 12 2025

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
    <div class="logo">Approved</div>
    <button id="newProjectBtn" class="primary-btn full">+ New project</button>

    <div class="sidebar-section">
      <div class="tabs">
        <button class="tab-btn active" data-tab="my-projects">
          I miei progetti
        </button>
        <button class="tab-btn" data-tab="shared-with-me">
          Condivisi con me
        </button>
      </div>

      <div id="my-projects-tab" class="tab-content active">
        <ul id="projectList" class="project-list">
          <li class="project-item empty">
            No projects yet. Click "New project".
          </li>
        </ul>
      </div>

      <div id="shared-with-me-tab" class="tab-content">
        <ul id="sharedProjectList" class="project-list">
          <li class="project-item empty">
            No shared projects yet.
          </li>
        </ul>
      </div>
    </div>
  </aside>

  <main class="main">
    <header class="topbar">
      <div class="project-header-left">
        <div class="project-title-row">
          <div id="projectTitle" class="project-title">No project</div>
          <button
            id="projectMenuBtn"
            class="icon-btn"
            type="button"
            title="Project options"
            style="display: none"
          >
            ⋯
          </button>
        </div>
        <div id="projectMeta" class="project-meta">
          Click "New project" to get started
        </div>
      </div>
      <div class="topbar-actions">
        <button id="accountBtn" class="ghost-btn" onclick="window.location.href='/account'">
          Il mio account
        </button>
      </div>
    </header>

    <section class="upload-strip">
      <div id="globalDropzone" class="dropzone disabled">
        <strong>Drop media here</strong>
        <span>Create a project to start.</span>
      </div>

      <div class="naming-options">
        <label class="rename-toggle">
          <input type="checkbox" id="autoRenameToggle" />
          <span>Auto rename files (composer preset)</span>
        </label>
        <div class="naming-levels">
          <span class="level-label">Scheme:</span>
          <label class="level-option">
            <input type="radio" name="namingLevel" value="media" checked />
            <span>Media</span>
          </label>
          <label class="level-option">
            <input type="radio" name="namingLevel" value="cinema" />
            <span>Cinema</span>
          </label>
        </div>
      </div>
    </section>

    <section class="content">
      <!-- LEFT COLUMN -->
      <div class="left-column">
        <!-- PROJECT REFERENCES -->
        <div class="refs-card">
          <div class="refs-header">
            <div>
              <h2>Project references</h2>
              <div id="refsSubtitle" class="refs-subtitle">
                Upload script, storyboard, temp tracks, brief...
              </div>
            </div>
            <button id="refsToggleBtn" class="ghost-btn tiny">
              Show
            </button>
          </div>

          <div id="refsBody" class="refs-body">
            <div id="refsDropzone" class="refs-dropzone disabled">
              <strong>Drop reference files here</strong>
              <span>PDF, images, audio, video, zip…</span>
            </div>
            <div id="refsList" class="refs-list refs-list-empty">
              No reference files for this project.
            </div>
          </div>
        </div>

        <!-- CUE -->
        <h2>Project cues</h2>
        <div id="cueListSubtitle" class="cue-list-subtitle">
          No project yet. Click "New project".
        </div>
        <div id="cueList" class="cue-list cue-list-empty">
          No project. Click "New project" to get started.
        </div>
      </div>

      <!-- RIGHT COLUMN -->
      <div class="right-column">
        <div class="player-card">
          <div class="player-mode-toggle">
            <button
              id="modeReviewBtn"
              class="ghost-btn tiny player-mode-btn active"
            >
              Review versions
            </button>
            <button
              id="modeRefsBtn"
              class="ghost-btn tiny player-mode-btn"
            >
              Project references
            </button>
          </div>

          <div class="player-title-row">
            <div id="playerTitle" class="player-title">
              No version selected
            </div>
            <span id="playerBadge" class="player-badge" data-status="">
              No media
            </span>
          </div>

          <div id="playerMedia" class="player-preview">
            <div class="player-placeholder">
              Create a project and drop a file to see the player.
            </div>
          </div>

          <div class="player-controls">
            <button id="playPauseBtn" class="primary-btn small" disabled>
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
            <button id="statusInReviewBtn" class="ghost-btn tiny">
              In review
            </button>
            <button id="statusApprovedBtn" class="ghost-btn tiny">
              Approved
            </button>
            <button id="statusChangesBtn" class="ghost-btn tiny">
              Changes requested
            </button>
          </div>
        </div>

        <div class="comments-card">
            <div class="comments-header">
              <h3>Comments</h3>
              <span id="commentsSummary" class="tag small">No comments</span>
            </div>
            <ul id="commentsList" class="comments-list"></ul>

            <div class="comment-input">
              <input
                id="commentInput"
                type="text"
                placeholder="Add a comment (auto timecode)…"
              />
              <button id="addCommentBtn" class="primary-btn small" disabled>
                Send
              </button>
            </div>
          </div>

          <div class="share-card">
            <div class="share-row">
              <div>
                <strong>Client link</strong>
                <div class="share-meta">
                  They can listen, comment and approve without an account.
                </div>
              </div>
              <button id="copyLinkBtn" class="ghost-btn small" disabled>
                Copy demo link
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
  `;

  return (
    <>
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
      <Script src="/flow-auth.js" strategy="afterInteractive" />
      <Script src="/share-handler.js" strategy="afterInteractive" />
      <Script 
        src="/flow.js"
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
                      } catch (e) {
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
