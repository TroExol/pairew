import { NextResponse } from 'next/server';

import type { Database } from '@/types/database';

import { createClient } from '@/lib/supabase/server';

type Room = Database['public']['Tables']['rooms']['Row'];

// Получить список комнат пользователя
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Получаем комнаты, где пользователь является участником
  const { data: participations, error: partError } = await supabase
    .from('room_participants')
    .select('room_id')
    .eq('user_id', user.id);

  if (partError) {
    return NextResponse.json({ error: partError.message }, { status: 500 });
  }

  const roomIds = (participations ?? []).map((p: { room_id: string }) => p.room_id);

  if (roomIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('*')
    .in('id', roomIds)
    .order('created_at', { ascending: false })
    .returns<Room[]>();

  if (roomsError) {
    return NextResponse.json({ error: roomsError.message }, { status: 500 });
  }

  // Получаем количество участников для каждой комнаты
  const roomsWithCounts = await Promise.all(
    (rooms ?? []).map(async (room: Room) => {
      const { count } = await supabase
        .from('room_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);

      return {
        ...room,
        participant_count: count ?? 0,
      };
    }),
  );

  return NextResponse.json(roomsWithCounts);
}
