"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

const bi = (it: string, en: string) => `${it} / ${en}`;

export default function SharePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [supabase, setSupabase] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [share, setShare] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [nickname, setNickname] = useState('');
  const [isGuestLink, setIsGuestLink] = useState(false);

  const initializeShare = useCallback(async () => {
    try {
      // We expect links in the form /share/{shareId}?token={token}
      const shareId = token;
      const params = new URLSearchParams(window.location.search);
      const tokenQuery = params.get('token');

      // If a public app URL is configured, and current origin doesn't match it,
      // redirect there so links generated on localhost still work from other machines.
      try {
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_ORIGIN || '').trim();
        if (appUrl) {
          const currentOrigin = window.location.origin.replace(/\/+$/, '');
          const normalizedApp = appUrl.replace(/\/+$/, '');
          if (normalizedApp && currentOrigin !== normalizedApp) {
            const redirectPath = `/share/${encodeURIComponent(shareId || '')}` + (tokenQuery ? `?token=${encodeURIComponent(tokenQuery)}` : '');
            const target = `${normalizedApp}${redirectPath}`;
            window.location.replace(target);
            return;
          }
        }
      } catch (e) {
        console.warn('[Share] redirect check failed', e);
      }

      if (!shareId || !tokenQuery) {
        setError(bi('Link non valido', 'Invalid link'));
        setLoading(false);
        return;
      }

      // Fetch details from server-side helper which validates token hash
      const resp = await fetch(`/api/share/details?share_id=${encodeURIComponent(shareId)}&token=${encodeURIComponent(tokenQuery)}`);
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        console.error('[Share] details API failed', resp.status, body);
        setError(body?.error || bi('Link non trovato o non valido.', 'Link not found or invalid.'));
        setLoading(false);
        return;
      }

      const body = await resp.json();
      setShare(body);
      setIsGuestLink(body.guest_enabled === true);
      setLoading(false);
    } catch (err) {
      console.error('[Share] initialize error', err);
      setError(bi('Errore durante il caricamento del link.', 'Error while loading link.'));
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    initializeShare();
  }, [initializeShare]);

  useEffect(() => {
    // Initialize Supabase client on the browser and get current user
    import('@/lib/supabaseClient').then(mod => {
      const client = mod.getSupabaseClient();
      setSupabase(client);

      // Try to read current user/session
      (async () => {
        try {
          const { data } = await client.auth.getUser();
          if (data && (data as any).user) setUser((data as any).user);
        } catch (e) {
          console.warn('[Share] supabase getUser failed', e);
        }
      })();

      // Listen for auth changes
      const { data: sub } = client.auth.onAuthStateChange((event: any, session: any) => {
        if (session && session.access_token) {
          client.auth.getUser().then(res => {
            if (res?.data?.user) setUser(res.data.user);
          }).catch(() => {});
        } else {
          setUser(null);
        }
      });

      // cleanup
      return () => {
        try { sub?.subscription?.unsubscribe?.(); } catch {}
      };
    }).catch(err => console.warn('[Share] failed to init supabase', err));
  }, []);

  const sendMagicLink = useCallback(async (addr: string) => {
    if (!supabase) {
      setError(bi('Impossibile inizializzare l\'autenticazione', 'Unable to initialize authentication'));
      return;
    }
    setSending(true);
    try {
      const redirectTo = window.location.href.split('#')[0];
      const res = await supabase.auth.signInWithOtp({ email: addr, options: { emailRedirectTo: redirectTo } });
      if (res.error) {
        setError(res.error.message || bi('Errore durante l\'invio del link', 'Error while sending link'));
      } else {
        setSuccess(true);
      }
    } catch (e: any) {
      console.error('[Share] sendMagicLink error', e);
      setError(e?.message || bi('Errore durante l\'invio del link', 'Error while sending link'));
    } finally {
      setSending(false);
    }
  }, [supabase]);

  const handleOpen = useCallback(async () => {
    const shareId = token;
    const params = new URLSearchParams(window.location.search);
    const tokenQuery = params.get('token') || '';

    if (!user) {
      // Show signup option instead of forcing immediate redirect to login
      try {
        localStorage.setItem('pending_share', JSON.stringify({ share_id: shareId, token: tokenQuery }));
      } catch (e) {
        console.warn('[Share] could not set pending_share', e);
      }
      // If an email is already filled, send magic link automatically
      if (email && supabase) {
        await sendMagicLink(email);
        return;
      }
      // otherwise navigate to register/login where user can sign up
      router.push('/register');
      return;
    }

      // Redeem via server API
    try {
      if (!supabase) {
        setError(bi("Sessione non disponibile. Ricarica la pagina.", "Session unavailable. Reload the page."));
        return;
      }
      const sessionRes = await supabase.auth.getSession();
      const accessToken = sessionRes?.data?.session?.access_token;
      if (!accessToken) {
        setError(bi("Sessione scaduta. Effettua di nuovo l'accesso.", "Session expired. Please sign in again."));
        return;
      }

      const resp = await fetch('/api/share/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'x-actor-id': user.id
        },
        body: JSON.stringify({ share_id: shareId, token: tokenQuery })
      });

      if (!resp.ok) {
        const b = await resp.json().catch(() => ({}));
        setError(b?.error || bi('Impossibile aprire il progetto', 'Unable to open project'));
        return;
      }

      const b = await resp.json();
      setSuccess(true);
      // Ask the main app to open the redeemed project when landing on the home page
      if (b && b.project_id) {
        try {
          localStorage.setItem('open_project', b.project_id);
        } catch (e) {
          console.warn('[Share] Could not set open_project in localStorage', e);
        }
      }
      setTimeout(() => router.push('/'), 400);
    } catch (err) {
      console.error('[Share] redeem error', err);
      setError(bi('Errore durante l\'apertura del progetto', 'Error while opening project'));
    }
  }, [email, router, sendMagicLink, supabase, token, user]);

  const handleOpenWithoutAccount = useCallback(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tokenQuery = params.get('token') || '';
      if (!share || !tokenQuery) {
        setError(bi('Link non valido', 'Invalid link'));
        return;
      }
      localStorage.setItem('approved_share_link', JSON.stringify({
        share_id: share.share_id || token,
        token: tokenQuery,
        project_id: share.project_id,
        role: share.role || 'viewer'
      }));
      localStorage.setItem('open_project', share.project_id);
      router.push(`/?shared_project=${encodeURIComponent(share.project_id || '')}`);
    } catch (e) {
      console.warn('[Share] Unable to open without account', e);
      setError(bi('Impossibile aprire il progetto senza account.', 'Unable to open project without account.'));
    }
  }, [router, share, token]);

  const handleGuestAccess = useCallback(async () => {
    const shareId = token;
    const params = new URLSearchParams(window.location.search);
    const tokenQuery = params.get('token') || '';

    if (!nickname || nickname.trim().length < 2) {
      setError(bi('Il nickname deve avere almeno 2 caratteri', 'Nickname must be at least 2 characters'));
      return;
    }

    setSending(true);
    setError('');

    try {
      const resp = await fetch('/api/share/guest-redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          share_id: shareId,
          token: tokenQuery,
          nickname: nickname.trim(),
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || bi('Impossibile accedere come guest', 'Unable to access as guest'));
        return;
      }

      // Save guest session in localStorage
      localStorage.setItem('approved_guest_session', JSON.stringify({
        session_token: data.session_token,
        project_id: data.project_id,
        nickname: data.nickname,
        role: data.role,
        expires_at: data.expires_at,
      }));

      // Set cookie for API calls
      const maxAge = 7 * 24 * 60 * 60; // 7 days
      document.cookie = `guest_session=${data.session_token}; path=/; max-age=${maxAge}; SameSite=Strict`;

      setSuccess(true);
      localStorage.setItem('open_project', data.project_id);

      setTimeout(() => {
        router.push(`/?guest=1&project=${encodeURIComponent(data.project_id)}`);
      }, 400);

    } catch (err: any) {
      console.error('[Share] guest access error', err);
      setError(err?.message || bi('Errore durante l\'accesso', 'Error while accessing project'));
    } finally {
      setSending(false);
    }
  }, [nickname, router, token]);

  // Auto-redeem when user is already logged in and share details loaded
  // Skip auto-redeem for guest links if no user - let them enter nickname
  useEffect(() => {
    if (user && !loading && share && !success && !isGuestLink) {
      // small delay to allow UI to settle
      const t = setTimeout(() => {
        handleOpen();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [user, loading, share, success, handleOpen, isGuestLink]);

  if (loading) {
    return <div style={{ padding: 40 }}>{bi('Caricamento link...', 'Loading link...')}</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <h2>{bi('Link non valido', 'Invalid link')}</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/')}>{bi('Torna alla home', 'Back to home')}</button>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ padding: 40 }}>
        <h2>{bi('Apertura progetto...', 'Opening project...')}</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 680, margin: '40px auto' }}>
      <h2>{bi('Progetto condiviso', 'Shared project')}</h2>
      <p style={{ color: '#999' }}>{bi('Progetto', 'Project')}: <strong>{share.project_name}</strong></p>
      <p style={{ color: '#999' }}>{bi('Ruolo consentito', 'Allowed role')}: <strong>{share.role === 'commenter' ? bi('Commentatore', 'Commenter') : share.role === 'viewer' ? bi('Visualizzatore', 'Viewer') : share.role}</strong></p>
      <div style={{ marginTop: 20 }}>
        {user ? (
          <button onClick={handleOpen} style={{ padding: '10px 14px' }}>
            {bi('Apri progetto', 'Open project')}
          </button>
        ) : isGuestLink ? (
          /* Guest link: only nickname required */
          <div style={{ display: 'flex', gap: 12, flexDirection: 'column', maxWidth: 420 }}>
            <div style={{ padding: '12px 16px', background: '#1a2a1a', borderRadius: '6px', border: '1px solid #2a4a2a' }}>
              <p style={{ margin: 0, color: '#8f8', fontSize: '0.9rem' }}>
                {bi('Questo link ti permette di accedere al progetto senza creare un account. Inserisci un nickname per continuare.', 'This link lets you access the project without creating an account. Enter a nickname to continue.')}
              </p>
            </div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={bi("Il tuo nickname", "Your nickname")}
              maxLength={50}
              style={{ padding: '10px 12px', fontSize: 16, borderRadius: '4px', border: '1px solid #333', background: '#0a0a0a', color: '#fff' }}
            />
            <button
              onClick={handleGuestAccess}
              disabled={sending || nickname.trim().length < 2}
              style={{
                padding: '12px 16px',
                fontSize: 16,
                background: sending || nickname.trim().length < 2 ? '#333' : '#0066ff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: sending || nickname.trim().length < 2 ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? bi('Accesso in corso...', 'Access in progress...') : bi('Accedi come Guest', 'Access as Guest')}
            </button>
            <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>
              {bi('Oppure', 'Or')} <a href="/register" style={{ color: '#0066ff' }}>{bi('crea un account', 'create an account')}</a> {bi('per salvare i tuoi progetti.', 'to save your projects.')}
            </p>
          </div>
        ) : (
          /* Standard link: requires account */
          <div style={{ display: 'flex', gap: 8, flexDirection: 'column', maxWidth: 420 }}>
            <p style={{ color: '#555' }}>{bi('Per aprire il progetto devi avere un account. Puoi crearne uno rapidamente inserendo la tua email qui sotto; ti invieremo un link magico per accedere e completare l\'apertura.', 'To open the project you need an account. You can create one quickly by entering your email below; we will send a magic link to sign in and complete access.')}</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={bi("La tua email", "Your email")}
              style={{ padding: '8px 10px', fontSize: 16 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => sendMagicLink(email)} disabled={sending || !email} style={{ padding: '10px 14px' }}>
                {sending ? bi('Invio...', 'Sending...') : bi('Ricevi link magico', 'Receive magic link')}
              </button>
              <button onClick={() => { localStorage.setItem('pending_share', JSON.stringify({ share_id: token, token: (new URLSearchParams(window.location.search)).get('token') || '' })); router.push('/login'); }} style={{ padding: '10px 14px' }}>
                {bi('Ho già un account (Accedi)', 'I already have an account (Sign in)')}
              </button>
              <button onClick={handleOpenWithoutAccount} style={{ padding: '10px 14px' }}>
                {bi('Continua senza account', 'Continue without account')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
