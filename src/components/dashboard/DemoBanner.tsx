import { Eye, LogOut } from 'lucide-react';

export function DemoBanner({ name }: { name: string | null }) {
  const who = name?.split(' ')[0] ?? 'Ruben';
  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b bg-amber-100/90 px-4 py-2 text-sm text-amber-900 backdrop-blur dark:bg-amber-900/30 dark:text-amber-100">
      <span className="inline-flex items-center gap-2">
        <Eye className="size-4" />
        Mode démo — vous explorez le compte de {who} en lecture seule.
      </span>
      <a
        href="/demo/exit"
        className="inline-flex items-center gap-1 rounded-md border border-amber-700/30 bg-amber-200/60 px-2.5 py-1 text-xs font-medium hover:bg-amber-200 dark:border-amber-200/30 dark:bg-amber-800/40 dark:hover:bg-amber-800/60"
      >
        <LogOut className="size-3.5" /> Sortir de la démo
      </a>
    </div>
  );
}
