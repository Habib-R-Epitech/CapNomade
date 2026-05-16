# CapNomade

**Planificateur de voyages collaboratif, budget, carte et carnet de voyage.**

CapNomade est un SaaS B2C qui remplace Excel pour planifier, suivre et noter ses voyages : planning jour par jour, dépenses détaillées avec répartition entre voyageurs, trajets et empreinte carbone, carte interactive, documents et liens de réservation, vidéos YouTube, envies de voyages, statistiques de vie de voyageur.

---

## Sommaire

- [Stack](#stack)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données](#base-de-données)
- [Architecture](#architecture)
- [Sécurité & RGPD](#sécurité--rgpd)
- [Tests](#tests)
- [Scripts npm](#scripts-npm)
- [Déploiement](#déploiement)

---

## Stack

| Couche               | Choix                                                                  |
| -------------------- | ---------------------------------------------------------------------- |
| Framework            | **Next.js 15** (App Router, Server Actions, typed routes)              |
| Langage              | **TypeScript** strict, `noUncheckedIndexedAccess`                      |
| UI                   | Tailwind CSS, **shadcn/ui** (Radix), Lucide icons                      |
| Formulaires          | React Hook Form + Zod                                                  |
| BaaS                 | **Supabase** (Postgres 15+ avec **PostGIS**, Auth, Storage, Realtime)  |
| Auth                 | OAuth Google via Supabase Auth, sessions cookies HttpOnly              |
| Cartographie client  | **MapLibre GL JS** + tuiles vector configurables                       |
| Cartographie serveur | Google Maps Platform (Geocoding, Routes / Route Matrix) — server only  |
| Email transactionnel | Resend                                                                 |
| IA insights          | Provider abstrait (OpenAI / Anthropic / désactivé), cache en base      |
| Tests                | Vitest (unitaire) + Playwright (E2E)                                   |
| Qualité              | ESLint + Prettier + Tailwind plugin                                    |

---

## Démarrage rapide

### 1. Pré-requis

- **Node.js ≥ 20.11**
- **Supabase CLI** (`brew install supabase/tap/supabase` ou `npm i -g supabase`)
- **Docker** (pour la stack Supabase locale)
- Comptes : [Google Cloud](https://console.cloud.google.com/) (OAuth + Maps), [Resend](https://resend.com), un fournisseur de tuiles (MapTiler/Stadia/Protomaps)

### 2. Installation

```bash
git clone <repo> capnomade && cd capnomade
npm install
cp .env.example .env.local
# Éditez .env.local avec vos clés
```

### 3. Lancer Supabase localement

```bash
npm run db:start         # docker compose up (Postgres + Auth + Storage + Studio)
npm run db:reset         # applique migrations + seed
npm run db:types         # régénère les types TypeScript
```

Studio Supabase : <http://localhost:54323>

### 4. Configurer le provider Google OAuth

Dans Supabase Studio → **Authentication → Providers → Google** :

1. Activer Google.
2. Coller le **Client ID** et **Client Secret** d'un OAuth 2.0 Web Application Google Cloud.
3. Dans Google Cloud Console, ajouter aux **Authorized redirect URIs** :
   ```
   http://localhost:54321/auth/v1/callback        (dev local)
   https://YOUR-PROJECT.supabase.co/auth/v1/callback   (prod)
   ```
4. Dans le menu **Authentication → URL Configuration**, ajouter `http://localhost:3000/auth/callback` aux **Redirect URLs**.

### 5. Lancer l'app

```bash
npm run dev
```

Application : <http://localhost:3000>

Le seed crée un utilisateur `demo@capnomade.app` avec trois voyages de démonstration (Bali réalisé, Japon planifié, Patagonie en envie). En local, vous pouvez vous connecter via le lien magique depuis Supabase Studio → Authentication.

---

## Variables d'environnement

Toutes les variables sont documentées dans [`.env.example`](.env.example). Distinctions importantes :

| Préfixe                          | Visibilité                              | Exemples                                    |
| -------------------------------- | --------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_*`                  | Exposées au navigateur                  | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, tuiles |
| (sans préfixe)                   | **Server-only** — jamais bundled client | `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_MAPS_SERVER_API_KEY`, `RESEND_API_KEY`, clés IA |

⚠️ **Ne jamais** exposer `SUPABASE_SERVICE_ROLE_KEY` ni `GOOGLE_MAPS_SERVER_API_KEY` côté client.

---

## Base de données

Le schéma est défini dans [`supabase/migrations/`](supabase/migrations/), avec :

- **Extensions** : `pgcrypto`, `citext`, **`postgis`**.
- **Tables métier** : `profiles`, `trips`, `trip_members`, `trip_invitations`, `trip_stops`, `trip_days`, `activities`, `accommodations`, `transport_segments`, `expenses`, `expense_allocations`, `expense_payments`, `attachments`, `media_links`, `map_imports`, `map_features`, `trip_reviews`, `wish_items`, `notifications`, `destination_insights`, `trip_stats_snapshots`, `audit_logs`.
- **Row Level Security** activée partout. Chaque voyage est privé par défaut ; l'accès passe par `trip_members` (rôles : `owner`, `editor`, `viewer`).
- **Triggers** : auto-création du profil à l'inscription, auto-ajout de l'owner dans `trip_members`, `updated_at` automatique.
- **Storage** : buckets `trip-covers` (public), `trip-attachments` (privé, signed URLs), `map-sources` (privé).

Pour générer les types TypeScript à partir du schéma :

```bash
npm run db:types
```

---

## Architecture

```
src/
├── app/                          # App Router
│   ├── (public)/                 # Marketing — indexable
│   │   ├── page.tsx              # Landing
│   │   ├── fonctionnalites/      # Pages SEO
│   │   └── pourquoi-quitter-excel/
│   ├── (dashboard)/              # Application — noindex
│   │   ├── dashboard/
│   │   ├── voyages/[slug]/
│   │   ├── envies/
│   │   └── invitations/
│   ├── auth/                     # Callback OAuth, signout
│   └── api/                      # Route handlers (signed URLs, exports)
├── components/
│   ├── ui/                       # shadcn primitives
│   ├── marketing/                # Sections landing
│   ├── dashboard/                # Widgets, nav, layout
│   ├── trip/                     # Sections voyage (planning, dépenses, carte…)
│   └── map/                      # MapLibre wrappers
├── lib/
│   ├── supabase/                 # Clients (browser, server, admin, middleware)
│   ├── auth/                     # Session, permissions
│   ├── carbon/                   # Calcul CO2 multi-source
│   ├── stats/                    # Stats globales + par voyage
│   ├── imports/                  # KML, KMZ, GPX, GeoJSON, CSV, XLSX
│   ├── insights/                 # Provider IA pluggable
│   ├── exports/                  # CSV, PDF, ICS, GeoJSON
│   ├── google/                   # Geocoding + Routes (server-only)
│   ├── email/                    # Resend + templates
│   ├── notifications/
│   ├── schemas/                  # Zod
│   └── types/                    # Types Database (générés) + types métier
├── server/actions/               # Server actions Next.js
└── config/site.ts                # Métadonnées globales
```

**Principes architecturaux** :

- **Private by default** : toute écriture passe par une server action validée par Zod et vérifie les permissions via `lib/auth/permissions.ts` *avant* d'appeler Supabase. RLS reste la dernière ligne de défense, jamais la seule.
- **Encapsulation des intégrations externes** : Google Maps, Resend, OpenAI/Anthropic exposent une interface stable dans `lib/` ; les composants ne dépendent pas du SDK.
- **Pas de données mockées** dans le produit ; le seed fournit des voyages réalistes pour tester.
- **Server Components par défaut**, Client Components uniquement quand interactivité nécessaire (cartes, formulaires complexes, drag & drop).

---

## Sécurité & RGPD

- **Row Level Security** activée sur toutes les tables métier ; politiques par rôle (`owner`/`editor`/`viewer`).
- **Validation Zod côté serveur** sur toutes les entrées utilisateur.
- **Uploads** : whitelist MIME, taille max, scan d'extension, stockage privé avec **signed URLs** courtes durées.
- **Headers** : HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. CSP appliquée via middleware avec nonces.
- **CSRF** : Server Actions Next.js protégées par défaut (Origin check + same-site cookies).
- **Pages privées** marquées `noindex, nofollow, noarchive`.
- **Emails transactionnels idempotents** : tokens d'invitation à usage unique avec expiration 14 jours.
- **Audit log** des actions sensibles : invitations, changements de statut voyage, dépenses > seuil.
- **Données utilisateur** : suppression de compte → cascade complète via `on delete cascade`. Export RGPD disponible côté paramètres.
- **Aucun secret côté client** : clés Google Maps, IA, service_role uniquement côté serveur.

---

## Tests

```bash
npm run test           # Vitest unitaires
npm run test:e2e       # Playwright E2E
```

Couvertures critiques (cf. `tests/` et `e2e/`) :

- Calcul de répartition de dépense (égale, pourcentage, montants fixes, paiements partiels)
- Empreinte carbone vols et voiture (fallback distance-based)
- Acceptation d'invitation (token + permissions)
- Passage `planning → completed` (déclenche modal review)
- Parsers d'import : KML, GPX, GeoJSON, XLSX
- Flux OAuth complet (mock) et middleware redirect

---

## Scripts npm

| Commande              | Description                              |
| --------------------- | ---------------------------------------- |
| `npm run dev`         | Next.js dev (Turbo)                      |
| `npm run build`       | Build production                         |
| `npm run start`       | Serve production                         |
| `npm run lint`        | ESLint                                   |
| `npm run typecheck`   | TypeScript sans émission                 |
| `npm run format`      | Prettier write                           |
| `npm run test`        | Vitest                                   |
| `npm run test:e2e`    | Playwright                               |
| `npm run db:start`    | Supabase local (Docker)                  |
| `npm run db:reset`    | Reset + migrations + seed                |
| `npm run db:push`     | Push migrations vers Supabase distant    |
| `npm run db:types`    | Génère `src/lib/types/database.ts`       |

---

## Déploiement

### Vercel

1. Importer le repo sur Vercel.
2. Renseigner toutes les variables d'environnement de `.env.example`.
3. Le runtime Node.js par défaut convient (Edge non requis).
4. Pour Supabase, créer un projet, appliquer les migrations :
   ```bash
   supabase link --project-ref YOUR-PROJECT-REF
   supabase db push
   ```
5. Dans Supabase → Authentication → URL Configuration, ajouter `https://votre-domaine.com/auth/callback` aux Redirect URLs.

### Domaine personnalisé

Une fois le domaine connecté, mettre à jour :

- `NEXT_PUBLIC_APP_URL` → URL canonique
- Redirect URLs Supabase
- Redirect URIs Google OAuth
- Domaine `EMAIL_FROM` configuré et DNS vérifié dans Resend

---

## Licence

Propriétaire — © 2026 CapNomade.
