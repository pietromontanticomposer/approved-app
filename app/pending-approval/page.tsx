"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const bi = (it: string, en: string) => `${it} / ${en}`;

export default function PendingApprovalPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Get user email from Supabase session
    const checkSession = async () => {
      try {
        const { getSupabaseClient } = await import("@/lib/supabaseClient");
        const client = getSupabaseClient();
        const { data } = await client.auth.getSession();

        if (data?.session?.user?.email) {
          setUserEmail(data.session.user.email);
        }
      } catch (e) {
        console.warn("[PendingApproval] Could not get session", e);
      }
    };

    checkSession();
  }, []);

  const checkApprovalStatus = async () => {
    setChecking(true);
    try {
      const { getSupabaseClient } = await import("@/lib/supabaseClient");
      const client = getSupabaseClient();
      const { data } = await client.auth.getSession();

      if (!data?.session?.access_token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/auth/check-approval", {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      const result = await res.json();

      if (result.approved) {
        // User is now approved, redirect to app
        router.push("/");
      } else if (result.status === "rejected") {
        setStatus("rejected");
      } else {
        setStatus("pending");
      }
    } catch (e) {
      console.error("[PendingApproval] Check failed", e);
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { getSupabaseClient } = await import("@/lib/supabaseClient");
      const client = getSupabaseClient();
      await client.auth.signOut();
      router.push("/login");
    } catch (e) {
      console.error("[PendingApproval] Logout failed", e);
      router.push("/login");
    }
  };

  // App colors
  const colors = {
    bgCore: "#020617",
    bgDeep: "#0b0f1a",
    surface: "#0f172a",
    border: "#1e293b",
    text: "#e5e7eb",
    textStrong: "#f8fafc",
    textMuted: "#9ca3af",
    textWeak: "#64748b",
    accent: "#3b82f6",
    accentStrong: "#2563eb",
    warning: "#f59e0b",
    error: "#dc2626",
  };

  return (
    <div
      style={{
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        background: colors.bgCore,
        color: colors.text,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 48,
          maxWidth: 500,
          textAlign: "center",
        }}
      >
        {status === "pending" ? (
          <>
            <div style={{ fontSize: 64, marginBottom: 24 }}>⏳</div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: colors.textStrong,
                marginBottom: 16,
              }}
            >
              {bi("In attesa di approvazione", "Pending approval")}
            </h1>
            <p
              style={{
                color: colors.textMuted,
                fontSize: 16,
                marginBottom: 24,
              }}
            >
              {bi("Il tuo account", "Your account")}{" "}
              {userEmail && (
                <strong style={{ color: colors.text }}>{userEmail}</strong>
              )}{" "}
              {bi("è in attesa di approvazione da parte dell'amministratore.", "is pending admin approval.")}
            </p>
            <p style={{ color: colors.textWeak, fontSize: 14, marginBottom: 32 }}>
              {bi("Riceverai un'email quando il tuo account sarà approvato.", "You will receive an email when your account is approved.")}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={checkApprovalStatus}
                disabled={checking}
                style={{
                  background: colors.accentStrong,
                  color: "#fff",
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: checking ? "not-allowed" : "pointer",
                  opacity: checking ? 0.7 : 1,
                }}
              >
                {checking ? bi("Verifico...", "Checking...") : bi("Verifica stato", "Check status")}
              </button>
              <button
                onClick={handleLogout}
                style={{
                  background: "transparent",
                  color: colors.textMuted,
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                {bi("Esci", "Logout")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 64, marginBottom: 24 }}>❌</div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: colors.error,
                marginBottom: 16,
              }}
            >
              {bi("Accesso negato", "Access denied")}
            </h1>
            <p
              style={{
                color: colors.textMuted,
                fontSize: 16,
                marginBottom: 24,
              }}
            >
              {bi("La tua richiesta di registrazione non è stata approvata.", "Your registration request was not approved.")}
            </p>
            <p style={{ color: colors.textWeak, fontSize: 14, marginBottom: 32 }}>
              {bi("Se ritieni sia un errore, contatta l'amministratore.", "If you think this is a mistake, contact the administrator.")}
            </p>
            <button
              onClick={handleLogout}
              style={{
                background: colors.accentStrong,
                color: "#fff",
                padding: "12px 24px",
                borderRadius: 8,
                border: "none",
                fontSize: 15,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {bi("Torna al login", "Back to login")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
