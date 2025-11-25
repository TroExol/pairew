import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import type { TmdbMovie } from '@/types/tmdb';
import type { Database } from '@/types/database';

import { tmdbClient } from '@/lib/tmdb/client';
import { createClient } from '@/lib/supabase/server';

type Preferences = Database['public']['Tables']['preferences']['Row'];
type Room = Database['public']['Tables']['rooms']['Row'];

// Начать голосование в комнате - генерирует фильмы и меняет статус атомарно
export async function POST(request: NextRequest) {
  const { roomId } = await request.json() as { roomId: string };

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Проверяем, что у комнаты ещё нет фильмов и статус 'waiting'
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, status, movie_ids')
    .eq('id', roomId)
    .single<Pick<Room, 'id' | 'status' | 'movie_ids'>>();

  if (roomError || !room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (room.status !== 'waiting') {
    return NextResponse.json({ error: 'Voting already started' }, { status: 400 });
  }

  // Если фильмы уже есть, просто меняем статус
  if (room.movie_ids && room.movie_ids.length > 0) {
    await supabase
      .from('rooms')
      .update({ status: 'voting' })
      .eq('id', roomId);

    return NextResponse.json({ success: true, movieIds: room.movie_ids });
  }

  // Генерируем фильмы
  const movieIds = await generateMoviesForRoom(supabase, roomId);

  // Атомарно сохраняем фильмы и меняем статус
  const { error: updateError } = await supabase
    .from('rooms')
    .update({
      movie_ids: movieIds,
      status: 'voting',
    })
    .eq('id', roomId)
    .eq('status', 'waiting'); // Дополнительная проверка на race condition

  if (updateError) {
    return NextResponse.json({ error: 'Failed to start voting' }, { status: 500 });
  }

  return NextResponse.json({ success: true, movieIds });
}

async function generateMoviesForRoom(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomId: string,
): Promise<number[]> {
  // Получить случайную страницу из диапазона
  const getRandomPage = (totalPages: number, maxPage = 10): number => {
    const availablePages = Math.min(totalPages, maxPage);
    return Math.floor(Math.random() * availablePages) + 1;
  };

  // Fisher-Yates shuffle для случайного перемешивания массива
  const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Получаем участников комнаты
  const { data: participants } = await supabase
    .from('room_participants')
    .select('user_id')
    .eq('room_id', roomId);

  if (!participants?.length) {
    return [];
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

  const allMovies: TmdbMovie[] = [];
  const seenIds = new Set<number>();

  // Хелпер для добавления уникальных фильмов
  const addUniqueMovies = (movies: TmdbMovie[]) => {
    for (const movie of movies) {
      if (!seenIds.has(movie.id)) {
        seenIds.add(movie.id);
        allMovies.push(movie);
      }
    }
  };

  try {
    // Первая попытка - с полными фильтрами и строгими требованиями к качеству
    const initialMovies = await tmdbClient.discoverMovies({
      genres: commonGenres.length > 0 ? commonGenres : undefined,
      yearFrom,
      yearTo,
      page: 1,
      sortBy: 'popularity.desc',
      voteCountGte: 100,
      voteAverageGte: 6.0,
    });

    // Выбираем случайную страницу из доступных
    const randomPage = getRandomPage(initialMovies.total_pages);

    if (randomPage > 1) {
      const randomPageMovies = await tmdbClient.discoverMovies({
        genres: commonGenres.length > 0 ? commonGenres : undefined,
        yearFrom,
        yearTo,
        page: randomPage,
        sortBy: 'popularity.desc',
        voteCountGte: 100,
        voteAverageGte: 6.0,
      });
      addUniqueMovies(randomPageMovies.results);
    }
    addUniqueMovies(initialMovies.results);

    // Если фильмов слишком мало, снижаем требования к качеству
    if (allMovies.length < 15) {
      const moviesLowerQuality = await tmdbClient.discoverMovies({
        genres: commonGenres.length > 0 ? commonGenres : undefined,
        yearFrom,
        yearTo,
        page: getRandomPage(5),
        sortBy: 'popularity.desc',
        voteCountGte: 30,
        voteAverageGte: 5.0,
      });
      addUniqueMovies(moviesLowerQuality.results);
    }

    // Если всё ещё мало - пробуем без фильтра по годам
    if (allMovies.length < 15 && (yearFrom || yearTo)) {
      const moviesWithoutYear = await tmdbClient.discoverMovies({
        genres: commonGenres.length > 0 ? commonGenres : undefined,
        page: getRandomPage(5),
        sortBy: 'popularity.desc',
        voteCountGte: 50,
        voteAverageGte: 5.5,
      });
      addUniqueMovies(moviesWithoutYear.results);
    }

    // Последний фолбэк - популярные фильмы
    if (allMovies.length < 15) {
      const popularMovies = await tmdbClient.getPopularMovies(getRandomPage(3));
      const filteredPopular = popularMovies.results.filter(
        m => m.poster_path && m.overview,
      );
      addUniqueMovies(filteredPopular);
    }

    // Перемешиваем результаты и берём первые 20
    const shuffledMovies = shuffleArray(allMovies).slice(0, 20);
    return shuffledMovies.map(m => m.id);
  } catch (error) {
    console.error('Error generating movies for room:', error);
    return [];
  }
}
