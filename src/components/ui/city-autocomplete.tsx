'use client';

import * as React from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { publicEnvironment } from '@/lib/env';

interface Suggestion {
  name: string; // ex. "Ubud"
  context: string; // ex. "Bali, Indonésie"
  country_code?: string | null;
  lng?: number | null;
  lat?: number | null;
}

interface Props {
  countries: string[]; // ISO2 codes — filter scope. Empty = worldwide.
  placeholder?: string;
  onPick: (city: { name: string; context: string; lng?: number | null; lat?: number | null }) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

// Lightweight in-memory cache per session: (query|countries) → results.
const cache = new Map<string, Suggestion[]>();

export function CityAutocomplete({
  countries,
  placeholder = 'Rechercher une ville…',
  onPick,
  onCancel,
  autoFocus,
  disabled,
}: Props) {
  const [query, setQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const key = publicEnvironment.NEXT_PUBLIC_MAP_TILES_API_KEY;
  const countryFilter = countries.map((c) => c.toLowerCase()).join(',');

  // Debounced fetch
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !key) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const cacheKey = `${q}|${countryFilter}`;
    if (cache.has(cacheKey)) {
      setSuggestions(cache.get(cacheKey)!);
      setLoading(false);
      return;
    }
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json`);
        url.searchParams.set('key', key);
        if (countryFilter) url.searchParams.set('country', countryFilter);
        url.searchParams.set('limit', '10');
        url.searchParams.set('language', 'fr');
        const r = await fetch(url.toString(), { signal: ctrl.signal });
        if (!r.ok) throw new Error('geocode_failed');
        const json: {
          features: Array<{
            text?: string;
            place_name?: string;
            place_type?: string[];
            center?: [number, number];
            geometry?: { coordinates?: [number, number] };
            properties?: { country_code?: string };
          }>;
        } = await r.json();
        // Blacklist : exclude only what is clearly not a city/locality.
        const excluded = new Set(['address', 'poi', 'postal_code', 'country']);
        const items: Suggestion[] = (json.features || [])
          .filter((f) => !f.place_type || !f.place_type.every((t) => excluded.has(t)))
          .map((f) => {
            const coords = f.center ?? f.geometry?.coordinates ?? null;
            return {
              name: f.text || f.place_name || '',
              context: f.place_name || '',
              country_code: f.properties?.country_code ?? null,
              lng: coords ? coords[0] : null,
              lat: coords ? coords[1] : null,
            };
          })
          .slice(0, 8);
        cache.set(cacheKey, items);
        setSuggestions(items);
        setHighlight(0);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, countryFilter, key]);

  React.useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  function pick(s: Suggestion) {
    onPick({ name: s.name, context: s.context, lng: s.lng, lat: s.lat });
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const s = suggestions[highlight];
      if (s) pick(s);
      else if (query.trim()) onPick({ name: query.trim(), context: '' });
    } else if (e.key === 'Escape') {
      if (onCancel) onCancel();
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus={autoFocus}
          disabled={disabled}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-8 w-56 pl-7 text-sm"
        />
        {loading && (
          <Loader2 className="absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && (query.trim().length >= 2 || suggestions.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border bg-popover text-sm shadow-md">
          {!key && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Clé MapTiler manquante. Saisissez la ville manuellement et Entrée pour valider.
            </p>
          )}
          {key && suggestions.length === 0 && !loading && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Aucun résultat. Appuyez sur Entrée pour utiliser «&nbsp;{query.trim()}&nbsp;» tel quel.
            </p>
          )}
          {suggestions.map((s, i) => (
            <button
              key={`${s.name}-${s.context}-${i}`}
              type="button"
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(s)}
              className={`flex w-full items-start gap-2 px-3 py-1.5 text-left transition ${
                i === highlight ? 'bg-muted' : 'hover:bg-muted/60'
              }`}
            >
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{s.name}</div>
                {s.context && s.context !== s.name && (
                  <div className="truncate text-xs text-muted-foreground">{s.context}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
