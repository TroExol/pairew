'use client';

import type { Database } from '@/types/database';

import { useCallback, useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

type Preferences = Database['public']['Tables']['preferences']['Row'];
type PreferencesInsert = Database['public']['Tables']['preferences']['Insert'];

export function usePreferences(userId: string | undefined) {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchPreferences = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setPreferences(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch preferences'));
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    void fetchPreferences();
  }, [fetchPreferences]);

  const savePreferences = useCallback(async (data: Omit<PreferencesInsert, 'user_id'>) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { data: savedData, error: saveError } = await supabase
      .from('preferences')
      .upsert({
        user_id: userId,
        ...data,
      })
      .select()
      .single();

    if (saveError) {
      throw saveError;
    }

    setPreferences(savedData);
    return savedData;
  }, [userId, supabase]);

  return {
    preferences,
    loading,
    error,
    savePreferences,
    refetch: fetchPreferences,
  };
}

