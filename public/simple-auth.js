// Simple auth wrapper - gets session directly from supabaseClient
async function getSession() {
  if (!window.supabaseClient) {
    console.log('[SimpleAuth] Supabase not ready');
    return null;
  }
  
  try {
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();
    if (error) {
      console.error('[SimpleAuth] Session error:', error.message);
      return null;
    }
    return session;
  } catch (err) {
    console.error('[SimpleAuth] Error getting session:', err);
    return null;
  }
}

async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

async function signOut() {
  if (window.supabaseClient) {
    await window.supabaseClient.auth.signOut();
  }
  window.location.href = '/login';
}

// Make available globally
window.simpleAuth = {
  getSession,
  getUser,
  signOut
};
