import type { Metadata, Viewport } from 'next';

import { Providers } from '@/providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'Pairew — Подбор фильмов в компании',
  description: 'Сервис для совместного выбора фильмов. Свайпайте, голосуйте и находите идеальный фильм для просмотра с друзьями.',
  keywords: ['фильмы', 'подбор фильмов', 'совместный просмотр', 'tinder для фильмов'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0f',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
