'use client';

import Image from 'next/image';
import { Star } from 'lucide-react';

import type { TmdbMovie } from '@/types/tmdb';

import { cn } from '@/lib/utils';
import { Badge, Card } from '@/components/ui';

interface MovieCardProps {
  movie: TmdbMovie;
  className?: string;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

interface SwipeCardProps extends MovieCardProps {
  onSwipe: (direction: 'left' | 'right') => void;
}

export function MovieCard({ movie, className }: MovieCardProps) {
  const posterUrl = movie.poster_path
    ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}`
    : null;

  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : null;

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
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h3 className="text-lg font-semibold text-white line-clamp-2">
            {movie.title}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            {year && (
              <span className="text-sm text-white/70">{year}</span>
            )}
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="text-sm text-white/90">
                {movie.vote_average.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-muted-foreground line-clamp-3">
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

  return (
    <div
      className={cn(
        'swipe-card relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-card shadow-xl',
        className,
      )}
    >
      <div className="relative aspect-[2/3]">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {movie.title}
          </h2>
          <div className="flex items-center gap-3 mb-3">
            {year && (
              <Badge variant="secondary">{year}</Badge>
            )}
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="text-white font-medium">
                {movie.vote_average.toFixed(1)}
              </span>
            </div>
          </div>
          <p className="text-sm text-white/80 line-clamp-3">
            {movie.overview || 'Описание отсутствует'}
          </p>
        </div>
      </div>
      <div className="flex justify-center gap-4 p-4">
        <button
          type="button"
          onClick={() => onSwipe('left')}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-error/20 text-error transition-colors hover:bg-error hover:text-white"
        >
          <span className="text-2xl">✕</span>
        </button>
        <button
          type="button"
          onClick={() => onSwipe('right')}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-success/20 text-success transition-colors hover:bg-success hover:text-white"
        >
          <span className="text-2xl">♥</span>
        </button>
      </div>
    </div>
  );
}
