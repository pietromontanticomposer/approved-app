// flow-auth.js - Simple auth wrapper

const authState = {
  user: null,
  session: null,
  defaultTeamId: null,
  teams: [],
  share: null
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
      console.log('[FlowAuth] No session found');

      // Check if user is accessing via share link - allow anonymous access in that case
      const isSharePage = window.location.pathname.startsWith('/share/');
      const isInvitePage = window.location.pathname.startsWith('/invite/');
      const hasShareContext = localStorage.getItem('approved_share_link');

      if (isSharePage || isInvitePage || hasShareContext) {
        console.log('[FlowAuth] Anonymous access allowed for share/invite flow');
        authState.user = null;
        authState.session = null;
        return true; // Allow access but without user
      }

      // No session and not a share flow - redirect to login
      console.log('[FlowAuth] Redirecting to /login (no session)');
      window.location.replace('/login');
      return false;
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

    // Load share context if present
    try {
      const raw = localStorage.getItem('approved_share_link');
      if (raw) {
        authState.share = JSON.parse(raw);
      }
    } catch (e) {
      authState.share = null;
    }

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
    const headers = { 'Content-Type': 'application/json' };
    try {
      const raw = localStorage.getItem('approved_share_link');
      if (raw) {
        const share = JSON.parse(raw);
        if (share?.share_id && share?.token) {
          headers['x-share-id'] = share.share_id;
          headers['x-share-token'] = share.token;
        }
      }
    } catch (e) {}
    return headers;
  }
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authState.session.access_token}`
  };
  if (authState.user && authState.user.id) {
    headers['x-actor-id'] = authState.user.id;
  }
  try {
    const raw = localStorage.getItem('approved_share_link');
    if (raw) {
      const share = JSON.parse(raw);
      if (share?.share_id && share?.token) {
        headers['x-share-id'] = share.share_id;
        headers['x-share-token'] = share.token;
      }
    }
  } catch (e) {}
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
