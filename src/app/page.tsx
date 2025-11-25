'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users } from 'lucide-react';

import { ROUTES } from '@/lib/constants';
import { useAuth, useRoom } from '@/hooks';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
  useToast,
} from '@/components/ui';
import { Header } from '@/components';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { createRoom, joinRoom } = useRoom();
  const { addToast } = useToast();
  const router = useRouter();

  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async () => {
    if (!user) {
      router.push(ROUTES.AUTH.LOGIN);
      return;
    }

    setLoading(true);
    try {
      const room = await createRoom();
      router.push(ROUTES.ROOM(room.id));
    } catch (error) {
      addToast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать комнату',
        variant: 'error',
      });
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push(ROUTES.AUTH.LOGIN);
      return;
    }

    if (!roomCode.trim()) return;

    setLoading(true);
    try {
      const room = await joinRoom(roomCode);
      router.push(ROUTES.ROOM(room.id));
    } catch (error) {
      addToast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось войти в комнату',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-fixed">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto">
        <div className="w-full max-w-md space-y-6">
          {/* Hero */}
          <div className="text-center fade-in">
            <h1 className="text-4xl font-bold gradient-text mb-4 md:text-5xl">
              Pairew
            </h1>
            <p className="text-muted-foreground text-lg mb-2">
              Найдите идеальный фильм для просмотра в компании
            </p>
            <p className="text-muted-foreground text-sm">
              Свайпайте фильмы вместе с друзьями и находите совпадения
            </p>
          </div>

          {authLoading
            ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              )
            : (
                <div className="space-y-4 fade-in">
                  {/* Создать комнату */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Создать комнату
                      </CardTitle>
                      <CardDescription>
                        Создайте новую комнату и пригласите друзей
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        className="w-full"
                        onClick={() => void handleCreateRoom()}
                        disabled={loading}
                      >
                        {loading
                          ? <Spinner size="sm" />
                          : 'Создать комнату'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Войти в комнату */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Войти в комнату
                      </CardTitle>
                      <CardDescription>
                        Введите код комнаты от друга
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={e => void handleJoinRoom(e)} className="flex gap-2">
                        <Input
                          placeholder="Код комнаты"
                          value={roomCode}
                          onChange={e => setRoomCode(e.target.value.toUpperCase())}
                          className="font-mono uppercase"
                          maxLength={6}
                        />
                        <Button type="submit" disabled={loading || !roomCode.trim()}>
                          {loading
                            ? <Spinner size="sm" />
                            : 'Войти'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {!user && (
                    <p className="text-center text-sm text-muted-foreground">
                      Для создания или входа в комнату необходимо
                      {' '}
                      <a href={ROUTES.AUTH.LOGIN} className="text-primary hover:underline">
                        войти в аккаунт
                      </a>
                    </p>
                  )}
                </div>
              )}
        </div>
      </main>
    </div>
  );
}
