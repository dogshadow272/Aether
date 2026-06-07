import { NextResponse } from 'next/server';
import db from '@/lib/db';

const selectHighlightsStmt = db.prepare('SELECT * FROM pdf_highlights WHERE pdf_id = ? ORDER BY created_at ASC');
const selectHighlightByIdStmt = db.prepare('SELECT * FROM pdf_highlights WHERE id = ?');
const insertHighlightStmt = db.prepare(`
  INSERT INTO pdf_highlights (id, pdf_id, page_number, start_offset, end_offset, text, color)
  VALUES (@id, @pdf_id, @page_number, @start_offset, @end_offset, @text, @color)
`);
const deleteHighlightStmt = db.prepare('DELETE FROM pdf_highlights WHERE id = ?');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pdfId = searchParams.get('pdf_id');
    if (!pdfId) {
      return NextResponse.json({ error: 'pdf_id required' }, { status: 400 });
    }
    const highlights = selectHighlightsStmt.all(pdfId);
    return NextResponse.json(highlights);
  } catch (error) {
    console.error('Failed to fetch PDF highlights:', error);
    return NextResponse.json({ error: 'Failed to fetch highlights' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { pdf_id, page_number, start_offset, end_offset, text, color } = data;

    if (!pdf_id || !page_number || start_offset === undefined || end_offset === undefined || !text || !color) {
      return NextResponse.json({ error: 'Missing required highlight parameters' }, { status: 400 });
    }

    const id = data.id || crypto.randomUUID();
    insertHighlightStmt.run({
      id,
      pdf_id,
      page_number: parseInt(page_number),
      start_offset: parseInt(start_offset),
      end_offset: parseInt(end_offset),
      text,
      color
    });

    const newHighlight = selectHighlightByIdStmt.get(id);
    return NextResponse.json(newHighlight);
  } catch (error) {
    console.error('Failed to create PDF highlight:', error);
    return NextResponse.json({ error: 'Failed to create highlight' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    deleteHighlightStmt.run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete PDF highlight:', error);
    return NextResponse.json({ error: 'Failed to delete highlight' }, { status: 500 });
  }
}
