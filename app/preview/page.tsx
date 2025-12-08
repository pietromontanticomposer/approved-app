"use client";

import Script from "next/script";

const html = `
<div class="app">
  <aside class="sidebar">
    <div class="logo">Approved</div>
    <button id="newProjectBtn" class="primary-btn full">+ New project</button>

    <div class="sidebar-section">
      <h3>Projects</h3>
      <ul id="projectList" class="project-list">
        <li class="project-item empty">
          No projects yet. Click "New project".
        </li>
      </ul>
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
        <button id="shareBtn" class="ghost-btn" disabled>Share link</button>
        <button id="deliverBtn" class="primary-btn" disabled>
          Generate delivery
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
                Upload script, storyboard, temp tracks, brief.
              </div>
            </div>
            <button id="refsToggleBtn" class="ghost-btn tiny" type="button">
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

        <!-- CUES -->
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
              type="button"
            >
              Review versions
            </button>
            <button
              id="modeRefsBtn"
              class="ghost-btn tiny player-mode-btn"
              type="button"
            >
              Project references
            </button>
          </div>

          <div class="player-title-row">
            <div id="playerTitle" class="player-title">
              No version selected
            </div>
            <span
              id="playerBadge"
              class="player-badge"
              data-status=""
            >
              No media
            </span>
          </div>

          <div id="playerMedia" class="player-preview">
            <div class="player-placeholder">
              Create a project and drop a file to see the player.
            </div>
          </div>

          <div class="player-controls">
            <button
              id="playPauseBtn"
              class="primary-btn small"
              type="button"
              disabled
            >
              Play
            </button>
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

          <div class="status-controls">
            <button id="statusInReviewBtn" class="ghost-btn tiny" type="button">
              In review
            </button>
            <button id="statusApprovedBtn" class="ghost-btn tiny" type="button">
              Approved
            </button>
            <button id="statusChangesBtn" class="ghost-btn tiny" type="button">
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
            <button id="addCommentBtn" class="primary-btn small" type="button" disabled>
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
            <button id="copyLinkBtn" class="ghost-btn small" type="button" disabled>
              Copy demo link
            </button>
          </div>
        </div>
      </div>
    </section>
  </main>
</div>
`;

export default function LegacyPage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <link rel="stylesheet" href="/flow.css" />
      {/* Load WaveSurfer before our script (CDN v6.6.4) */}
      <Script src="https://unpkg.com/wavesurfer.js@6.6.4/dist/wavesurfer.min.js" strategy="beforeInteractive" />
      <Script src="/flow.js" strategy="afterInteractive" />
    </>
  );
}
