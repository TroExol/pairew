'use client';

import { useEffect, useState } from 'react';
import { Film } from 'lucide-react';

import type { Database } from '@/types/database';

import { useAuth } from '@/hooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
} from '@/components/ui';
import { Header, RoomCard } from '@/components';

type RoomWithCount = Database['public']['Tables']['rooms']['Row'] & {
  participant_count: number;
};

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [rooms, setRooms] = useState<RoomWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        const data = await res.json() as RoomWithCount[];
        setRooms(data);
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchRooms();
  }, [user]);

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <main className="min-h-[calc(100vh-65px)] flex items-center justify-center">
          <Spinner size="lg" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-65px)] p-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">История подборов</h1>
            <p className="text-muted-foreground">
              Ваши прошлые комнаты и результаты
            </p>
          </div>

          {rooms.length > 0
            ? (
                <div className="space-y-4">
                  {rooms.map(room => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      participantCount={room.participant_count}
                    />
                  ))}
                </div>
              )
            : (
                <Card>
                  <CardHeader className="text-center">
                    <Film className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <CardTitle>Пока пусто</CardTitle>
                    <CardDescription>
                      Создайте первую комнату и пригласите друзей!
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <a href="/" className="block">
                      <button
                        type="button"
                        className="w-full bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-3 rounded-xl font-medium transition-colors"
                      >
                        Создать комнату
                      </button>
                    </a>
                  </CardContent>
                </Card>
              )}
        </div>
      </main>
    </>
  );
}
