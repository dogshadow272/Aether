import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { syncBookToDisk } from '@/lib/sync';

// Pre-compiled prepared statements for maximum performance
const selectQuoteByIdStmt = db.prepare('SELECT * FROM quotes WHERE id = ?');
const selectBookByIdStmt = db.prepare('SELECT * FROM books WHERE id = ?');

const insertQuoteStmt = db.prepare(`
  INSERT INTO quotes (id, book_id, quote, x_pos, y_pos)
  VALUES (@id, @book_id, @quote, @x_pos, @y_pos)
`);

const updateQuoteStmt = db.prepare(`
  UPDATE quotes
  SET x_pos = @x_pos, y_pos = @y_pos
  WHERE id = @id
`);

const deleteQuoteStmt = db.prepare('DELETE FROM quotes WHERE id = ?');

export async function POST(request) {
  try {
    const data = await request.json();
    const id = data.id || crypto.randomUUID();
    
    insertQuoteStmt.run({
      id,
      book_id: data.book_id,
      quote: data.quote,
      x_pos: data.x_pos || 0,
      y_pos: data.y_pos || 0
    });

    const newQuote = selectQuoteByIdStmt.get(id);
    const book = selectBookByIdStmt.get(newQuote.book_id);
    if (book) {
      syncBookToDisk(book);
    }
    return NextResponse.json(newQuote);
  } catch (error) {
    console.error('Failed to add quote:', error);
    return NextResponse.json({ error: 'Failed to add quote' }, { status: 500 });
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
    console.error('Failed to update quote:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
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
      const book = selectBookByIdStmt.get(quote.book_id);
      if (book) {
        syncBookToDisk(book);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete quote:', error);
    return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 });
  }
}
