import fs from 'fs/promises';
import path from 'path';
import db from '@/lib/db';

export async function syncBookToDisk(book) {
  try {
    const reviewsDir = path.resolve(process.cwd(), 'reviews');
    await fs.mkdir(reviewsDir, { recursive: true });

    const sanitizedTitle = book.title
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
      
    const filePath = path.join(reviewsDir, `${sanitizedTitle || 'untitled'}.md`);

    // Fetch quotes for this book
    const quotes = db.prepare('SELECT * FROM quotes WHERE book_id = ?').all(book.id);

    // Format content in clean markdown
    let content = `# ${book.title.toUpperCase()}\n\n`;
    content += `- **Author:** ${book.author || 'Unknown'}\n`;
    content += `- **Status:** ${book.status || 'To Read'}\n`;
    content += `- **Rating:** ${'★'.repeat(book.rating || 0)}${'☆'.repeat(5 - (book.rating || 0))}\n\n`;
    content += `## Review Notes\n\n`;
    
    const htmlToMarkdownText = (html) => {
      if (!html) return '';
      return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .trim();
    };

    content += htmlToMarkdownText(book.review) || '*No review text logged yet.*';
    content += `\n\n`;

    if (quotes.length > 0) {
      content += `## Key Quotes\n\n`;
      quotes.forEach((q, idx) => {
        content += `> "${q.quote}"\n`;
        content += `> — Quote Satellite ${idx + 1}\n\n`;
      });
    }

    await fs.writeFile(filePath, content, 'utf8');
  } catch (err) {
    console.error('Failed to sync book to disk:', err);
  }
}

export async function deleteBookFromDisk(book) {
  try {
    if (!book) return;
    const sanitizedTitle = book.title
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const filePath = path.resolve(process.cwd(), 'reviews', `${sanitizedTitle || 'untitled'}.md`);
    try {
      await fs.unlink(filePath);
    } catch (e) {
      // Ignore if file doesn't exist
    }
  } catch (err) {
    console.error('Failed to delete book from disk:', err);
  }
}

export async function syncNoteToDisk(note) {
  try {
    const notesDir = path.resolve(process.cwd(), 'notes');
    await fs.mkdir(notesDir, { recursive: true });

    const filePath = path.join(notesDir, `note_${note.id.substring(0, 8)}.md`);

    let content = `# INDEX CARD NOTE // ${note.id.substring(0, 8)}\n\n`;
    content += `- **Color Theme:** ${note.color || 'Default'}\n`;
    content += `- **Wrap Text:** ${note.wrap_text ? 'ON' : 'OFF'}\n\n`;
    content += `## Content\n\n`;

    const htmlToMarkdownText = (html) => {
      if (!html) return '';
      return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .trim();
    };

    content += htmlToMarkdownText(note.content) || '*Empty note.*';
    content += `\n`;

    await fs.writeFile(filePath, content, 'utf8');
  } catch (err) {
    console.error('Failed to sync note to disk:', err);
  }
}

export async function deleteNoteFromDisk(noteId) {
  try {
    if (!noteId) return;
    const filePath = path.resolve(process.cwd(), 'notes', `note_${noteId.substring(0, 8)}.md`);
    try {
      await fs.unlink(filePath);
    } catch (e) {
      // Ignore if file doesn't exist
    }
  } catch (err) {
    console.error('Failed to delete note from disk:', err);
  }
}

export async function syncMovieToDisk(movie) {
  try {
    const moviesDir = path.resolve(process.cwd(), 'reviews', 'movies');
    await fs.mkdir(moviesDir, { recursive: true });

    const sanitizedTitle = movie.title
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
      
    const filePath = path.join(moviesDir, `${sanitizedTitle || 'untitled'}.md`);

    // Fetch quotes for this movie
    const quotes = db.prepare('SELECT * FROM movie_quotes WHERE movie_id = ?').all(movie.id);

    // Format content in clean markdown
    let content = `# ${movie.title.toUpperCase()}\n\n`;
    content += `- **Director/Cast:** ${movie.director || 'Unknown'}\n`;
    content += `- **Year:** ${movie.year || 'Unknown'}\n`;
    content += `- **Status:** ${movie.status || 'To Watch'}\n`;
    content += `- **Rating:** ${'★'.repeat(movie.rating || 0)}${'☆'.repeat(5 - (movie.rating || 0))}\n\n`;
    content += `## Review Notes\n\n`;
    
    const htmlToMarkdownText = (html) => {
      if (!html) return '';
      return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .trim();
    };

    content += htmlToMarkdownText(movie.review) || '*No review text logged yet.*';
    content += `\n\n`;

    if (quotes.length > 0) {
      content += `## Key Movie Quotes\n\n`;
      quotes.forEach((q, idx) => {
        content += `> "${q.quote}"\n`;
        content += `> — Quote Satellite ${idx + 1}\n\n`;
      });
    }

    await fs.writeFile(filePath, content, 'utf8');
  } catch (err) {
    console.error('Failed to sync movie to disk:', err);
  }
}

export async function deleteMovieFromDisk(movie) {
  try {
    if (!movie) return;
    const sanitizedTitle = movie.title
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const filePath = path.resolve(process.cwd(), 'reviews', 'movies', `${sanitizedTitle || 'untitled'}.md`);
    try {
      await fs.unlink(filePath);
    } catch (e) {
      // Ignore if file doesn't exist
    }
  } catch (err) {
    console.error('Failed to delete movie from disk:', err);
  }
}
