import { cn } from '@/lib/utils';

/**
 * CapNomade brand logo.
 *
 * - `LogoMark` is the circular emblem alone (globe, mountains, flight path).
 *   Use it in tight spaces like the dashboard sidebar collapsed state.
 * - `LogoWordmark` is the "CapNomade" text with two-tone colors.
 * - `Logo` (default) combines both, with an optional tagline.
 *
 * Colors track the design tokens (ocean for navy, lagoon for teal, coral
 * accent). To replace the SVG with the exact PNG from the brand kit,
 * drop the file at `public/logo.png` and swap the component to render
 * `<Image src="/logo.png" />`.
 */

export interface LogoProps {
  className?: string;
  /** Size in px for the mark (the wordmark scales accordingly). */
  size?: number;
  withTagline?: boolean;
  variant?: 'horizontal' | 'stacked';
}

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <title>CapNomade</title>
      {/* Outer circle */}
      <circle
        cx="32"
        cy="32"
        r="29"
        fill="hsl(36 33% 99%)"
        stroke="hsl(201 45% 25%)"
        strokeWidth="1.5"
        className="dark:fill-[hsl(210_30%_10%)] dark:stroke-[hsl(201_55%_70%)]"
      />
      {/* Globe equator + tropic lines */}
      <ellipse
        cx="32"
        cy="32"
        rx="29"
        ry="11"
        fill="none"
        stroke="hsl(165 55% 45%)"
        strokeWidth="0.9"
        opacity="0.55"
      />
      <ellipse
        cx="32"
        cy="32"
        rx="29"
        ry="22"
        fill="none"
        stroke="hsl(165 55% 45%)"
        strokeWidth="0.6"
        opacity="0.35"
      />
      {/* Continents (simplified blobs in teal) */}
      <path
        d="M16 22 Q 22 18 27 22 T 32 26 Q 28 32 22 30 Q 18 27 16 22 Z"
        fill="hsl(165 55% 60%)"
        opacity="0.55"
      />
      <path
        d="M38 18 Q 46 16 50 22 Q 48 28 42 28 Q 36 26 38 18 Z"
        fill="hsl(165 55% 60%)"
        opacity="0.55"
      />
      <path
        d="M40 36 Q 46 34 48 40 Q 46 46 42 44 Q 38 42 40 36 Z"
        fill="hsl(165 55% 60%)"
        opacity="0.55"
      />
      {/* Mountains foreground */}
      <path
        d="M10 50 L 18 38 L 23 44 L 30 30 L 40 42 L 48 36 L 54 50 Z"
        fill="hsl(201 45% 22%)"
      />
      {/* Snow caps */}
      <path d="M28.8 32 L 30 30 L 31.2 32 L 30 32.8 Z" fill="hsl(36 33% 97%)" />
      <path d="M38.8 44 L 40 42 L 41.2 44 L 40 44.8 Z" fill="hsl(36 33% 97%)" />
      {/* Two pine trees */}
      <path
        d="M14 50 L 16 44 L 18 50 Z M 14.8 47 L 16 44.5 L 17.2 47 Z"
        fill="hsl(201 45% 22%)"
      />
      <path
        d="M19 50 L 20.8 45 L 22.6 50 Z M 19.6 47.5 L 20.8 45.4 L 22 47.5 Z"
        fill="hsl(201 45% 22%)"
      />
      {/* Flight path (dotted arc) */}
      <path
        d="M 11 24 Q 32 12 53 24"
        fill="none"
        stroke="hsl(201 45% 25%)"
        strokeWidth="1.2"
        strokeDasharray="1.6 2"
        strokeLinecap="round"
        className="dark:stroke-[hsl(201_55%_70%)]"
      />
      {/* Pin (departure) */}
      <circle cx="11" cy="24" r="1.6" fill="hsl(13 84% 55%)" />
      {/* Plane (arrival) */}
      <g transform="translate(50 22) rotate(40)">
        <path
          d="M0 0 L 6 1.6 L 6 0 L 8.4 0.8 L 6 1.6 L 8.4 2.4 L 6 3.2 L 6 1.6 L 0 3.2 L 1.6 1.6 Z"
          fill="hsl(201 45% 25%)"
          className="dark:fill-[hsl(201_55%_70%)]"
        />
      </g>
    </svg>
  );
}

export function LogoWordmark({
  className,
  size = 22,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn('font-serif font-semibold tracking-tight leading-none', className)}
      style={{ fontSize: size }}
    >
      <span className="text-[hsl(201_45%_22%)] dark:text-[hsl(201_55%_85%)]">Cap</span>
      <span className="text-[hsl(165_55%_42%)] dark:text-[hsl(165_55%_60%)]">Nomade</span>
    </span>
  );
}

export function Logo({
  className,
  size = 36,
  withTagline = false,
  variant = 'horizontal',
}: LogoProps) {
  if (variant === 'stacked') {
    return (
      <div className={cn('flex flex-col items-center gap-2', className)}>
        <LogoMark size={size} />
        <LogoWordmark size={size * 0.6} />
        {withTagline && (
          <p className="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Planifiez · Voyagez · Partagez · Vivez
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoMark size={size} />
      <div className="flex flex-col leading-tight">
        <LogoWordmark size={size * 0.55} />
        {withTagline && (
          <span className="text-[0.55rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Planifiez · Voyagez · Partagez
          </span>
        )}
      </div>
    </div>
  );
}
