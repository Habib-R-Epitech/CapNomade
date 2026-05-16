import { z } from 'zod';

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('CapNomade'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_MAPLIBRE_STYLE_URL: z.string().url().optional(),
  NEXT_PUBLIC_MAPLIBRE_STYLE_URL_DARK: z.string().url().optional(),
  NEXT_PUBLIC_MAP_TILES_API_KEY: z.string().optional(),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  GOOGLE_MAPS_SERVER_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_REPLY_TO: z.string().email().optional(),
  INSIGHTS_PROVIDER: z.enum(['disabled', 'openai', 'anthropic']).default('disabled'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  INVITE_TOKEN_SECRET: z.string().min(32).optional(),
  CARBON_FACTOR_PLANE_SHORT_KM: z.coerce.number().positive().default(0.255),
  CARBON_FACTOR_PLANE_MEDIUM_KM: z.coerce.number().positive().default(0.187),
  CARBON_FACTOR_PLANE_LONG_KM: z.coerce.number().positive().default(0.152),
  CARBON_FACTOR_CAR_KM: z.coerce.number().positive().default(0.193),
  CARBON_FACTOR_TRAIN_KM: z.coerce.number().positive().default(0.027),
  CARBON_FACTOR_BUS_KM: z.coerce.number().positive().default(0.103),
  CARBON_FACTOR_FERRY_KM: z.coerce.number().positive().default(0.115),
});

const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_MAPLIBRE_STYLE_URL: process.env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL,
  NEXT_PUBLIC_MAPLIBRE_STYLE_URL_DARK: process.env.NEXT_PUBLIC_MAPLIBRE_STYLE_URL_DARK,
  NEXT_PUBLIC_MAP_TILES_API_KEY: process.env.NEXT_PUBLIC_MAP_TILES_API_KEY,
});

export const publicEnvironment = publicEnv;

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

export function serverEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() must not be called from the browser');
  }
  if (!cachedServerEnv) cachedServerEnv = serverSchema.parse(process.env);
  return cachedServerEnv;
}
