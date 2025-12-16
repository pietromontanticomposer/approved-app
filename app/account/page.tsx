"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProviderInfo {
  provider: string;
  identityId?: string;
  email?: string | null;
}

export default function AccountPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [theme, setTheme] = useState("dark");
  const [language, setLanguage] = useState("it");
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { getSupabaseClient } = await import("@/lib/supabaseClient");
      const client = getSupabaseClient();
      setSupabase(client);

      const { data: userData } = await client.auth.getUser();
      setUser(userData?.user || null);

      const meta = userData?.user?.user_metadata || {};
      setFirstName(meta.first_name || meta.firstName || "");
      setLastName(meta.last_name || meta.lastName || "");

      const identities: ProviderInfo[] = (userData?.user?.identities || []).map((i: any) => ({
        provider: i.provider,
        identityId: i.identity_id,
        email: i.identity_data?.email || userData?.user?.email || null,
      }));
      setProviders(identities);

      setLoading(false);
    };

    init();
  }, []);

  const signOut = async (global = false) => {
    if (!supabase) return;
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signOut({ scope: global ? "global" : "local" });
    if (error) {
      setError(error.message);
    } else {
      setMessage(global ? "Logout da tutti i dispositivi eseguito" : "Logout eseguito");
      router.push("/login");
    }
  };

  const handlePasswordChange = async () => {
    if (!supabase) return;
    if (newPassword.length < 6) {
      setError("La password deve avere almeno 6 caratteri");
      return;
    }
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setError(error.message);
    else setMessage("Password aggiornata");
  };

  const handleSaveProfile = async () => {
    if (!supabase) return;
    setError(null);
    setMessage(null);
    try {
      const full = `${firstName || ""} ${lastName || ""}`.trim();
      const { error: updErr } = await supabase.auth.updateUser({
        data: {
          first_name: firstName || null,
          last_name: lastName || null,
          full_name: full || null,
        },
      });
      if (updErr) {
        setError(updErr.message || 'Errore aggiornamento profilo');
        return;
      }

      // Refresh user
      const { data: refreshed } = await supabase.auth.getUser();
      setUser(refreshed?.user || null);
      setMessage('Profilo aggiornato');
    } catch (e: any) {
      setError(e?.message || 'Errore');
    }
  };

  const showPasswordSection = providers.some(p => p.provider === "email");

  const providerLabel = (p: string) => {
    if (p === "google") return "Google";
    if (p === "apple") return "Apple";
    if (p === "email") return "Email/Password";
    return p;
  };

  if (loading) {
    return (
      <div style={styles.page}>Caricamento account...</div>
    );
  }

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Account</h1>
          <p style={styles.muted}>Non sei autenticato.</p>
          <button style={styles.primaryButton} onClick={() => router.push("/login")}>Vai al login</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Il mio account</h1>
          <p style={styles.muted}>Gestisci dati personali, sicurezza e preferenze</p>
        </div>
        <button style={styles.ghostButton} onClick={() => router.push("/")}>← Torna all'app</button>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>👤 Dati personali</h2>
          <div style={styles.fieldRow}>
            <div style={styles.label}>Nome</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nome" style={{ ...styles.input, width: '140px' }} />
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Cognome" style={{ ...styles.input, width: '180px' }} />
              <button style={styles.primaryButton} onClick={handleSaveProfile}>Salva</button>
            </div>
            
          </div>
          <div style={styles.fieldRow}>
            <div style={styles.label}>Nome completo</div>
            <div style={styles.value}>{user.user_metadata?.full_name || `${firstName} ${lastName}`.trim() || "—"}</div>
          </div>
          <div style={styles.fieldRow}>
            <div style={styles.label}>Email</div>
            <div style={styles.value}>{user.email || "—"}</div>
          </div>
          <div style={styles.fieldRow}>
            <div style={styles.label}>Foto profilo</div>
            <div style={styles.value}>Usa il provider collegato (Google/Apple)</div>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>🔐 Sicurezza</h2>
          <div style={styles.subsection}>
            <div style={styles.subLabel}>Provider collegati</div>
            <ul style={{ paddingLeft: "1rem", margin: 0 }}>
              {providers.length === 0 && <li style={styles.muted}>Nessun provider trovato</li>}
              {providers.map((p) => (
                <li key={p.identityId || p.provider} style={styles.value}>
                  {providerLabel(p.provider)} {p.email ? `(${p.email})` : ""}
                </li>
              ))}
            </ul>
          </div>

          {showPasswordSection ? (
            <div style={styles.subsection}>
              <div style={styles.subLabel}>Cambia password</div>
              <input
                type="password"
                placeholder="Nuova password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
              />
              <button style={styles.primaryButton} onClick={handlePasswordChange}>Aggiorna password</button>
            </div>
          ) : (
            <div style={styles.subsection}>
              <div style={styles.subLabel}>Cambia password</div>
              <div style={styles.muted}>Non disponibile per i provider social (Google/Apple)</div>
            </div>
          )}

          <div style={styles.buttonsRow}>
            <button style={styles.secondaryButton} onClick={() => signOut(false)}>Logout</button>
            <button style={styles.ghostButton} onClick={() => signOut(true)}>Logout da tutti i dispositivi</button>
          </div>
          <div style={styles.subsection}>
            <div style={styles.subLabel}>Cancella account</div>
            <div style={styles.muted}>Contatta il supporto per la cancellazione definitiva.</div>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>⚙️ Preferenze</h2>
          <div style={styles.fieldRow}>
            <div style={styles.label}>Tema</div>
            <select style={styles.select} value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="dark">Scuro</option>
              <option value="light">Chiaro</option>
            </select>
          </div>
          <div style={styles.fieldRow}>
            <div style={styles.label}>Lingua</div>
            <select style={styles.select} value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="it">Italiano</option>
              <option value="en">English</option>
            </select>
          </div>
          <div style={styles.fieldRow}>
            <div style={styles.label}>Notifiche</div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
              <span style={styles.value}>Attive</span>
            </label>
          </div>
        </div>
      </div>

      {(message || error) && (
        <div style={{ ...styles.card, borderColor: error ? "#4d1a1a" : "#1a4d1a" }}>
          <div style={{ color: error ? "#ff6b6b" : "#44ff44" }}>
            {error || message}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, any> = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#fff",
    padding: "2rem",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  title: { margin: 0, fontSize: "1.8rem" },
  muted: { color: "#888", margin: 0 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "1rem",
  },
  card: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "1.25rem",
  },
  cardTitle: { marginTop: 0, marginBottom: "1rem" },
  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 0",
    borderBottom: "1px solid #222",
  },
  label: { color: "#aaa", fontSize: "0.9rem" },
  value: { color: "#fff", fontSize: "0.95rem" },
  subLabel: { color: "#aaa", fontSize: "0.9rem", marginBottom: "0.35rem" },
  subsection: { marginTop: "0.75rem", borderTop: "1px solid #222", paddingTop: "0.75rem" },
  buttonsRow: { display: "flex", gap: "0.5rem", marginTop: "0.5rem" },
  primaryButton: {
    background: "#0066ff",
    color: "#fff",
    border: "none",
    padding: "0.6rem 1rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryButton: {
    background: "#333",
    color: "#fff",
    border: "1px solid #444",
    padding: "0.6rem 1rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
  },
  ghostButton: {
    background: "transparent",
    color: "#999",
    border: "1px solid #333",
    padding: "0.6rem 1rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "0.65rem",
    borderRadius: "6px",
    border: "1px solid #333",
    background: "#0a0a0a",
    color: "#fff",
    marginBottom: "0.5rem",
  },
  select: {
    background: "#0a0a0a",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: "6px",
    padding: "0.45rem",
    minWidth: "140px",
  },
};
