import type { Metadata } from 'next';
import { HeroSection } from '@/components/marketing/HeroSection';
import { FeaturesGrid } from '@/components/marketing/FeaturesGrid';
import { ExcelVsCapNomade } from '@/components/marketing/ExcelVsCapNomade';
import { ProductScreenshots } from '@/components/marketing/ProductScreenshots';
import { CtaSection } from '@/components/marketing/CtaSection';
import { SeoContent } from '@/components/marketing/SeoContent';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesGrid />
      <ProductScreenshots />
      <ExcelVsCapNomade />
      <SeoContent />
      <CtaSection />

      {/* JSON-LD: WebSite + Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: siteConfig.name,
              description: siteConfig.description,
              url: siteConfig.url,
              inLanguage: 'fr-FR',
              potentialAction: {
                '@type': 'SearchAction',
                target: `${siteConfig.url}/?q={search_term_string}`,
                'query-input': 'required name=search_term_string',
              },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: siteConfig.name,
              applicationCategory: 'TravelApplication',
              operatingSystem: 'Web',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
              description: siteConfig.description,
            },
          ]),
        }}
      />
    </>
  );
}
