// app/invite/[token]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

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

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [user, setUser] = useState<any>(null);
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const initializeInvite = useCallback(async () => {
    try {
      // Prevent calling RPC when token is missing or string "null"
      if (!token || token === "null") {
        console.warn('[Invite] Missing or invalid token:', token);
        setError(bi("Invito non valido.", "Invalid invite."));
        setLoading(false);
        return;
      }
      // Import Supabase client
      const { getSupabaseClient } = await import("@/lib/supabaseClient");
      const client = getSupabaseClient();

      // Check if user is authenticated
      const { data: { user: currentUser } } = await client.auth.getUser();
      setUser(currentUser);

      // Fetch invite details from server endpoint (bypass DB RPC issues)
      const resp = await fetch(`/api/invites/details?token=${encodeURIComponent(token)}`);
      const rpcRes = await resp.json();
      const inviteError = resp.ok ? null : (rpcRes?.error || 'Invite fetch failed');
      const inviteData = resp.ok ? rpcRes : null;

      // If error object exists but is empty, log details and continue to data check
      if (inviteError) {
        // Prefer message if present
        const msg = inviteError.message || JSON.stringify(inviteError, Object.getOwnPropertyNames(inviteError));
        console.error("Error fetching invite (RPC):", msg, inviteError);
        setError(bi("Invito non trovato o non valido.", "Invite not found or invalid."));
        setLoading(false);
        return;
      }

      // Accept either an array result or a single object
      if (!inviteData || (Array.isArray(inviteData) && inviteData.length === 0)) {
        setError(bi("Invito non trovato, scaduto o già utilizzato.", "Invite not found, expired, or already used."));
        setLoading(false);
        return;
      }

      const resolvedInvite = Array.isArray(inviteData) ? inviteData[0] : inviteData;
      setInvite(resolvedInvite);
      setLoading(false);
    } catch (err) {
      console.error("Error initializing invite:", err);
      setError(bi("Errore durante il caricamento dell'invito.", "Error while loading invite."));
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    initializeInvite();
  }, [initializeInvite]);

  const handleAcceptInvite = async () => {
    if (!user) {
      // Save token and invite email, then redirect to login
      localStorage.setItem("pending_invite", token);
      if (invite?.email) {
        localStorage.setItem("pending_invite_email", invite.email);
      }
      router.push("/login");
      return;
    }

    // Check if email matches (for non-link invites)
    if (invite.email && invite.email !== user.email) {
      setError(`${bi("Questo invito è riservato a", "This invite is reserved for")} ${invite.email}. ${bi("Hai effettuato l'accesso come", "You are signed in as")} ${user.email}.`);
      return;
    }

    setAccepting(true);
    setError("");

    try {
      const { getSupabaseClient } = await import("@/lib/supabaseClient");
      const client = getSupabaseClient();
      const sessionRes = await client.auth.getSession();
      const accessToken = sessionRes?.data?.session?.access_token;
      if (!accessToken) {
        setError(bi("Sessione scaduta. Effettua di nuovo l'accesso.", "Session expired. Please sign in again."));
        setAccepting(false);
        return;
      }

      const resp = await fetch("/api/invites/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-actor-id": user?.id || ""
        },
        credentials: "same-origin",
        body: JSON.stringify({ invite_token: token })
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setError(data.error || bi("Errore durante l'accettazione dell'invito.", "Error while accepting invite."));
        setAccepting(false);
        return;
      }

      setSuccess(true);

      // If invite contains a project_id, instruct app to open that project after redirect
      try {
        const projectIdToOpen = data?.project_id || invite?.project_id || null;
        if (projectIdToOpen) {
          localStorage.setItem('open_project', projectIdToOpen);
          localStorage.setItem('open_project_tab', 'shared-with-me');
        }
      } catch (e) {
        console.warn('[Invite] Could not set open_project', e);
      }

      // Redirect immediately to the home app where the shared project is opened.
      router.replace("/");
    } catch (err) {
      console.error("Error accepting invite:", err);
      setError(bi("Errore imprevisto.", "Unexpected error."));
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#fff"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>⏳</div>
          <div>{bi("Caricamento invito...", "Loading invite...")}</div>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#fff"
      }}>
        <div style={{
          background: "#1a1a1a",
          padding: "2rem",
          borderRadius: "8px",
          maxWidth: "500px",
          width: "100%",
          border: "1px solid #333",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>❌</div>
          <h1 style={{ marginBottom: "1rem", color: "#ff4444" }}>{bi("Invito non valido", "Invalid invite")}</h1>
          <p style={{ color: "#999", marginBottom: "2rem" }}>{error}</p>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#333",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            {bi("Torna alla home", "Back to home")}
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#fff"
      }}>
        <div style={{
          background: "#1a1a1a",
          padding: "2rem",
          borderRadius: "8px",
          maxWidth: "500px",
          width: "100%",
          border: "1px solid #333",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
          <h1 style={{ marginBottom: "1rem", color: "#44ff44" }}>{bi("Invito accettato!", "Invite accepted!")}</h1>
          <p style={{ color: "#999", marginBottom: "1rem" }}>
            {bi("Ora fai parte del team/progetto.", "You are now part of the team/project.")}
          </p>
          <p style={{ color: "#666" }}>{bi("Reindirizzamento in corso...", "Redirecting...")}</p>
        </div>
      </div>
    );
  }

  const roleName: Record<string, string> = {
    owner: bi("Proprietario", "Owner"),
    editor: "Editor",
    commenter: bi("Commentatore", "Commenter"),
    viewer: bi("Visualizzatore", "Viewer")
  };
  
  const displayRole = roleName[invite.role] || invite.role;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0a0a",
      color: "#fff"
    }}>
      <div style={{
        background: "#1a1a1a",
        padding: "2rem",
        borderRadius: "8px",
        maxWidth: "500px",
        width: "100%",
        border: "1px solid #333"
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
          <h1 style={{ marginBottom: "0.5rem" }}>{bi("Sei stato invitato!", "You have been invited!")}</h1>
          {invite.invited_by_email && (
            <p style={{ color: "#999", fontSize: "0.9rem" }}>
              {bi("da", "by")} {invite.invited_by_email}
            </p>
          )}
        </div>

        <div style={{
          background: "#0a0a0a",
          padding: "1.5rem",
          borderRadius: "6px",
          marginBottom: "2rem",
          border: "1px solid #333"
        }}>
          {invite.project_name && (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ color: "#999", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                {bi("Progetto", "Project")}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: "600" }}>
                {invite.project_name}
              </div>
            </div>
          )}
          
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ color: "#999", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
              {bi("Team", "Team")}
            </div>
            <div style={{ fontSize: "1.1rem" }}>
              {invite.team_name}
            </div>
          </div>

          <div>
            <div style={{ color: "#999", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
              {bi("Ruolo", "Role")}
            </div>
            <div style={{
              display: "inline-block",
              padding: "0.25rem 0.75rem",
              background: "#0066ff33",
              color: "#0066ff",
              borderRadius: "4px",
              fontSize: "0.9rem",
              fontWeight: "500"
            }}>
              {displayRole}
            </div>
          </div>

          {invite.email && (
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #333" }}>
              <div style={{ color: "#999", fontSize: "0.85rem" }}>
                {bi("Invito riservato a", "Invite reserved for")}: <span style={{ color: "#fff" }}>{invite.email}</span>
              </div>
            </div>
          )}
        </div>

        {!user ? (
          <div>
            <p style={{ color: "#999", marginBottom: "1.5rem", textAlign: "center" }}>
              {bi("Effettua l'accesso per accettare l'invito", "Sign in to accept the invite")}
            </p>
            <button
              onClick={handleAcceptInvite}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "#0066ff",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "1rem",
                cursor: "pointer",
                fontWeight: "500"
              }}
            >
              {bi("Accedi per continuare", "Sign in to continue")}
            </button>
          </div>
        ) : (
          <div>
            {error && (
              <div style={{
                padding: "0.75rem",
                background: "#4d1a1a",
                borderRadius: "4px",
                color: "#ff6b6b",
                marginBottom: "1rem",
                fontSize: "0.9rem"
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleAcceptInvite}
              disabled={accepting}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: accepting ? "#333" : "#0066ff",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "1rem",
                cursor: accepting ? "not-allowed" : "pointer",
                fontWeight: "500",
                opacity: accepting ? 0.6 : 1
              }}
            >
              {accepting ? bi("Accettazione in corso...", "Accepting...") : bi("Accetta invito", "Accept invite")}
            </button>

            <p style={{
              textAlign: "center",
              color: "#666",
              fontSize: "0.85rem",
              marginTop: "1rem"
            }}>
              {bi("Accesso effettuato come", "Signed in as")} {user.email}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
