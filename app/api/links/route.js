import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const links = db.prepare('SELECT * FROM links').all();
    return NextResponse.json(links);
  } catch (error) {
    console.error('Failed to fetch links:', error);
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const id = crypto.randomUUID();
    
    const stmt = db.prepare(`
      INSERT INTO links (id, source_id, source_type, target_id, target_type, label, type, arrow)
      VALUES (@id, @source_id, @source_type, @target_id, @target_type, @label, @type, @arrow)
    `);
    
    stmt.run({
      id,
      source_id: data.source_id,
      source_type: data.source_type,
      target_id: data.target_id,
      target_type: data.target_type,
      label: data.label || '',
      type: data.type || 'default',
      arrow: data.arrow || 'none'
    });

    const newLink = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
    return NextResponse.json(newLink);
  } catch (error) {
    console.error('Failed to add link:', error);
    return NextResponse.json({ error: 'Failed to add link' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, label, type, arrow } = data;
    
    const existing = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const nextLabel = label !== undefined ? label : existing.label;
    const nextType = type !== undefined ? type : existing.type;
    const nextArrow = arrow !== undefined ? arrow : existing.arrow;

    const stmt = db.prepare(`
      UPDATE links
      SET label = @label, type = @type, arrow = @arrow
      WHERE id = @id
    `);
    
    stmt.run({ id, label: nextLabel, type: nextType, arrow: nextArrow });
    
    const updatedLink = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error('Failed to update link:', error);
    return NextResponse.json({ error: 'Failed to update link' }, { status: 500 });
  }
}


export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    db.prepare('DELETE FROM links WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete link:', error);
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
  }
}
