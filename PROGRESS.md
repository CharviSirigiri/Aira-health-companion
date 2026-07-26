# AIRA Build Progress

Working checklist against the PRD (`prd-AI-Health-Companion-2026-07-13/prd.md`) and
architecture spine (`architecture/architecture-AI-Health-Companion-2026-07-14/ARCHITECTURE-SPINE.md`).
Status snapshot taken 2026-07-23. Update checkboxes as items land; keep acceptance
criteria one line so a fresh session can pick up a single item without re-reading everything.

Legend: [ ] not started · [~] partial/in progress · [x] done

## 0. Foundation (do these first — everything else depends on them)

Status: **all foundation items complete.** Auth, real Supabase data layer,
and server-side Gemini proxy are all done and verified end-to-end.

- [x] **Real Supabase project credentials wired into `.env`** — project URL +
  anon key set (gitignored). `services/supabase.ts` client itself still needs to
  be imported/used by app code (currently dead code, see item below).
- [x] **Applied `supabase/schema.sql` to the real project** — schema + seed data
  live. Added `caregiver.user_id` / `doctor.user_id` columns linking to
  `auth.users` for RLS scoping.
- [x] **Fixed RLS policies** — replaced `USING (true)` wide-open policies with
  role-scoped ones: elder device (unauthenticated) writes vs caregiver/doctor
  read access via `accessible_elder_ids()`; caregiver has write access
  (confirm gate, routine edits) via `caregiver_elder_ids()`; doctor is
  read-only + can insert `memory` notes, per PRD FR39-41.
- [ ] Confirmation-gate trigger (`check_medication_confirmed_before_reminder`)
  applied but not yet exercised by real app traffic (app doesn't talk to
  Supabase yet — see Section 8 migration item).
- [x] **Moved Gemini calls server-side** — added `supabase/functions/gemini-proxy`
  (Deno Edge Function), deployed via Supabase CLI, with `GEMINI_API_KEY` set as
  a server-only secret (`supabase secrets set`). `services/gemini.ts` now calls
  `supabase.functions.invoke('gemini-proxy', ...)` instead of fetching Gemini
  directly; `EXPO_PUBLIC_GEMINI_API_KEY` removed from `.env`/`.env.example`
  entirely. Added an explicit `EXPO_PUBLIC_GEMINI_SIMULATION` toggle (decoupled
  from key presence, since the client no longer knows if a key is configured)
  to still support demoing offline. Verified end-to-end via curl directly
  against the deployed function and via the live app (Gemini 2.5 Flash
  responded correctly through the proxy).
- [x] **Real auth for caregiver/doctor** — `services/auth.ts` added, wired into
  `app/caregiver.tsx` and `app/doctor.tsx` with real Supabase email/password
  sign-up/sign-in, replacing the old local-state pairing-code/PIN gates.
  Added `claim_caregiver`/`claim_doctor` SECURITY DEFINER RPC functions in
  `supabase/schema.sql` so a first-time sign-up can link itself to the
  still-unclaimed seed caregiver/doctor row (plain RLS would otherwise hide
  that unlinked row from the new user). Elder routine/pairing-code step (step 2
  of onboarding) is still local UI only — the pairing code isn't validated
  against anything server-side yet since this is a single pilot-elder ("Susan")
  build; noted as a known simplification, not a bug to fix unless multi-elder
  support is in scope.

## 1. Voice & Conversation

- [x] Voice conversation loop — `services/gemini.ts` `generateCompanionReply`,
  now via the `gemini-proxy` Edge Function (see Foundation).
- [x] STT — **corrected an earlier wrong finding**: native/Android is NOT
  actually mocked. `app/(tabs)/index.tsx` `handleMicPress` only calls
  `useSpeechToText`'s browser-API path when `Platform.OS === 'web' &&
  stt.isSupported`; on native (and on web browsers without
  `webkitSpeechRecognition`, e.g. Firefox) it goes through
  `useVoiceRecorder` (real `expo-audio` recording) -> `processRecordedVoice`
  -> `transcribeVoiceMessage` (real Gemini audio transcription, now
  proxied). The two paths are mutually exclusive by design (web vs
  native/fallback), not a bug. Removed genuinely dead "mock" fallback code
  in `hooks/useSpeechToText.ts` (`startListening`/`stopListening`'s `else`
  branches could never actually fire given how the caller gates on
  `isSupported`). Verified working live via Expo Go (found and fixed two
  real bugs along the way: a crash from the new `expo-file-system` API
  being called with the legacy `readAsStringAsync` method — fixed by
  importing `expo-file-system/legacy` in `app/(tabs)/index.tsx`, matching
  `services/database.ts`'s existing pattern; and TTS audio routing
  through the earpiece instead of the speaker after a recording session —
  fixed in `services/voice.ts` by resetting `allowsRecording: false`
  explicitly in `configureVoicePlaybackAudioMode` (setAudioModeAsync
  merges with prior state) and by changing `Speech.speak`'s
  `useApplicationAudioSession` from `false` to `true` so it reuses the
  app's own configured audio session instead of a separate one).
- [x] TTS — upgraded from on-device `expo-speech` to real neural TTS via
  Gemini (`gemini-2.5-flash-preview-tts`), proxied through `gemini-proxy`
  (extended the Edge Function to accept an optional top-level `model`
  field so it can target non-default models). `services/voice.ts` maps
  elder persona -> a matching prebuilt voice (warm->Sulafat,
  friendly->Achird, patient->Vindemiatrix), wraps the headerless PCM
  response in a WAV header (hand-rolled, no new dependency), writes it to
  a temp file, and plays it via `expo-audio`'s `createAudioPlayer`. Falls
  back to the original on-device `expo-speech` path if Gemini TTS fails
  or `EXPO_PUBLIC_GEMINI_SIMULATION=true`. Verified end-to-end via curl
  directly against the deployed function (confirmed real PCM audio
  returned, `audio/L16;codec=pcm;rate=24000`).

## 2. Hero Flow: Rx Photo → Confirm → Schedule

- [~] OCR parse — `services/gemini.ts` `parsePrescription`, real Vision call +
  simulation fallback. Working.
- [x] App-layer confirmation gate — `services/database.ts` `addReminder`/
  `confirmMedication` throw if `!med.confirmed`.
- [ ] DB-layer confirmation gate exercised for real (depends on Foundation).
- [ ] Fix hardcoded placeholder image path in `app/caregiver.tsx:230`
  (`via.placeholder.com` URL in one code path) — replace with real captured image.
- [ ] **Pill appearance from authoritative source** (DC-3) — currently free-text
  typed by caregiver (`app/caregiver.tsx:633`). PRD allows hand-curated fallback
  for FYP scope; decide whether to build a small curated lookup table or keep as-is.

## 3. Reminders

- [x] On-device scheduling via `expo-notifications`, respects `routine_json`,
  cancel/resync on change — `services/reminders.ts`. Solid, no changes needed
  unless data-layer migration requires rewiring calls.

## 4. Memory & Passive Logging

- [~] Memory injection into Gemini prompt — last 5 records only, no per-session
  summarization (FR21 missing).
- [~] Symptom/mood extraction — simple hardcoded keyword match
  (`services/gemini.ts:372-405`), not model-based passive extraction. Acceptable
  for FYP scope per PRD but flag as simplistic.

## 5. Safety Floor

- [x] Deterministic red-flag keyword gate before any model call —
  `services/gemini.ts:204-226`. Matches AD-9. No changes needed.
- [x] User-initiated "call my family" flow present.

## 6. Caregiver Dashboard

- [~] Onboarding, pairing, confirm gate, routine editor, Rx review UI all present
  in `app/caregiver.tsx` (1781 lines) — needs real auth (see Foundation).
- [ ] Pharmacist share — stubbed (`alert('Mock link sent to pharmacist!...')`,
  line ~856). Deferred per PRD Section 11 — leave as stub unless scope changes.

## 7. Doctor Dashboard

- [~] Adherence calc, "since last visit" delta, notes/appointments —
  `app/doctor.tsx` (1018 lines). Needs real auth (see Foundation).
- [ ] Verify "patient-reported, not medical advice" watermark is actually shown
  in the UI (FR41) — not yet directly confirmed.

## 8. Data Model Consistency

- [x] `services/database.ts` now talks to real Supabase tables instead of a
  local JSON blob (`localStorage`/`expo-file-system`). Field-name mapping
  (`at` <-> `timestamp`) is handled internally so callers are unaffected.
  `resolveElderId()` maps the legacy hardcoded `'elder-susan'` id to the real
  pilot elder UUID, so callers didn't need to change.
- [x] Removed the old full-database `resetDatabase()` (was safe on a local
  mock, but would have wiped shared production data now that the backend is
  real). Replaced with `resetIntakeHistory(elderId)`, scoped to just that
  elder's intake events, matching what the doctor dashboard's reset button
  actually claims to do.
- [ ] Hardcoded single-elder ID (`'elder-susan'`) still scattered across
  `services/reminders.ts`, `services/voice.ts`, `app/(tabs)/index.tsx` — fine
  for the single-pilot-elder FYP scope; would need real multi-elder wiring
  (pairing code -> elder_id resolution) if that becomes in-scope.
- [ ] `require('./reminders')` inside async functions in `services/database.ts`
  (circular-import workaround) — left as-is, same pattern as before.
- [ ] **`scripts/test_modules.ts` and `scratch/test-reminders.js` are now
  stale** — they hand-roll mocks of the old local-blob `loadDatabase`/
  `saveDatabase`/`resetDatabase` shape, which no longer exists. Neither is
  wired into any npm script (checked `package.json`), so nothing breaks, but
  they should be rewritten or deleted before relying on them again.
- [x] **Fixed a real seed-data duplication bug**, found during manual testing:
  `caregiver`/`doctor`/`reminder`/`memory` seed `INSERT`s in `schema.sql` had
  no fixed id and no working `ON CONFLICT` target, so every rerun of the
  script (which we did several times while iterating on RLS/auth) inserted a
  fresh duplicate row. Symptoms seen: `claim_caregiver` RPC error "query
  returned more than one row", and 5 duplicate "APPOINTMENT" memory entries
  on the doctor dashboard. Fixed by giving all seed rows fixed UUIDs (matching
  the pattern `elder`/`prescription`/`medication` already used) so
  `ON CONFLICT (id) DO NOTHING` actually works, and made `claim_caregiver`/
  `claim_doctor` defensive via `ctid`-scoped updates in case duplicates exist
  already. Verified end-to-end: caregiver sign-up -> claim -> onboarding
  -> dashboard, and doctor sign-up -> claim -> patient review all work
  against the real Supabase backend, with the "PATIENT-REPORTED LOGS — NOT
  CLINICAL ADVICE" watermark (FR41) confirmed showing.

## 9. Testing

- [ ] **No automated tests exist at all.** No `jest`/`vitest` configured in
  `package.json`; `scratch/test-reminders.js` and `scripts/test_modules.ts` are
  manual ad hoc scripts, not part of any test runner.
- [ ] Priority order once a framework is added: confirmation-gate logic →
  reminder scheduling → red-flag safety gate (safety-critical paths first).

## Explicitly Out of Scope for v1 (per PRD Section 11 — do not build unless asked)

Translation validation/back-translation, silence-based check-in/auto-escalation,
adaptive reminder cadence, symptom continuity, "forget that"/auto-expiry,
tap/non-verbal accessibility, anti-scam/safe-phrase, honest-about-AI surface,
coercion-safe revoke, data export/deletion, caregiver voice-note relay,
digest/alert-fatigue engine, per-share consent tooling.

---
**How to use this file:** pick one unchecked item per session, reference it by
its section + bullet, and let Claude Code read only the files named in that
bullet rather than re-auditing the whole repo. Check items off as they land.
