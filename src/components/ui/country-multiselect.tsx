'use client';

import * as React from 'react';
import { Check, X, ChevronDown, Search } from 'lucide-react';
import { COUNTRIES, countryName, searchCountries } from '@/lib/data/countries';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
}

export function CountryMultiSelect({ value, onChange, placeholder = 'Rechercher un pays…', id }: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const upperValue = React.useMemo(() => value.map((c) => c.toUpperCase()), [value]);
  const selectedSet = React.useMemo(() => new Set(upperValue), [upperValue]);
  const results = React.useMemo(() => searchCountries(query, 30), [query]);

  function toggle(code: string) {
    const c = code.toUpperCase();
    if (selectedSet.has(c)) {
      onChange(upperValue.filter((x) => x !== c));
    } else {
      onChange([...upperValue, c]);
    }
    setQuery('');
    inputRef.current?.focus();
  }

  function remove(code: string) {
    onChange(upperValue.filter((c) => c !== code.toUpperCase()));
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition focus-within:ring-1 focus-within:ring-ring"
      >
        {upperValue.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          upperValue.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
            >
              <span>{countryName(code) ?? code}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(code);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    remove(code);
                  }
                }}
                className="cursor-pointer rounded p-0.5 hover:bg-background"
                aria-label={`Retirer ${countryName(code) ?? code}`}
              >
                <X className="size-3" />
              </span>
            </span>
          ))
        )}
        <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-hidden rounded-md border bg-popover shadow-md">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tapez le nom d'un pays…"
              className="flex-1 bg-transparent text-sm focus:outline-none"
              autoComplete="off"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {results.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">Aucun pays trouvé.</li>
            )}
            {results.map((c) => {
              const selected = selectedSet.has(c.code);
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => toggle(c.code)}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-muted ${
                      selected ? 'bg-muted/50' : ''
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{c.code}</span>
                      {selected && <Check className="size-4 text-primary" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {results.length > 0 && (
            <div className="border-t px-3 py-1 text-xs text-muted-foreground">
              {COUNTRIES.length} pays au total · {upperValue.length} sélectionné{upperValue.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
