import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { syncBookToDisk } from '@/lib/sync';

export async function POST(request) {
  try {
    const data = await request.json();
    const id = crypto.randomUUID();
    
    const stmt = db.prepare(`
      INSERT INTO quotes (id, book_id, quote, x_pos, y_pos)
      VALUES (@id, @book_id, @quote, @x_pos, @y_pos)
    `);
    
    stmt.run({
      id,
      book_id: data.book_id,
      quote: data.quote,
      x_pos: data.x_pos || 0,
      y_pos: data.y_pos || 0
    });

    const newQuote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(newQuote.book_id);
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
    
    const stmt = db.prepare(`
      UPDATE quotes
      SET x_pos = @x_pos, y_pos = @y_pos
      WHERE id = @id
    `);
    
    stmt.run({ id, x_pos, y_pos });
    
    const updatedQuote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
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

    const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
    if (quote) {
      db.prepare('DELETE FROM quotes WHERE id = ?').run(id);
      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(quote.book_id);
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
