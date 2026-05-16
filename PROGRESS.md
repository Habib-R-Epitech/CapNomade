# CapNomade — État d'avancement

> Ce fichier est mis à jour à chaque push.
> Dernière mise à jour : **2026-05-16** — fix lookup `TYPE_TO_FIELD` (noUncheckedIndexedAccess).

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

- **2026-05-16 · switch type-safe dans tripStats (commit n°11)** — vraie erreur
  TS (pas Supabase) : avec `noUncheckedIndexedAccess: true`, `TYPE_TO_FIELD[exp.type]`
  retournait `keyof TripStats['totals'] | undefined`, et `(totals as Record<...>)[field]`
  retournait `number | undefined` qu'on ne pouvait pas `+=`. Remplacement du lookup
  par un `switch` exhaustif sur `exp.type` — plus lisible, totalement type-safe,
  pas besoin du cast Record.
- **2026-05-16 · Drop `<Database>` + logo brand (commit n°10)** — 2 livraisons :
  1. **Build fix nucléaire** : suppression du générique `<Database>` dans les 4
     `createClient` calls (server/browser/admin/middleware). Aucune variation de mon
     `Database` type fait-main ne satisfaisait les contraintes internes de supabase-js
     (`.insert(...)` collapsait à `never[]`). Sans le générique, les queries renvoient
     `any` côté Supabase et les casts `asRow<T>` / `asRows<T>` font le typage explicite
     au call site. Defense-in-depth via Zod schemas + NOT NULL constraints + RLS reste
     en place.
  2. **Logo** : nouveau composant `src/components/brand/Logo.tsx` (`LogoMark` /
     `LogoWordmark` / `Logo`) en SVG, fidèle à la maquette (cercle + globe stylisé
     teal + montagnes + trajet d'avion pointillé + pin coral, wordmark "Cap" navy +
     "Nomade" teal). Utilisé dans header marketing, sidebar dashboard, footer. Favicon
     dynamique via `app/icon.tsx` (Edge runtime + ImageResponse). Pour la version
     PNG exacte : drop le fichier sur `public/logo.png` et swap le SVG via `next/image`.
- **2026-05-16 · Simplifier TableShape (commit n°9)** —
  `.insert({...})` collapsait à `never[]` parce que mon `TableShape<R, K>` avec
  `Insert: Partial<R> & Pick<R, K>` ne satisfaisait pas les contraintes
  génériques internes de supabase-js (l'intersection cassait l'inférence des
  overloads). Simplification : `Insert: Partial<R>` (plus de générique K).
  La validation des champs requis se fait via Zod dans les server actions
  (défense en profondeur : Zod + NOT NULL en BDD + RLS).
- **2026-05-16 · session.ts cast (commit n°8)** — `profile.email` collapsait à
  `never` dans `getSession`. Le refactor du Database type au commit n°5 n'a
  apparemment pas résolu tous les cas d'inférence — peut-être le helper
  `TableShape<Row, ...>` interfère avec l'auto-inférence de supabase-js.
  Fix : `asRow<Profile>(resp)` pour casser explicitement. Audit grep de tous
  les autres call sites Supabase → tous déjà castés (Auth methods incluses).
- **2026-05-16 · MapLibre 4.x API (commit n°7)** — `attributionControl: true`
  n'est plus valide en MapLibre 4.x : le type accepte `false | AttributionControlOptions`.
  Suppression de la ligne (le défaut affiche déjà l'attribution).
- **2026-05-16 · Email auth + fix devise (commit n°6)** — 2 choses :
  1. **Build error** : `parametres/page.tsx` passait `session.profile.default_currency` (typé
     `string` depuis la DB) à un form dont le prop attendait l'enum
     `'EUR' | 'USD' | ...`. Fix : `ProfileForm` accepte maintenant `default_currency: string`
     et normalise vers le set de devises supportées au moment du `defaultValues`.
  2. **Nouvelle feature** : système email+password complet en complément de Google OAuth.
     Pages publiques `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reinitialisation`,
     toutes avec formulaires Zod+RHF, gestion du flow de confirmation email Supabase,
     redirection auto si déjà connecté, anti-énumération sur le forgot-password.
     Header marketing pointe vers `/connexion` et `/inscription`, hero CTA propose les
     deux options. Middleware redirige les routes protégées vers `/connexion?redirect=...`
     au lieu de `/?signin=1`. Tests Playwright et sitemap mis à jour.
- **2026-05-16 · TS Vercel root cause (commit n°5)** — `wishes.id` (et toute
  query Supabase) collapsait à `never` à cause de mon `Database` type qui
  manquait `Relationships: []` sur chaque table et `CompositeTypes` sur le
  schéma. Refactor `src/lib/types/database.ts` avec un helper `TableShape<Row, K>`
  qui ajoute `Relationships: []` à toutes les tables + ajout de
  `CompositeTypes: Record<string, never>`. En filet de sécurité : cast `asRow`/
  `asRows` ajouté sur 7 call sites restants (envies/page, auth/callback,
  api/.../expenses.csv, api/.../geojson, server/actions/{invitations, trips,
  reviews, expenses}).
- **2026-05-16 · TS Vercel (commit n°4)** — sur les 11 queries Supabase utilisant
  `!inner` join syntax, l'inférence de types collapsait à `never` parce que mon
  `Database` type ne déclare pas `Relationships`. Ajout de `src/lib/supabase/helpers.ts`
  (`asRow<T>`, `asRows<T>`) et typage explicite des résultats dans :
  dashboard/page, voyages/page, voyages/planifies/page, voyages/[slug]/page,
  invitations/page, auth/permissions, stats/globalStats, stats/tripStats,
  server/actions/expenses. Bonus : assertTripAccessBySlug simplifié (fallback
  `.or(...)` retiré, qui ne marchait pas).
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
