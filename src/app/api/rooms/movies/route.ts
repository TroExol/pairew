import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import type { Database } from '@/types/database';

import { tmdbClient } from '@/lib/tmdb/client';
import { createClient } from '@/lib/supabase/server';

type Preferences = Database['public']['Tables']['preferences']['Row'];

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

  const userIds = participants.map((p: { user_id: string }) => p.user_id);

  // Получаем предпочтения всех участников
  const { data: allPreferences } = await supabase
    .from('preferences')
    .select('*')
    .in('user_id', userIds)
    .returns<Preferences[]>();

  // Находим пересечение жанров
  const prefsWithGenres = (allPreferences ?? []).filter(
    (p: Preferences) => Array.isArray(p.genres) && p.genres.length > 0,
  );
  const genreSets = prefsWithGenres.map((p: Preferences) => new Set(p.genres));

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
  const yearFromValues = (allPreferences ?? [])
    .filter((p): p is Preferences & { year_from: number } => p.year_from !== null)
    .map(p => p.year_from);
  const yearToValues = (allPreferences ?? [])
    .filter((p): p is Preferences & { year_to: number } => p.year_to !== null)
    .map(p => p.year_to);

  const yearFrom = yearFromValues.length > 0 ? Math.max(...yearFromValues) : undefined;
  const yearTo = yearToValues.length > 0 ? Math.min(...yearToValues) : undefined;

  try {
    // Первая попытка - с полными фильтрами
    let movies = await tmdbClient.discoverMovies({
      genres: commonGenres.length > 0 ? commonGenres : undefined,
      yearFrom,
      yearTo,
      page,
      sortBy: 'popularity.desc',
    });

    // Если фильмов слишком мало (меньше 10), пробуем без года
    if (movies.results.length < 10 && (yearFrom || yearTo)) {
      const moviesWithoutYear = await tmdbClient.discoverMovies({
        genres: commonGenres.length > 0 ? commonGenres : undefined,
        page,
        sortBy: 'popularity.desc',
      });

      // Объединяем результаты, удаляя дубликаты
      const existingIds = new Set(movies.results.map(m => m.id));
      const additionalMovies = moviesWithoutYear.results.filter(m => !existingIds.has(m.id));
      movies = {
        ...movies,
        results: [...movies.results, ...additionalMovies].slice(0, 20),
        total_results: movies.total_results + additionalMovies.length,
      };
    }

    // Если всё ещё мало - добавляем популярные фильмы без фильтров
    if (movies.results.length < 10) {
      const popularMovies = await tmdbClient.getPopularMovies(page);
      const existingIds = new Set(movies.results.map(m => m.id));
      const additionalMovies = popularMovies.results.filter(m => !existingIds.has(m.id));
      movies = {
        ...movies,
        results: [...movies.results, ...additionalMovies].slice(0, 20),
        total_results: movies.total_results + additionalMovies.length,
      };
    }

    return NextResponse.json(movies);
  } catch (error) {
    console.error('Error fetching movies for room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 },
    );
  }
}
