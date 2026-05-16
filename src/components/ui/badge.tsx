import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        accent: 'border-transparent bg-accent/15 text-accent-foreground',
        success: 'border-transparent bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
        warning: 'border-transparent bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
        outline: 'text-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
