"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

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
        setError('Link non valido');
        setLoading(false);
        return;
      }

      // Fetch details from server-side helper which validates token hash
      const resp = await fetch(`/api/share/details?share_id=${encodeURIComponent(shareId)}&token=${encodeURIComponent(tokenQuery)}`);
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        console.error('[Share] details API failed', resp.status, body);
        setError(body?.error || 'Link non trovato o non valido.');
        setLoading(false);
        return;
      }

      const body = await resp.json();
      setShare(body);
      setLoading(false);
    } catch (err) {
      console.error('[Share] initialize error', err);
      setError('Errore durante il caricamento del link.');
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
      setError('Impossibile inizializzare l\'autenticazione');
      return;
    }
    setSending(true);
    try {
      const redirectTo = window.location.href.split('#')[0];
      const res = await supabase.auth.signInWithOtp({ email: addr, options: { emailRedirectTo: redirectTo } });
      if (res.error) {
        setError(res.error.message || 'Errore durante l\'invio del link');
      } else {
        setSuccess(true);
      }
    } catch (e: any) {
      console.error('[Share] sendMagicLink error', e);
      setError(e?.message || 'Errore durante l\'invio del link');
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
      const resp = await fetch('/api/share/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-actor-id': user.id
        },
        body: JSON.stringify({ share_id: shareId, token: tokenQuery })
      });

      if (!resp.ok) {
        const b = await resp.json().catch(() => ({}));
        setError(b?.error || 'Impossibile aprire il progetto');
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
      setError('Errore durante l\'apertura del progetto');
    }
  }, [email, router, sendMagicLink, supabase, token, user]);

  // Auto-redeem when user is already logged in and share details loaded
  useEffect(() => {
    if (user && !loading && share && !success) {
      // small delay to allow UI to settle
      const t = setTimeout(() => {
        handleOpen();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [user, loading, share, success, handleOpen]);

  if (loading) {
    return <div style={{ padding: 40 }}>Caricamento link…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Link non valido</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/')}>Torna alla home</button>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Aprendo il progetto…</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 680, margin: '40px auto' }}>
      <h2>Progetto condiviso</h2>
      <p style={{ color: '#999' }}>Progetto: <strong>{share.project_name}</strong></p>
      <p style={{ color: '#999' }}>Ruolo consentito: <strong>{share.role}</strong></p>
      <div style={{ marginTop: 20 }}>
        {user ? (
          <button onClick={handleOpen} style={{ padding: '10px 14px' }}>
            Apri progetto
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexDirection: 'column', maxWidth: 420 }}>
            <p style={{ color: '#555' }}>Per aprire il progetto devi avere un account. Puoi crearne uno rapidamente inserendo la tua email qui sotto; ti invieremo un link magico per accedere e completare l'apertura.</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="La tua email"
              style={{ padding: '8px 10px', fontSize: 16 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => sendMagicLink(email)} disabled={sending || !email} style={{ padding: '10px 14px' }}>
                {sending ? 'Invio…' : 'Ricevi link magico'}
              </button>
              <button onClick={() => { localStorage.setItem('pending_share', JSON.stringify({ share_id: token, token: (new URLSearchParams(window.location.search)).get('token') || '' })); router.push('/login'); }} style={{ padding: '10px 14px' }}>
                Ho già un account (Accedi)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
