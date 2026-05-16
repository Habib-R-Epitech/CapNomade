# CapNomade — État d'avancement

> Ce fichier est mis à jour à chaque push.
> Dernière mise à jour : **2026-05-16** — fix lint errors bloquant le build Vercel.

---

## Vue d'ensemble

| Domaine                              | État    |
| ------------------------------------ | ------- |
| Configs racine & toolchain           | ✅ Fait |
| Base de données + RLS + seed         | ✅ Fait |
| Auth Google + middleware + sessions  | ✅ Fait |
| Permissions (modèle de rôles)        | ✅ Fait |
| Primitives UI shadcn + design tokens | ✅ Fait |
| Pages publiques (SEO)                | ✅ Fait |
| Dashboard + page accueil             | ✅ Fait |
| Détail voyage (8 onglets)            | ✅ Fait |
| Server actions (trips/expenses/…)    | ✅ Fait |
| Services métier (stats/carbone/…)    | ✅ Fait |
| Imports KML/KMZ/GPX/GeoJSON/CSV/XLSX | ✅ Fait |
| Exports CSV/GeoJSON/ICS/PDF          | ✅ Fait |
| Email transactionnel (Resend)        | ✅ Fait |
| Google Geocoding + Routes server     | ✅ Fait |
| Tests Vitest + Playwright (initiaux) | ✅ Fait |
| Page édition voyage                  | ⏳ TODO |
| Page dépenses CRUD complète          | ⏳ TODO |
| Page carte plein écran               | ⏳ TODO |
| Wizard d'import (UI)                 | ⏳ TODO |
| Insights destination (UI)            | ⏳ TODO |
| Export/suppression de compte         | ⏳ TODO |

---

## Journal des fixes / patchs

- **2026-05-16 · lint Vercel (commit n°3)** — 9 erreurs ESLint qui bloquaient le build :
  imports inutilisés (`formatDateRange`, `CopyIcon/Share2/Archive`, `TransportMode`),
  `let` non réassignés → `const` (`used` dans `expenseSplit`), `<a>` → `<Link>` dans
  `error.tsx`, arg unused → préfixe `_` dans `TripPlanning`, et passage à
  `import type { ZodError }` dans `server/actions/trips.ts`. Plus nettoyage des
  `any` du dashboard `page.tsx`.
- **2026-05-16 · build Vercel (commit n°2)** — `src/server/actions/onboarding.ts` extrait
  hors de `src/app/auth/onboarding/page.tsx`. Cause : Next 15 interdit d'exporter à la
  fois `metadata` et une inline server action `'use server'` depuis un fichier
  importé par un Client Component (`OnboardingForm.tsx`). Bonus : `typedRoutes`
  déplacé d'`experimental` vers le top-level (Next 15.5+).

---

## Détail par vague

### Vague 1 — Configs racine ✅

`package.json`, `tsconfig.json` (strict + `noUncheckedIndexedAccess`), `next.config.ts`
(headers de sécurité + noindex sur `/dashboard|/api`), `tailwind.config.ts` (palette
ocean/sand/lagoon/coral + plugin animate), `postcss.config.mjs`, `.eslintrc.json`,
`.prettierrc`, `.gitignore`, `.env.example` (commenté par sections), `README.md`,
`vitest.config.ts`, `playwright.config.ts`, `supabase/config.toml`.

### Vague 2 — Schéma SQL + seed ✅

- `supabase/migrations/0001_init_schema.sql` — extensions `pgcrypto/citext/postgis`,
  enums métier, 22 tables (profiles, trips, trip_members, trip_invitations, trip_stops,
  trip_days, activities, accommodations, transport_segments, expenses, expense_allocations,
  expense_payments, attachments, media_links, map_imports, map_features, trip_reviews,
  wish_items, notifications, destination_insights, trip_stats_snapshots, audit_logs),
  contraintes, indexes GIST.
- `0002_functions_triggers.sql` — triggers `updated_at`, auto-création de profil sur
  signup auth, auto-ajout owner dans trip_members, helpers permissions `is_trip_*`,
  RPC `accept_trip_invitation` / `decline_trip_invitation` (security definer, audit log),
  `slugify`, storage buckets (`trip-covers` public, `trip-attachments` privé,
  `map-sources` privé).
- `0003_rls_policies.sql` — RLS sur **toutes** les tables, policies par rôle
  (owner/editor/viewer), policies storage extrayant le `trip_id` depuis le path
  d'objet.
- `seed.sql` — 2 utilisateurs (demo + amie), voyage Bali réalisé avec dépenses + review,
  voyage Japon planning, wish Patagonie, notification de bienvenue.

### Vague 3 — Auth & permissions ✅

- `src/lib/env.ts` — validation Zod du `.env`, scission public/server.
- `src/lib/supabase/{server,browser,middleware,admin}.ts` — clients par contexte.
- `src/middleware.ts` — refresh session + redirection si non authentifié + CSP.
- `src/app/auth/callback/route.ts` — exchange OAuth, sanitize next-redirect, détection
  premier login → `/auth/onboarding`.
- `src/app/auth/signout/route.ts`.
- `src/app/auth/onboarding/{page,OnboardingForm}.tsx` — formulaire 3 champs (nom, devise,
  fuseau) avec Zod + RHF.
- `src/lib/auth/session.ts`, `src/lib/auth/permissions.ts` — `requireSession`,
  `assertTripAccess`, `assertTripAccessBySlug`, `AuthorizationError` typée.

### Vague 4 — UI primitives ✅

`button`, `card`, `input`, `label`, `textarea`, `select`, `dialog`, `dropdown-menu`,
`badge`, `avatar`, `separator`, `skeleton`, `tabs`, `toaster` (sonner), `empty-state`,
`google-icon`. `globals.css` avec variables HSL light + dark, root `layout.tsx`
configurant les fonts Inter+Fraunces + ThemeProvider + metadata Open Graph + Twitter.
Header & footer marketing + ThemeToggle.

### Vague 5 — Pages publiques (SEO) ✅

- Landing `/` : Hero ("Vos voyages, planifiés à plusieurs, sans le chaos d'Excel"),
  FeaturesGrid (10 cartes), ProductScreenshots (4 mockups), ExcelVsCapNomade (tableau),
  SeoContent (texte naturel), CtaSection, **JSON-LD WebSite + SoftwareApplication**.
- `/fonctionnalites`, `/pourquoi-quitter-excel`, `/confidentialite`, `/conditions`.
- `sitemap.ts`, `robots.ts` (disallow `/dashboard|/voyages|/envies|/invitations|/parametres|/auth|/api`).
- Metadata par page : title, description, canonical, OG, Twitter card.

### Vague 6 — Dashboard et voyages ✅

- Layout dashboard avec sidebar, topbar (notifs, nouveau voyage, user menu, theme toggle).
- `/dashboard` : hero "Quel sera le prochain voyage ?", bloc prochain voyage avec
  jours restants, **WorldMap MapLibre** interactive (style configurable via env, fallback
  OpenStreetMap), 11 tuiles de stats, 4 widgets (réalisés / planifiés / envies /
  invitations), récemment modifié, encart conseils.
- `/voyages`, `/voyages/planifies`, `/voyages/nouveau` (formulaire RHF+Zod).
- `/voyages/[slug]` : page détail avec **8 onglets** (Planning, Dépenses, Transports,
  Logements, Médias, Carte, Équipe, Notation) + **CompleteTripDialog** (modal de
  notation post-voyage avec 8 critères) + TripActions (copier lien, dupliquer,
  archiver, supprimer).
- `/invitations` (accept/decline avec deep-link `?token=...` côté composant).
- `/envies`, `/parametres` (ProfileForm).
- Server actions : `trips.ts` (5 actions + slug unique + audit log), `expenses.ts`
  (split intégré, audit log pour dépenses > 200 €), `invitations.ts` (idempotence,
  email Resend, RPC accept/decline), `reviews.ts` (auto-transition vers `completed`),
  `profile.ts`.

### Vague 7 — Services métier ✅

- `lib/stats/globalStats.ts` — pays visités, vols cumulés, km voiture, CO₂, dépenses
  par voyage / par jour / par personne, top pays, top catégories, timeline annuelle.
- `lib/stats/tripStats.ts` — totaux par catégorie d'un voyage + transport agrégé.
- `lib/stats/expenseSplit.ts` — pure fns : `computeSplit` (equal/percentage/fixed/custom
  avec gestion d'arrondi à 1 cent), `computeBalances`, `settleBalances` (greedy debt
  simplification).
- `lib/carbon/index.ts` — multi-source (Travel Impact Model en hook, distance_factor
  par défaut, RF aviation = 1.9, hauteur configurable via env), `haversineKm`.
- `lib/imports/` — `kml`, `kmz` (JSZip), `gpx`, `geojson`, `csv` (parser maison avec
  guillemets), **`excelWizard.ts`** (lecture xlsx, auto-détection zones planning et
  dépenses, mapping de colonnes).
- `lib/exports/` — `csv`, `geojson`, `ics`, `pdfTripSummary` (pdf-lib).
- `lib/email/{resend,sendInvitationEmail}.ts` — wrapper + template HTML invitations
  inline-styled, idempotent (header `X-Entity-Ref-ID`).
- `lib/google/{geocoding,routes}.ts` — server-only, dégradation propre si pas de clé.
- `lib/insights/provider.ts` — pattern provider (`disabled`, `openai`), payload typé,
  cache via table `destination_insights`.
- `lib/notifications/index.ts` — `pushNotification`, `markAllNotificationsRead`.
- Routes API : `/api/voyages/[slug]/export/expenses.csv`, `/api/voyages/[slug]/export/geojson`.

### Vague 8 — Tests ✅ (couverture initiale)

- `tests/setup.ts` — env de test.
- Vitest : `expenseSplit.test.ts` (equal, percentage, fixed, pipeline balances+settle),
  `carbon.test.ts` (Haversine CDG→HND, long-haul, fallback `other`, car>train),
  `imports.test.ts` (GeoJSON, CSV avec delimiter auto, KML Point, GPX track+waypoint),
  `utils.test.ts` (slugify accents, formatCurrency, formatDateRange).
- Playwright : `landing.spec.ts` (hero, features, headers privés), `auth.spec.ts`
  (gating dashboard, sitemap, robots).

---

## Reste à faire — prochaines vagues

| Pri | Item | Notes |
| --- | ---- | ----- |
| P1 | Page `/voyages/[slug]/parametres` | UI d'édition (l'action `updateTripAction` existe) |
| P1 | Page `/voyages/[slug]/depenses` CRUD complet | UI tableau filtrable + formulaire d'ajout |
| P2 | Page `/voyages/[slug]/carte` plein écran | Réutiliser `WorldMap` + segments + features |
| P2 | Page `/import` wizard 3 étapes | upload → preview Excel/map → confirm |
| P3 | UI Insights destination + bouton "Regénérer" | Provider et table prêts |
| P3 | `/api/account/export` + `/api/account/delete` | Référencés dans `parametres` |
| P3 | Page `/voyages/[slug]/transports` | UI d'ajout + auto-CO₂ via `carbon` |
| P3 | Drag & drop sur planning jour par jour | Activités déplaçables entre jours |
| P3 | Notifications dashboard popover | Liste + markAllRead |

---

## Comment installer & lancer

```bash
npm install
cp .env.example .env.local        # remplir Supabase + Google + Resend
npm run db:start                  # Docker Supabase local
npm run db:reset                  # migrations + seed
npm run db:types                  # regénère src/lib/types/database.ts
npm run dev
```

Tests :

```bash
npm run test       # Vitest
npm run test:e2e   # Playwright
```
