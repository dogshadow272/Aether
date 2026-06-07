import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { syncMovieToDisk } from '@/lib/sync';

// Pre-compiled prepared statements for maximum performance
const selectQuoteByIdStmt = db.prepare('SELECT * FROM movie_quotes WHERE id = ?');
const selectMovieByIdStmt = db.prepare('SELECT * FROM movies WHERE id = ?');

const insertQuoteStmt = db.prepare(`
  INSERT INTO movie_quotes (id, movie_id, quote, x_pos, y_pos)
  VALUES (@id, @movie_id, @quote, @x_pos, @y_pos)
`);

const updateQuoteStmt = db.prepare(`
  UPDATE movie_quotes
  SET x_pos = @x_pos, y_pos = @y_pos
  WHERE id = @id
`);

const deleteQuoteStmt = db.prepare('DELETE FROM movie_quotes WHERE id = ?');

export async function POST(request) {
  try {
    const data = await request.json();
    const id = crypto.randomUUID();
    
    insertQuoteStmt.run({
      id,
      movie_id: data.movie_id,
      quote: data.quote,
      x_pos: data.x_pos || 0,
      y_pos: data.y_pos || 0
    });

    const newQuote = selectQuoteByIdStmt.get(id);
    const movie = selectMovieByIdStmt.get(newQuote.movie_id);
    if (movie) {
      syncMovieToDisk(movie);
    }
    return NextResponse.json(newQuote);
  } catch (error) {
    console.error('Failed to add movie quote:', error);
    return NextResponse.json({ error: 'Failed to add movie quote' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, x_pos, y_pos } = data;
    
    updateQuoteStmt.run({ id, x_pos, y_pos });
    
    const updatedQuote = selectQuoteByIdStmt.get(id);
    return NextResponse.json(updatedQuote);
  } catch (error) {
    console.error('Failed to update movie quote:', error);
    return NextResponse.json({ error: 'Failed to update movie quote' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const quote = selectQuoteByIdStmt.get(id);
    if (quote) {
      deleteQuoteStmt.run(id);
      const movie = selectMovieByIdStmt.get(quote.movie_id);
      if (movie) {
        syncMovieToDisk(movie);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete movie quote:', error);
    return NextResponse.json({ error: 'Failed to delete movie quote' }, { status: 500 });
  }
}
