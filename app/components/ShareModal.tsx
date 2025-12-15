// app/components/ShareModal.tsx
"use client";

import { useState, useEffect } from "react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  teamId: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  teamId,
}: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [linkInvite, setLinkInvite] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [activeTab, setActiveTab] = useState<"email" | "link">("email");
  const [invites, setInvites] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadInvites();
    }
  }, [isOpen, teamId]);

  const getAuthHeaders = async () => {
    try {
      // Prefer flowAuth helper if available
      const win: any = window as any;
      if (win.flowAuth && typeof win.flowAuth.getAuthHeaders === 'function') {
        try {
          const session = win.flowAuth.getSession && win.flowAuth.getSession();
          // Ignore demo mode from flowAuth (demo token/user) so we don't send a fake Authorization header
          if (session && session.access_token && session.access_token !== 'demo' && session.user && session.user.id !== 'demo-user') {
            const headers = win.flowAuth.getAuthHeaders();
            // Ensure x-actor-id is present when possible
            if (!headers['x-actor-id'] && session.user && session.user.id) headers['x-actor-id'] = session.user.id;
            return headers;
          }
        } catch (e) {
          // fallback to supabase client below
        }
      }
      // Fallback to Supabase client session
      if (win.supabaseClient && win.supabaseClient.auth) {
        try {
          const res = await win.supabaseClient.auth.getUser();
          const user = res?.data?.user;
          if (user && user.id) {
            const headers: any = { 'x-actor-id': user.id };
            try {
              const session = (await win.supabaseClient.auth.getSession())?.data?.session;
              if (session?.access_token) headers['authorization'] = 'Bearer ' + session.access_token;
            } catch (e) {}
            return headers;
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }
    return { 'Content-Type': 'application/json' };
  };

  const loadInvites = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/invites?team_id=${teamId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites || []);
      }
    } catch (error) {
      console.error("Error loading invites:", error);
    }
  };

  const handleInviteByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          team_id: teamId,
          project_id: projectId,
          email,
          role,
          is_link_invite: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create invite");
      }

      setMessage(`✅ Invito inviato a ${email}`);
      setEmail("");
      loadInvites();
    } catch (error: any) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    setMessage("");

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          team_id: teamId,
          project_id: projectId,
          role: inviteRole,
          is_link_invite: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create invite link");
      }

      setLinkInvite(data.invite_url);
      setMessage("✅ Link generato!");
      loadInvites();
    } catch (error: any) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      let toCopy = linkInvite || '';
      if (!toCopy) {
        setMessage('❌ Nessun link disponibile');
        return;
      }

      // Normalize: if relative path or starts with "/invite" or "/share", prepend origin
      if (/^\//.test(toCopy)) {
        toCopy = window.location.origin.replace(/\/+$/, '') + toCopy;
      }
      if (!/^https?:\/\//i.test(toCopy)) {
        // If invite_url sometimes comes as hostless like "localhost:3000/...", ensure protocol
        if (/^[^/:]+:\d+\//.test(toCopy)) {
          toCopy = 'http://' + toCopy;
        }
      }

      // Prefer modern clipboard API, fallback to textarea+execCommand for older/mobile browsers
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(toCopy);
      } else {
        const ta = document.createElement('textarea');
        ta.value = toCopy;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (!ok) throw new Error('execCommand failed');
      }

      setMessage('✅ Link copiato!');
      setTimeout(() => setMessage(''), 2000);
    } catch (e) {
      console.error('[ShareModal] copy failed', e);
      setMessage('❌ Impossibile copiare — prova a tenere premuto il link e copiare manualmente');
    }
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/invites?invite_id=${inviteId}`, {
        method: "DELETE",
        headers: { ...headers },
      });

      if (res.ok) {
        setMessage("✅ Invito revocato");
        loadInvites();
      }
    } catch (error) {
      console.error("Error revoking invite:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1a1a1a",
          borderRadius: "8px",
          padding: "2rem",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
          border: "1px solid #333",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0, color: "#fff" }}>
            Condividi: {projectName}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#999",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "0.25rem",
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid #333" }}>
          <button
            onClick={() => setActiveTab("email")}
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "email" ? "2px solid #0066ff" : "2px solid transparent",
              color: activeTab === "email" ? "#0066ff" : "#999",
              cursor: "pointer",
              fontWeight: activeTab === "email" ? "600" : "400",
            }}
          >
            📧 Via Email
          </button>
          <button
            onClick={() => setActiveTab("link")}
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "link" ? "2px solid #0066ff" : "2px solid transparent",
              color: activeTab === "link" ? "#0066ff" : "#999",
              cursor: "pointer",
              fontWeight: activeTab === "link" ? "600" : "400",
            }}
          >
            🔗 Link Condivisibile
          </button>
        </div>

        {activeTab === "email" ? (
          <form onSubmit={handleInviteByEmail}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#ccc" }}>
                Email dell'utente da invitare
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@example.com"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  border: "1px solid #333",
                  background: "#0a0a0a",
                  color: "#fff",
                  fontSize: "1rem",
                }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#ccc" }}>
                Ruolo
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  border: "1px solid #333",
                  background: "#0a0a0a",
                  color: "#fff",
                  fontSize: "1rem",
                }}
              >
                <option value="viewer">👁️ Visualizzatore (solo lettura)</option>
                <option value="commenter">💬 Commentatore (può commentare)</option>
                <option value="editor">✏️ Editor (può modificare)</option>
                <option value="owner">👑 Proprietario (controllo totale)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: loading ? "#333" : "#0066ff",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "1rem",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Invio..." : "Invia invito"}
            </button>
          </form>
        ) : (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#ccc" }}>
                Ruolo per il link
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  border: "1px solid #333",
                  background: "#0a0a0a",
                  color: "#fff",
                  fontSize: "1rem",
                }}
              >
                <option value="viewer">👁️ Visualizzatore (solo lettura)</option>
                <option value="commenter">💬 Commentatore (può commentare)</option>
                <option value="editor">✏️ Editor (può modificare)</option>
              </select>
            </div>

            <button
              onClick={handleGenerateLink}
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: loading ? "#333" : "#0066ff",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "1rem",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                marginBottom: "1rem",
              }}
            >
              {loading ? "Generazione..." : "Genera link di invito"}
            </button>

            {linkInvite && (
              <div
                style={{
                  padding: "1rem",
                  background: "#0a0a0a",
                  borderRadius: "4px",
                  border: "1px solid #333",
                }}
              >
                <div style={{ marginBottom: "0.5rem", color: "#999", fontSize: "0.85rem" }}>
                  Link generato:
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    value={linkInvite}
                    readOnly
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "4px",
                      color: "#0066ff",
                      fontSize: "0.9rem",
                    }}
                  />
                  <button
                    onClick={copyToClipboard}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#333",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    📋 Copia
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {message && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: message.includes("❌") ? "#4d1a1a" : "#1a4d1a",
              borderRadius: "4px",
              color: "#fff",
              fontSize: "0.9rem",
            }}
          >
            {message}
          </div>
        )}

        {/* Lista inviti attivi */}
        {invites.length > 0 && (
          <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #333" }}>
            <h3 style={{ marginBottom: "1rem", color: "#ccc", fontSize: "0.9rem" }}>
              Inviti attivi ({invites.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem",
                    background: "#0a0a0a",
                    borderRadius: "4px",
                    border: "1px solid #333",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", marginBottom: "0.25rem" }}>
                      {invite.email || "🔗 Link pubblico"}
                    </div>
                    <div style={{ color: "#666", fontSize: "0.8rem" }}>
                      {invite.role} · Scade il {new Date(invite.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => revokeInvite(invite.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#4d1a1a",
                      color: "#ff6b6b",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    Revoca
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
