import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', md: '2rem' },
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        ocean: {
          50: '#f0f7fb',
          100: '#dbecf3',
          200: '#bcdbe9',
          300: '#8fc3d8',
          400: '#5aa3c2',
          500: '#3a87aa',
          600: '#2f6c8e',
          700: '#295976',
          800: '#264a61',
          900: '#1d3a4f',
          950: '#0e2236',
        },
        sand: {
          50: '#fbf9f4',
          100: '#f5efe1',
          200: '#ebdfc4',
          300: '#dec79c',
          400: '#cfaa72',
          500: '#c39256',
          600: '#b37c47',
          700: '#94633c',
          800: '#785036',
          900: '#62432f',
        },
        lagoon: {
          50: '#effaf6',
          100: '#d8f3e6',
          200: '#b3e6d0',
          300: '#82d2b4',
          400: '#4eb893',
          500: '#2c9d7a',
          600: '#1e7e62',
          700: '#196550',
          800: '#175141',
          900: '#134337',
        },
        coral: {
          50: '#fff3f0',
          100: '#ffe2da',
          200: '#ffc6b5',
          300: '#ff9c81',
          400: '#fb6d4a',
          500: '#f04923',
          600: '#dd3217',
          700: '#b72414',
          800: '#931f17',
          900: '#791e18',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.05)',
        elevated: '0 10px 30px -10px rgb(15 30 45 / 0.18)',
        glow: '0 0 0 1px hsl(var(--ring) / 0.3), 0 4px 24px -8px hsl(var(--primary) / 0.35)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
