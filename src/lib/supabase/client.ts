import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/types/database';

// Синглтон для клиента Supabase, чтобы избежать пересоздания при каждом вызове
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
