import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { syncNoteToDisk, deleteNoteFromDisk } from '@/lib/sync';

// Pre-compiled prepared statements for maximum performance
const selectNotesStmt = db.prepare('SELECT * FROM notes');
const selectNoteByIdStmt = db.prepare('SELECT * FROM notes WHERE id = ?');

const insertNoteStmt = db.prepare(`
  INSERT INTO notes (id, content, x_pos, y_pos, width, height, z_index, color, wrap_text)
  VALUES (@id, @content, @x_pos, @y_pos, @width, @height, @z_index, @color, @wrap_text)
`);

const updateNoteStmt = db.prepare(`
  UPDATE notes
  SET content = @content, x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height, z_index = @z_index, color = @color, wrap_text = @wrap_text
  WHERE id = @id
`);

const deleteNoteStmt = db.prepare('DELETE FROM notes WHERE id = ?');

export async function GET() {
  try {
    const notes = selectNotesStmt.all();
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Failed to fetch notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const id = crypto.randomUUID();
    
    insertNoteStmt.run({
      id,
      content: data.content || 'DOUBLE-CLICK TO EDIT NOTE',
      x_pos: data.x_pos || 0,
      y_pos: data.y_pos || 0,
      width: data.width || 220,
      height: data.height || 150,
      z_index: data.z_index || 0,
      color: data.color || 'rgba(255, 255, 255, 0.08)',
      wrap_text: data.wrap_text !== undefined ? (data.wrap_text ? 1 : 0) : 1
    });

    const newNote = selectNoteByIdStmt.get(id);
    syncNoteToDisk(newNote);
    return NextResponse.json(newNote);
  } catch (error) {
    console.error('Failed to add note:', error);
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, content, x_pos, y_pos, width, height, z_index, color, wrap_text } = data;
    
    updateNoteStmt.run({
      id,
      content,
      x_pos,
      y_pos,
      width,
      height,
      z_index: z_index || 0,
      color,
      wrap_text: wrap_text !== undefined ? (wrap_text ? 1 : 0) : 1
    });
    
    const updatedNote = selectNoteByIdStmt.get(id);
    syncNoteToDisk(updatedNote);
    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Failed to update note:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    deleteNoteFromDisk(id);
    deleteNoteStmt.run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete note:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
