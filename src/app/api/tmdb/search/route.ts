import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { tmdbClient } from '@/lib/tmdb/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const type = searchParams.get('type') || 'movie';
  const page = parseInt(searchParams.get('page') || '1', 10);

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 },
    );
  }

  try {
    if (type === 'person') {
      const results = await tmdbClient.searchPerson(query, page);
      return NextResponse.json(results);
    }

    const results = await tmdbClient.searchMovies(query, page);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 },
    );
  }
}

