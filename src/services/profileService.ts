import { supabaseClient } from "@/src/lib/supabase";
import type { Profile, ProfileUpdate } from "@/src/types/profile";

const columns = "id, display_name, risk_profile, watchlist, updated_at";

async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select(columns)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getOrCreateProfile(userId: string): Promise<Profile> {
  const existing = await getProfile(userId);
  if (existing) return existing;

  const { data, error } = await supabaseClient
    .from("profiles")
    .insert({
      id: userId,
      display_name: "",
      risk_profile: "balanced",
      watchlist: [],
    })
    .select(columns)
    .single();

  if (error?.code === "23505") {
    const concurrent = await getProfile(userId);
    if (concurrent) return concurrent;
  }
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  changes: ProfileUpdate,
): Promise<Profile> {
  const values: ProfileUpdate & { updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (changes.display_name !== undefined)
    values.display_name = changes.display_name.trim();
  if (changes.risk_profile !== undefined)
    values.risk_profile = changes.risk_profile;
  if (changes.watchlist !== undefined) values.watchlist = changes.watchlist;
  const { data, error } = await supabaseClient
    .from("profiles")
    .update(values)
    .eq("id", userId)
    .select(columns)
    .single();
  if (error) throw error;
  return data as Profile;
}
