"use client";

import { useEffect, useState } from "react";
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

export default function CompleteProfile() {
  const [supabase, setSupabase] = useState<any>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("Other");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    import("@/lib/supabaseClient").then(mod => {
      const client = mod.getSupabaseClient();
      setSupabase(client);
    });
  }, []);

  const roles = [
    "Producer",
    "Editor",
    "Sound Designer",
    "Director",
    "Other",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage("");

    try {
      // Ensure user is signed in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage(bi("Devi effettuare l'accesso per completare il profilo.", "You must be signed in to complete your profile."));
        setLoading(false);
        router.push('/login');
        return;
      }

      // Update user metadata (public metadata) with profile fields
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          role: role,
        },
      });

      if (error) throw error;

      setMessage(bi("Profilo salvato. Reindirizzamento...", "Profile saved. Redirecting..."));
      setTimeout(() => router.push('/'), 900);
    } catch (err: any) {
      console.error('[CompleteProfile] Error saving profile', err);
      setMessage(err?.message || bi('Errore nel salvataggio del profilo', 'Error saving profile'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '40px auto' }}>
      <h2>{bi("Completa il tuo profilo", "Complete your profile")}</h2>
      <p>{bi("Inserisci nome e cognome e scegli il tuo ruolo professionale.", "Please enter your name and choose your professional role.")}</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>{bi("Nome", "First name")}</label>
          <input value={firstName} onChange={e => setFirstName(e.target.value)} required style={{ width: '100%', padding: 8 }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>{bi("Cognome", "Last name")}</label>
          <input value={lastName} onChange={e => setLastName(e.target.value)} required style={{ width: '100%', padding: 8 }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>{bi("Ruolo", "Role")}</label>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: 8 }}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r === "Producer" ? bi("Produttore", "Producer") : r === "Director" ? bi("Regista", "Director") : r === "Other" ? bi("Altro", "Other") : r}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px 16px' }}>
          {loading ? bi('Salvataggio...', 'Saving...') : bi('Salva profilo', 'Save profile')}
        </button>
      </form>

      {message && <div style={{ marginTop: 12 }}>{message}</div>}
    </div>
  );
}
