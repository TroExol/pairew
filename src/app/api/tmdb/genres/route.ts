import { NextResponse } from 'next/server';

import { tmdbClient } from '@/lib/tmdb/client';

export async function GET() {
  try {
    const genres = await tmdbClient.getGenres();
    return NextResponse.json(genres);
  } catch (error) {
    console.error('Error fetching genres:', error);
    return NextResponse.json(
      { error: 'Failed to fetch genres' },
      { status: 500 },
    );
  }
}

