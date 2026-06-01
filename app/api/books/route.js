import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { syncBookToDisk, deleteBookFromDisk } from '@/lib/sync';

export async function GET() {
  try {
    const books = db.prepare('SELECT * FROM books').all();
    const quotes = db.prepare('SELECT * FROM quotes').all();
    
    // Group quotes by book_id
    const booksWithQuotes = books.map(book => ({
      ...book,
      quotes: quotes.filter(q => q.book_id === book.id)
    }));

    return NextResponse.json(booksWithQuotes);
  } catch (error) {
    console.error('Failed to fetch books:', error);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const id = crypto.randomUUID();
    
    const stmt = db.prepare(`
      INSERT INTO books (id, title, author, cover_url, x_pos, y_pos, status)
      VALUES (@id, @title, @author, @cover_url, @x_pos, @y_pos, @status)
    `);
    
    stmt.run({
      id,
      title: data.title,
      author: data.author || '',
      cover_url: data.cover_url || '',
      x_pos: data.x_pos || 0,
      y_pos: data.y_pos || 0,
      status: data.status || 'To Read'
    });

    const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    syncBookToDisk(newBook);
    return NextResponse.json({ ...newBook, quotes: [] });
  } catch (error) {
    console.error('Failed to add book:', error);
    return NextResponse.json({ error: 'Failed to add book' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, title, author, cover_url, rating, review, x_pos, y_pos, status } = data;
    
    const oldBook = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    if (oldBook && oldBook.title !== title) {
      deleteBookFromDisk(oldBook);
    }

    const stmt = db.prepare(`
      UPDATE books
      SET title = @title, author = @author, cover_url = @cover_url,
          rating = @rating, review = @review, x_pos = @x_pos, y_pos = @y_pos, status = @status
      WHERE id = @id
    `);
    
    stmt.run({ id, title, author, cover_url, rating, review, x_pos, y_pos, status });
    
    const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    const quotes = db.prepare('SELECT * FROM quotes WHERE book_id = ?').all(id);
    
    syncBookToDisk(updatedBook);
    return NextResponse.json({ ...updatedBook, quotes });
  } catch (error) {
    console.error('Failed to update book:', error);
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    if (book) {
      deleteBookFromDisk(book);
    }

    db.prepare('DELETE FROM books WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete book:', error);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}

