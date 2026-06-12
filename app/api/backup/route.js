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
    const pdfs = db.prepare('SELECT id, name, filename, x_pos, y_pos, width, height, z_index, created_at FROM pdfs').all();
    const pdf_highlights = db.prepare('SELECT * FROM pdf_highlights').all();
    const drawings = db.prepare('SELECT * FROM drawings').all();
    const images = db.prepare('SELECT id, name, filename, x_pos, y_pos, width, height, z_index, created_at FROM images').all();
    const movies = db.prepare('SELECT * FROM movies').all();
    const movie_quotes = db.prepare('SELECT * FROM movie_quotes').all();

    return NextResponse.json({
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      books,
      quotes,
      areas,
      notes,
      links,
      presets,
      pdfs,
      pdf_highlights,
      drawings,
      images,
      movies,
      movie_quotes
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

    const hasHighlights = 'pdf_highlights' in backupData;
    const hasDrawings = 'drawings' in backupData;
    const hasImages = 'images' in backupData;
    const hasMovies = 'movies' in backupData;
    const hasMovieQuotes = 'movie_quotes' in backupData;
    const { books = [], quotes = [], areas = [], notes = [], links = [], presets = [], pdfs = [] } = backupData;
    const pdf_highlights = hasHighlights ? backupData.pdf_highlights : [];
    const drawings = hasDrawings ? backupData.drawings : [];
    const images = hasImages ? backupData.images : [];
    const movies = hasMovies ? backupData.movies : [];
    const movie_quotes = hasMovieQuotes ? backupData.movie_quotes : [];

    const executeRestore = db.transaction(() => {
      // Clear tables
      db.prepare('DELETE FROM links').run();
      db.prepare('DELETE FROM quotes').run();
      db.prepare('DELETE FROM notes').run();
      db.prepare('DELETE FROM areas').run();
      db.prepare('DELETE FROM books').run();
      db.prepare('DELETE FROM presets').run();
      db.prepare('DELETE FROM pdfs').run();
      db.prepare('DELETE FROM images').run();
      db.prepare('DELETE FROM movie_quotes').run();
      db.prepare('DELETE FROM movies').run();
      if (hasHighlights) {
        db.prepare('DELETE FROM pdf_highlights').run();
      }
      if (hasDrawings) {
        db.prepare('DELETE FROM drawings').run();
      }
      if (hasImages) {
        db.prepare('DELETE FROM images').run();
      }

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
        INSERT INTO links (id, source_id, source_type, target_id, target_type, label, type, arrow, speed, shape, color, created_at)
        VALUES (@id, @source_id, @source_type, @target_id, @target_type, @label, @type, @arrow, @speed, @shape, @color, @created_at)
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
          color: l.color !== undefined ? l.color : null,
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

      // Insert pdfs
      const insertPdf = db.prepare(`
        INSERT INTO pdfs (id, name, filename, x_pos, y_pos, width, height, created_at)
        VALUES (@id, @name, @filename, @x_pos, @y_pos, @width, @height, @created_at)
      `);
      pdfs.forEach(pdf => {
        insertPdf.run({
          id: pdf.id,
          name: pdf.name,
          filename: pdf.filename,
          x_pos: pdf.x_pos || 0,
          y_pos: pdf.y_pos || 0,
          width: pdf.width || 450,
          height: pdf.height || 600,
          created_at: pdf.created_at || new Date().toISOString()
        });
      });

      // Insert pdf_highlights
      if (hasHighlights) {
        const insertHighlight = db.prepare(`
          INSERT INTO pdf_highlights (id, pdf_id, page_number, start_offset, end_offset, text, color, created_at)
          VALUES (@id, @pdf_id, @page_number, @start_offset, @end_offset, @text, @color, @created_at)
        `);
        pdf_highlights.forEach(h => {
          insertHighlight.run({
            id: h.id,
            pdf_id: h.pdf_id,
            page_number: h.page_number || 1,
            start_offset: h.start_offset,
            end_offset: h.end_offset,
            text: h.text,
            color: h.color,
            created_at: h.created_at || new Date().toISOString()
          });
        });
      }

      // Insert drawings
      if (hasDrawings) {
        const insertDrawing = db.prepare(`
          INSERT INTO drawings (id, path_data, color, stroke_width, created_at)
          VALUES (@id, @path_data, @color, @stroke_width, @created_at)
        `);
        drawings.forEach(d => {
          insertDrawing.run({
            id: d.id,
            path_data: d.path_data,
            color: d.color || '#00aaff',
            stroke_width: d.stroke_width || 4,
            created_at: d.created_at || new Date().toISOString()
          });
        });
      }

      // Insert images
      if (hasImages) {
        const insertImage = db.prepare(`
          INSERT INTO images (id, name, filename, x_pos, y_pos, width, height, created_at)
          VALUES (@id, @name, @filename, @x_pos, @y_pos, @width, @height, @created_at)
        `);
        images.forEach(img => {
          insertImage.run({
            id: img.id,
            name: img.name,
            filename: img.filename,
            x_pos: img.x_pos || 0,
            y_pos: img.y_pos || 0,
            width: img.width || 300,
            height: img.height || 300,
            created_at: img.created_at || new Date().toISOString()
          });
        });
      }

      // Insert movies
      if (hasMovies) {
        const insertMovie = db.prepare(`
          INSERT INTO movies (id, title, director, cover_url, rating, review, x_pos, y_pos, status, year, created_at)
          VALUES (@id, @title, @director, @cover_url, @rating, @review, @x_pos, @y_pos, @status, @year, @created_at)
        `);
        movies.forEach(m => {
          insertMovie.run({
            id: m.id,
            title: m.title,
            director: m.director || '',
            cover_url: m.cover_url || '',
            rating: m.rating || 0,
            review: m.review || '',
            x_pos: m.x_pos || 0,
            y_pos: m.y_pos || 0,
            status: m.status || 'To Watch',
            year: m.year || null,
            created_at: m.created_at || new Date().toISOString()
          });
        });
      }

      // Insert movie quotes
      if (hasMovieQuotes) {
        const insertMovieQuote = db.prepare(`
          INSERT INTO movie_quotes (id, movie_id, quote, x_pos, y_pos)
          VALUES (@id, @movie_id, @quote, @x_pos, @y_pos)
        `);
        movie_quotes.forEach(q => {
          insertMovieQuote.run({
            id: q.id,
            movie_id: q.movie_id,
            quote: q.quote,
            x_pos: q.x_pos || 0,
            y_pos: q.y_pos || 0
          });
        });
      }
    });

    executeRestore();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Restore failed:', error);
    return NextResponse.json({ error: `Restore failed: ${error.message}` }, { status: 500 });
  }
}
