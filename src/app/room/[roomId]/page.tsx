'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Check,
  Copy,
  Users,
} from 'lucide-react';

import type { TmdbMovie } from '@/types/tmdb';

import { APP_CONFIG, ROUTES } from '@/lib/constants';
import {
  useAuth,
  useRoom,
  useVotes,
} from '@/hooks';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Spinner,
  useToast,
} from '@/components/ui';
import { Header, SwipeCard } from '@/components';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const { user } = useAuth();
  const { room, participants, loading: roomLoading, startVoting, leaveRoom, markVotingFinished } = useRoom(roomId);
  const { vote, getVoteCount } = useVotes(roomId, user?.id);
  const { addToast } = useToast();

  const [movies, setMovies] = useState<TmdbMovie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingMovies, setLoadingMovies] = useState(false);

  // Загружаем фильмы когда начинается голосование
  const fetchMovies = useCallback(async () => {
    if (!roomId) return;
    setLoadingMovies(true);
    try {
      const res = await fetch(`/api/rooms/movies?roomId=${roomId}`);
      const data = await res.json() as { results: TmdbMovie[] };
      setMovies(data.results ?? []);
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    } finally {
      setLoadingMovies(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (room?.status === 'voting') {
      void fetchMovies();
    }
  }, [room?.status, fetchMovies]);

  // Редирект на результаты если голосование завершено
  useEffect(() => {
    if (room?.status === 'finished') {
      router.push(ROUTES.RESULTS(roomId));
    }
  }, [room?.status, roomId, router]);

  const handleCopyCode = async () => {
    if (!room) return;
    await navigator.clipboard.writeText(room.code);
    addToast({
      title: 'Скопировано!',
      description: 'Код комнаты в буфере обмена',
    });
  };

  const handleStartVoting = async () => {
    try {
      await startVoting();
      addToast({
        title: 'Голосование началось!',
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось начать голосование',
        variant: 'error',
      });
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    const movie = movies[currentIndex];
    if (!movie) return;

    try {
      await vote(movie.id, direction === 'right');
      const newVoteCount = getVoteCount() + 1;

      if (newVoteCount >= APP_CONFIG.MAX_SWIPES) {
        // Достигли максимума свайпов - отмечаем завершение и переходим к результатам
        await markVotingFinished();
        router.push(ROUTES.RESULTS(roomId));
      } else if (currentIndex >= movies.length - 1) {
        // Фильмы закончились, но ещё не достигли лимита - показываем сообщение
        setCurrentIndex(prev => prev + 1);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    } catch (error) {
      addToast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось сохранить голос',
        variant: 'error',
      });
    }
  };

  const handleLeave = async () => {
    await leaveRoom();
    router.push('/');
  };

  const handleViewResults = async () => {
    await markVotingFinished();
    router.push(ROUTES.RESULTS(roomId));
  };

  const handleComplete = async () => {
    await markVotingFinished();
    router.push(ROUTES.RESULTS(roomId));
  };

  if (roomLoading) {
    return (
      <div className="page-fixed">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </main>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="page-fixed">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle>Комната не найдена</CardTitle>
              <CardDescription>
                Возможно, комната была удалена или код неверный
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => router.push('/')}>
                На главную
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Лобби - ожидание участников
  if (room.status === 'waiting') {
    const isCreator = room.creator_id === user?.id;
    const canStart = participants.length >= APP_CONFIG.MIN_PARTICIPANTS;

    return (
      <div className="page-fixed">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto">
          <div className="max-w-md w-full space-y-6">
            <Card className="fade-in">
              <CardHeader className="text-center">
                <CardTitle>Комната</CardTitle>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-3xl font-mono font-bold tracking-wider">
                    {room.code}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => void handleCopyCode()}>
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
                <CardDescription className="mt-2">
                  Поделитесь кодом с друзьями
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Участники */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Участники (
                      {participants.length}
                      )
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {participants.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {String.fromCharCode(65 + i)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {p.user_id === user?.id ? 'Вы' : `Участник ${i + 1}`}
                        </span>
                        {p.user_id === room.creator_id && (
                          <Badge variant="secondary" className="text-xs">Создатель</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Действия */}
                <div className="space-y-2 pt-4">
                  {isCreator
                    ? (
                        <Button
                          className="w-full"
                          onClick={() => void handleStartVoting()}
                          disabled={!canStart}
                        >
                          {canStart
                            ? (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Начать голосование
                                </>
                              )
                            : (
                                `Нужно минимум ${APP_CONFIG.MIN_PARTICIPANTS} участника`
                              )}
                        </Button>
                      )
                    : (
                        <div className="text-center py-4">
                          <Spinner className="mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Ожидание начала голосования...
                          </p>
                        </div>
                      )}
                  <Button variant="secondary" className="w-full" onClick={() => void handleLeave()}>
                    Покинуть комнату
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Голосование
  if (room.status === 'voting') {
    const currentMovie = movies[currentIndex];
    const voteCount = getVoteCount();

    return (
      <div className="page-fixed">
        <Header />
        <main className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="max-w-md mx-auto w-full flex-1 flex flex-col min-h-0">
            {/* Progress */}
            <div className="text-center shrink-0 mb-3">
              <p className="text-sm text-muted-foreground mb-1">
                {voteCount}
                {' '}
                из
                {' '}
                {APP_CONFIG.MAX_SWIPES}
                {' '}
                фильмов
              </p>
              <Progress value={voteCount} max={APP_CONFIG.MAX_SWIPES} />
            </div>

            {/* Swipe Card */}
            <div className="flex-1 min-h-0 flex flex-col">
              {loadingMovies
                ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Spinner size="lg" />
                    </div>
                  )
                : currentMovie
                  ? (
                      <SwipeCard movie={currentMovie} onSwipe={dir => void handleSwipe(dir)} className="flex-1" />
                    )
                  : (
                      <Card className="flex-1 flex flex-col justify-center">
                        <CardContent className="text-center py-8">
                          <p className="text-lg font-medium mb-2">Фильмы закончились!</p>
                          <p className="text-muted-foreground mb-4">
                            Вы просмотрели
                            {' '}
                            {voteCount}
                            {' '}
                            фильмов.
                            {voteCount < APP_CONFIG.MAX_SWIPES && (
                              <>
                                <br />
                                Попробуйте изменить предпочтения, чтобы получить больше фильмов.
                              </>
                            )}
                          </p>
                          <Button
                            className="mt-4"
                            onClick={() => void handleViewResults()}
                          >
                            Посмотреть результаты
                          </Button>
                        </CardContent>
                      </Card>
                    )}
            </div>

            <Button
              variant="secondary"
              className="w-full shrink-0 mt-3"
              onClick={() => void handleComplete()}
            >
              Завершить раньше
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
