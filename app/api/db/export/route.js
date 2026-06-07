import { NextResponse } from 'next/server';
import fs from 'fs';
import db from '@/lib/db';

export async function GET() {
  try {
    // Read the active database file (handles both local development and /tmp on Vercel)
    const fileBuffer = fs.readFileSync(db.name);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': 'attachment; filename=apiron.db',
      },
    });
  } catch (error) {
    console.error('Failed to export database:', error);
    return NextResponse.json({ error: 'Failed to export database' }, { status: 500 });
  }
}
