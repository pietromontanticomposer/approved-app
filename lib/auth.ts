// lib/auth.ts
import { supabase } from "./supabaseClient";

/**
 * Ottiene l'utente autenticato corrente
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Ottiene il primo team dell'utente (tipicamente il workspace personale)
 */
export async function getUserDefaultTeam(userId: string) {
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, role, teams(id, name)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    teamId: data.team_id,
    role: data.role,
    teamName: (data.teams as any)?.name || "My Workspace",
  };
}

/**
 * Ottiene tutti i team dell'utente
 */
export async function getUserTeams(userId: string) {
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, role, joined_at, teams(id, name, description)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((tm) => ({
    teamId: tm.team_id,
    role: tm.role,
    joinedAt: tm.joined_at,
    team: tm.teams as any,
  }));
}
