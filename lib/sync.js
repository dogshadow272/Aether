import fs from 'fs';
import path from 'path';
import db from '@/lib/db';

export function syncBookToDisk(book) {
  try {
    const reviewsDir = path.resolve(process.cwd(), 'reviews');
    if (!fs.existsSync(reviewsDir)) {
      fs.mkdirSync(reviewsDir, { recursive: true });
    }

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

    fs.writeFileSync(filePath, content, 'utf8');
  } catch (err) {
    console.error('Failed to sync book to disk:', err);
  }
}

export function deleteBookFromDisk(book) {
  try {
    if (!book) return;
    const sanitizedTitle = book.title
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const filePath = path.resolve(process.cwd(), 'reviews', `${sanitizedTitle || 'untitled'}.md`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Failed to delete book from disk:', err);
  }
}

export function syncNoteToDisk(note) {
  try {
    const notesDir = path.resolve(process.cwd(), 'notes');
    if (!fs.existsSync(notesDir)) {
      fs.mkdirSync(notesDir, { recursive: true });
    }

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

    fs.writeFileSync(filePath, content, 'utf8');
  } catch (err) {
    console.error('Failed to sync note to disk:', err);
  }
}

export function deleteNoteFromDisk(noteId) {
  try {
    if (!noteId) return;
    const filePath = path.resolve(process.cwd(), 'notes', `note_${noteId.substring(0, 8)}.md`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Failed to delete note from disk:', err);
  }
}
