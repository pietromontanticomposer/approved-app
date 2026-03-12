// app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const bi = (it: string, en: string) => {
  if (typeof window === "undefined") return it;
  try {
    const lang =
      ((window as any).i18n && typeof (window as any).i18n.getLanguage === "function"
        ? (window as any).i18n.getLanguage()
        : localStorage.getItem("app-language")) || "it";
    return lang === "en" ? en : it;
  } catch {
    return it;
  }
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);
  const [emailLocked, setEmailLocked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Handle URL params synchronously (no async needed)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    if (hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery') {
      setIsResetPassword(true);
    }
    if (searchParams.get('signup') === '1') {
      setIsSignUp(true);
    }

    // Init supabase, check session, then handle pending invite
    import("@/lib/supabaseClient").then(async (mod) => {
      const client = mod.getSupabaseClient();
      setSupabase(client);

      // Use Supabase's own session check (handles expiry + refresh correctly)
      const { data } = await client.auth.getSession();
      if (data?.session?.user) {
        router.push('/');
        return;
      }

      // Only process pending invite if user is NOT already logged in
      const pendingInviteEmail = localStorage.getItem("pending_invite_email");
      if (pendingInviteEmail) {
        setEmail(pendingInviteEmail);
        setEmailLocked(true);
        checkEmailExists(pendingInviteEmail);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkEmailExists = async (emailToCheck: string) => {
    try {
      const resp = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck }),
      });
      const data = await resp.json();
      if (resp.ok && data.exists === false) {
        // Email doesn't exist, show signup form
        setIsSignUp(true);
        setMessage(bi("Crea un account per accettare l'invito", "Create an account to accept the invite"));
      } else if (resp.ok && data.exists === true) {
        // Email exists, show login form
        setIsSignUp(false);
        setMessage(bi("Accedi per accettare l'invito", "Sign in to accept the invite"));
      }
    } catch (err) {
      console.error('[Login] Error checking email:', err);
    }
  };

  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setMessage(bi("Supabase non pronto", "Supabase not ready"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (useMagicLink) {
        // Magic Link (OTP) - No password needed
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;
        setMessage("✉️ " + bi("Controlla la tua email! Ti abbiamo inviato un link di accesso magico.", "Check your email! We sent you a magic sign-in link."));
        setLoading(false);
        return;
      }

      if (isSignUp) {
        // Use server endpoint to generate Supabase action link and send email from our SMTP
        const resp = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await resp.json();
        if (!resp.ok || data?.error) {
          throw new Error(data?.error || 'Signup failed');
        }
        setMessage("✉️ " + bi("Controlla la tua email! Ti abbiamo inviato una mail di conferma da Approved.", "Check your email! We sent you a confirmation email from Approved."));
        setLoading(false);
        return;
      } else {
        console.log('[Login] Attempting sign in...');
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('[Login] Sign in error:', error.message);
          throw error;
        }
        
        console.log('[Login] ✅ Sign in successful');

        // Check for pending invite or pending share
        const pendingInvite = localStorage.getItem("pending_invite");
        if (pendingInvite) {
          localStorage.removeItem("pending_invite");
          localStorage.removeItem("pending_invite_email");
          router.push(`/invite/${pendingInvite}`);
          return;
        }

        const pendingShare = localStorage.getItem("pending_share");
        if (pendingShare) {
          localStorage.removeItem("pending_share");
          try {
            const parsed = JSON.parse(pendingShare);
            if (parsed && parsed.share_id) {
              const t = parsed.token ? `?token=${encodeURIComponent(parsed.token)}` : '';
              router.push(`/share/${parsed.share_id}${t}`);
              return;
            }
          } catch {
            // fallback: older string format
            router.push(`/share/${pendingShare}`);
            return;
          }
        }
        
        console.log('[Login] Redirecting to home');
        router.push("/");
      }
    } catch (error: any) {
      console.error('[Login] Error:', error);
      setMessage(error.message || bi("Autenticazione fallita", "Authentication failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    if (!supabase) {
      setMessage(bi("Supabase non pronto", "Supabase not ready"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error(`[Login] ${provider} OAuth error:`, error);
      setMessage(error.message || bi(`Autenticazione ${provider} fallita`, `${provider} authentication failed`));
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;
      setMessage(bi("Controlla la tua email per il link di reset password!", "Check your email for the password reset link!"));
    } catch (error: any) {
      setMessage(error.message || bi("Errore durante l'invio dell'email di reset", "Error sending reset email"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage(bi("Le password non coincidono", "Passwords do not match"));
      return;
    }

    if (newPassword.length < 6) {
      setMessage(bi("La password deve avere almeno 6 caratteri", "Password must be at least 6 characters"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      setMessage(bi("Password aggiornata con successo! Reindirizzamento...", "Password updated successfully! Redirecting..."));
      setTimeout(() => router.push("/"), 2000);
    } catch (error: any) {
      setMessage(error.message || bi("Errore durante l'aggiornamento della password", "Error updating password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "#0a0a0a"
    }}>
      <div style={{
        background: "#1a1a1a",
        padding: "2rem",
        borderRadius: "8px",
        maxWidth: "400px",
        width: "100%",
        border: "1px solid #333"
      }}>
        <h1 style={{ marginBottom: "1.5rem", color: "#fff" }}>
          {isResetPassword ? bi("Imposta nuova password", "Set New Password") : isForgotPassword ? bi("Reset password", "Reset Password") : (isSignUp ? bi("Crea account", "Create Account") : bi("Accedi ad Approved", "Sign in to Approved"))}
        </h1>
        
        {isResetPassword ? (
          <form onSubmit={handleUpdatePassword}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#ccc" }}>
                {bi("Nuova password", "New Password")}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                autoComplete="new-password"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  border: "1px solid #333",
                  background: "#0a0a0a",
                  color: "#fff",
                  fontSize: "1rem"
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#ccc" }}>
                {bi("Conferma password", "Confirm Password")}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  border: "1px solid #333",
                  background: "#0a0a0a",
                  color: "#fff",
                  fontSize: "1rem"
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "#0066ff",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "1rem",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? bi("Aggiornamento...", "Updating...") : bi("Aggiorna password", "Update Password")}
            </button>
          </form>
        ) : isForgotPassword ? (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#ccc" }}>
                {bi("Email", "Email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  border: "1px solid #333",
                  background: "#0a0a0a",
                  color: "#fff",
                  fontSize: "1rem"
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "#0066ff",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "1rem",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                marginBottom: "1rem"
              }}
            >
              {loading ? bi("Invio...", "Sending...") : bi("Invia link di reset", "Send reset link")}
            </button>

            <button
              onClick={() => setIsForgotPassword(false)}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "transparent",
                color: "#999",
                border: "none",
                fontSize: "0.9rem",
                cursor: "pointer"
              }}
            >
              ← {bi("Torna al login", "Back to sign in")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailPassword}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#ccc" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => !emailLocked && setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                readOnly={emailLocked}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  border: emailLocked ? "1px solid #0066ff" : "1px solid #333",
                  background: emailLocked ? "#0a1a2a" : "#0a0a0a",
                  color: "#fff",
                  fontSize: "1rem",
                  cursor: emailLocked ? "not-allowed" : "text"
                }}
              />
              {emailLocked && (
                <p style={{ color: "#0066ff", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                  {bi("Email dell'invito - non modificabile", "Invite email - cannot be changed")}
                </p>
              )}
            </div>

            {!useMagicLink && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "#ccc" }}>
                  {bi("Password", "Password")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "4px",
                    border: "1px solid #333",
                    background: "#0a0a0a",
                    color: "#fff",
                    fontSize: "1rem"
                  }}
                />
              </div>
            )}

            {!isSignUp && !useMagicLink && (
              <div style={{ textAlign: "right", marginBottom: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  style={{
                    background: "transparent",
                    color: "#0066ff",
                    border: "none",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  {bi("Password dimenticata?", "Forgot password?")}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !supabase}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "#0066ff",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "1rem",
                cursor: (loading || !supabase) ? "not-allowed" : "pointer",
                opacity: (loading || !supabase) ? 0.6 : 1,
                marginBottom: "1rem"
              }}
            >
              {loading ? bi("Caricamento...", "Loading...") : (useMagicLink ? bi("Invia link magico 📧", "Send magic link 📧") : (isSignUp ? bi("Registrati", "Sign up") : bi("Accedi", "Sign in")))}
            </button>

            {/* OAuth Buttons */}
            {!isSignUp && !useMagicLink && (
              <>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  margin: "1.5rem 0"
                }}>
                  <div style={{ flex: 1, height: "1px", background: "#333" }}></div>
                  <span style={{ color: "#666", fontSize: "0.85rem" }}>{bi("oppure", "or")}</span>
                  <div style={{ flex: 1, height: "1px", background: "#333" }}></div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "#fff",
                    color: "#333",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "0.95rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    marginBottom: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    fontWeight: "500"
                  }}
                >
                  <span>🔍</span> {bi("Continua con Google", "Continue with Google")}
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('apple')}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "#000",
                    color: "#fff",
                    border: "1px solid #333",
                    borderRadius: "4px",
                    fontSize: "0.95rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    fontWeight: "500"
                  }}
                >
                  <span></span> {bi("Continua con Apple", "Continue with Apple")}
                </button>
              </>
            )}

            {/* Toggle Magic Link */}
            {!isSignUp && (
              <button
                type="button"
                onClick={() => setUseMagicLink(!useMagicLink)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "transparent",
                  color: "#0066ff",
                  border: "1px solid #0066ff",
                  borderRadius: "4px",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  marginBottom: "0.75rem"
                }}
              >
                {useMagicLink ? `← ${bi("Usa password invece", "Use password instead")}` : `✨ ${bi("Accedi senza password (Magic Link)", "Sign in without password (Magic Link)")}`}
              </button>
            )}

            {!emailLocked && (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setUseMagicLink(false);
                }}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "transparent",
                  color: "#999",
                  border: "none",
                  fontSize: "0.9rem",
                  cursor: "pointer"
                }}
              >
                {isSignUp ? bi("Hai già un account? Accedi", "Already have an account? Sign in") : bi("Ti serve un account? Registrati", "Need an account? Sign up")}
              </button>
            )}
          </form>
        )}

        {message && (
          <div style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: message.includes("✉️") || message.includes("Check") || message.includes("confirm") || message.includes("Crea un account") || message.includes("Accedi per") ? "#1a4d1a" : "#4d1a1a",
            borderRadius: "4px",
            color: "#fff",
            fontSize: "0.9rem"
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
