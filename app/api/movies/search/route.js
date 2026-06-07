import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    if (!query) {
      return NextResponse.json([]);
    }

    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return NextResponse.json([]);
    }

    // Get the first character for IMDb autocomplete structure
    const firstChar = trimmedQuery.charAt(0);
    // Ensure first character is alphanumeric or fallback to a default
    const firstLetter = /^[a-z0-9]$/i.test(firstChar) ? firstChar : 'a';

    const imdbUrl = `https://v3.sg.media-imdb.com/suggestion/${firstLetter}/${encodeURIComponent(trimmedQuery)}.json`;
    
    const res = await fetch(imdbUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`IMDb API responded with status ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.d) {
      return NextResponse.json([]);
    }

    // Map suggest items to frontend-compatible format
    const results = data.d.map((item) => {
      // Find poster image URL
      let cover_url = '';
      if (item.i && item.i.imageUrl) {
        cover_url = item.i.imageUrl;
      }

      return {
        id: item.id, // e.g. tt1375666
        title: item.l,
        director: item.s || 'Unknown Director/Cast',
        cover_url,
        year: item.y || null,
        isMovie: true
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('IMDb movie search query failed:', error);
    return NextResponse.json({ error: 'IMDb search failed' }, { status: 500 });
  }
}
