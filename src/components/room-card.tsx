import type { Database } from '@/types/database';

import Link from 'next/link';
import {
  Calendar,
  Users,
} from 'lucide-react';

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { ROUTES } from '@/lib/constants';

type Room = Database['public']['Tables']['rooms']['Row'];

interface RoomCardProps {
  room: Room;
  participantCount?: number;
}

const statusLabels: Record<Room['status'], string> = {
  waiting: 'Ожидание',
  voting: 'Голосование',
  finished: 'Завершено',
};

const statusVariants: Record<Room['status'], 'warning' | 'accent' | 'success'> = {
  waiting: 'warning',
  voting: 'accent',
  finished: 'success',
};

export function RoomCard({ room, participantCount = 0 }: RoomCardProps) {
  const href = room.status === 'finished'
    ? ROUTES.RESULTS(room.id)
    : ROUTES.ROOM(room.id);

  return (
    <Link href={href}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-mono">{room.code}</CardTitle>
            <Badge variant={statusVariants[room.status]}>
              {statusLabels[room.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{participantCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(room.created_at).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

