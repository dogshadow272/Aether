import { NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

// Prepared statements for fetching binary file data (BLOB)
const selectPdfFileData = db.prepare('SELECT file_data, name FROM pdfs WHERE filename = ?');
const selectImageFileData = db.prepare('SELECT file_data, name FROM images WHERE filename = ?');

export async function GET(request, { params }) {
  try {
    const { filename } = await params;
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // 1. Try finding in PDFs
    try {
      const pdfRow = selectPdfFileData.get(filename);
      if (pdfRow && pdfRow.file_data) {
        return new NextResponse(pdfRow.file_data, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${encodeURIComponent(pdfRow.name)}"`,
          },
        });
      }
    } catch (dbErr) {
      console.warn('Database error while querying PDF data:', dbErr);
    }

    // 2. Try finding in Images
    try {
      const imageRow = selectImageFileData.get(filename);
      if (imageRow && imageRow.file_data) {
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'image/jpeg'; // fallback
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.svg') contentType = 'image/svg+xml';
        else if (ext === '.webp') contentType = 'image/webp';

        return new NextResponse(imageRow.file_data, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${encodeURIComponent(imageRow.name)}"`,
          },
        });
      }
    } catch (dbErr) {
      console.warn('Database error while querying Image data:', dbErr);
    }

    // 3. Fallback: check if the file exists on local disk
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
    try {
      const fileBuffer = await fs.readFile(filePath);
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.svg') contentType = 'image/svg+xml';
      else if (ext === '.webp') contentType = 'image/webp';

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        },
      });
    } catch (fsError) {
      // Quiet warning, expected if file isn't anywhere
    }

    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  } catch (error) {
    console.error('Failed to retrieve file:', error);
    return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 });
  }
}
