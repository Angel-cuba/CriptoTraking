import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import {
  getOrCreateProfile,
  updateProfile,
} from "@/src/services/profileService";
import type { Profile, ProfileUpdate } from "@/src/types/profile";

type ProfileState = {
  profile: Profile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  reloadProfile: () => Promise<void>;
  saveProfile: (changes: ProfileUpdate) => Promise<boolean>;
  toggleWatchlist: (symbol: string) => Promise<boolean>;
};

export const ProfileContext = createContext<ProfileState | undefined>(
  undefined,
);

export function ProfileProvider({
  userId,
  children,
}: PropsWithChildren<{ userId: string }>) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentProfile = useRef<Profile | null>(null);
  const active = useRef(false);
  const busy = useRef(false);
  const request = useRef(0);

  const reloadProfile = useCallback(async () => {
    if (!active.current || busy.current) return;
    busy.current = true;
    const version = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getOrCreateProfile(userId);
      if (!active.current || request.current !== version) return;
      currentProfile.current = result;
      setProfile(result);
    } catch {
      if (active.current && request.current === version) {
        setError(
          "Unable to load your profile. Check your connection and try again.",
        );
      }
    } finally {
      if (active.current && request.current === version) {
        busy.current = false;
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    active.current = true;
    const timer = setTimeout(() => void reloadProfile(), 0);
    return () => {
      active.current = false;
      request.current += 1;
      busy.current = false;
      currentProfile.current = null;
      clearTimeout(timer);
    };
  }, [reloadProfile]);

  const saveProfile = useCallback(
    async (changes: ProfileUpdate): Promise<boolean> => {
      if (!active.current || !currentProfile.current || busy.current)
        return false;
      busy.current = true;
      const version = ++request.current;
      setSaving(true);
      setError(null);
      try {
        const result = await updateProfile(userId, changes);
        if (!active.current || request.current !== version) return false;
        currentProfile.current = result;
        setProfile(result);
        return true;
      } catch {
        if (active.current && request.current === version) {
          setError("Your changes could not be saved. Please try again.");
        }
        return false;
      } finally {
        if (active.current && request.current === version) {
          busy.current = false;
          setSaving(false);
        }
      }
    },
    [userId],
  );

  const toggleWatchlist = useCallback(
    (symbol: string): Promise<boolean> => {
      const current = currentProfile.current;
      if (!current) return Promise.resolve(false);
      const watchlist = current.watchlist.includes(symbol)
        ? current.watchlist.filter((item) => item !== symbol)
        : [...current.watchlist, symbol];
      return saveProfile({ watchlist });
    },
    [saveProfile],
  );

  const value = useMemo(
    () => ({
      profile,
      loading,
      saving,
      error,
      reloadProfile,
      saveProfile,
      toggleWatchlist,
    }),
    [
      profile,
      loading,
      saving,
      error,
      reloadProfile,
      saveProfile,
      toggleWatchlist,
    ],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}
