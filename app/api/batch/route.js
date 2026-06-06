import { NextResponse } from 'next/server';
import db from '@/lib/db';

// Prepared statements for maximum performance inside batch transaction
const updateBookCoords = db.prepare('UPDATE books SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id');
const updateNoteCoords = db.prepare('UPDATE notes SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id');
const updateAreaCoords = db.prepare('UPDATE areas SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id');
const updateQuoteCoords = db.prepare('UPDATE quotes SET x_pos = @x_pos, y_pos = @y_pos WHERE id = @id');
const updatePdfCoords = db.prepare('UPDATE pdfs SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id');
const updateImageCoords = db.prepare('UPDATE images SET x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height WHERE id = @id');

export async function POST(request) {
  try {
    const data = await request.json();
    const { books = [], notes = [], areas = [], quotes = [], pdfs = [], images = [] } = data;

    const executeBatch = db.transaction(() => {
      books.forEach((b) => {
        updateBookCoords.run({ id: b.id, x_pos: b.x_pos, y_pos: b.y_pos });
      });
      notes.forEach((n) => {
        updateNoteCoords.run({ id: n.id, x_pos: n.x_pos, y_pos: n.y_pos, width: n.width, height: n.height });
      });
      areas.forEach((a) => {
        updateAreaCoords.run({ id: a.id, x_pos: a.x_pos, y_pos: a.y_pos, width: a.width, height: a.height });
      });
      quotes.forEach((q) => {
        updateQuoteCoords.run({ id: q.id, x_pos: q.x_pos, y_pos: q.y_pos });
      });
      pdfs.forEach((p) => {
        updatePdfCoords.run({ id: p.id, x_pos: p.x_pos, y_pos: p.y_pos, width: p.width, height: p.height });
      });
      images.forEach((img) => {
        updateImageCoords.run({ id: img.id, x_pos: img.x_pos, y_pos: img.y_pos, width: img.width, height: img.height });
      });
    });

    executeBatch();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Batch coordinates save failed:', error);
    return NextResponse.json({ error: 'Batch coordinates save failed' }, { status: 500 });
  }
}
