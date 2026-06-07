import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { syncMovieToDisk, deleteMovieFromDisk } from '@/lib/sync';

// Pre-compiled prepared statements for maximum performance
const selectMoviesStmt = db.prepare('SELECT * FROM movies');
const selectMovieQuotesStmt = db.prepare('SELECT * FROM movie_quotes');
const selectMovieByIdStmt = db.prepare('SELECT * FROM movies WHERE id = ?');
const selectQuotesByMovieIdStmt = db.prepare('SELECT * FROM movie_quotes WHERE movie_id = ?');

const insertMovieStmt = db.prepare(`
  INSERT INTO movies (id, title, director, cover_url, x_pos, y_pos, status, year)
  VALUES (@id, @title, @director, @cover_url, @x_pos, @y_pos, @status, @year)
`);

const updateMovieStmt = db.prepare(`
  UPDATE movies
  SET title = @title, director = @director, cover_url = @cover_url,
      rating = @rating, review = @review, x_pos = @x_pos, y_pos = @y_pos, status = @status, year = @year
  WHERE id = @id
`);

const deleteMovieStmt = db.prepare('DELETE FROM movies WHERE id = ?');

export async function GET() {
  try {
    const movies = selectMoviesStmt.all();
    const quotes = selectMovieQuotesStmt.all();
    
    // Group quotes by movie_id
    const moviesWithQuotes = movies.map(movie => ({
      ...movie,
      quotes: quotes.filter(q => q.movie_id === movie.id)
    }));

    return NextResponse.json(moviesWithQuotes);
  } catch (error) {
    console.error('Failed to fetch movies:', error);
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const id = data.id || crypto.randomUUID();
    
    insertMovieStmt.run({
      id,
      title: data.title,
      director: data.director || '',
      cover_url: data.cover_url || '',
      x_pos: data.x_pos || 0,
      y_pos: data.y_pos || 0,
      status: data.status || 'To Watch',
      year: data.year || null
    });

    const newMovie = selectMovieByIdStmt.get(id);
    syncMovieToDisk(newMovie);
    return NextResponse.json({ ...newMovie, quotes: [] });
  } catch (error) {
    console.error('Failed to add movie:', error);
    return NextResponse.json({ error: 'Failed to add movie' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, title, director, cover_url, rating, review, x_pos, y_pos, status, year } = data;
    
    const oldMovie = selectMovieByIdStmt.get(id);
    if (oldMovie && oldMovie.title !== title) {
      deleteMovieFromDisk(oldMovie);
    }

    updateMovieStmt.run({ id, title, director, cover_url, rating, review, x_pos, y_pos, status, year });
    
    const updatedMovie = selectMovieByIdStmt.get(id);
    const quotes = selectQuotesByMovieIdStmt.all(id);
    
    syncMovieToDisk(updatedMovie);
    return NextResponse.json({ ...updatedMovie, quotes });
  } catch (error) {
    console.error('Failed to update movie:', error);
    return NextResponse.json({ error: 'Failed to update movie' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const movie = selectMovieByIdStmt.get(id);
    if (movie) {
      deleteMovieFromDisk(movie);
    }

    deleteMovieStmt.run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete movie:', error);
    return NextResponse.json({ error: 'Failed to delete movie' }, { status: 500 });
  }
}
