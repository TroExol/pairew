'use client';

import Link from 'next/link';
import {
  History,
  LogOut,
  Settings,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui';
import { useAuth } from '@/hooks';

export function Header() {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold gradient-text">
          Pairew
        </Link>

        <nav className="flex items-center gap-2">
          {!loading && user ? (
            <>
              <Link href="/history">
                <Button variant="ghost" size="icon" title="История">
                  <History className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/preferences">
                <Button variant="ghost" size="icon" title="Предпочтения">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={signOut} title="Выйти">
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : !loading ? (
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4 mr-2" />
                Войти
              </Button>
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

