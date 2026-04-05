---
phase: 08-cloud-ai-layer
plan: 01
subsystem: cloud-ai-reports-backend
tags: [edge-function, openai, supabase, ai-reports, deno]

requires:
  - phase: 07-on-device-insights
    plan: 02
    provides: On-device pattern detection complete; cloud AI is the premium layer on top
  - phase: 04-mood-check-in
    provides: mood_entries table with user_id, mood, note, check_in_slot, logged_at
  - phase: 03-paywall-auth
    provides: Supabase auth (JWT), anonymous/registered sessions

provides:
  - Supabase Edge Function (generate-report) that queries mood data, calls OpenAI GPT-4o-mini, stores narrative report
  - ai_reports table with RLS (users read own reports only)
  - Client-side service (aiReports.ts) with requestReport, getReports, getLatestReport
  - AIReport TypeScript type for app-wide use

affects: [ai-report-screen, subscription-gate, push-notification]

tech-stack:
  added: [openai-gpt-4o-mini, supabase-edge-functions-deno]
  patterns: [jwt-auth-extraction, duplicate-report-prevention, sanitized-error-responses, service-role-insert-bypass-rls]

key-files:
  created: [supabase/migrations/20260405_create_ai_reports.sql, supabase/functions/generate-report/index.ts, src/lib/aiReports.ts]
  modified: [src/types/index.ts, tsconfig.json]

key-decisions:
  - "JWT auth extraction from Authorization header — never trust client-supplied user_id (audit MH-1)"
  - "Deno.serve() natively — not imported serve() from deprecated deno.land/std (audit MH-2)"
  - "Sanitized error responses — raw OpenAI errors never forwarded to client (audit MH-3)"
  - "Duplicate report prevention — check existing report in period before calling OpenAI to prevent cost abuse (audit SR-1)"
  - "requestReport() does not send userId in body — Edge Function extracts from JWT, supabase client auto-sends Authorization header (audit SR-2)"
  - "tsconfig exclude supabase/ — Deno runtime uses URL imports incompatible with project TypeScript config"

patterns-established:
  - "Edge Function auth: always extract user from JWT via adminClient.auth.getUser(jwt), never from request body"
  - "Service-role for inserts: Edge Function uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS for writes, users have select-only RLS"
  - "Client service pure functions: aiReports.ts accepts params, never imports stores — same pattern as insights.ts, patterns.ts, notifications.ts"
  - "Deno/RN coexistence: exclude supabase/ from tsconfig to prevent Deno URL imports from failing Node/RN TypeScript checks"

duration: ~15min
started: 2026-04-05
completed: 2026-04-05
---

# Phase 8 Plan 01: Cloud AI Layer — Edge Function + Report Service Summary

**Supabase Edge Function (Deno) calls OpenAI GPT-4o-mini to generate personalized mood reports; client service provides requestReport/getReports/getLatestReport; audit-hardened with JWT auth, duplicate prevention, and sanitized errors.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15min |
| Started | 2026-04-05 |
| Completed | 2026-04-05 |
| Tasks | 2 completed (all auto, all PASS) |
| Files modified | 5 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Edge Function generates report via OpenAI | Pass | Deno.serve(), JWT auth, mood_entries query, GPT-4o-mini call, structured response |
| AC-2: ai_reports table stores reports | Pass | Migration with uuid PK, user_id FK, report_type check, mood_summary jsonb, composite index, RLS |
| AC-3: Client service can request reports | Pass | requestReport() invokes Edge Function via supabase.functions.invoke(), JWT auto-sent |
| AC-4: Client service can fetch existing reports | Pass | getReports() queries ai_reports ordered desc, limit 10; getLatestReport() with maybeSingle() |
| AC-5: AIReport type is defined | Pass | Exported from src/types/index.ts with all fields including nullable moodSummary |
| AC-6: Zero TypeScript errors (client-side) | Pass | npx tsc --noEmit exits 0 (supabase/ excluded from tsconfig) |

## Accomplishments

- Complete server-side AI report pipeline: auth -> query -> prompt -> generate -> store -> respond
- OpenAI prompt designed for warm, personalized, actionable 200-300 word reports structured as patterns + observations + suggestion
- Duplicate report prevention saves OpenAI API costs (check before call, return existing if recent)
- RLS ensures users can only read their own reports; Edge Function inserts via service_role
- Client service ready for AIReportScreen in Plan 08-02 — zero coupling to stores

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `supabase/migrations/20260405_create_ai_reports.sql` | Created | ai_reports table, composite index, RLS select policy |
| `supabase/functions/generate-report/index.ts` | Created | Deno Edge Function: JWT auth, duplicate check, mood query, OpenAI call, summary computation, insert |
| `src/lib/aiReports.ts` | Created | Client service: requestReport, getReports, getLatestReport with snake_case->camelCase mapping |
| `src/types/index.ts` | Modified | Added AIReport interface |
| `tsconfig.json` | Modified | Added exclude: ["supabase"] for Deno/RN coexistence |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| tsconfig exclude supabase/ | Deno Edge Functions use URL imports (esm.sh) incompatible with Node/RN TypeScript checker | Not in original plan files_modified list; necessary for tsc --noEmit to pass |
| Onboarding profile sent from client | OnboardingProfile is in-memory only (onboardingStore), not persisted to Supabase — Edge Function cannot query it server-side | Client must pass profile context with each report request |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | tsconfig exclude for Deno files |
| Scope additions | 0 | - |
| Deferred | 0 | - |

**Total impact:** Single configuration addition, no scope creep.

### Auto-fixed Issues

**1. Deno files fail project TypeScript checker**
- **Found during:** Task 2 qualify step (tsc --noEmit)
- **Issue:** supabase/functions/generate-report/index.ts uses `import from "https://esm.sh/..."` and `Deno.serve()` which are not valid in Node/RN TypeScript context.
- **Fix:** Added `"exclude": ["supabase"]` to tsconfig.json. Edge Function has its own Deno TypeScript environment.
- **Files:** tsconfig.json
- **Verification:** tsc --noEmit exits 0

## Skill Audit

All required skills invoked:
- /react-native-best-practices -- invoked
- /accessibility -- invoked

## Next Plan

**Plan 08-02 remaining:** AIReportScreen UI, server push notification ("Your weekly kibun report is ready"), subscription gate (subscribed users only). Phase 8 is NOT complete — 08-02 is the consumer-facing plan that wires the backend built here into the app.

**Concerns:**
- Prompt injection and content moderation deferred from audit (D-1, D-2) — revisit in Phase 9 polish
- Edge Function requires Supabase CLI deployment + secrets (OPENAI_API_KEY) — not auto-applied

**Blockers:**
- None

---
*Phase: 08-cloud-ai-layer, Plan: 01*
*Completed: 2026-04-05*
