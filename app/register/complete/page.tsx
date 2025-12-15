"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
        setMessage("You must be signed in to complete your profile.");
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

      setMessage("Profile saved. Redirecting…");
      setTimeout(() => router.push('/'), 900);
    } catch (err: any) {
      console.error('[CompleteProfile] Error saving profile', err);
      setMessage(err?.message || 'Error saving profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '40px auto' }}>
      <h2>Complete your profile</h2>
      <p>Please enter your name and choose your professional role.</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>First name</label>
          <input value={firstName} onChange={e => setFirstName(e.target.value)} required style={{ width: '100%', padding: 8 }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Last name</label>
          <input value={lastName} onChange={e => setLastName(e.target.value)} required style={{ width: '100%', padding: 8 }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Role</label>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: 8 }}>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px 16px' }}>{loading ? 'Saving…' : 'Save profile'}</button>
      </form>

      {message && <div style={{ marginTop: 12 }}>{message}</div>}
    </div>
  );
}
