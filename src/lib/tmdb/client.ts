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
  }): Promise<TmdbSearchResponse<TmdbMovie>> {
    const queryParams: Record<string, string> = {
      page: (params.page || 1).toString(),
      sort_by: params.sortBy || 'popularity.desc',
    };

    if (params.genres?.length) {
      queryParams.with_genres = params.genres.join(',');
    }
    if (params.yearFrom) {
      queryParams['primary_release_date.gte'] = `${params.yearFrom}-01-01`;
    }
    if (params.yearTo) {
      queryParams['primary_release_date.lte'] = `${params.yearTo}-12-31`;
    }
    if (params.withCast?.length) {
      queryParams.with_cast = params.withCast.join(',');
    }
    if (params.withCrew?.length) {
      queryParams.with_crew = params.withCrew.join(',');
    }

    return this.fetch<TmdbSearchResponse<TmdbMovie>>('/discover/movie', queryParams);
  }

  // Рекомендации на основе фильма
  async getRecommendations(movieId: number, page = 1): Promise<TmdbSearchResponse<TmdbMovie>> {
    return this.fetch<TmdbSearchResponse<TmdbMovie>>(`/movie/${movieId}/recommendations`, {
      page: page.toString(),
    });
  }
}

export const tmdbClient = new TmdbClient();
