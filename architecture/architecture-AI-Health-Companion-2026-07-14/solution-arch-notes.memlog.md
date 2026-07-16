---
topic: AI Health Companion — Solution Architecture (lightweight, $0 stack)
updated: 2026-07-14
for: PRD v1-core-locked
---

- (event) Intent: lightweight solution architecture + tech stack + APIs, student budget. Loaded PRD (v1-core-locked) + addendum §6-7 (data model + pipeline). No memlog.py (no Python on machine) — direct append.
- (decision) User constraints captured via AskUserQuestion: comfortable in **JavaScript/React**; budget **strictly $0 (free tiers only)**. Confirms Expo/React Native pick; drives a fully-free-tier stack.
- (decision) STACK (all $0): Elder app = Expo/RN -> Android APK (EAS free). Caregiver+Doctor = ONE React (Vite) app, role-routed, on Vercel/Netlify free. Backend = single Supabase project (Postgres + Auth + Storage + Edge Functions + RLS). Core AI = Gemini 2.5 Flash via AI Studio free tier (one model: Rx parse / translate / converse).
- (decision) VOICE = $0 via on-device: TTS = expo-speech (Android native, Malay ms-MY), STT = expo-speech-recognition (Android native). Only the middle 'thinking' step hits Gemini. Fallback ladder if on-device Malay weak: (1) feed audio to Gemini directly (transcribe+answer one call), (2) Google Cloud STT/TTS free tier + $300 credit. Voice behind a swappable voice.ts interface.
- (decision) SECURITY: Gemini API key lives ONLY in Supabase Edge Function, never in app/web bundle. App calls own function -> function calls Gemini.
- (decision) Rx parse uses Gemini responseSchema (JSON mode) -> guaranteed {name,dose,frequency,timing,confidence[]}; per-field confidence powers FR8 flag / FR9 gate. Red-flag (FR29) = keyword check in Edge Function BEFORE Gemini, fixed response (not model triage).
- (decision) CONFIRMATION GATE enforced in DATA not UI: medication.confirmed default false; reminder rows only creatable for confirmed=true (trigger/edge-fn only path); RLS limits who can flip. Schema refuses to schedule unverified pill even if app buggy.
- (decision) Reminders = expo-notifications LOCAL scheduled (offline, free) anchored to elder.routine_json (NFR10 satisfied at $0).
- (decision) OQ-3 pill data DE-RISKED for pilot: caregiver photographs actual pills at onboarding -> human-confirmed authoritative appearance (satisfies DC-3 better than scraped DB) + hand-curated ~10 demo-med table. National NPRA Quest3+ source -> Future Plans. Not a blocker anymore.
- (decision) Repo shape = monorepo /app (Expo) + /web (React dash) + /supabase (migrations + edge fns).
- (risk) Main stack risk is NOT cost, it's on-device Malay STT/TTS QUALITY. Week-1 validation mandated: (1) Malay voice on real Android w/ elderly-style speech, (2) Gemini Rx parse on 2-3 real messy scripts w/ responseSchema. Decide voice fallback early — it changes the voice module.
- (artifact) Written: architecture/architecture-AI-Health-Companion-2026-07-14/solution-architecture.md (10 sections + traceability to PRD). status: draft.
- (open) NEXT candidates: epics & stories from PRD+arch (5-week sprint plan), or start Week-1 spike. OQ-1 (retention) + OQ-2 (MDA) still product/regulatory open.
- (progress) Voice assistant block completed on 2026-07-16: native audio recording on the elder screen, Gemini audio transcription, on-device speech output via expo-speech, and removal of the old Gemini TTS voice path.
- (verification) Targeted eslint passed for touched voice files; `npx tsc --noEmit --pretty false` passed after updating the module test harness for text-only replies.
- (progress) Voice output routing and layout cleanup completed on 2026-07-16: playback is now re-asserted to the loudspeaker route before every spoken response, recording mode is confined to the active mic window, and the role switcher was moved to the safe top-right zone.
- (verification) `npx eslint` passed for touched files; `npx tsc --noEmit --pretty false` passed after the routing/layout update.
