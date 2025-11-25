export interface Database {
  public: {
    Tables: {
      preferences: {
        Row: {
          id: string;
          user_id: string;
          genres: number[];
          favorite_actors: number[];
          favorite_directors: number[];
          year_from: number | null;
          year_to: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          genres?: number[];
          favorite_actors?: number[];
          favorite_directors?: number[];
          year_from?: number | null;
          year_to?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          genres?: number[];
          favorite_actors?: number[];
          favorite_directors?: number[];
          year_from?: number | null;
          year_to?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      rooms: {
        Row: {
          id: string;
          code: string;
          creator_id: string;
          status: 'waiting' | 'voting' | 'finished';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          creator_id: string;
          status?: 'waiting' | 'voting' | 'finished';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          creator_id?: string;
          status?: 'waiting' | 'voting' | 'finished';
          created_at?: string;
          updated_at?: string;
        };
      };
      room_participants: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          joined_at?: string;
        };
      };
      votes: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          movie_id: number;
          liked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          movie_id: number;
          liked: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          movie_id?: number;
          liked?: boolean;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
