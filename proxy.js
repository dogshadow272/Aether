import { NextResponse } from 'next/server';

export function proxy(request) {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    const host = request.headers.get('host') || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.startsWith('192.168.') || host.startsWith('10.');
    const isVercel = process.env.VERCEL === '1' || host.includes('vercel.app');
    
    const url = request.nextUrl.clone();
    
    // Always block /test and /api/backup in production
    if (url.pathname.startsWith('/test') || url.pathname.startsWith('/api/backup')) {
      return new NextResponse(
        JSON.stringify({ error: 'Restricted in production environment.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Restrict other /api routes in production if not accessed locally or on Vercel
    if (url.pathname.startsWith('/api') && !isLocal && !isVercel) {
      return new NextResponse(
        JSON.stringify({ error: 'Access Denied: Production API is restricted to local or Vercel access.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/test/:path*'],
};
