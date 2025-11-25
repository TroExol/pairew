// Лимиты и настройки приложения
export const APP_CONFIG = {
  // Количество свайпов до показа результатов
  MAX_SWIPES: 20,

  // Минимальное количество участников для начала голосования
  MIN_PARTICIPANTS: 2,

  // Максимальное количество участников в комнате
  MAX_PARTICIPANTS: 10,

  // Время жизни комнаты (в часах)
  ROOM_LIFETIME_HOURS: 24,
} as const;

// TMDB константы
export const TMDB_CONFIG = {
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',

  // Размеры постеров
  POSTER_SIZES: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original',
  },

  // Размеры фонов
  BACKDROP_SIZES: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original',
  },
} as const;

// Маппинг жанров TMDB (id → name)
export const GENRE_MAP: Record<number, string> = {
  28: 'Боевик',
  12: 'Приключения',
  16: 'Мультфильм',
  35: 'Комедия',
  80: 'Криминал',
  99: 'Документальный',
  18: 'Драма',
  10751: 'Семейный',
  14: 'Фэнтези',
  36: 'История',
  27: 'Ужасы',
  10402: 'Музыка',
  9648: 'Детектив',
  10749: 'Мелодрама',
  878: 'Фантастика',
  10770: 'Телефильм',
  53: 'Триллер',
  10752: 'Военный',
  37: 'Вестерн',
};

// Маршруты приложения
export const ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/auth/login',
    CALLBACK: '/auth/callback',
    SIGNOUT: '/auth/signout',
  },
  PREFERENCES: '/preferences',
  ROOM: (roomId: string) => `/room/${roomId}`,
  RESULTS: (roomId: string) => `/results/${roomId}`,
  HISTORY: '/history',
} as const;
