import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const books = db.prepare('SELECT * FROM books').all();
    const quotes = db.prepare('SELECT * FROM quotes').all();
    const areas = db.prepare('SELECT * FROM areas').all();
    const notes = db.prepare('SELECT * FROM notes').all();
    const links = db.prepare('SELECT * FROM links').all();
    const presets = db.prepare('SELECT * FROM presets').all();

    return NextResponse.json({
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      books,
      quotes,
      areas,
      notes,
      links,
      presets
    });
  } catch (error) {
    console.error('Backup failed:', error);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const backupData = await request.json();
    
    if (!backupData || typeof backupData !== 'object') {
      return NextResponse.json({ error: 'Invalid backup payload' }, { status: 400 });
    }

    const { books = [], quotes = [], areas = [], notes = [], links = [], presets = [] } = backupData;

    const executeRestore = db.transaction(() => {
      // Clear tables
      db.prepare('DELETE FROM links').run();
      db.prepare('DELETE FROM quotes').run();
      db.prepare('DELETE FROM notes').run();
      db.prepare('DELETE FROM areas').run();
      db.prepare('DELETE FROM books').run();
      db.prepare('DELETE FROM presets').run();

      // Insert books
      const insertBook = db.prepare(`
        INSERT INTO books (id, title, author, cover_url, rating, review, x_pos, y_pos, status, created_at)
        VALUES (@id, @title, @author, @cover_url, @rating, @review, @x_pos, @y_pos, @status, @created_at)
      `);
      books.forEach(b => {
        insertBook.run({
          id: b.id,
          title: b.title,
          author: b.author || '',
          cover_url: b.cover_url || '',
          rating: b.rating || 0,
          review: b.review || '',
          x_pos: b.x_pos || 0,
          y_pos: b.y_pos || 0,
          status: b.status || 'To Read',
          created_at: b.created_at || new Date().toISOString()
        });
      });

      // Insert quotes
      const insertQuote = db.prepare(`
        INSERT INTO quotes (id, book_id, quote, x_pos, y_pos)
        VALUES (@id, @book_id, @quote, @x_pos, @y_pos)
      `);
      quotes.forEach(q => {
        insertQuote.run({
          id: q.id,
          book_id: q.book_id,
          quote: q.quote,
          x_pos: q.x_pos || 0,
          y_pos: q.y_pos || 0
        });
      });

      // Insert areas
      const insertArea = db.prepare(`
        INSERT INTO areas (id, name, x_pos, y_pos, width, height, color, created_at)
        VALUES (@id, @name, @x_pos, @y_pos, @width, @height, @color, @created_at)
      `);
      areas.forEach(a => {
        insertArea.run({
          id: a.id,
          name: a.name,
          x_pos: a.x_pos || 0,
          y_pos: a.y_pos || 0,
          width: a.width || 200,
          height: a.height || 200,
          color: a.color || 'rgba(0, 170, 255, 0.08)',
          created_at: a.created_at || new Date().toISOString()
        });
      });

      // Insert notes
      const insertNote = db.prepare(`
        INSERT INTO notes (id, content, x_pos, y_pos, width, height, color, wrap_text, created_at)
        VALUES (@id, @content, @x_pos, @y_pos, @width, @height, @color, @wrap_text, @created_at)
      `);
      notes.forEach(n => {
        insertNote.run({
          id: n.id,
          content: n.content,
          x_pos: n.x_pos || 0,
          y_pos: n.y_pos || 0,
          width: n.width || 220,
          height: n.height || 150,
          color: n.color || 'rgba(255, 255, 255, 0.08)',
          wrap_text: n.wrap_text !== undefined ? n.wrap_text : 1,
          created_at: n.created_at || new Date().toISOString()
        });
      });

      // Insert links
      const insertLink = db.prepare(`
        INSERT INTO links (id, source_id, source_type, target_id, target_type, label, type, arrow, speed, shape, created_at)
        VALUES (@id, @source_id, @source_type, @target_id, @target_type, @label, @type, @arrow, @speed, @shape, @created_at)
      `);
      links.forEach(l => {
        insertLink.run({
          id: l.id,
          source_id: l.source_id,
          source_type: l.source_type,
          target_id: l.target_id,
          target_type: l.target_type,
          label: l.label || '',
          type: l.type || 'default',
          arrow: l.arrow || 'none',
          speed: l.speed || 'normal',
          shape: l.shape || 'curved',
          created_at: l.created_at || new Date().toISOString()
        });
      });

      // Insert presets
      const insertPreset = db.prepare(`
        INSERT INTO presets (id, name, pan_x, pan_y, scale, created_at)
        VALUES (@id, @name, @pan_x, @pan_y, @scale, @created_at)
      `);
      presets.forEach(p => {
        insertPreset.run({
          id: p.id,
          name: p.name,
          pan_x: p.pan_x,
          pan_y: p.pan_y,
          scale: p.scale,
          created_at: p.created_at || new Date().toISOString()
        });
      });
    });

    executeRestore();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Restore failed:', error);
    return NextResponse.json({ error: `Restore failed: ${error.message}` }, { status: 500 });
  }
}
