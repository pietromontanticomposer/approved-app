// app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
    // Get supabase instance when component mounts
    import("@/lib/supabaseClient").then(mod => {
      const client = mod.getSupabaseClient();
      setSupabase(client);
      console.log('[Login] Supabase client ready');
    });

    // Check if this is a password reset callback
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    const hashType = hashParams.get('type');
    const searchType = searchParams.get('type');
    if (hashType === 'recovery' || searchType === 'recovery') {
      setIsResetPassword(true);
    }

    // Check for pending invite email
    const pendingInviteEmail = localStorage.getItem("pending_invite_email");
    if (pendingInviteEmail) {
      setEmail(pendingInviteEmail);
      setEmailLocked(true);
      // Check if this email exists in the system
      checkEmailExists(pendingInviteEmail);
    }

    // Check if already logged in
    checkExistingSession();
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
        setMessage("Crea un account per accettare l'invito");
      } else if (resp.ok && data.exists === true) {
        // Email exists, show login form
        setIsSignUp(false);
        setMessage("Accedi per accettare l'invito");
      }
    } catch (err) {
      console.error('[Login] Error checking email:', err);
    }
  };

  const checkExistingSession = async () => {
    try {
      const stored = localStorage.getItem('approved-auth');
      if (stored) {
        console.log('[Login] Found existing auth in localStorage');
        router.push('/');
      }
    } catch (err) {
      console.error('[Login] Error checking session:', err);
    }
  };

  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setMessage("Supabase not ready");
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
        setMessage("✉️ Controlla la tua email! Ti abbiamo inviato un link di accesso magico.");
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
        setMessage("✉️ Controlla la tua email! Ti abbiamo inviato una mail di conferma da Approved.");
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
        console.log('[Login] Checking localStorage...');
        const stored = localStorage.getItem('approved-auth');
        console.log('[Login] Auth in localStorage:', !!stored);
        
        // Wait for session to persist
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
      setMessage(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    if (!supabase) {
      setMessage("Supabase not ready");
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
      setMessage(error.message || `${provider} authentication failed`);
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
      setMessage("Check your email for the password reset link!");
    } catch (error: any) {
      setMessage(error.message || "Error sending reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      setMessage("Password updated successfully! Redirecting...");
      setTimeout(() => router.push("/"), 2000);
    } catch (error: any) {
      setMessage(error.message || "Error updating password");
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
          {isResetPassword ? "Set New Password" : isForgotPassword ? "Reset Password" : (isSignUp ? "Create Account" : "Sign in to Approved")}
        </h1>
        
        {isResetPassword ? (
          <form onSubmit={handleUpdatePassword}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#ccc" }}>
                New Password
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
                Confirm Password
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
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        ) : isForgotPassword ? (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#ccc" }}>
                Email
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
              {loading ? "Sending..." : "Send reset link"}
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
              ← Back to sign in
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
                  Email dell'invito - non modificabile
                </p>
              )}
            </div>

            {!useMagicLink && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "#ccc" }}>
                  Password
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
                  Forgot password?
                </button>
              </div>
            )}

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
              {loading ? "Loading..." : (useMagicLink ? "Invia link magico 📧" : (isSignUp ? "Sign up" : "Sign in"))}
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
                  <span style={{ color: "#666", fontSize: "0.85rem" }}>oppure</span>
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
                  <span>🔍</span> Continua con Google
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
                  <span></span> Continua con Apple
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
                {useMagicLink ? "← Usa password invece" : "✨ Accedi senza password (Magic Link)"}
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
                {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
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
