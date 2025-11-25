import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Страницы, требующие авторизации
const protectedPaths = [
  '/preferences',
  '/room',
  '/results',
  '/history',
];

// Страницы только для неавторизованных пользователей
const authPaths = ['/auth'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Проверяем, является ли путь защищённым
  const isProtectedPath = protectedPaths.some(path =>
    pathname.startsWith(path),
  );

  // Проверяем, является ли путь только для неавторизованных
  const isAuthPath = authPaths.some(path =>
    pathname.startsWith(path),
  );

  // Редирект неавторизованных пользователей с защищённых страниц
  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Редирект авторизованных пользователей со страниц авторизации
  if (isAuthPath && user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Применяем middleware ко всем маршрутам, кроме:
     * - _next/static (статические файлы)
     * - _next/image (оптимизация изображений)
     * - favicon.ico (favicon)
     * - публичные файлы (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
