// apps/app/middleware.ts v2 - server-side proxy with edge-gate credential injection.
// Browser talks only to this Vercel origin (protected by Vercel Authentication SSO - probe-
// verified active on preview). Middleware rewrites /v1/* and /local/* to the 212 edge with a
// secret header the edge requires. Direct hits on the edge origins without the header get 403.
// Secret via env (sensitive), agent-held service credential, never in code, never user-delivered.
import { NextRequest, NextResponse } from 'next/server';

const API_ORIGIN = process.env.EDGE_API_ORIGIN; // https://genfeed-api.31.220.58.212.sslip.io
const FILES_ORIGIN = process.env.EDGE_FILES_ORIGIN; // https://genfeed-files.31.220.58.212.sslip.io
const GATE_SECRET = process.env.EDGE_GATE_SECRET; // sensitive env, vault-held

function proxyWithGate(request: NextRequest, origin: string) {
  const url = new URL(request.url);
  const upstream = origin + url.pathname + url.search;
  const headers = new Headers(request.headers);
  headers.set('x-edge-gate', GATE_SECRET ?? '');
  headers.delete('host');
  return NextResponse.rewrite(upstream, { request: { headers } });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!GATE_SECRET || !API_ORIGIN || !FILES_ORIGIN) {
    return new NextResponse('edge not configured', { status: 503 });
  }
  if (pathname === '/v1' || pathname.startsWith('/v1/')) {
    return proxyWithGate(request, API_ORIGIN);
  }
  if (pathname === '/local' || pathname.startsWith('/local/')) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new NextResponse(null, { status: 403 });
    }
    return proxyWithGate(request, FILES_ORIGIN);
  }
  return NextResponse.next();
}

export const config = {
  // '/v1' listed explicitly: '/v1/:path*' does not match the bare segment (B5-8).
  matcher: ['/v1', '/v1/:path*', '/local', '/local/:path*'],
};
