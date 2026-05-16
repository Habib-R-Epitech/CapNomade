import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

const PUBLIC_ROUTES = [
  '/',
  '/fonctionnalites',
  '/pourquoi-quitter-excel',
  '/confidentialite',
  '/conditions',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.6,
  }));
}
