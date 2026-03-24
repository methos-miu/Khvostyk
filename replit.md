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

### Features (all implemented)
1. Pet list with large photo cards, species emoji, gender badges, age/weight pills
2. Add/edit pet: 12 species, gender, BreedPickerModal (searchable + custom input + alphabetically sorted), weight scroll-picker, DatePickerField (iOS inline calendar)
3. Pet profile with gradient hero section, medical profile section (allergies, chronic conditions, vet name/phone), vaccination list, weight action shortcut
4. Vaccinations with status badges (overdue/soon/upcoming/ok) and push notifications
5. Documents with category picker (Аналізи/Рецепти/Страховка/Ветпаспорт/Інше) and filter chips
6. Weight tracking screen with SVG line chart, weight log, weight picker
7. Reminders tab with tabs (All/Vaccines/Others), birthday reminders (≤30 days), custom reminders (deworming/flea_tick/birthday/checkup)
8. Settings tab with Ukrainian/English switcher + JSON backup export/import (expo-sharing/expo-document-picker)
9. Birthday push notifications (day before + day of)
10. Animated JS splash screen on app launch (🐾 logo, title, fade in)
11. Data export/import: full JSON backup of all pets, vaccinations, documents, reminders, weight history
12. `migratePet()` for backward compatibility with old data

### Key Files
- `app/(tabs)/index.tsx` — Home/pets list
- `app/(tabs)/reminders.tsx` — Reminders with tabs, birthday + custom reminders
- `app/(tabs)/settings.tsx` — Settings + language switcher + JSON backup
- `app/(tabs)/_layout.tsx` — Tab bar layout (supports Liquid Glass on iOS 26+)
- `app/_layout.tsx` — Root layout with animated splash screen + all Stack routes
- `app/pet/add.tsx` — Add pet form
- `app/pet/edit/[id].tsx` — Edit pet form
- `app/pet/[id].tsx` — Pet profile with medical profile modal + quick actions
- `app/pet/vaccinations/[id].tsx` — Vaccinations list
- `app/pet/documents/[id].tsx` — Documents with category filter
- `app/pet/weight/[id].tsx` — Weight tracking with SVG chart
- `app/pet/add-vaccination/[id].tsx` — Add vaccination form
- `components/ui/BreedPickerModal.tsx` — Searchable breed picker with custom input
- `components/ui/DatePickerField.tsx` — iOS inline + Android calendar picker
- `context/PetsContext.tsx` — Full pet data: CRUD + WeightEntry + Reminder + MedicalProfile + exportData/importData
- `context/LanguageContext.tsx` — Language switcher (uk/en, persisted)
- `constants/colors.ts` — App color palette (blue/white gradient)
- `constants/breeds.ts` — All breed lists (12 species, UK+EN, sorted alphabetically)
- `utils/notifications.ts` — Date parsing, age calc, push notifications, getNextBirthday

### Date Format
- User inputs dates as `DD-MM-YYYY`
- Stored internally as `YYYY-MM-DD` (ISO)
- `parseDate()` handles both formats with validation
- `toISODate()` converts user input to ISO for storage

### ID Generation
- Never use `uuid` — use `Date.now().toString() + Math.random().toString(36).substr(2, 9)`

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
