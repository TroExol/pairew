import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirectTo') || '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Проверяем, заполнены ли предпочтения пользователя
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: preferences } = await supabase
          .from('preferences')
          .select('id')
          .eq('user_id', user.id)
          .single();

        // Если предпочтения не заполнены, направляем на онбординг
        if (!preferences) {
          return NextResponse.redirect(`${origin}/preferences`);
        }
      }

      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // Ошибка авторизации — возвращаем на страницу входа
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}

