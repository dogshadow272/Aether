import { NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

// Pre-compiled SQLite prepared statements for maximum performance
const selectPdfsStmt = db.prepare('SELECT * FROM pdfs');
const selectPdfByIdStmt = db.prepare('SELECT * FROM pdfs WHERE id = ?');
const insertPdfStmt = db.prepare(`
  INSERT INTO pdfs (id, name, filename, x_pos, y_pos, width, height)
  VALUES (@id, @name, @filename, @x_pos, @y_pos, @width, @height)
`);
const updatePdfStmt = db.prepare(`
  UPDATE pdfs
  SET name = @name, x_pos = @x_pos, y_pos = @y_pos, width = @width, height = @height
  WHERE id = @id
`);
const deletePdfStmt = db.prepare('DELETE FROM pdfs WHERE id = ?');

export async function GET() {
  try {
    const pdfs = selectPdfsStmt.all();
    return NextResponse.json(pdfs);
  } catch (error) {
    console.error('Failed to fetch pdfs:', error);
    return NextResponse.json({ error: 'Failed to fetch pdfs' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const x_pos = parseFloat(formData.get('x_pos') || '0');
    const y_pos = parseFloat(formData.get('y_pos') || '0');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize and prepare filename
    const originalName = file.name;
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const uniqueFilename = `${baseName}_${Date.now()}${ext}`;

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    // Save file to public/uploads/
    const filePath = path.join(uploadDir, uniqueFilename);
    await fs.writeFile(filePath, buffer);

    // Insert into SQLite database
    const id = formData.get('id') || crypto.randomUUID();
    insertPdfStmt.run({
      id,
      name: originalName,
      filename: uniqueFilename,
      x_pos,
      y_pos,
      width: 450,
      height: 600
    });

    const newPdf = selectPdfByIdStmt.get(id);
    return NextResponse.json(newPdf);
  } catch (error) {
    console.error('Failed to upload PDF:', error);
    return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, name, x_pos, y_pos, width, height } = data;

    updatePdfStmt.run({ id, name, x_pos, y_pos, width, height });
    const updatedPdf = selectPdfByIdStmt.get(id);
    return NextResponse.json(updatedPdf);
  } catch (error) {
    console.error('Failed to update PDF:', error);
    return NextResponse.json({ error: 'Failed to update PDF' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const pdf = selectPdfByIdStmt.get(id);
    if (pdf) {
      // Delete local file from disk
      const filePath = path.join(process.cwd(), 'public', 'uploads', pdf.filename);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn('File not found or failed to delete from disk:', err);
      }
    }

    deletePdfStmt.run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete PDF:', error);
    return NextResponse.json({ error: 'Failed to delete PDF' }, { status: 500 });
  }
}
