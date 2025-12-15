// Flow UI - Complete Implementation
console.log('[Flow] Initializing complete UI...');

// Global state
window.__state = {
  projects: [],
  activeProjectId: null,
  activeCueId: null,
  activeVersionId: null,
  cues: [],
  versions: [],
  comments: [],
  references: [],
  loading: false,
  error: null
};

console.log('[Flow] Created window.__state');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function apiCall(endpoint, options = {}) {
  try {
    // Attach auth / actor headers when available so server can return personalized lists
    const authHeaders = (window.flowAuth && typeof window.flowAuth.getUser === 'function') ? (window.flowAuth.getUser()?.id ? { 'x-actor-id': window.flowAuth.getUser().id } : {}) : {};
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error(`[API] ${endpoint} failed:`, err);
    throw err;
  }
}

function showError(message) {
  console.error('[Error]', message);
  window.__state.error = message;
  const metaEl = document.getElementById('projectMeta');
  if (metaEl) metaEl.textContent = `❌ Error: ${message}`;
}

function clearError() {
  window.__state.error = null;
}

// ============================================================================
// PROJECT SELECTION
// ============================================================================

async function selectProject(projectId, projectName) {
  console.log('[selectProject] Selected:', projectName, projectId);
  
  try {
    clearError();
    window.__state.activeProjectId = projectId;
    window.__state.activeCueId = null;
    window.__state.activeVersionId = null;
    
    // Update header
    const titleEl = document.getElementById('projectTitle');
    if (titleEl) titleEl.textContent = projectName;
    
    // Highlight in sidebar
    document.querySelectorAll('.project-item').forEach(item => {
      if (item.dataset.projectId === projectId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // Load project data
    await Promise.all([
      loadCues(projectId),
      loadReferences(projectId)
    ]);
    
    console.log('[selectProject] ✅ Project selected and loaded');
  } catch (err) {
    showError(err.message);
  }
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadCues(projectId) {
  try {
    console.log('[loadCues] Fetching cues for', projectId);
    const data = await apiCall(`/api/cues?projectId=${projectId}`);
    window.__state.cues = data.cues || [];
    console.log('[loadCues] Loaded', window.__state.cues.length, 'cues');
    await renderCueList();
  } catch (err) {
    console.error('[loadCues] Error:', err);
    window.__state.cues = [];
    renderCueList();
  }
}

async function loadVersions(cueId) {
  try {
    console.log('[loadVersions] Fetching versions for', cueId);
    const data = await apiCall(`/api/versions?cueId=${cueId}`);
    window.__state.versions = data.versions || [];
    console.log('[loadVersions] Loaded', window.__state.versions.length, 'versions');
    if (window.__state.versions.length > 0) {
      await selectVersion(window.__state.versions[0].id, window.__state.versions[0]);
    }
  } catch (err) {
    console.error('[loadVersions] Error:', err);
    window.__state.versions = [];
  }
}

async function loadComments(versionId) {
  try {
    console.log('[loadComments] Fetching comments for', versionId);
    const data = await apiCall(`/api/comments?versionId=${versionId}`);
    window.__state.comments = data.comments || [];
    console.log('[loadComments] Loaded', window.__state.comments.length, 'comments');
    await renderComments();
  } catch (err) {
    console.error('[loadComments] Error:', err);
    window.__state.comments = [];
    renderComments();
  }
}

async function loadReferences(projectId) {
  try {
    console.log('[loadReferences] Fetching references for', projectId);
    const data = await apiCall(`/api/references?projectId=${projectId}`);
    window.__state.references = data.references || [];
    console.log('[loadReferences] Loaded', window.__state.references.length, 'references');
    await renderReferences();
  } catch (err) {
    console.error('[loadReferences] Error:', err);
    window.__state.references = [];
    renderReferences();
  }
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================

function renderProjectList() {
  console.log('[renderProjectList] START');
  
  const myProjectListEl = document.getElementById("myProjectList");
  const sharedProjectListEl = document.getElementById("sharedProjectList");
  
  if (!myProjectListEl || !sharedProjectListEl) {
    console.warn('[renderProjectList] DOM not ready, retrying...');
    setTimeout(renderProjectList, 100);
    return;
  }
  
  const user = window.flowAuth ? window.flowAuth.getUser() : null;
  const userId = user?.id;
  const allProjects = window.__state?.projects || [];
  
  const myProjects = allProjects.filter(p => !p.owner_id || p.owner_id === userId);
  const sharedProjects = allProjects.filter(p => {
    if (!p.owner_id || p.owner_id === userId) return false;
    const members = p.team_members || [];
    return members.some(m => m.user_id === userId);
  });

  // Render my projects
  myProjectListEl.innerHTML = '';
  if (myProjects.length === 0) {
    myProjectListEl.innerHTML = '<li class="project-item empty">Nessun progetto creato.</li>';
  } else {
    myProjects.forEach(p => {
      const li = renderProjectItem(p);
      myProjectListEl.appendChild(li);
    });
  }

  // Render shared projects
  sharedProjectListEl.innerHTML = '';
  if (sharedProjects.length === 0) {
    sharedProjectListEl.innerHTML = '<li class="project-item empty">Nessun progetto condiviso.</li>';
  } else {
    sharedProjects.forEach(p => {
      const li = renderProjectItem(p);
      sharedProjectListEl.appendChild(li);
    });
  }
  
  console.log('[renderProjectList] ✅ COMPLETE');
}

function renderProjectItem(project) {
  const li = document.createElement('li');
  li.className = 'project-item' + (window.__state.activeProjectId === project.id ? ' active' : '');
  li.dataset.projectId = project.id;

  const label = document.createElement('span');
  label.textContent = project.name;

  const dd = document.createElement('div');
  dd.className = 'download-dropdown project-dropdown';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'icon-btn tiny download-toggle';
  btn.textContent = '⋯';

  const menu = document.createElement('div');
  menu.className = 'download-menu';
  menu.innerHTML = `
    <button data-action="rename">Rename</button>
    <button data-action="delete">Delete</button>
  `;

  dd.appendChild(btn);
  dd.appendChild(menu);
  li.appendChild(label);
  li.appendChild(dd);

  li.addEventListener('click', e => {
    if (e.target.closest('.download-dropdown')) return;
    selectProject(project.id, project.name);
  });

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = dd.classList.contains('open');
    document.querySelectorAll('.download-dropdown.open').forEach(x => x.classList.remove('open'));
    if (!open) dd.classList.add('open');
  });

  menu.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      dd.classList.remove('open');
      const action = b.dataset.action;
      if (action === 'rename') {
        const newName = prompt('Rename project', project.name);
        if (newName && newName.trim()) {
          project.name = newName.trim();
          renderProjectList();
        }
      }
      if (action === 'delete') {
        if (confirm(`Delete "${project.name}"?`)) {
          window.__state.projects = window.__state.projects.filter(x => x.id !== project.id);
          if (window.__state.activeProjectId === project.id) {
            window.__state.activeProjectId = null;
            document.getElementById('projectTitle').textContent = 'No project';
            document.getElementById('cueList').innerHTML = '<div class="cue-list-empty">No project selected.</div>';
          }
          renderProjectList();
        }
      }
    });
  });

  return li;
}

async function renderCueList() {
  console.log('[renderCueList] START');
  const cueListEl = document.getElementById("cueList");
  if (!cueListEl) {
    console.warn('[renderCueList] DOM not ready');
    return;
  }

  const cues = window.__state.cues || [];
  
  cueListEl.className = cues.length === 0 ? 'cue-list cue-list-empty' : 'cue-list';
  cueListEl.innerHTML = '';

  if (cues.length === 0) {
    cueListEl.innerHTML = '<div class="cue-item empty">No cues yet. Drop a file to add.</div>';
    return;
  }

  cues.forEach((cue, idx) => {
    const div = document.createElement('div');
    div.className = 'cue-item' + (window.__state.activeCueId === cue.id ? ' active' : '');
    div.dataset.cueId = cue.id;
    div.style.cursor = 'pointer';
    
    div.innerHTML = `
      <div class="cue-index">${idx + 1}</div>
      <div class="cue-info">
        <div class="cue-name">${cue.display_name || cue.name || 'Untitled'}</div>
        <div class="cue-status">${cue.status || 'pending'}</div>
      </div>
    `;

    div.addEventListener('click', () => {
      window.__state.activeCueId = cue.id;
      loadVersions(cue.id);
      renderCueList();
    });

    cueListEl.appendChild(div);
  });

  console.log('[renderCueList] ✅ Rendered', cues.length, 'cues');
}

async function selectVersion(versionId, version) {
  console.log('[selectVersion]', versionId);
  window.__state.activeVersionId = versionId;
  await renderPlayer(version);
  await loadComments(versionId);
}

async function renderPlayer(version) {
  console.log('[renderPlayer] START');
  const playerMediaEl = document.getElementById("playerMedia");
  const playerTitleEl = document.getElementById("playerTitle");
  const playPauseBtnEl = document.getElementById("playPauseBtn");

  if (!playerMediaEl || !playerTitleEl || !playPauseBtnEl) {
    console.warn('[renderPlayer] DOM not ready');
    return;
  }

  if (!version) {
    playerMediaEl.innerHTML = '<div class="player-placeholder">Select a version to play.</div>';
    playerTitleEl.textContent = 'No version';
    playPauseBtnEl.disabled = true;
    return;
  }

  const mediaUrl = version.media_url;
  const mediaType = version.media_type;
  
  playerTitleEl.textContent = version.media_display_name || 'Version';

  playerMediaEl.innerHTML = '';

  if (mediaType === 'audio') {
    const audio = document.createElement('audio');
    audio.id = 'playerAudio';
    audio.src = mediaUrl;
    audio.controls = true;
    audio.style.width = '100%';
    playerMediaEl.appendChild(audio);
    playPauseBtnEl.disabled = false;
    playPauseBtnEl.textContent = 'Play';
    playPauseBtnEl.onclick = () => {
      if (audio.paused) {
        audio.play();
        playPauseBtnEl.textContent = 'Pause';
      } else {
        audio.pause();
        playPauseBtnEl.textContent = 'Play';
      }
    };
  } else if (mediaType === 'video') {
    const video = document.createElement('video');
    video.src = mediaUrl;
    video.controls = true;
    video.style.width = '100%';
    video.style.maxHeight = '400px';
    playerMediaEl.appendChild(video);
    playPauseBtnEl.disabled = true;
  } else {
    playerMediaEl.innerHTML = '<div class="player-placeholder">Unsupported media type.</div>';
    playPauseBtnEl.disabled = true;
  }

  console.log('[renderPlayer] ✅ Rendered', mediaType);
}

async function renderComments() {
  console.log('[renderComments] START');
  const commentsListEl = document.getElementById("commentsList");
  const commentsSummaryEl = document.getElementById("commentsSummary");

  if (!commentsListEl || !commentsSummaryEl) {
    console.warn('[renderComments] DOM not ready');
    return;
  }

  const comments = window.__state.comments || [];
  commentsSummaryEl.textContent = `${comments.length} comment${comments.length !== 1 ? 's' : ''}`;
  commentsListEl.innerHTML = '';

  if (comments.length === 0) {
    commentsListEl.innerHTML = '<li class="comment-item empty">No comments yet.</li>';
    return;
  }

  comments.forEach(comment => {
    const li = document.createElement('li');
    li.className = 'comment-item';
    li.innerHTML = `
      <div class="comment-meta">
        <strong>${comment.author || 'Anonymous'}</strong>
        <span class="comment-time">${comment.time_seconds ? `${comment.time_seconds.toFixed(1)}s` : ''}</span>
      </div>
      <div class="comment-text">${comment.text}</div>
    `;
    commentsListEl.appendChild(li);
  });

  console.log('[renderComments] ✅ Rendered', comments.length, 'comments');
}

async function renderReferences() {
  console.log('[renderReferences] START');
  const refsListEl = document.getElementById("refsList");

  if (!refsListEl) {
    console.warn('[renderReferences] DOM not ready');
    return;
  }

  const refs = window.__state.references || [];
  refsListEl.className = refs.length === 0 ? 'refs-list refs-list-empty' : 'refs-list';
  refsListEl.innerHTML = '';

  if (refs.length === 0) {
    refsListEl.innerHTML = 'No reference files for this project.';
    return;
  }

  refs.forEach(ref => {
    const div = document.createElement('div');
    div.className = 'ref-item';
    div.innerHTML = `
      <a href="${ref.url}" target="_blank" rel="noopener noreferrer">
        ${ref.name}
      </a>
      <span class="ref-size">${ref.size ? (ref.size / 1024 / 1024).toFixed(1) + ' MB' : ''}</span>
    `;
    refsListEl.appendChild(div);
  });

  console.log('[renderReferences] ✅ Rendered', refs.length, 'references');
}

// ============================================================================
// PROJECT CREATION
// ============================================================================

async function createNewProject() {
  const name = prompt("Project name");
  if (!name || !name.trim()) return;

  try {
    const user = window.flowAuth ? window.flowAuth.getUser() : null;
    const response = await apiCall("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        team_id: 'auto',
        owner_id: user?.id || null
      })
    });

    console.log("✅ Project created");
    await initializeFromSupabase();
  } catch (err) {
    alert("Failed to create project: " + err.message);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initializeFromSupabase() {
  console.log('[initializeFromSupabase] START');
  
  try {
    const data = await apiCall('/api/projects');
    window.__state.projects = data.projects || [];
    console.log('[initializeFromSupabase] ✅ Loaded', window.__state.projects.length, 'projects');
    
    renderProjectList();
    attachEventListeners();
    
    console.log('[initializeFromSupabase] ✅ COMPLETE');
  } catch (err) {
    console.error('[initializeFromSupabase] ❌ Failed:', err);
    showError('Failed to load projects');
  }
}

function attachEventListeners() {
  const newProjectBtn = document.getElementById('newProjectBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  
  if (newProjectBtn && !newProjectBtn.__attached) {
    newProjectBtn.addEventListener('click', createNewProject);
    newProjectBtn.__attached = true;
  }

  if (signOutBtn && !signOutBtn.__attached) {
    signOutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.flowAuth) window.flowAuth.signOut();
    });
    signOutBtn.__attached = true;
  }
}

// Expose globals
window.initializeFromSupabase = initializeFromSupabase;
window.renderProjectList = renderProjectList;
window.selectProject = selectProject;

console.log('[Flow] Ready');
