import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const isAdminOnlyRoute =
      req.nextUrl.pathname.startsWith('/dashboard/users') || req.nextUrl.pathname.startsWith('/dashboard/settings');
    const role = req.nextauth.token?.role;

    if (isAdminOnlyRoute && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: '/login' },
  },
);

export const config = {
  matcher: ['/dashboard/:path*'],
};
