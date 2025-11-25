'use client';

import Image from 'next/image';
import { ExternalLink, Star } from 'lucide-react';

import type { TmdbMovie } from '@/types/tmdb';

import { cn } from '@/lib/utils';
import { GENRE_MAP } from '@/lib/constants';
import { Badge, Card } from '@/components/ui';

interface MovieCardProps {
  movie: TmdbMovie;
  className?: string;
}

interface SwipeCardProps extends MovieCardProps {
  onSwipe: (direction: 'left' | 'right') => void;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

const getGenreName = (id: number): string | undefined =>
  (GENRE_MAP as Record<number, string | undefined>)[id];

export function MovieCard({ movie, className }: MovieCardProps) {
  const posterUrl = movie.poster_path
    ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}`
    : null;

  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : null;

  const genres = (movie.genre_ids ?? [])
    .slice(0, 3)
    .map(getGenreName)
    .filter((name): name is string => name !== undefined);

  const googleSearchUrl = year
    ? `https://www.google.com/search?q=${encodeURIComponent(`${movie.title} ${year} фильм`)}`
    : `https://www.google.com/search?q=${encodeURIComponent(`${movie.title} фильм`)}`;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="relative aspect-[2/3] bg-muted">
        {posterUrl
          ? (
              <Image
                src={posterUrl}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            )
          : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Нет постера
              </div>
            )}
        {genres.length > 0 && (
          <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1">
            {genres.map(genre => (
              <Badge
                key={genre}
                variant="secondary"
                className="bg-black/60 text-white text-xs backdrop-blur-sm"
              >
                {genre}
              </Badge>
            ))}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <a
            href={googleSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 hover:underline"
          >
            <h3 className="text-lg font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {movie.title}
            </h3>
            <ExternalLink className="h-4 w-4 text-white/70 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
          <div className="mt-1 flex items-center gap-2">
            {year && (
              <span className="text-sm text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{year}</span>
            )}
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
              <span className="text-sm text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {movie.vote_average.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          {movie.overview || 'Описание отсутствует'}
        </p>
      </div>
    </Card>
  );
}

export function SwipeCard({ movie, onSwipe, className }: SwipeCardProps) {
  const posterUrl = movie.poster_path
    ? `${TMDB_IMAGE_BASE}/w780${movie.poster_path}`
    : null;

  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : null;

  const genres = (movie.genre_ids ?? [])
    .slice(0, 3)
    .map(getGenreName)
    .filter((name): name is string => name !== undefined);

  const googleSearchUrl = year
    ? `https://www.google.com/search?q=${encodeURIComponent(`${movie.title} ${year} фильм`)}`
    : `https://www.google.com/search?q=${encodeURIComponent(`${movie.title} фильм`)}`;

  return (
    <div
      className={cn(
        'swipe-card w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-card shadow-xl flex flex-col',
        className,
      )}
    >
      {/* Poster section - takes remaining space */}
      <div className="relative flex-1 min-h-0">
        {posterUrl
          ? (
              <Image
                src={posterUrl}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
                priority
              />
            )
          : (
              <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
                Нет постера
              </div>
            )}
        {genres.length > 0 && (
          <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5">
            {genres.map(genre => (
              <Badge
                key={genre}
                variant="secondary"
                className="bg-black/60 text-white text-xs backdrop-blur-sm border-0"
              >
                {genre}
              </Badge>
            ))}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <a
            href={googleSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 hover:underline"
          >
            <h2 className="text-xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {movie.title}
            </h2>
            <ExternalLink className="h-4 w-4 text-white/70 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
          <div className="flex items-center gap-3 mt-1">
            {year && (
              <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-sm border-0 text-xs">{year}</Badge>
            )}
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
              <span className="text-white font-medium text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {movie.vote_average.toFixed(1)}
              </span>
            </div>
          </div>
          <p className="text-xs text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,1)] leading-relaxed mt-2">
            {movie.overview || 'Описание отсутствует'}
          </p>
        </div>
      </div>
      {/* Buttons - fixed at bottom */}
      <div className="flex justify-center gap-4 p-3 shrink-0 bg-card">
        <button
          type="button"
          onClick={() => onSwipe('left')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-error/20 text-error transition-colors hover:bg-error hover:text-white"
        >
          <span className="text-xl">✕</span>
        </button>
        <button
          type="button"
          onClick={() => onSwipe('right')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20 text-success transition-colors hover:bg-success hover:text-white"
        >
          <span className="text-xl">♥</span>
        </button>
      </div>
    </div>
  );
}
