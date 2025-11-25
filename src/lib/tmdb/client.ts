import type {
  TmdbGenre,
  TmdbMovie,
  TmdbMovieDetails,
  TmdbPerson,
  TmdbSearchResponse,
} from '@/types/tmdb';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';

class TmdbClient {
  private apiKey: string;
  private language: string;

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || '';
    this.language = 'ru-RU';
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${TMDB_API_BASE}${endpoint}`);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('language', this.language);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 }, // Кеширование на 1 час
    });

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // Жанры
  async getGenres(): Promise<TmdbGenre[]> {
    const data = await this.fetch<{ genres: TmdbGenre[] }>('/genre/movie/list');
    return data.genres;
  }

  // Популярные фильмы
  async getPopularMovies(page = 1): Promise<TmdbSearchResponse<TmdbMovie>> {
    return this.fetch<TmdbSearchResponse<TmdbMovie>>('/movie/popular', {
      page: page.toString(),
    });
  }

  // Поиск фильмов
  async searchMovies(query: string, page = 1): Promise<TmdbSearchResponse<TmdbMovie>> {
    return this.fetch<TmdbSearchResponse<TmdbMovie>>('/search/movie', {
      query,
      page: page.toString(),
    });
  }

  // Детали фильма
  async getMovieDetails(movieId: number): Promise<TmdbMovieDetails> {
    return this.fetch<TmdbMovieDetails>(`/movie/${movieId}`);
  }

  // Поиск персон (актёры, режиссёры)
  async searchPerson(query: string, page = 1): Promise<TmdbSearchResponse<TmdbPerson>> {
    return this.fetch<TmdbSearchResponse<TmdbPerson>>('/search/person', {
      query,
      page: page.toString(),
    });
  }

  // Discover — фильтрация фильмов по параметрам
  async discoverMovies(params: {
    genres?: number[];
    yearFrom?: number;
    yearTo?: number;
    withCast?: number[];
    withCrew?: number[];
    page?: number;
    sortBy?: string;
    voteCountGte?: number;
    voteAverageGte?: number;
  }): Promise<TmdbSearchResponse<TmdbMovie>> {
    // Текущая дата для фильтрации невышедших фильмов
    const today = new Date().toISOString().split('T')[0];

    const queryParams: Record<string, string> = {
      'page': (params.page || 1).toString(),
      'sort_by': params.sortBy || 'popularity.desc',
      // Фильтры качества по умолчанию: минимум 50 голосов и оценка 5.5
      'vote_count.gte': (params.voteCountGte ?? 50).toString(),
      'vote_average.gte': (params.voteAverageGte ?? 5.5).toString(),
      // Только фильмы, которые уже вышли
      'primary_release_date.lte': today,
    };

    if (params.genres?.length) {
      // Используем | (OR) вместо , (AND) для более широкого поиска
      queryParams.with_genres = params.genres.join('|');
    }
    if (params.yearFrom) {
      queryParams['primary_release_date.gte'] = `${params.yearFrom}-01-01`;
    }
    if (params.yearTo) {
      // Берём минимум между yearTo и сегодняшней датой, чтобы не показывать невышедшие фильмы
      const yearToDate = `${params.yearTo}-12-31`;
      queryParams['primary_release_date.lte'] = yearToDate < today ? yearToDate : today;
    }
    if (params.withCast?.length) {
      queryParams.with_cast = params.withCast.join(',');
    }
    if (params.withCrew?.length) {
      queryParams.with_crew = params.withCrew.join(',');
    }

    const response = await this.fetch<TmdbSearchResponse<TmdbMovie>>('/discover/movie', queryParams);

    // Постфильтрация: убираем фильмы без постера и описания
    const filteredResults = response.results.filter(
      movie => movie.poster_path && movie.overview && movie.overview.trim().length > 0,
    );

    return {
      ...response,
      results: filteredResults,
    };
  }

  // Рекомендации на основе фильма
  async getRecommendations(movieId: number, page = 1): Promise<TmdbSearchResponse<TmdbMovie>> {
    return this.fetch<TmdbSearchResponse<TmdbMovie>>(`/movie/${movieId}/recommendations`, {
      page: page.toString(),
    });
  }
}

export const tmdbClient = new TmdbClient();
