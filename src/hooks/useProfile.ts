import { useCallback, useEffect, useRef, useState } from 'react';

import { getOrCreateProfile, updateProfile } from '@/src/services/profileService';
import type { Profile, ProfileUpdate } from '@/src/types/profile';

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false);
  const request = useRef(0);
  const savingRef = useRef(false);

  useEffect(() => {
    active.current = true;
    const version = ++request.current;
    void getOrCreateProfile(userId).then((result) => {
      if (active.current && request.current === version) {
        setProfile(result);
        setError(null);
      }
    }).catch(() => {
      if (active.current && request.current === version) setError('Unable to load your profile. Check your connection and try again.');
    }).finally(() => {
      if (active.current && request.current === version) setLoading(false);
    });
    return () => { active.current = false; request.current += 1; };
  }, [userId]);

  const reloadProfile = useCallback(async () => {
    if (savingRef.current) return;
    const version = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getOrCreateProfile(userId);
      if (active.current && request.current === version) setProfile(result);
    } catch {
      if (active.current && request.current === version) setError('Unable to load your profile. Check your connection and try again.');
    } finally {
      if (active.current && request.current === version) setLoading(false);
    }
  }, [userId]);

  const saveProfile = useCallback(async (changes: ProfileUpdate): Promise<boolean> => {
    if (savingRef.current) return false;
    savingRef.current = true;
    const version = ++request.current;
    setSaving(true);
    setError(null);
    try {
      const result = await updateProfile(userId, changes);
      if (!active.current || request.current !== version) return false;
      setProfile(result);
      return true;
    } catch {
      if (active.current && request.current === version) setError('Your changes could not be saved. Please try again.');
      return false;
    } finally {
      savingRef.current = false;
      if (active.current && request.current === version) setSaving(false);
    }
  }, [userId]);

  return { profile, loading, saving, error, reloadProfile, saveProfile };
}
