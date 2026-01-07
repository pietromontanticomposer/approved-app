// app/invite/[token]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

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
        setError("Invito non valido.");
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
        setError("Invito non trovato o non valido.");
        setLoading(false);
        return;
      }

      // Accept either an array result or a single object
      if (!inviteData || (Array.isArray(inviteData) && inviteData.length === 0)) {
        setError("Invito non trovato, scaduto o già utilizzato.");
        setLoading(false);
        return;
      }

      const resolvedInvite = Array.isArray(inviteData) ? inviteData[0] : inviteData;
      setInvite(resolvedInvite);
      setLoading(false);
    } catch (err) {
      console.error("Error initializing invite:", err);
      setError("Errore durante il caricamento dell'invito.");
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
      setError(`Questo invito è riservato a ${invite.email}. Hai effettuato l'accesso come ${user.email}.`);
      return;
    }

    setAccepting(true);
    setError("");

    try {
      const resp = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ invite_token: token })
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setError(data.error || "Errore durante l'accettazione dell'invito.");
        setAccepting(false);
        return;
      }

      setSuccess(true);

      // If invite contains a project_id, instruct app to open that project after redirect
      try {
        if (invite && invite.project_id) {
          localStorage.setItem('open_project', invite.project_id);
        }
      } catch (e) {
        console.warn('[Invite] Could not set open_project', e);
      }

      // Redirect to home where initializeFromSupabase will open the project
      setTimeout(() => {
        router.push("/");
      }, 1200);
    } catch (err) {
      console.error("Error accepting invite:", err);
      setError("Errore imprevisto.");
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
          <div>Caricamento invito...</div>
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
          <h1 style={{ marginBottom: "1rem", color: "#ff4444" }}>Invito non valido</h1>
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
            Torna alla home
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
          <h1 style={{ marginBottom: "1rem", color: "#44ff44" }}>Invito accettato!</h1>
          <p style={{ color: "#999", marginBottom: "1rem" }}>
            Ora fai parte del team/progetto.
          </p>
          <p style={{ color: "#666" }}>Reindirizzamento in corso...</p>
        </div>
      </div>
    );
  }

  const roleName: Record<string, string> = {
    owner: "Proprietario",
    editor: "Editor",
    commenter: "Commentatore",
    viewer: "Visualizzatore"
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
          <h1 style={{ marginBottom: "0.5rem" }}>Sei stato invitato!</h1>
          {invite.invited_by_email && (
            <p style={{ color: "#999", fontSize: "0.9rem" }}>
              da {invite.invited_by_email}
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
                Progetto
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: "600" }}>
                {invite.project_name}
              </div>
            </div>
          )}
          
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ color: "#999", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
              Team
            </div>
            <div style={{ fontSize: "1.1rem" }}>
              {invite.team_name}
            </div>
          </div>

          <div>
            <div style={{ color: "#999", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
              Ruolo
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
                Invito riservato a: <span style={{ color: "#fff" }}>{invite.email}</span>
              </div>
            </div>
          )}
        </div>

        {!user ? (
          <div>
            <p style={{ color: "#999", marginBottom: "1.5rem", textAlign: "center" }}>
              Effettua l'accesso per accettare l'invito
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
              Accedi per continuare
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
              {accepting ? "Accettazione in corso..." : "Accetta invito"}
            </button>

            <p style={{
              textAlign: "center",
              color: "#666",
              fontSize: "0.85rem",
              marginTop: "1rem"
            }}>
              Accesso effettuato come {user.email}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
