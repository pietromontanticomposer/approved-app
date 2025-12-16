// flow-init.js - defensive initializer to ensure projects are loaded
(async function(){
  try {
    console.log('[flow-init] start');

    // Wait a bit for supabaseClient/flowAuth/initializeFromSupabase to be available
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    for (let i=0;i<50;i++) {
      if (window.supabaseClient || window.flowAuth || window.initializeFromSupabase) break;
      await wait(50);
    }

    const safeFetchProjects = async () => {
      try {
        // Build headers: prefer flowAuth.getAuthHeaders, then supabaseClient.session
        let headers = { 'Content-Type': 'application/json' };
        if (window.flowAuth && typeof window.flowAuth.getAuthHeaders === 'function') {
          headers = { ...headers, ...window.flowAuth.getAuthHeaders() };
        } else if (window.supabaseClient && window.supabaseClient.auth) {
          try {
            const s = await window.supabaseClient.auth.getSession();
            const session = s?.data?.session || null;
            if (session && session.access_token) headers['Authorization'] = 'Bearer ' + session.access_token;
            if (session && session.user && session.user.id) headers['x-actor-id'] = session.user.id;
          } catch (e) {}
        }

        console.log('[flow-init] fetching /api/projects with headers', headers);
        const resp = await fetch('/api/projects', { headers });
        const data = await resp.json().catch(() => null);
        console.log('[flow-init] /api/projects response', resp.status, data);

        // Normalize data to projects array
        let projects = [];
        if (data) {
          if (Array.isArray(data.projects)) projects = data.projects;
          else if (Array.isArray(data.my_projects) || Array.isArray(data.shared_with_me)) projects = [...(data.my_projects||[]), ...(data.shared_with_me||[])];
          else if (Array.isArray(data)) projects = data;
        }

        // minimal render into DOM if renderProjectList not available
        if (projects.length && typeof renderProjectList !== 'function') {
          try {
            const projectList = document.getElementById('projectList');
            const sharedList = document.getElementById('sharedProjectList');
            if (projectList) {
              projectList.innerHTML = '';
              projects.forEach(p => {
                const li = document.createElement('li');
                li.className = 'project-item';
                li.textContent = p.name || p.id;
                projectList.appendChild(li);
              });
            }
            if (sharedList) {
              sharedList.innerHTML = '';
              projects.forEach(p => {
                const li = document.createElement('li');
                li.className = 'project-item';
                li.textContent = p.name || p.id;
                sharedList.appendChild(li);
              });
            }
          } catch (e) {
            console.warn('[flow-init] minimal render failed', e);
          }
        }

        return { ok: true, projects };
      } catch (err) {
        console.error('[flow-init] error fetching projects', err);
        return { ok: false };
      }
    };

    // If initializeFromSupabase exists, attempt to bootstrap client auth first
    if (typeof window.initializeFromSupabase === 'function') {
      try {
        // Prefer to run flowAuth.initAuth first so we have client-side session available
        if (window.flowAuth && typeof window.flowAuth.initAuth === 'function') {
          try {
            console.log('[flow-init] bootstrapping flowAuth.initAuth before initializeFromSupabase');
            const ok = await window.flowAuth.initAuth().catch(() => false);
            console.log('[flow-init] flowAuth.initAuth result', !!ok);
          } catch (e) {
            console.warn('[flow-init] flowAuth.initAuth failed', e);
          }
        }

        console.log('[flow-init] calling initializeFromSupabase');
        const p = window.initializeFromSupabase();
        // if it returns a promise, wait shortly then check DOM
        if (p && typeof p.then === 'function') {
          await Promise.race([p, new Promise(r => setTimeout(r, 2000))]);
        } else {
          await new Promise(r => setTimeout(r, 1200));
        }
        // check whether projectList has been populated
        const projectList = document.getElementById('projectList');
        const empty = projectList && projectList.querySelector('.project-item.empty');
        if (empty) {
          console.log('[flow-init] initializeFromSupabase left empty list, running fallback fetch');
          await safeFetchProjects();
        } else {
          console.log('[flow-init] initializeFromSupabase likely succeeded');
        }
      } catch (e) {
        console.warn('[flow-init] initializeFromSupabase threw, running fallback', e);
        await safeFetchProjects();
      }
    } else {
      console.log('[flow-init] initializeFromSupabase not found, running fallback fetch');
      await safeFetchProjects();
    }

    // Expose a safe fallback so other scripts (e.g. page init) can trigger
    // a minimal project fetch if `initializeFromSupabase` is not available.
    try {
      window.safeFetchProjectsFallback = safeFetchProjects;
    } catch (e) {
      // ignore
    }

  } catch (err) {
    console.error('[flow-init] unexpected error', err);
  }
})();
