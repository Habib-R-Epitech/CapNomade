import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface WidgetCardProps {
  title: string;
  icon: LucideIcon;
  count?: number | string;
  description?: string;
  href: string;
  emptyHint?: string;
  className?: string;
  children?: React.ReactNode;
}

export function WidgetCard({
  title,
  icon: Icon,
  count,
  description,
  href,
  emptyHint,
  className,
  children,
}: WidgetCardProps) {
  return (
    <Card className={cn('flex flex-col p-5', className)}>
      <header className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
          {count !== undefined && <p className="font-serif text-2xl font-semibold">{count}</p>}
        </div>
        <Link
          href={href}
          aria-label={`Voir ${title.toLowerCase()}`}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="size-4" />
        </Link>
      </header>
      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-3 flex-1">{children ?? (emptyHint && <p className="text-xs text-muted-foreground">{emptyHint}</p>)}</div>
    </Card>
  );
}
