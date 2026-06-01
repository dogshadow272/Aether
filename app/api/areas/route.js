import { NextResponse } from 'next/server';
import db from '@/lib/db';

// Pre-compiled prepared statements for maximum performance
const selectAreasStmt = db.prepare('SELECT * FROM areas');
const selectAreaByIdStmt = db.prepare('SELECT * FROM areas WHERE id = ?');

const insertAreaStmt = db.prepare(`
  INSERT INTO areas (id, name, x_pos, y_pos, width, height, color)
  VALUES (@id, @name, @x_pos, @y_pos, @width, @height, @color)
`);

const updateAreaStmt = db.prepare(`
  UPDATE areas
  SET name = @name, x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height, color = @color
  WHERE id = @id
`);

const deleteAreaStmt = db.prepare('DELETE FROM areas WHERE id = ?');

export async function GET() {
  try {
    const areas = selectAreasStmt.all();
    return NextResponse.json(areas);
  } catch (error) {
    console.error('Failed to fetch areas:', error);
    return NextResponse.json({ error: 'Failed to fetch areas' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const id = crypto.randomUUID();
    
    insertAreaStmt.run({
      id,
      name: data.name || 'NEW AREA',
      x_pos: data.x_pos || 0,
      y_pos: data.y_pos || 0,
      width: data.width || 200,
      height: data.height || 200,
      color: data.color || 'rgba(0, 170, 255, 0.08)'
    });

    const newArea = selectAreaByIdStmt.get(id);
    return NextResponse.json(newArea);
  } catch (error) {
    console.error('Failed to add area:', error);
    return NextResponse.json({ error: 'Failed to add area' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, name, x_pos, y_pos, width, height, color } = data;
    
    updateAreaStmt.run({ id, name, x_pos, y_pos, width, height, color });
    
    const updatedArea = selectAreaByIdStmt.get(id);
    return NextResponse.json(updatedArea);
  } catch (error) {
    console.error('Failed to update area:', error);
    return NextResponse.json({ error: 'Failed to update area' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    deleteAreaStmt.run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete area:', error);
    return NextResponse.json({ error: 'Failed to delete area' }, { status: 500 });
  }
}
