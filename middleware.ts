import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Allow all requests - no authentication required
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|auth|_next/static|_next/image|favicon.ico).*)',
  ],
};