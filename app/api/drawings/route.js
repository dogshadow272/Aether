import { NextResponse } from 'next/server';
import db from '@/lib/db';

const selectDrawingsStmt = db.prepare('SELECT * FROM drawings ORDER BY created_at ASC');
const insertDrawingStmt = db.prepare(`
  INSERT INTO drawings (id, path_data, color, stroke_width)
  VALUES (@id, @path_data, @color, @stroke_width)
`);
const deleteDrawingByIdStmt = db.prepare('DELETE FROM drawings WHERE id = ?');
const deleteAllDrawingsStmt = db.prepare('DELETE FROM drawings');

export async function GET() {
  try {
    const drawings = selectDrawingsStmt.all();
    return NextResponse.json(drawings);
  } catch (error) {
    console.error('Failed to fetch drawings:', error);
    return NextResponse.json({ error: 'Failed to fetch drawings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const id = data.id || crypto.randomUUID();
    
    insertDrawingStmt.run({
      id,
      path_data: data.path_data,
      color: data.color || '#00aaff',
      stroke_width: data.stroke_width || 4
    });

    const newDrawing = db.prepare('SELECT * FROM drawings WHERE id = ?').get(id);
    return NextResponse.json(newDrawing);
  } catch (error) {
    console.error('Failed to save drawing stroke:', error);
    return NextResponse.json({ error: 'Failed to save drawing stroke' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      deleteDrawingByIdStmt.run(id);
    } else {
      deleteAllDrawingsStmt.run();
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete drawings:', error);
    return NextResponse.json({ error: 'Failed to delete drawings' }, { status: 500 });
  }
}
