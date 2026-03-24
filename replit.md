# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains an Express API server and a React Native Expo mobile app (ВетПомічник / Хвостик / Tailsy).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── mobile/             # Expo React Native app (Хвостик / Tailsy)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
│   └── src/
└── pnpm-workspace.yaml
```

---

## Mobile App: Хвостик / Tailsy (`artifacts/mobile`)

A pet health tracker app built with Expo SDK 53 / React Native.

### Features
- Pet list with large photo cards, species emoji, gender badges, age/weight pills
- Add pet: 12 species types, gender selection (male/female), breed picker (top 30 cats + dogs in Ukraine), weight scroll-picker (0.5–100kg), date validation
- Pet profile with gradient hero section, vaccination list, document list
- Vaccinations with status badges (overdue/soon/upcoming/ok) and push notifications
- Documents with action sheet: take photo / gallery / files
- Reminders tab showing upcoming vaccinations sorted by urgency
- Settings tab with 🇺🇦 Ukrainian ("Хвостик") / 🇬🇧 English ("Tailsy") language switcher
- All data persisted with AsyncStorage
- Supports Expo Go and production builds

### Key Files
- `app/(tabs)/index.tsx` — Home/pets list
- `app/(tabs)/reminders.tsx` — Reminders screen
- `app/(tabs)/settings.tsx` — Settings + language switcher
- `app/(tabs)/_layout.tsx` — Tab bar layout (supports Liquid Glass on iOS 26+)
- `app/_layout.tsx` — Root layout with all providers
- `app/pet/add.tsx` — Add pet form (species grid, gender, breed picker, weight picker)
- `app/pet/[id].tsx` — Pet profile screen
- `app/pet/vaccinations/[id].tsx` — Vaccinations list
- `app/pet/documents/[id].tsx` — Documents (photo/gallery/files action sheet)
- `app/pet/add-vaccination/[id].tsx` — Add vaccination form
- `context/PetsContext.tsx` — All pet data (CRUD + AsyncStorage)
- `context/LanguageContext.tsx` — Language switcher (uk/en, persisted)
- `constants/colors.ts` — App color palette
- `constants/breeds.ts` — Top 30 cat + dog breeds (Ukrainian & English)
- `utils/notifications.ts` — Date parsing (DD-MM-YYYY / YYYY-MM-DD), age calculation, push notifications

### Date Format
- User inputs dates as `DD-MM-YYYY`
- Stored internally as `YYYY-MM-DD` (ISO)
- `parseDate()` handles both formats with validation (no NaN bugs)
- `toISODate()` converts user input to ISO for storage

### Expo Go QR
- URL: `exp://[REPLIT_EXPO_DEV_DOMAIN]`
- HTML QR page: `artifacts/mobile/assets/qr.html`

---

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. Always typecheck from root:

```bash
pnpm run typecheck
```

## Packages

### `artifacts/api-server`
Express 5 API server at port `$PORT`. Routes in `src/routes/`. Health check at `GET /api/health`.

### `lib/db`
Drizzle ORM + PostgreSQL. Push migrations: `pnpm --filter @workspace/db run push`

### `lib/api-spec`
OpenAPI 3.1 spec + Orval codegen. Run: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod`
Generated Zod schemas from OpenAPI.

### `lib/api-client-react`
Generated React Query hooks from OpenAPI.

### `scripts`
Utility scripts in `src/`. Run via `pnpm --filter @workspace/scripts run <script>`.
