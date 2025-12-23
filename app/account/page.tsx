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
  const [theme, setTheme] = useState("dark-01");
  const [language, setLanguage] = useState("it");
  const [notifications, setNotifications] = useState(true);
  const themeOptions = [
    { value: "dark-01", label: "Scuro 01" },
    { value: "dark-02", label: "Scuro 02" },
    { value: "azure-01", label: "Azzurro 01" },
    { value: "dark", label: "Scuro" },
    { value: "light", label: "Chiaro" },
  ];

  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() ||
    (user?.email ? user.email.slice(0, 2).toUpperCase() : "AC");
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString("it-IT")
    : "—";
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("it-IT")
    : "—";

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

  useEffect(() => {
    try {
      const stored = localStorage.getItem("approved_theme");
      if (stored) setTheme(stored);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("approved_theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
    } catch {}
  }, [theme]);

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
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap');
      `}</style>

      <div style={styles.shell}>
        <div style={styles.headerRow}>
          <div>
            <div style={styles.eyebrow}>Account</div>
            <h1 style={styles.title}>Il mio account</h1>
            <p style={styles.subtitle}>Gestisci dati personali, sicurezza e preferenze.</p>
          </div>
          <button
            style={styles.ghostButton}
            onClick={() => {
              window.location.href = "/";
            }}
          >
            ← Torna all'app
          </button>
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <div style={styles.cardEyebrow}>Profilo</div>
                <h2 style={styles.cardTitle}>Dati personali</h2>
                <p style={styles.cardDesc}>Aggiorna nome e preferenze di profilo.</p>
              </div>
              <div style={styles.avatar}>{initials}</div>
            </div>
            <div style={styles.profileSummary}>
              <div style={styles.profileName}>
                {user.user_metadata?.full_name || `${firstName} ${lastName}`.trim() || "Utente"}
              </div>
              <div style={styles.profileEmail}>{user.email || "—"}</div>
              <div style={styles.profileMeta}>
                <span>ID {user.id?.slice(0, 8) || "—"}</span>
                <span>Creato {createdAt}</span>
              </div>
            </div>
            <div style={styles.fieldStack}>
              <div style={styles.fieldRow}>
                <div style={styles.label}>Nome</div>
                <div style={styles.inputRow}>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nome" style={styles.input} />
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Cognome" style={styles.input} />
                </div>
              </div>
              <div style={styles.fieldRow}>
                <div style={styles.label}>Email</div>
                <div style={styles.value}>{user.email || "—"}</div>
              </div>
              <div style={styles.fieldRow}>
                <div style={styles.label}>Foto profilo</div>
                <div style={styles.value}>Gestita dal provider collegato</div>
              </div>
            </div>
            <div style={styles.actionsRow}>
              <button style={styles.primaryButton} onClick={handleSaveProfile}>Salva modifiche</button>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <div style={styles.cardEyebrow}>Sicurezza</div>
                <h2 style={styles.cardTitle}>Accesso e sessioni</h2>
                <p style={styles.cardDesc}>Controlla provider e password.</p>
              </div>
              <div style={styles.securityBadge}>Sessione attiva</div>
            </div>
            <div style={styles.securityStats}>
              <div style={styles.statItem}>
                <div style={styles.statLabel}>Ultimo accesso</div>
                <div style={styles.statValue}>{lastSignIn}</div>
              </div>
              <div style={styles.statItem}>
                <div style={styles.statLabel}>Provider</div>
                <div style={styles.statValue}>{providers.length || 0}</div>
              </div>
            </div>
            <div style={styles.subsection}>
              <div style={styles.subLabel}>Provider collegati</div>
              <div style={styles.providerList}>
                {providers.length === 0 && <span style={styles.muted}>Nessun provider trovato</span>}
                {providers.map((p) => (
                  <span key={p.identityId || p.provider} style={styles.providerChip}>
                    {providerLabel(p.provider)} {p.email ? `· ${p.email}` : ""}
                  </span>
                ))}
              </div>
            </div>

            {showPasswordSection ? (
              <div style={styles.subsection}>
                <div style={styles.subLabel}>Cambia password</div>
                <div style={styles.inputRow}>
                  <input
                    type="password"
                    placeholder="Nuova password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={styles.input}
                  />
                  <button style={styles.primaryButton} onClick={handlePasswordChange}>Aggiorna</button>
                </div>
              </div>
            ) : (
              <div style={styles.subsection}>
                <div style={styles.subLabel}>Cambia password</div>
                <div style={styles.muted}>Non disponibile per i provider social (Google/Apple).</div>
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
            <div style={styles.cardHeader}>
              <div>
                <div style={styles.cardEyebrow}>Preferenze</div>
                <h2 style={styles.cardTitle}>Esperienza</h2>
                <p style={styles.cardDesc}>Personalizza l’interfaccia.</p>
              </div>
            </div>
            <div style={styles.fieldStack}>
              <div style={styles.fieldRow}>
                <div style={styles.label}>Tema</div>
                <select style={styles.select} value={theme} onChange={(e) => setTheme(e.target.value)}>
                  {themeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
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
                <label style={styles.toggleRow}>
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
        </div>

        {(message || error) && (
          <div style={{ ...styles.notice, borderColor: error ? "#4d1a1a" : "#1a4d1a" }}>
            <div style={{ color: error ? "#ff6b6b" : "#44ff44" }}>
              {error || message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at 15% 15%, var(--bg-ink), var(--bg-deep) 45%, var(--bg-core) 100%)",
    color: "var(--text)",
    padding: "2.5rem",
    fontFamily: '"Space Grotesk", "DM Sans", sans-serif',
  },
  shell: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    gap: "1rem",
    flexWrap: "wrap",
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: "0.22em",
    fontSize: "0.7rem",
    color: "var(--text-weak)",
  },
  title: { margin: 0, fontSize: "2.2rem", color: "var(--text-strong)" },
  subtitle: { color: "var(--text-subtle)", margin: "0.4rem 0 0" },
  muted: { color: "var(--text-subtle)", margin: 0 },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 1.2fr) minmax(320px, 1fr)",
    gap: "1.5rem",
  },
  card: {
    background: "linear-gradient(180deg, var(--surface), var(--surface-2))",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "1.5rem",
    boxShadow: "0 20px 40px rgba(2,8,23,0.35)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
    marginBottom: "1rem",
  },
  cardEyebrow: {
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: "0.7rem",
    color: "var(--text-weak)",
  },
  cardTitle: { margin: "0.35rem 0 0", fontSize: "1.35rem", color: "var(--text-strong)" },
  cardDesc: { margin: "0.35rem 0 0", color: "var(--text-subtle)", fontSize: "0.95rem" },
  avatar: {
    width: "54px",
    height: "54px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, var(--accent-strong), var(--accent-bright))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: "1rem",
  },
  profileSummary: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "1rem",
    marginBottom: "1rem",
  },
  profileName: { fontSize: "1.1rem", color: "var(--text-strong)", fontWeight: 600 },
  profileEmail: { color: "var(--text-subtle)", marginTop: "0.2rem" },
  profileMeta: {
    marginTop: "0.6rem",
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    fontSize: "0.85rem",
    color: "var(--text-weak)",
  },
  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.65rem 0",
    borderBottom: "1px solid var(--border)",
    gap: "1rem",
    flexWrap: "wrap",
  },
  fieldStack: {
    display: "flex",
    flexDirection: "column",
    gap: "0.1rem",
  },
  label: { color: "var(--text-subtle)", fontSize: "0.9rem" },
  value: { color: "var(--text)", fontSize: "0.95rem" },
  subLabel: { color: "var(--text-subtle)", fontSize: "0.9rem", marginBottom: "0.35rem" },
  subsection: { marginTop: "0.9rem", borderTop: "1px solid var(--border)", paddingTop: "0.9rem" },
  buttonsRow: { display: "flex", gap: "0.75rem", marginTop: "0.9rem", flexWrap: "wrap" },
  inputRow: {
    display: "flex",
    gap: "0.6rem",
    alignItems: "center",
    flexWrap: "wrap",
    minWidth: "240px",
  },
  actionsRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "1rem",
  },
  primaryButton: {
    background: "linear-gradient(135deg, var(--accent-strong), var(--accent-bright))",
    color: "#fff",
    border: "none",
    padding: "0.65rem 1.1rem",
    borderRadius: "999px",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryButton: {
    background: "var(--surface-2)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    padding: "0.6rem 1.1rem",
    borderRadius: "999px",
    cursor: "pointer",
    fontWeight: 600,
  },
  ghostButton: {
    background: "transparent",
    color: "var(--text-muted)",
    border: "1px solid var(--border)",
    padding: "0.6rem 1.1rem",
    borderRadius: "999px",
    cursor: "pointer",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    minWidth: "180px",
    padding: "0.6rem 0.75rem",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
  },
  select: {
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "0.45rem 0.7rem",
    minWidth: "140px",
  },
  providerList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  providerChip: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "999px",
    padding: "0.35rem 0.8rem",
    fontSize: "0.85rem",
    color: "var(--text)",
  },
  securityBadge: {
    background: "rgba(16,185,129,0.12)",
    border: "1px solid rgba(16,185,129,0.4)",
    color: "#6ee7b7",
    fontSize: "0.8rem",
    padding: "0.35rem 0.8rem",
    borderRadius: "999px",
  },
  securityStats: {
    display: "flex",
    gap: "1.5rem",
    flexWrap: "wrap",
    marginBottom: "0.8rem",
  },
  statItem: {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "0.6rem 0.9rem",
    minWidth: "160px",
  },
  statLabel: { color: "var(--text-subtle)", fontSize: "0.8rem" },
  statValue: { color: "var(--text-strong)", fontSize: "0.95rem", marginTop: "0.2rem" },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
  },
  notice: {
    marginTop: "1.5rem",
    padding: "0.9rem 1rem",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    background: "var(--surface-2)",
  },
};
