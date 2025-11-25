'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import type { Database } from '@/types/database';

import { createClient } from '@/lib/supabase/client';

type Vote = Database['public']['Tables']['votes']['Row'];

// Хук для получения результатов комнаты
export function useRoomResults(roomId: string | undefined) {
  const [results, setResults] = useState<{
    matches: Array<{ movie_id: number; count: number; voters: string[] }>;
    partial: Array<{ movie_id: number; count: number; voters: string[] }>;
    noMatch: number[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      // Получаем все голоса в комнате
      const { data: allVotes } = await supabase
        .from('votes')
        .select('*')
        .eq('room_id', roomId);

      // Получаем количество участников
      const { data: participants } = await supabase
        .from('room_participants')
        .select('user_id')
        .eq('room_id', roomId);

      if (!allVotes || !participants) {
        setLoading(false);
        return;
      }

      const participantCount = participants.length;
      const movieVotes = new Map<number, { liked: string[]; disliked: string[] }>();

      // Группируем голоса по фильмам
      allVotes.forEach((v: Vote) => {
        const current = movieVotes.get(v.movie_id) || { liked: [], disliked: [] };
        if (v.liked) {
          current.liked.push(v.user_id);
        } else {
          current.disliked.push(v.user_id);
        }
        movieVotes.set(v.movie_id, current);
      });

      // Формируем результаты
      const matches: Array<{ movie_id: number; count: number; voters: string[] }> = [];
      const partial: Array<{ movie_id: number; count: number; voters: string[] }> = [];
      const noMatch: number[] = [];

      movieVotes.forEach((data, movieId) => {
        if (data.liked.length === participantCount) {
          // Все лайкнули
          matches.push({ movie_id: movieId, count: data.liked.length, voters: data.liked });
        } else if (data.liked.length > 0) {
          // Частичное совпадение
          partial.push({ movie_id: movieId, count: data.liked.length, voters: data.liked });
        } else {
          // Никто не лайкнул
          noMatch.push(movieId);
        }
      });

      // Сортируем по количеству голосов
      matches.sort((a, b) => b.count - a.count);
      partial.sort((a, b) => b.count - a.count);

      setResults({ matches, partial, noMatch });
      setLoading(false);
    };

    void fetchResults();
  }, [roomId, supabase]);

  return { results, loading };
}

export function useVotes(roomId: string | undefined, userId: string | undefined) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (!roomId || !userId) {
      setLoading(false);
      return;
    }

    const fetchVotes = async () => {
      const { data } = await supabase
        .from('votes')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId);

      setVotes(data ?? []);
      setLoading(false);
    };

    void fetchVotes();
  }, [roomId, userId, supabase]);

  const vote = useCallback(async (movieId: number, liked: boolean) => {
    if (!roomId || !userId) {
      throw new Error('Room or user not available');
    }

    const { data, error } = await supabase
      .from('votes')
      .insert({
        room_id: roomId,
        user_id: userId,
        movie_id: movieId,
        liked,
      })
      .select()
      .single<Vote>();

    if (error) throw error;
    if (!data) throw new Error('Failed to create vote');

    setVotes(prev => [...prev, data]);
    return data;
  }, [roomId, userId, supabase]);

  const hasVoted = useCallback((movieId: number) => {
    return votes.some(v => v.movie_id === movieId);
  }, [votes]);

  const getVoteCount = useCallback(() => {
    return votes.length;
  }, [votes]);

  return {
    votes,
    loading,
    vote,
    hasVoted,
    getVoteCount,
  };
}
