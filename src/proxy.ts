import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * UX gate only. API authorization is always enforced by selfkit-backend.
 *
 * Unlike the previous gate, this checks the httpOnly access-token cookie
 * rather than user-controlled profile/flag cookies.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has('kys_access_token')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/manual/:path*/details'],
};
