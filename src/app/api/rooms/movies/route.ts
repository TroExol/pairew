import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { tmdbClient } from '@/lib/tmdb/client';
import { createClient } from '@/lib/supabase/server';

// Получить фильмы для комнаты на основе предпочтений участников
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const roomId = searchParams.get('roomId');
  const page = parseInt(searchParams.get('page') || '1', 10);

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Получаем участников комнаты
  const { data: participants } = await supabase
    .from('room_participants')
    .select('user_id')
    .eq('room_id', roomId);

  if (!participants?.length) {
    return NextResponse.json({ error: 'No participants found' }, { status: 404 });
  }

  const userIds = participants.map(p => p.user_id);

  // Получаем предпочтения всех участников
  const { data: allPreferences } = await supabase
    .from('preferences')
    .select('*')
    .in('user_id', userIds);

  // Находим пересечение жанров
  const genreSets = allPreferences
    ?.filter(p => p.genres?.length)
    .map(p => new Set(p.genres)) ?? [];

  let commonGenres: number[] = [];
  if (genreSets.length > 0) {
    commonGenres = [...genreSets[0]].filter(genre =>
      genreSets.every(set => set.has(genre)),
    );

    // Если нет общих жанров, берём все уникальные
    if (commonGenres.length === 0) {
      const allGenres = new Set<number>();
      genreSets.forEach(set => set.forEach(g => allGenres.add(g)));
      commonGenres = [...allGenres];
    }
  }

  // Находим диапазон годов
  const yearFromValues = allPreferences
    ?.filter(p => p.year_from !== null)
    .map(p => p.year_from!) ?? [];
  const yearToValues = allPreferences
    ?.filter(p => p.year_to !== null)
    .map(p => p.year_to!) ?? [];

  const yearFrom = yearFromValues.length > 0 ? Math.max(...yearFromValues) : undefined;
  const yearTo = yearToValues.length > 0 ? Math.min(...yearToValues) : undefined;

  try {
    const movies = await tmdbClient.discoverMovies({
      genres: commonGenres.length > 0 ? commonGenres : undefined,
      yearFrom,
      yearTo,
      page,
      sortBy: 'popularity.desc',
    });

    return NextResponse.json(movies);
  } catch (error) {
    console.error('Error fetching movies for room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 },
    );
  }
}

