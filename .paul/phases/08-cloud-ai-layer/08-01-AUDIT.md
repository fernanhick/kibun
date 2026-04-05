# Enterprise Plan Audit Report

**Plan:** .paul/phases/08-cloud-ai-layer/08-01-PLAN.md
**Audited:** 2026-04-05
**Verdict:** Conditionally Acceptable -> Ready (after applying findings)

---

## 1. Executive Verdict

**Conditionally Acceptable.** The plan has strong architectural foundations — RLS policies, pure service functions, separation of server and client concerns. However, three must-have findings required remediation: a critical authorization bypass (Edge Function trusted client-supplied user_id), an outdated Deno import pattern, and potential error detail leakage. Two strongly-recommended findings addressed cost protection and API response handling clarity. After applying all five, the plan is ready for APPLY.

I would approve this plan for production after the applied changes.

## 2. What Is Solid

- **RLS policy design** — Users can only read their own reports via `auth.uid() = user_id`. Edge Function uses service_role key for inserts (bypasses RLS correctly). This is the standard Supabase security pattern.
- **Profile sent from client, not assumed server-side** — Correct acknowledgment that onboarding profile is in-memory only. Avoids a silent data absence bug where the Edge Function queries a non-existent table.
- **Client service as pure functions** — `aiReports.ts` accepts parameters, never imports stores. Consistent with established patterns (insights.ts, patterns.ts, notifications.ts).
- **Snake_case to camelCase mapping** — Explicit mapRow helper prevents scattered ad-hoc transformations. Clean data boundary.
- **Scope limits are comprehensive** — No UI, no push notifications, no subscription gating, no cron scheduling. Clear ownership boundaries between 08-01 and 08-02.
- **CORS handling specified** — Edge Functions need explicit CORS headers for cross-origin invocation.

## 3. Enterprise Gaps Identified

1. **Critical: Authorization bypass via client-supplied user_id** — The original plan accepted `user_id` in the POST body. Any authenticated user could generate reports for any other user by supplying a different user_id. Supabase Edge Functions receive the caller's JWT in the Authorization header; the function must extract user identity from there, not from the request body.

2. **Outdated Deno serve import** — `https://deno.land/std@0.168.0/http/server.ts` is deprecated. Supabase Edge Functions run on Deno 1.35+ which provides `Deno.serve()` natively. Using the old import may fail on current Supabase infrastructure.

3. **Raw OpenAI error detail leakage** — Forwarding OpenAI API errors to the client could expose API key fragments, rate limit details, or internal model information. Error responses must be sanitized to generic messages.

4. **No duplicate report prevention** — Without a check for existing reports in the current period, a client bug or malicious actor could trigger unlimited OpenAI API calls. At ~$0.001-0.01 per call, this is a cost risk that scales with user count.

5. **supabase.functions.invoke() response parsing underspecified** — The return type `{ data, error }` from `invoke()` has specific semantics where `data` is the parsed JSON body of the Edge Function's response. Without explicit handling, the client could misinterpret the response structure.

6. **Prompt injection via user notes** — Notes included verbatim in the OpenAI prompt. A malicious note could attempt to override system instructions. Low risk for MVP (worst case: garbled report text), but worth noting.

7. **No content moderation on AI output** — OpenAI could theoretically generate inappropriate mental health advice. System prompt mitigates this, but no programmatic check exists.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Auth bypass: Edge Function trusted client user_id | Task 1 action steps c, d2, m; AC-1; AC-3 | Added JWT extraction via adminClient.auth.getUser(jwt). Removed user_id from request body. Added 401 return for invalid JWT. Updated ACs to specify JWT-based auth. |
| 2 | Outdated Deno serve import | Task 1 action step a | Changed from `serve` import to `Deno.serve()` natively |
| 3 | Raw OpenAI error leakage | Task 1 action step m | Added instruction to not forward raw OpenAI details; catch-all returns generic error, logs details server-side only |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | No duplicate report prevention | Task 1 action step m2 | Added check for existing report in current period before OpenAI call; return existing report if found |
| 2 | invoke() response handling unclear | Task 2 action step e | Added explicit note that invoke() returns { data, error } where data is parsed JSON body; clarified parsing flow |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Prompt injection via user notes | Low risk for MVP — worst case is garbled report text, not data exfiltration. Notes are user's own data. Can add structured formatting (e.g., JSON encoding notes separately) in Phase 9 polish. |
| 2 | AI output content moderation | System prompt includes "warm, supportive" guardrails. Programmatic moderation adds complexity without proportional risk reduction for a personal wellness app with small user base. Revisit if app scales or receives clinical use. |

## 5. Audit & Compliance Readiness

- **Authorization**: After applied fix, user identity comes from cryptographically verified JWT, not client assertion. This is the correct pattern for any multi-user system.
- **Audit trail**: Reports stored with user_id and created_at. The ai_reports table provides a complete history of generated reports per user. RLS ensures users only see their own data.
- **Cost control**: Duplicate prevention check limits OpenAI API spend. One report per type per period per user.
- **Error handling**: Sanitized error responses prevent information disclosure. Server-side logging preserves diagnostic ability.
- **Data privacy**: Mood data and profile context are sent to OpenAI for processing. This should be disclosed in the app's privacy policy (existing constraint in PROJECT.md). No findings here beyond existing awareness.

## 6. Final Release Bar

**What must be true before this plan ships:**
- Edge Function authenticates users via JWT, never via client-supplied user_id
- Error responses are generic (no raw OpenAI or Supabase error details)
- Duplicate report check prevents unbounded OpenAI API costs
- Migration includes RLS policy restricting reads to own user

**Remaining risks if shipped as-is (after applied fixes):**
- Prompt injection is theoretically possible but low impact
- No content moderation on AI output (mitigated by system prompt)
- Edge Function deployment requires manual Supabase CLI setup and secret configuration

**Sign-off:** I would sign my name to this plan after the applied changes. The authorization fix was critical — without it, this would have been a data access vulnerability in production.

---

**Summary:** Applied 3 must-have + 2 strongly-recommended upgrades. Deferred 2 items.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
