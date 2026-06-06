import { NextResponse } from 'next/server';
import db from '@/lib/db';

// Table allowlist — prevents SQL injection via type param
const TABLE_MAP = {
  note: 'notes',
  book: 'books',
  pdf: 'pdfs',
  image: 'images',
  area: 'areas',
  quote: 'quotes',
};

export async function PATCH(request) {
  try {
    const { id, type, z_index } = await request.json();

    if (!id || !type || z_index === undefined) {
      return NextResponse.json({ error: 'id, type, and z_index are required' }, { status: 400 });
    }

    const table = TABLE_MAP[type];
    if (!table) {
      return NextResponse.json({ error: `Unknown node type: ${type}` }, { status: 400 });
    }

    db.prepare(`UPDATE ${table} SET z_index = ? WHERE id = ?`).run(z_index, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Layer update failed:', error);
    return NextResponse.json({ error: 'Layer update failed' }, { status: 500 });
  }
}
