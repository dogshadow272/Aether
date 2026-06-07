import { NextResponse } from 'next/server';
import db from '@/lib/db';

// Pre-compiled prepared statements for maximum performance
const selectLinksStmt = db.prepare('SELECT * FROM links');
const selectLinkByIdStmt = db.prepare('SELECT * FROM links WHERE id = ?');

const insertLinkStmt = db.prepare(`
  INSERT INTO links (id, source_id, source_type, target_id, target_type, label, type, arrow, speed, shape, color)
  VALUES (@id, @source_id, @source_type, @target_id, @target_type, @label, @type, @arrow, @speed, @shape, @color)
`);

const updateLinkStmt = db.prepare(`
  UPDATE links
  SET label = @label, type = @type, arrow = @arrow, speed = @speed, shape = @shape, color = @color
  WHERE id = @id
`);

const deleteLinkStmt = db.prepare('DELETE FROM links WHERE id = ?');

export async function GET() {
  try {
    const links = selectLinksStmt.all();
    return NextResponse.json(links);
  } catch (error) {
    console.error('Failed to fetch links:', error);
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const id = data.id || crypto.randomUUID();
    
    insertLinkStmt.run({
      id,
      source_id: data.source_id,
      source_type: data.source_type,
      target_id: data.target_id,
      target_type: data.target_type,
      label: data.label || '',
      type: data.type || 'default',
      arrow: data.arrow || 'none',
      speed: data.speed || 'normal',
      shape: data.shape || 'curved',
      color: data.color || null
    });

    const newLink = selectLinkByIdStmt.get(id);
    return NextResponse.json(newLink);
  } catch (error) {
    console.error('Failed to add link:', error);
    return NextResponse.json({ error: 'Failed to add link' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, label, type, arrow, speed, shape, color } = data;
    
    const existing = selectLinkByIdStmt.get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const nextLabel = label !== undefined ? label : existing.label;
    const nextType = type !== undefined ? type : existing.type;
    const nextArrow = arrow !== undefined ? arrow : existing.arrow;
    const nextSpeed = speed !== undefined ? speed : existing.speed;
    const nextShape = shape !== undefined ? shape : existing.shape;
    const nextColor = color !== undefined ? color : existing.color;

    updateLinkStmt.run({ id, label: nextLabel, type: nextType, arrow: nextArrow, speed: nextSpeed, shape: nextShape, color: nextColor });
    
    const updatedLink = selectLinkByIdStmt.get(id);
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

    deleteLinkStmt.run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete link:', error);
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
  }
}
