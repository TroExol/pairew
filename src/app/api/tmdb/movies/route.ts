import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { tmdbClient } from '@/lib/tmdb/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);

  try {
    const movies = await tmdbClient.getPopularMovies(page);
    return NextResponse.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 },
    );
  }
}
