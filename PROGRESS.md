# AIRA Build Progress

Working checklist against the PRD (`prd-AI-Health-Companion-2026-07-13/prd.md`) and
architecture spine (`architecture/architecture-AI-Health-Companion-2026-07-14/ARCHITECTURE-SPINE.md`).
Status snapshot taken 2026-07-23. Update checkboxes as items land; keep acceptance
criteria one line so a fresh session can pick up a single item without re-reading everything.

Legend: [ ] not started · [~] partial/in progress · [x] done

## 0. Foundation (do these first — everything else depends on them)

- [ ] **Real Supabase project wired up** — `services/supabase.ts` currently has
  placeholder URL/anon key and is imported nowhere. Acceptance: app reads/writes
  through Supabase client, not the local JSON blob in `services/database.ts`.
- [ ] **Apply `supabase/schema.sql` to the real project** — verify confirmation-gate
  trigger (`check_medication_confirmed_before_reminder`) actually fires.
- [ ] **Fix RLS policies** — currently `USING (true) WITH CHECK (true)` on every
  table in `supabase/schema.sql`, i.e. wide open. Acceptance: elder/caregiver/doctor
  roles scoped per AD-7.
- [ ] **Move Gemini calls server-side** — `EXPO_PUBLIC_GEMINI_API_KEY` is bundled
  client-side (`services/gemini.ts`). Acceptance: key lives only in a Supabase Edge
  Function; client calls the function, not Gemini directly.
- [ ] **Real auth for caregiver/doctor** — both `app/caregiver.tsx` (pairing code)
  and `app/doctor.tsx:195` (PIN) are local component state, not verified server-side.

## 1. Voice & Conversation

- [~] Voice conversation loop — works via `services/gemini.ts` `generateCompanionReply`,
  but calls Gemini directly from client (see Foundation).
- [~] STT — web works (`hooks/useSpeechToText.ts` via `webkitSpeechRecognition`);
  **native/Android is a mock** (lines 81, 94 just flip `isListening`). Needs a real
  on-device or Gemini-audio path for mobile.
- [x] TTS — `services/voice.ts` via `expo-speech`, persona-based pitch/rate.
- [~] Two parallel STT paths exist (`hooks/useSpeechToText.ts` and
  `services/gemini.ts` `transcribeVoiceMessage` / `hooks/useVoiceRecorder.ts`) —
  needs consolidation to one path before shipping native STT.

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

- [ ] Reconcile `supabase/schema.sql` (snake_case, e.g. `timestamp` column) vs
  `services/database.ts` in-app schema (`at` field, `intake_events` array) —
  no mapping layer exists between the two today.
- [ ] Remove hardcoded single-elder ID (`'elder-susan'`) scattered across
  `services/reminders.ts`, `services/voice.ts`, etc., once multi-elder support
  is needed (schema already implies it via `caregiver.elder_id` FK).
- [ ] Replace `require('./reminders')` inside async functions in
  `services/database.ts` (circular-import workaround, lines ~282-286, 411-430)
  with a cleaner pattern (event emitter or dynamic `import()`).

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
