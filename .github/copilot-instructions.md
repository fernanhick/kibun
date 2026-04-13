# Kibun - Copilot Instructions

## Project Overview

Kibun is a mood-tracking mobile app built with **Expo (SDK 55)** and **React Native**, using **expo-router** for file-based navigation. The backend uses **Supabase** for auth, database, and edge functions. State management is done with **Zustand** (persisted via AsyncStorage). The app includes a Shiba Inu mascot with Lottie animations, a kawaii/soft UI style, and RevenueCat for subscriptions.

## Tech Stack

- **Framework**: Expo SDK 55 + React Native
- **Language**: TypeScript (strict mode)
- **Routing**: expo-router (file-based, `app/` directory)
- **State**: Zustand stores in `src/store/`
- **Backend**: Supabase (auth, database, edge functions in `supabase/functions/`)
- **Styling**: Inline styles + shared theme constants (`src/constants/theme.ts`)
- **Subscriptions**: RevenueCat
- **Notifications**: expo-notifications

## Project Structure

```
app/                     # expo-router screens (file-based routing)
  (tabs)/                # Main tab navigator (home, history, insights, settings)
  (onboarding)/          # Onboarding flow screens
  auth/                  # Auth callback
src/
  components/            # Reusable UI components
  constants/             # Theme colors, moods, mascot animations
  hooks/                 # Custom hooks (useAuth, etc.)
  lib/                   # Business logic (supabase, achievements, sync, sentiment, etc.)
  store/                 # Zustand stores (mood entries, onboarding, achievements, etc.)
  types/                 # TypeScript type definitions
supabase/functions/      # Supabase edge functions (Deno)
assets/                  # Images, Lottie animations, ML model files
```

## Path Aliases

Use these TypeScript path aliases (configured in `tsconfig.json`):

- `@components/*` -> `src/components/*`
- `@store/*` -> `src/store/*`
- `@models/*` -> `src/types/*`
- `@constants/*` -> `src/constants/*`
- `@hooks/*` -> `src/hooks/*`
- `@lib/*` -> `src/lib/*`

## Coding Conventions

- Use **functional components** with hooks, never class components.
- Use `const` arrow functions for component definitions.
- State management: use Zustand stores, not React Context or Redux.
- Keep business logic in `src/lib/`, not inside components.
- Keep components small and focused; extract reusable pieces into `src/components/`.
- Use the shared color palette from `src/constants/theme.ts` — do not hardcode color values.
- Follow the existing kawaii/soft visual style: rounded corners, pastel colors, friendly tone.
- Supabase edge functions use Deno runtime, not Node.js.

## Accessibility

- Follow WCAG 2.1 AA contrast guidelines for text.
- Status colors (success, error, warning) in theme.ts have low contrast on white — use them only for icons, borders, and background fills, NOT as text color on light backgrounds.
- For error text, use `colors.text` on `colors.errorLight` instead.

## Important Notes

- Do not introduce new state management libraries — use Zustand.
- Do not add new navigation libraries — use expo-router.
- Prefer `expo-image` over React Native's `Image` component.
- The app targets both iOS and Android — ensure platform compatibility.
- Never commit API keys, secrets, or `.env` files.

## Graph Workflow Auto-Use Rule

Use graph workflow automatically when the user asks for:

- architecture mapping, dependency mapping, or module relationships
- knowledge graph, concept graph, or cross-file connection discovery
- large-scale codebase understanding, onboarding map, or repo exploration report
- traceability of concepts across docs, code, and assets
- token-efficient analysis of many files through cached extraction

Execution policy:

- If the user explicitly says `/graphify`, run graph workflow immediately.
- If the request implies graph-level analysis (even without `/graphify`), run graph workflow by default.
- For narrow tasks (single bug fix, one function explanation, or one-file edit), do not run graph workflow.
- Prefer token-efficient runs:
  1. Start with the smallest relevant folder.
  2. Use update mode after the first run.
  3. Expand scope only if required.
- Use this threshold for auto-trigger:
  1. If scope is more than 15 files, or spans more than one top-level folder, use graph workflow.
