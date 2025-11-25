import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { tmdbClient } from '@/lib/tmdb/client';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const movieId = parseInt(id, 10);

  if (isNaN(movieId)) {
    return NextResponse.json(
      { error: 'Invalid movie ID' },
      { status: 400 },
    );
  }

  try {
    const movie = await tmdbClient.getMovieDetails(movieId);
    return NextResponse.json(movie);
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie details' },
      { status: 500 },
    );
  }
}

