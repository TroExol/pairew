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
