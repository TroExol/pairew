import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import type { TmdbMovie } from '@/types/tmdb';
import type { Database } from '@/types/database';

import { tmdbClient } from '@/lib/tmdb/client';
import { createClient } from '@/lib/supabase/server';

type Room = Database['public']['Tables']['rooms']['Row'];

// Получить фильмы для комнаты по сохранённым movie_ids
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Получаем сохранённые movie_ids для комнаты
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('movie_ids')
    .eq('id', roomId)
    .single<Pick<Room, 'movie_ids'>>();

  if (roomError || !room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (!room.movie_ids || room.movie_ids.length === 0) {
    return NextResponse.json({ error: 'Movies not generated yet. Start voting first.' }, { status: 400 });
  }

  try {
    // Загружаем информацию о фильмах по сохранённым ID
    const moviePromises = room.movie_ids.map(id => tmdbClient.getMovieDetails(id));
    const movieDetails = await Promise.all(moviePromises);

    // Конвертируем TmdbMovieDetails в TmdbMovie, добавляя genre_ids из genres
    const validMovies: TmdbMovie[] = movieDetails
      .filter(m => m !== null)
      .map(m => ({
        ...m,
        genre_ids: m.genres?.map(g => g.id) ?? [],
      }));

    return NextResponse.json({
      page: 1,
      results: validMovies,
      total_pages: 1,
      total_results: validMovies.length,
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 },
    );
  }
}
