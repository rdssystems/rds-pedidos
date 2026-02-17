import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl;
    const hostname = request.headers.get('host') || '';

    // Define main domain (for localhost testing)
    const mainDomain = 'localhost:3000'; // Or just 'localhost' depending on how Nginx/Docker is set up
    // Actually, since we use Nginx, it might be just 'localhost'

    const isMainDomain = hostname === 'localhost' || hostname === '127.0.0.1';

    // Extract subdomain for .lvh.me or .localhost
    let subdomain = '';
    if (hostname.includes('.lvh.me')) {
        subdomain = hostname.split('.lvh.me')[0];
    } else if (hostname.includes('.localhost') && hostname !== 'localhost') {
        subdomain = hostname.split('.localhost')[0];
    }

    // If we have a subdomain and it's not the main domain
    if (subdomain && !isMainDomain) {
        // Prevent infinite loops if the path already starts with the slug (though unlikely with subdomains)
        if (url.pathname.startsWith(`/${subdomain}`)) {
            return NextResponse.next();
        }

        // Rewrite to /[subdomain]/...
        // This allows the user to visit loja1.lvh.me/ and see /[slug]/page.tsx
        console.log(`Rewriting ${hostname}${url.pathname} to /${subdomain}${url.pathname}`);
        return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, request.url));
    }

    return NextResponse.next();
}

// Only match public routes or specific paths if needed
// For now, we want it to run on almost everything except internal Next.js paths
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - media (Django media)
         * - django-admin (Django admin)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|media|django-admin).*)',
    ],
};
