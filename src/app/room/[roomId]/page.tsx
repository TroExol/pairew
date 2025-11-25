'use client';

import type { TmdbMovie } from '@/types/tmdb';

import { useParams, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Check,
  Copy,
  Users,
} from 'lucide-react';

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
import { useAuth, useRoom, useVotes } from '@/hooks';
import { APP_CONFIG, ROUTES } from '@/lib/constants';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const { user } = useAuth();
  const { room, participants, loading: roomLoading, startVoting, leaveRoom } = useRoom(roomId);
  const { votes, vote, getVoteCount } = useVotes(roomId, user?.id);
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

      if (getVoteCount() + 1 >= APP_CONFIG.MAX_SWIPES || currentIndex >= movies.length - 1) {
        // Завершаем голосование
        router.push(ROUTES.RESULTS(roomId));
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

  if (roomLoading) {
    return (
      <>
        <Header />
        <main className="min-h-[calc(100vh-64px)] flex items-center justify-center">
          <Spinner size="lg" />
        </main>
      </>
    );
  }

  if (!room) {
    return (
      <>
        <Header />
        <main className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
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
      </>
    );
  }

  // Лобби - ожидание участников
  if (room.status === 'waiting') {
    const isCreator = room.creator_id === user?.id;
    const canStart = participants.length >= APP_CONFIG.MIN_PARTICIPANTS;

    return (
      <>
        <Header />
        <main className="min-h-[calc(100vh-64px)] p-4">
          <div className="max-w-md mx-auto space-y-6">
            <Card className="fade-in">
              <CardHeader className="text-center">
                <CardTitle>Комната</CardTitle>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-3xl font-mono font-bold tracking-wider">
                    {room.code}
                  </span>
                  <Button variant="ghost" size="icon" onClick={handleCopyCode}>
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
                      Участники ({participants.length})
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
                  {isCreator ? (
                    <Button
                      className="w-full"
                      onClick={handleStartVoting}
                      disabled={!canStart}
                    >
                      {canStart ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Начать голосование
                        </>
                      ) : (
                        `Нужно минимум ${APP_CONFIG.MIN_PARTICIPANTS} участника`
                      )}
                    </Button>
                  ) : (
                    <div className="text-center py-4">
                      <Spinner className="mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Ожидание начала голосования...
                      </p>
                    </div>
                  )}
                  <Button variant="secondary" className="w-full" onClick={handleLeave}>
                    Покинуть комнату
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    );
  }

  // Голосование
  if (room.status === 'voting') {
    const currentMovie = movies[currentIndex];
    const voteCount = getVoteCount();

    return (
      <>
        <Header />
        <main className="min-h-[calc(100vh-64px)] p-4">
          <div className="max-w-md mx-auto space-y-4">
            {/* Progress */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {voteCount} из {APP_CONFIG.MAX_SWIPES} фильмов
              </p>
              <Progress value={voteCount} max={APP_CONFIG.MAX_SWIPES} />
            </div>

            {/* Swipe Card */}
            {loadingMovies ? (
              <div className="flex items-center justify-center py-20">
                <Spinner size="lg" />
              </div>
            ) : currentMovie ? (
              <SwipeCard movie={currentMovie} onSwipe={handleSwipe} />
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">Фильмы закончились!</p>
                  <Button
                    className="mt-4"
                    onClick={() => router.push(ROUTES.RESULTS(roomId))}
                  >
                    Посмотреть результаты
                  </Button>
                </CardContent>
              </Card>
            )}

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.push(ROUTES.RESULTS(roomId))}
            >
              Завершить раньше
            </Button>
          </div>
        </main>
      </>
    );
  }

  return null;
}
