'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { Database } from '@/types/database';

import { createClient } from '@/lib/supabase/client';
import { APP_CONFIG } from '@/lib/constants';

export interface VotingProgress {
  participantCount: number;
  finishedCount: number;
  allFinished: boolean;
  userVoteCounts: Map<string, number>;
}

interface RoomResultsReturn {
  results: {
    matches: Array<{ movie_id: number; count: number; voters: string[] }>;
    partial: Array<{ movie_id: number; count: number; voters: string[] }>;
    noMatch: number[];
  } | null;
  loading: boolean;
  votingProgress: VotingProgress | null;
  refetch: () => Promise<void>;
}

type Vote = Database['public']['Tables']['votes']['Row'];

// Хук для получения результатов комнаты
export function useRoomResults(roomId: string | undefined): RoomResultsReturn {
  const [results, setResults] = useState<{
    matches: Array<{ movie_id: number; count: number; voters: string[] }>;
    partial: Array<{ movie_id: number; count: number; voters: string[] }>;
    noMatch: number[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [votingProgress, setVotingProgress] = useState<VotingProgress | null>(null);

  // Храним предыдущее количество завершивших для сравнения
  const prevFinishedCountRef = useRef<number>(0);

  const supabase = createClient();

  const fetchResults = useCallback(async () => {
    if (!roomId) {
      setLoading(false);
      return;
    }

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
    const userVoteCounts = new Map<string, number>();

    // Инициализируем счётчики для всех участников
    participants.forEach((p: { user_id: string }) => {
      userVoteCounts.set(p.user_id, 0);
    });

    // Группируем голоса по фильмам и считаем голоса пользователей
    allVotes.forEach((v: Vote) => {
      const current = movieVotes.get(v.movie_id) || { liked: [], disliked: [] };
      if (v.liked) {
        current.liked.push(v.user_id);
      } else {
        current.disliked.push(v.user_id);
      }
      movieVotes.set(v.movie_id, current);

      // Увеличиваем счётчик голосов пользователя
      const currentCount = userVoteCounts.get(v.user_id) || 0;
      userVoteCounts.set(v.user_id, currentCount + 1);
    });

    // Считаем сколько участников завершили голосование (достигли MAX_SWIPES)
    let finishedCount = 0;
    userVoteCounts.forEach(count => {
      if (count >= APP_CONFIG.MAX_SWIPES) {
        finishedCount++;
      }
    });

    const allFinished = finishedCount === participantCount;

    // Обновляем ref с текущим значением
    prevFinishedCountRef.current = finishedCount;

    setVotingProgress({
      participantCount,
      finishedCount,
      allFinished,
      userVoteCounts,
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
  }, [roomId, supabase]);

  // Быстрая проверка прогресса без пересчёта результатов
  const checkProgressAndMaybeRefetch = useCallback(async () => {
    if (!roomId) return;

    // Получаем количество голосов по каждому пользователю
    const { data: allVotes } = await supabase
      .from('votes')
      .select('user_id')
      .eq('room_id', roomId);

    const { data: participants } = await supabase
      .from('room_participants')
      .select('user_id')
      .eq('room_id', roomId);

    if (!allVotes || !participants) return;

    const userVoteCounts = new Map<string, number>();

    // Инициализируем счётчики для всех участников
    participants.forEach((p: { user_id: string }) => {
      userVoteCounts.set(p.user_id, 0);
    });

    // Считаем голоса пользователей
    allVotes.forEach((v: { user_id: string }) => {
      const currentCount = userVoteCounts.get(v.user_id) || 0;
      userVoteCounts.set(v.user_id, currentCount + 1);
    });

    // Считаем сколько участников завершили голосование
    let finishedCount = 0;
    userVoteCounts.forEach(count => {
      if (count >= APP_CONFIG.MAX_SWIPES) {
        finishedCount++;
      }
    });

    // Обновляем прогресс голосования для отображения в UI
    const allFinished = finishedCount === participants.length;
    setVotingProgress({
      participantCount: participants.length,
      finishedCount,
      allFinished,
      userVoteCounts,
    });

    // Пересчитываем результаты только если изменилось количество завершивших
    if (finishedCount !== prevFinishedCountRef.current) {
      prevFinishedCountRef.current = finishedCount;
      void fetchResults();
    }
  }, [roomId, supabase, fetchResults]);

  useEffect(() => {
    void fetchResults();
  }, [fetchResults]);

  // Realtime подписка на изменения голосов
  useEffect(() => {
    if (!roomId) return;

    let channel: RealtimeChannel;

    const setupRealtime = () => {
      channel = supabase
        .channel(`votes:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'votes',
            filter: `room_id=eq.${roomId}`,
          },
          () => {
            // Проверяем прогресс и обновляем результаты только если кто-то завершил
            void checkProgressAndMaybeRefetch();
          },
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [roomId, supabase, checkProgressAndMaybeRefetch]);

  return { results, loading, votingProgress, refetch: fetchResults };
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
      .upsert(
        {
          room_id: roomId,
          user_id: userId,
          movie_id: movieId,
          liked,
        },
        { onConflict: 'room_id,user_id,movie_id' },
      )
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
