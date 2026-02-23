import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const isPartyDetailRoute = /^\/party\/[^/]+$/.test(pathname);

    // Fast path for public discovery/list endpoints to reduce navigation latency.
    if (
        request.method === 'GET' &&
        (pathname === '/discover' || pathname === '/api/parties' || isPartyDetailRoute)
    ) {
        return NextResponse.next();
    }

    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
