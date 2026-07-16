---
title: "Solution Architecture: AI Health Companion (lightweight, $0 stack)"
status: draft
created: 2026-07-14
for: PRD v1-core-locked (prds/prd-AI-Health-Companion-2026-07-13)
audience: solo student dev, JS/React, 5-week FYP core, strictly free tiers
---

# Solution Architecture — AI Health Companion

**Lightweight build map for the 5-week v1 core.** Optimised for one constraint stack: **solo dev, comfortable in JavaScript/React, strictly $0.** Every component below has a genuine free tier. Requirements traceability points back to `prd.md`; the data model + pipeline live in the PRD's `addendum.md` §6–7.

The one-line architecture: **three React surfaces (one Expo app + two web dashboards) talking to one Supabase project, with Gemini called through a server-side function so the key never ships to a device.** Voice runs *on the phone*, not in the cloud — that is what keeps it free.

---

## 1. The stack at a glance (all $0)

| Layer | Choice | Free tier | Why |
|---|---|---|---|
| **Elder app** | **Expo (React Native)** → Android APK | Expo/EAS free build tier | Your JS/React skills; one codebase, also runs on your iPhone via Expo Go for dev |
| **Caregiver + Doctor dashboards** | **React (Vite)**, one app, role-routed | Vercel / Netlify / Cloudflare Pages free | Two dashboards = two routes, not two projects |
| **Backend / DB / Auth / Storage** | **Supabase** (Postgres + Auth + Storage + Edge Functions) | 500 MB DB, 1 GB files, 50k users free | Relational fits the spine; RLS gives you roles for free; one service instead of five |
| **Core AI** | **Google Gemini API** (AI Studio key) | Gemini 2.5 Flash free tier (rate-limited) | One model does all three AI jobs: Rx parse, translate, converse |
| **Speak (TTS)** | **`expo-speech`** → Android's built-in TTS | Free, on-device, offline | **The big cost saver.** Malay (ms-MY) supported on most Android devices |
| **Listen (STT)** | **`expo-speech-recognition`** → Android's recogniser | Free, on-device | Free speech-to-text; no per-minute API bill |
| **Reminders** | **`expo-notifications`** local scheduled | Free, on-device | Fires offline → satisfies NFR10 with zero server cost |
| **Emails (later)** | Resend / Supabase SMTP | Resend 3k/mo free | Caregiver alerts (FR36) are deferred anyway |

**Total recurring cost: $0.** The only thing that might cost money is a cheap second-hand Android phone to test on (~RM 200–400) — and you can start on the Android emulator on your PC for free.

---

## 2. The $0 voice strategy (the key decision)

Voice is where student projects accidentally get expensive — cloud STT/TTS bill per minute/character. The design avoids it:

```
Elder speaks ─▶ [on-device STT: expo-speech-recognition] ─▶ text
   text ─▶ [Supabase Edge Function] ─▶ Gemini (text in, text reply) ─▶ text
   text ─▶ [on-device TTS: expo-speech] ─▶ Elder hears the reply
```

Both ends of the voice loop run on the phone for free; only the "thinking" middle hits Gemini's free tier. This also helps **latency (NFR5 ≤2.5s)** — no upload/download of audio, just a short text round-trip to fast Gemini Flash.

**Fallback ladder if on-device Malay quality is poor** (validate this in Week 1 — see §9):
1. **Feed audio straight to Gemini** — Gemini Flash accepts audio input and can transcribe *and* answer in one call (still free tier). Removes the separate STT dependency; costs a bit more latency.
2. **Google Cloud STT/TTS** — free tier (60 min STT/mo; 1M TTS chars/mo) + $300 new-account credit; better accented-Malay models. Use only if 1 isn't enough.

Keep the voice layer behind a small `voice.ts` interface so you can swap STT/TTS providers without touching the rest of the app.

---

## 3. Component architecture — how the pieces talk

```
   ┌─────────────────┐        ┌──────────────────────┐     ┌────────────────────┐
   │  ELDER APP       │        │  CAREGIVER DASH      │     │  DOCTOR DASH       │
   │  Expo / RN       │        │  React (web)         │     │  React (web)       │
   │  voice loop,     │        │  onboard, CONFIRM    │     │  read-only "since  │
   │  reminders,      │        │  gate, "she's okay"  │     │  last visit"       │
   │  photo capture   │        └───────────┬──────────┘     └─────────┬──────────┘
   └───────┬─────────┘                     │                          │
           │  Supabase JS client (auth + RLS enforce who sees what)   │
           └──────────────────────┬────────┴──────────────────────────┘
                                   ▼
                      ┌──────────────────────────────┐
                      │  SUPABASE (one project)       │
                      │  • Postgres (the ~10 tables)  │
                      │  • Auth (elder/caregiver/doc) │
                      │  • Storage (Rx + pill photos) │
                      │  • RLS (role security)        │
                      │  • Edge Functions ────────────┼──▶ GEMINI API
                      │      (hold the API key,        │    (parse / translate /
                      │       call Gemini server-side) │     converse)
                      └──────────────────────────────┘
```

**Golden rule:** the Gemini API key lives **only** in a Supabase Edge Function, never in the Expo app or web bundle (those ship to users and the key would leak). The app calls *your* function; your function calls Gemini.

---

## 4. Gemini — the three jobs, one model

Use **Gemini 2.5 Flash** (fast + free tier + multimodal). Three call shapes, all via Edge Functions:

1. **Rx parse (the hero, FR6–FR8).** Image → **structured JSON** using Gemini's `responseSchema` (JSON mode) so output is guaranteed shape:
   ```json
   { "medications": [
       { "name": "...", "dose": "...", "frequency": "...", "timing": "...",
         "confidence": 0.0 } ] }
   ```
   The `confidence` per field is what powers FR8 → any low-confidence field is flagged for the caregiver, never auto-accepted. Structured output is what makes the safety gate *reliable* instead of parsing free text.
2. **Translate (FR11 spoken description / basic FR-level translation).** Text → target language. Keep the rigorous numeric/back-translation check (FR12) for Future Plans as decided.
3. **Converse (FR18–FR20).** System prompt encodes the locks (DC-1 no clinical judgement, DC-2 reassurance-by-connection, red-flag script). Pass recent `memory` rows as context so it can answer "what did the doctor say?".

**Red-flag safety (FR29)** is a plain keyword check in your Edge Function *before* Gemini, not something you trust the model to do — fixed phrases → fixed "call someone now" response. A first-aid poster, not AI triage.

---

## 5. The confirmation gate, enforced in data (DC-3)

The most important safety property is that a reminder can never come from an unconfirmed photo. Make it a **database rule, not a UI habit**:

- `medication.confirmed` defaults `false`.
- `reminder` rows may only be created for a medication where `confirmed = true` (enforce via a check/trigger or an Edge Function that is the *only* path to create reminders).
- Row-Level Security: only a linked **caregiver** (or the elder herself) can flip `confirmed`.

So even if the app has a bug, the schema refuses to schedule an unverified pill. That is a strong, demoable safety story for an FYP.

---

## 6. Reminders — on-device, offline, free

Use `expo-notifications` to schedule **local** notifications anchored to the elder's routine (`elder.routine_json`), not raw clock times (FR13). Local scheduling means they fire even with no connection (NFR10) and cost nothing. On fire → app speaks the reminder + the pill's appearance (FR14) via `expo-speech`.

---

## 7. Pill appearance solved cheaply (reframing OQ-3)

You do **not** need a national Malaysian pill-image database for a pilot. The compliant, $0 solution is already in your design:

- **Primary: the caregiver photographs the actual pills during onboarding.** That human-confirmed photo + description becomes the authoritative `medication.appearance` — which *satisfies* DC-3 ("authoritative, human-confirmed, not model-guessed") better than any scraped DB. Store the photo in Supabase Storage.
- **Supplement:** a hand-curated table of colour/shape/size for your ~10 demo medications (from packaging).

This turns OQ-3 from a blocking data-sourcing problem into a Week-3 onboarding feature. (Longer term, NPRA Quest3+ remains the path to a real national source — Future Plans.)

---

## 8. Repo & deploy shape

Simple monorepo (or two folders side by side):
```
/app        → Expo elder app          → EAS build → APK sideloaded to pilot phones
/web        → React dashboards         → Vercel (free)   (caregiver + doctor, role-routed)
/supabase   → SQL migrations + edge functions (holds Gemini key)
```
Deploy: `web` → Vercel free; `app` → EAS build APK; `supabase` → one free project. All connect to the same Supabase URL.

---

## 9. Free-tier limits — where they'd actually bite (honest)

| Service | The limit | Bites you when… | For a pilot? |
|---|---|---|---|
| Gemini free tier | requests/min + /day cap | many users hammering it at once | Fine — a handful of pilot users is well under |
| Supabase free | pauses after ~1 week *inactivity*; 500MB DB | you don't open it for a week; huge data | Fine — just log in weekly; text data is tiny |
| Expo EAS build | limited builds/month | you rebuild the APK constantly | Fine — build a few times |
| On-device Malay STT/TTS | *quality*, not cost | elderly/accented Malay is misheard | **Validate Week 1** (§2 fallback) |

The only real risk here is **not cost, it's Malay voice quality on-device** — so test it first.

---

## 10. Week-1 validation (do these before building the rest)

The two things that can sink this stack — prove them cheaply in the first few days:
1. **Malay STT/TTS on a real Android device** with elderly-style speech. If on-device is weak, drop to the Gemini-audio fallback (§2) — decide early, it changes the voice module.
2. **Gemini Rx parse on 2–3 real, messy prescriptions** with `responseSchema`. Confirm you get usable structured JSON + confidence. This is the whole hero feature; know it works before Week 2.

Everything else (Supabase schema, React screens, notifications) is standard JS/React work you already have the skills for.

---

## Open items still owned by the PRD
- **OQ-1** retention validation (~10 elder conversations) — product risk, not architecture.
- **OQ-2** Malaysian MDA device classification — regulatory, unaffected by stack.
- **OQ-3** national pill data — *de-risked for the pilot* by §7; national source stays Future Plans.
