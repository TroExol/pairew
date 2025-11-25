import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import type { TmdbMovie } from '@/types/tmdb';
import type { Database } from '@/types/database';

import { tmdbClient } from '@/lib/tmdb/client';
import { createClient } from '@/lib/supabase/server';

type Preferences = Database['public']['Tables']['preferences']['Row'];
type Room = Database['public']['Tables']['rooms']['Row'];

// Получить фильмы для комнаты на основе предпочтений участников
export async function GET(request: NextRequest) {
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
  const searchParams = request.nextUrl.searchParams;
  const roomId = searchParams.get('roomId');
  const page = parseInt(searchParams.get('page') || '1', 10);

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Проверяем, есть ли уже сохранённые фильмы для этой комнаты
  const { data: room } = await supabase
    .from('rooms')
    .select('movie_ids')
    .eq('id', roomId)
    .single<Pick<Room, 'movie_ids'>>();

  // Если фильмы уже выбраны для комнаты - возвращаем их
  if (room?.movie_ids && room.movie_ids.length > 0) {
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
      console.error('Error fetching cached movies:', error);
      // Если не удалось загрузить кешированные фильмы, генерируем новые
    }
  }

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

    // Первая попытка - с полными фильтрами и строгими требованиями к качеству
    // Сначала делаем запрос на первую страницу, чтобы узнать total_pages
    const initialMovies = await tmdbClient.discoverMovies({
      genres: commonGenres.length > 0 ? commonGenres : undefined,
      yearFrom,
      yearTo,
      page: 1,
      sortBy: 'popularity.desc',
      voteCountGte: 100,
      voteAverageGte: 6.0,
    });

    // Выбираем случайную страницу из доступных (но не дальше 10-й, чтобы не уходить в совсем непопулярные)
    const randomPage = getRandomPage(initialMovies.total_pages);

    // Если случайная страница не первая, делаем дополнительный запрос
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

    // Если фильмов слишком мало (меньше 15), снижаем требования к качеству
    if (allMovies.length < 15) {
      const moviesLowerQuality = await tmdbClient.discoverMovies({
        genres: commonGenres.length > 0 ? commonGenres : undefined,
        yearFrom,
        yearTo,
        page: getRandomPage(5), // Случайная страница из первых 5
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

    // Сохраняем выбранные movie_ids в комнату, чтобы все участники видели одинаковые фильмы
    const movieIds = shuffledMovies.map(m => m.id);
    await supabase
      .from('rooms')
      .update({ movie_ids: movieIds })
      .eq('id', roomId);

    return NextResponse.json({
      page,
      results: shuffledMovies,
      total_pages: initialMovies.total_pages,
      total_results: initialMovies.total_results,
    });
  } catch (error) {
    console.error('Error fetching movies for room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 },
    );
  }
}
