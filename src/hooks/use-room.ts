'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import type { Database } from '@/types/database';

import { createClient } from '@/lib/supabase/client';

type Room = Database['public']['Tables']['rooms']['Row'];
type RoomParticipant = Database['public']['Tables']['room_participants']['Row'];

interface UseRoomReturn {
  room: Room | null;
  participants: RoomParticipant[];
  loading: boolean;
  error: Error | null;
  createRoom: () => Promise<Room>;
  joinRoom: (code: string) => Promise<Room>;
  leaveRoom: () => Promise<void>;
  startVoting: () => Promise<void>;
  finishVoting: () => Promise<void>;
}

export function useRoom(roomId?: string): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  // Загрузка комнаты
  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    const fetchRoom = async () => {
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single<Room>();

        if (roomError) throw roomError;
        setRoom(roomData);

        const { data: participantsData, error: participantsError } = await supabase
          .from('room_participants')
          .select('*')
          .eq('room_id', roomId)
          .returns<RoomParticipant[]>();

        if (participantsError) throw participantsError;
        setParticipants(participantsData ?? []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch room'));
      } finally {
        setLoading(false);
      }
    };

    void fetchRoom();
  }, [roomId, supabase]);

  // Realtime подписка на изменения участников
  useEffect(() => {
    if (!roomId) return;

    let channel: RealtimeChannel;

    const setupRealtime = () => {
      channel = supabase
        .channel(`room:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'room_participants',
            filter: `room_id=eq.${roomId}`,
          },
          () => {
            void (async () => {
              const { data } = await supabase
                .from('room_participants')
                .select('*')
                .eq('room_id', roomId)
                .returns<RoomParticipant[]>();

              setParticipants(data ?? []);
            })();
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rooms',
            filter: `id=eq.${roomId}`,
          },
          payload => {
            setRoom(payload.new as Room);
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
  }, [roomId, supabase]);

  const createRoom = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const code = generateRoomCode();

    const { data: newRoom, error: createError } = await supabase
      .from('rooms')
      .insert({
        code,
        creator_id: user.id,
        status: 'waiting',
      })
      .select()
      .single<Room>();

    if (createError) throw createError;
    if (!newRoom) throw new Error('Failed to create room');

    // Добавляем создателя как участника
    await supabase.from('room_participants').insert({
      room_id: newRoom.id,
      user_id: user.id,
    });

    setRoom(newRoom);
    return newRoom;
  }, [supabase]);

  const joinRoom = useCallback(async (code: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: foundRoom, error: findError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single<Room>();

    if (findError || !foundRoom) {
      throw new Error('Комната не найдена');
    }

    if (foundRoom.status !== 'waiting') {
      throw new Error('Голосование уже началось или завершено');
    }

    // Проверяем, не является ли пользователь уже участником
    const { data: existingParticipant } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', foundRoom.id)
      .eq('user_id', user.id)
      .single<{ id: string }>();

    if (!existingParticipant) {
      await supabase.from('room_participants').insert({
        room_id: foundRoom.id,
        user_id: user.id,
      });
    }

    setRoom(foundRoom);
    return foundRoom;
  }, [supabase]);

  const leaveRoom = useCallback(async () => {
    if (!room) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('room_participants')
      .delete()
      .eq('room_id', room.id)
      .eq('user_id', user.id);

    setRoom(null);
    setParticipants([]);
  }, [room, supabase]);

  const startVoting = useCallback(async () => {
    if (!room) throw new Error('No room');

    await supabase
      .from('rooms')
      .update({ status: 'voting' })
      .eq('id', room.id);
  }, [room, supabase]);

  const finishVoting = useCallback(async () => {
    if (!room) throw new Error('No room');

    await supabase
      .from('rooms')
      .update({ status: 'finished' })
      .eq('id', room.id);
  }, [room, supabase]);

  return {
    room,
    participants,
    loading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    startVoting,
    finishVoting,
  };
}

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
