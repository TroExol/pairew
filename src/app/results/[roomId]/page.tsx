'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Film,
  RefreshCw,
  Share2,
  Star,
  Users,
} from 'lucide-react';

import type { TmdbMovieDetails } from '@/types/tmdb';

import { TMDB_CONFIG } from '@/lib/constants';
import {
  useAuth,
  useRoom,
  useRoomResults,
} from '@/hooks';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
  useToast,
} from '@/components/ui';
import { Header } from '@/components';

interface MovieResultProps {
  movie: MovieWithDetails;
  totalParticipants: number;
  highlight?: boolean;
}

interface MovieWithDetails {
  movie_id: number;
  count: number;
  voters: string[];
  details?: TmdbMovieDetails;
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  useAuth();
  const { room, participants, finishVoting } = useRoom(roomId);
  const { results, loading: resultsLoading } = useRoomResults(roomId);
  const { addToast } = useToast();

  const [matches, setMatches] = useState<MovieWithDetails[]>([]);
  const [partial, setPartial] = useState<MovieWithDetails[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showPartial, setShowPartial] = useState(false);
  const [showNoMatch, setShowNoMatch] = useState(false);

  // Завершаем голосование при входе на страницу результатов
  useEffect(() => {
    if (room?.status === 'voting') {
      void finishVoting();
    }
  }, [room?.status, finishVoting]);

  // Загружаем детали фильмов
  useEffect(() => {
    if (!results) return;

    const fetchDetails = async () => {
      setLoadingDetails(true);

      const fetchMovieDetails = async (movieId: number): Promise<TmdbMovieDetails | undefined> => {
        try {
          const res = await fetch(`/api/tmdb/movies/${movieId}`);
          return await res.json() as TmdbMovieDetails;
        } catch {
          return undefined;
        }
      };

      const matchesWithDetails = await Promise.all(
        results.matches.map(async m => ({
          ...m,
          details: await fetchMovieDetails(m.movie_id),
        })),
      );

      const partialWithDetails = await Promise.all(
        results.partial.slice(0, 10).map(async m => ({
          ...m,
          details: await fetchMovieDetails(m.movie_id),
        })),
      );

      setMatches(matchesWithDetails);
      setPartial(partialWithDetails);
      setLoadingDetails(false);
    };

    void fetchDetails();
  }, [results]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: 'Результаты подбора фильмов — Pairew',
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      addToast({
        title: 'Ссылка скопирована!',
        description: 'Поделитесь ей с друзьями',
      });
    }
  };

  const handleNewRound = () => {
    router.push('/');
  };

  if (resultsLoading || loadingDetails) {
    return (
      <>
        <Header />
        <main className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground mt-4">Подсчитываем результаты...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-64px)] p-4 pb-20">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center fade-in">
            <h1 className="text-3xl font-bold gradient-text mb-2">Результаты</h1>
            <p className="text-muted-foreground">
              <Users className="inline h-4 w-4 mr-1" />
              {participants.length}
              {' '}
              участников
            </p>
          </div>

          {/* Полные совпадения */}
          {matches.length > 0
            ? (
                <Card className="fade-in border-success/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-success">
                      <Star className="h-5 w-5 fill-success" />
                      Идеальные совпадения!
                    </CardTitle>
                    <CardDescription>
                      Фильмы, которые понравились всем участникам
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {matches.map(match => (
                      <MovieResult
                        key={match.movie_id}
                        movie={match}
                        totalParticipants={participants.length}
                        highlight
                      />
                    ))}
                  </CardContent>
                </Card>
              )
            : (
                <Card className="fade-in">
                  <CardContent className="text-center py-8">
                    <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      К сожалению, полных совпадений нет.
                      <br />
                      Попробуйте ещё раз с другими фильмами!
                    </p>
                  </CardContent>
                </Card>
              )}

          {/* Частичные совпадения */}
          {partial.length > 0 && (
            <Card className="fade-in">
              <CardHeader
                className="cursor-pointer"
                onClick={() => setShowPartial(!showPartial)}
              >
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    Частичные совпадения
                    <Badge variant="secondary">{partial.length}</Badge>
                  </span>
                  {showPartial ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CardTitle>
                <CardDescription>
                  Фильмы, которые понравились части участников
                </CardDescription>
              </CardHeader>
              {showPartial && (
                <CardContent className="space-y-4">
                  {partial.map(match => (
                    <MovieResult
                      key={match.movie_id}
                      movie={match}
                      totalParticipants={participants.length}
                    />
                  ))}
                </CardContent>
              )}
            </Card>
          )}

          {/* Без совпадений */}
          {results?.noMatch && results.noMatch.length > 0 && (
            <Card className="fade-in">
              <CardHeader
                className="cursor-pointer"
                onClick={() => setShowNoMatch(!showNoMatch)}
              >
                <CardTitle className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    Не совпали
                    <Badge variant="secondary">{results.noMatch.length}</Badge>
                  </span>
                  {showNoMatch ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CardTitle>
              </CardHeader>
              {showNoMatch && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {results.noMatch.length}
                    {' '}
                    фильмов никому не понравились
                  </p>
                </CardContent>
              )}
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 fade-in">
            <Button variant="secondary" className="flex-1" onClick={() => void handleShare()}>
              <Share2 className="h-4 w-4 mr-2" />
              Поделиться
            </Button>
            <Button className="flex-1" onClick={handleNewRound}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Новый подбор
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}

function MovieResult({ movie, totalParticipants, highlight }: MovieResultProps) {
  const details = movie.details;
  const posterUrl = details?.poster_path
    ? `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZES.medium}${details.poster_path}`
    : null;

  return (
    <div className={`flex gap-4 p-3 rounded-xl ${highlight ? 'bg-success/10' : 'bg-secondary/50'}`}>
      {posterUrl && (
        <img
          src={posterUrl}
          alt={details?.title}
          className="w-20 h-30 object-cover rounded-lg"
        />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold line-clamp-1">{details?.title || `Фильм #${movie.movie_id}`}</h3>
        {details && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>{new Date(details.release_date).getFullYear()}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span>{details.vote_average.toFixed(1)}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {details.overview}
            </p>
          </>
        )}
        <Badge variant={highlight ? 'success' : 'secondary'} className="mt-2">
          {movie.count}
          {' '}
          из
          {totalParticipants}
          {' '}
          голосов
        </Badge>
      </div>
    </div>
  );
}
