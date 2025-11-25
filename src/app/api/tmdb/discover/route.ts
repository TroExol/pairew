import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { tmdbClient } from '@/lib/tmdb/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const genres = searchParams.get('genres')?.split(',').map(Number).filter(Boolean);
  const yearFrom = searchParams.get('yearFrom') ? parseInt(searchParams.get('yearFrom')!, 10) : undefined;
  const yearTo = searchParams.get('yearTo') ? parseInt(searchParams.get('yearTo')!, 10) : undefined;
  const withCast = searchParams.get('withCast')?.split(',').map(Number).filter(Boolean);
  const withCrew = searchParams.get('withCrew')?.split(',').map(Number).filter(Boolean);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sortBy') || undefined;

  try {
    const movies = await tmdbClient.discoverMovies({
      genres,
      yearFrom,
      yearTo,
      withCast,
      withCrew,
      page,
      sortBy,
    });
    return NextResponse.json(movies);
  } catch (error) {
    console.error('Error discovering movies:', error);
    return NextResponse.json(
      { error: 'Failed to discover movies' },
      { status: 500 },
    );
  }
}

