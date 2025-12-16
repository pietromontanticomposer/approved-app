// flow-auth.js - Simple auth wrapper

const authState = {
  user: null,
  session: null,
  defaultTeamId: null,
  teams: []
};

// Initialize on load
async function initAuth() {
  console.log('[FlowAuth] Initializing auth...');
  
  if (!window.supabaseClient) {
    console.warn('[FlowAuth] Supabase client not ready');
    return false;
  }

  try {
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();
    
    if (error || !session) {
      console.log('[FlowAuth] No session found, using demo mode');
      // DEMO MODE: create a stable fake user id (UUID) persisted in localStorage
      function getOrCreateDemoId() {
        try {
          const key = 'approved_demo_actor_id';
          let id = localStorage.getItem(key);
          if (id && typeof id === 'string') return id;
          // simple UUID v4 generator
          id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
          localStorage.setItem(key, id);
          return id;
        } catch (e) {
          return 'demo-user';
        }
      }

      const demoId = getOrCreateDemoId();
      authState.user = { id: demoId, email: 'demo@approved.local' };
      authState.session = { access_token: 'demo', user: authState.user };
      console.log('[FlowAuth] ✅ Demo mode active (demo id=', demoId, ')');
    } else {
      authState.session = session;
      authState.user = session.user;
      console.log('[FlowAuth] ✅ Session loaded:', session.user.email);
    }

    // Aggiorna subito la UI utente (evita "Loading...")
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) {
      userEmailEl.textContent = authState.user?.email || 'User';
    }

    // Set up auth state listener
    window.supabaseClient.auth.onAuthStateChange((event, newSession) => {
      console.log('[FlowAuth] Auth state changed:', event);
      if (!newSession && !window.__isSigningOut) {
        console.log('[FlowAuth] Session lost but keeping demo mode');
        // Don't redirect in demo mode
      }
    });

    return true;
  } catch (err) {
    console.error('[FlowAuth] Error initializing:', err);
    return false;
  }
}

function getDefaultTeamId() {
  return authState.defaultTeamId;
}

function getUser() {
  return authState.user;
}

function getSession() {
  return authState.session;
}

function getAuthHeaders() {
  if (!authState.session) {
    return { 'Content-Type': 'application/json' };
  }
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authState.session.access_token}`
  };
  if (authState.user && authState.user.id) {
    headers['x-actor-id'] = authState.user.id;
  }
  return headers;
}

async function signOut() {
  try {
    console.log('[FlowAuth] Signing out...');
    window.__isSigningOut = true;
    
    if (window.supabaseClient) {
      // Prova a logout da Supabase
      try {
        await window.supabaseClient.auth.signOut();
        console.log('[FlowAuth] ✅ Supabase signOut complete');
      } catch (err) {
        console.error('[FlowAuth] Supabase signOut error:', err);
      }
      
      // Forza la rimozione della sessione da localStorage
      try {
        const storage = window.supabaseClient.storage;
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('approved-auth') || key.includes('supabase')) {
            localStorage.removeItem(key);
            console.log('[FlowAuth] Removed localStorage key:', key);
          }
        });
      } catch (err) {
        console.error('[FlowAuth] Error clearing localStorage:', err);
      }
    }
    
    // Pulisci lo stato locale
    authState.user = null;
    authState.session = null;
    
    console.log('[FlowAuth] Redirecting to /login');
    // Usa replace per evitare di tornare con back button
    window.location.replace('/login');
  } catch (err) {
    console.error('[FlowAuth] Unexpected error in signOut:', err);
    window.location.replace('/login');
  }
}

// Export
window.flowAuth = {
  initAuth,
  getDefaultTeamId,
  getUser,
  getSession,
  getAuthHeaders,
  signOut
};

console.log('[FlowAuth] Ready');
