'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

import type { TmdbGenre, TmdbPerson } from '@/types/tmdb';

import { useAuth, usePreferences } from '@/hooks';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Chip,
  Input,
  Spinner,
  useToast,
} from '@/components/ui';
import { Header } from '@/components';

export default function PreferencesPage() {
  const { user, loading: authLoading } = useAuth();
  const { preferences, loading: prefsLoading, savePreferences } = usePreferences(user?.id);
  const { addToast } = useToast();
  const router = useRouter();

  const [genres, setGenres] = useState<TmdbGenre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [personSearch, setPersonSearch] = useState('');
  const [personResults, setPersonResults] = useState<TmdbPerson[]>([]);
  const [selectedActors, setSelectedActors] = useState<TmdbPerson[]>([]);
  const [selectedDirectors, setSelectedDirectors] = useState<TmdbPerson[]>([]);
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Загружаем жанры
  useEffect(() => {
    const fetchGenres = async () => {
      const res = await fetch('/api/tmdb/genres');
      const data = await res.json() as TmdbGenre[];
      setGenres(data);
    };
    void fetchGenres();
  }, []);

  // Загружаем сохранённые предпочтения
  useEffect(() => {
    if (preferences) {
      setSelectedGenres(preferences.genres ?? []);
      setYearFrom(preferences.year_from?.toString() ?? '');
      setYearTo(preferences.year_to?.toString() ?? '');
    }
  }, [preferences]);

  // Поиск персон
  const searchPerson = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPersonResults([]);
      return;
    }
    const res = await fetch(`/api/tmdb/search?type=person&query=${encodeURIComponent(query)}`);
    const data = await res.json() as { results: TmdbPerson[] };
    setPersonResults(data.results ?? []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void searchPerson(personSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [personSearch, searchPerson]);

  const toggleGenre = (genreId: number) => {
    setSelectedGenres(prev =>
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId],
    );
  };

  const addPerson = (person: TmdbPerson, type: 'actor' | 'director') => {
    if (type === 'actor') {
      if (!selectedActors.find(a => a.id === person.id)) {
        setSelectedActors(prev => [...prev, person]);
      }
    } else {
      if (!selectedDirectors.find(d => d.id === person.id)) {
        setSelectedDirectors(prev => [...prev, person]);
      }
    }
    setPersonSearch('');
    setPersonResults([]);
  };

  const removePerson = (personId: number, type: 'actor' | 'director') => {
    if (type === 'actor') {
      setSelectedActors(prev => prev.filter(a => a.id !== personId));
    } else {
      setSelectedDirectors(prev => prev.filter(d => d.id !== personId));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePreferences({
        genres: selectedGenres,
        favorite_actors: selectedActors.map(a => a.id),
        favorite_directors: selectedDirectors.map(d => d.id),
        year_from: yearFrom ? parseInt(yearFrom, 10) : null,
        year_to: yearTo ? parseInt(yearTo, 10) : null,
      });
      addToast({
        title: 'Сохранено!',
        description: 'Ваши предпочтения обновлены',
        variant: 'success',
      });
      router.push('/');
    } catch (error) {
      addToast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось сохранить',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || prefsLoading) {
    return (
      <>
        <Header />
        <main className="min-h-[calc(100vh-64px)] flex items-center justify-center">
          <Spinner size="lg" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-64px)] p-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-2 w-16 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-secondary'
                }`}
              />
            ))}
          </div>

          {step === 1 && (
            <Card className="fade-in">
              <CardHeader className="text-center">
                <CardTitle>Какие жанры тебе нравятся?</CardTitle>
                <CardDescription>
                  Выбери один или несколько жанров
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-6">
                  {genres.map(genre => (
                    <Chip
                      key={genre.id}
                      selected={selectedGenres.includes(genre.id)}
                      onClick={() => toggleGenre(genre.id)}
                    >
                      {selectedGenres.includes(genre.id) && (
                        <Check className="h-4 w-4" />
                      )}
                      {genre.name}
                    </Chip>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
                    Пропустить
                  </Button>
                  <Button onClick={() => setStep(2)} className="flex-1">
                    Далее
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="fade-in">
              <CardHeader className="text-center">
                <CardTitle>Любимые актёры и режиссёры</CardTitle>
                <CardDescription>
                  Добавьте людей, чьи фильмы вам нравятся
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Поиск актёров и режиссёров..."
                    value={personSearch}
                    onChange={e => setPersonSearch(e.target.value)}
                  />
                  {personResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-auto z-10">
                      {personResults.map(person => (
                        <div
                          key={person.id}
                          className="p-3 hover:bg-secondary cursor-pointer border-b border-border last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{person.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {person.known_for_department}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => addPerson(person, 'actor')}
                              >
                                Актёр
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => addPerson(person, 'director')}
                              >
                                Режиссёр
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedActors.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Актёры:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedActors.map(actor => (
                        <Chip
                          key={actor.id}
                          selected
                          onClick={() => removePerson(actor.id, 'actor')}
                        >
                          {actor.name}
                          {' '}
                          ×
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDirectors.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Режиссёры:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDirectors.map(director => (
                        <Chip
                          key={director.id}
                          selected
                          onClick={() => removePerson(director.id, 'director')}
                        >
                          {director.name}
                          {' '}
                          ×
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                    Назад
                  </Button>
                  <Button variant="secondary" onClick={() => setStep(3)} className="flex-1">
                    Пропустить
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1">
                    Далее
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="fade-in">
              <CardHeader className="text-center">
                <CardTitle>Годы выпуска фильмов</CardTitle>
                <CardDescription>
                  Укажите предпочтительный диапазон
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground mb-1 block">С года</label>
                    <Input
                      type="number"
                      placeholder="1990"
                      value={yearFrom}
                      onChange={e => setYearFrom(e.target.value)}
                      min={1900}
                      max={new Date().getFullYear()}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground mb-1 block">По год</label>
                    <Input
                      type="number"
                      placeholder={new Date().getFullYear().toString()}
                      value={yearTo}
                      onChange={e => setYearTo(e.target.value)}
                      min={1900}
                      max={new Date().getFullYear()}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
                    Назад
                  </Button>
                  <Button onClick={() => void handleSave()} disabled={saving} className="flex-1">
                    {saving ? <Spinner size="sm" /> : 'Готово!'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
