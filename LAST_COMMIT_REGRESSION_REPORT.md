# Regression report after latest commit (21df013)

Date: 2026-05-01

## What was checked
- Ran workspace typecheck: `pnpm run typecheck`
- Reproduced consistent TypeScript failures in `artifacts/mobile`

## Key failures detected
1. **Navigation/icon typing regressions**
   - `app/(tabs)/_layout.tsx`: invalid SFSymbol (`"calendar.fill"`) and incompatible string icon type.
2. **Potential runtime bug from variable ordering**
   - `app/pet/[id].tsx`: `timelineEvents` used before declaration/assignment.
3. **Broken or missing module dependencies/types**
   - Missing modules/types for `@react-navigation/native` and `expo-modules-core` in multiple files.
4. **Expo FileSystem API mismatch**
   - `app/(tabs)/settings.tsx`: `documentDirectory` and `EncodingType` not found in imported API surface.
5. **Invalid React Native style property**
   - `app/pet/add-vaccination/[id].tsx`: `whiteSpace` is not a valid RN style property.
6. **Strict typing regressions in domain data**
   - `Gender | undefined` passed where `Gender` is required in multiple files.
   - `pet` possibly undefined.
7. **Localization typing mismatch**
   - `context/LanguageContext.tsx`: UA/EN object union does not satisfy inferred literal-heavy type.

## Additional note
- There was also a separate type incompatibility in `artifacts/mockup-sandbox` around React refs. It was fixed in:
  - `artifacts/mockup-sandbox/src/components/ui/calendar.tsx`
  - `artifacts/mockup-sandbox/src/components/ui/spinner.tsx`

These fixes reduced noise, but **the build still fails because of mobile app regressions** listed above.
