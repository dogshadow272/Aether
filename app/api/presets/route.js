import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const presets = db.prepare('SELECT * FROM presets ORDER BY created_at DESC').all();
    return NextResponse.json(presets);
  } catch (error) {
    console.error('Failed to fetch presets:', error);
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const id = crypto.randomUUID();
    
    const stmt = db.prepare(`
      INSERT INTO presets (id, name, pan_x, pan_y, scale)
      VALUES (@id, @name, @pan_x, @pan_y, @scale)
    `);
    
    stmt.run({
      id,
      name: data.name,
      pan_x: data.pan_x,
      pan_y: data.pan_y,
      scale: data.scale
    });

    const newPreset = db.prepare('SELECT * FROM presets WHERE id = ?').get(id);
    return NextResponse.json(newPreset);
  } catch (error) {
    console.error('Failed to add preset:', error);
    return NextResponse.json({ error: 'Failed to add preset' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    db.prepare('DELETE FROM presets WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete preset:', error);
    return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 });
  }
}
