# Addendum — AI Health Companion PRD

Technical-how, mechanism, and rationale that belong downstream (architecture / solution design) rather than in the requirements-level PRD. Captured during the Fast-path PRD run (2026-07-13). See the product brief's own `addendum.md` (2026-07-10) for the full feature inventory and design-decision history — not duplicated here.

---

## 1. Platform & build-tech decisions

**Shipped surfaces (v1):**
- Elder: dedicated **Android** voice app.
- Caregiver: **web** dashboard.
- Doctor: **web** dashboard.
- iOS **not shipped** in v1 (Malaysia is Android-dominant; Apple paid dev account + Mac avoided).

**Build framework — recommended: Expo (React Native).** Rationale, grounded in the developer's actual setup (Windows PC + personal iPhone, no Mac):
- One codebase produces Android builds for pilot elders **and** runs live on the developer's **iPhone via the free Expo Go app** — no Mac, no Apple developer account required. This solves "I own an iPhone but ship Android" without buying hardware.
- Flutter was considered but rejected for this constraint: running on a *physical iPhone* requires a Mac + Xcode to sign. Native Kotlin was rejected: cannot run on the developer's iPhone at all (emulator/second device only).
- Note: this keeps **iOS available for development/dogfooding** even though iOS is not a v1 *ship* target — a softer position than "iOS deferred."
- Web dashboards (caregiver, doctor): standard web stack, free hosting tier — chosen to minimize surfaces for a solo 6-month build and to be demo-friendly for a final-year project.

**Alternatives if Expo is later dropped:** Android emulator on the Windows PC for demos, or a low-cost physical Android device (~RM 200–400).

## 2. Core AI

- **Gemini multimodal** as the core engine: prescription image reading (FR6), medical-grade translation (FR12), and conversation (FR18–FR20). Single-system multimodal fit is the "why now."
- **Guardrail:** pill *appearance* (FR7) must come from an authoritative pill database, **not** Gemini output — model guessing on the highest-stakes field is the disallowed failure mode (DC-3).

## 3. Pharmacist verification — mechanism

- v1 = **optional one-tap manual share** (shareable link / message containing the photo + parsed schedule) to a pharmacist who eyeballs and replies. No pharmacy-system integration, no partner dependency, free.
- The **mandatory** safety mechanism is the human confirmation gate (FR9), not the pharmacist. Pharmacist share is an optional extra layer.
- **Real pharmacy API / e-record integration → post-v1 roadmap** (needs a partner pharmacy + their data access; too heavy for a solo 6-month build).

## 4. Pill-appearance data source (OPEN)

- US NDC / RxImage does not apply to the Malaysia market.
- Candidate: **NPRA Quest3+** product-registration data and/or manufacturer appearance data. Imprint + appearance **coverage is an open risk** to the hero feature and must be validated before relying on FR7. Tracked as OQ-3.

## 5. Caregiver alert delivery (ASSUMPTION)

- On a web caregiver surface, genuine alerts (FR36) delivered via **web push + email**, optionally SMS. To be confirmed (OQ-4). Elder Android app uses native push for reminders (FR13) and on-device scheduling for reliability under flaky connectivity (NFR10).

## 6. Data model — the spine (v1 core)

The whole v1 architecture is one shared relational database. Every feature is a read or write against it; the elder voice app, the caregiver web dashboard, and the doctor web dashboard are three **views onto the same tables**. This is what makes the ~5-week core window achievable — design the DB once and the dashboards become mostly read-queries.

**Recommended stack: Supabase (Postgres + Auth + Storage + free tier).** Rationale: relational data (elder → medication → schedule → intake → logs) joins cleanly for the doctor dashboard's aggregations; built-in auth for the three roles; file storage for prescription photos; realtime for the "she's okay" signal; plugs into both Expo (elder app) and the web dashboards. Alternative: Firebase/Firestore if a NoSQL/serverless model is preferred — workable, but the doctor-view aggregations are easier in SQL.

**Core tables (~10) — the elder record is the hub; everything FKs to it:**

| Table | Key fields | Serves |
|---|---|---|
| `elder` | id, name, language, routine_json (wake/meal/sleep), persona | the hub (FR2) |
| `caregiver` / `doctor` | id, elder_id, role | role-based surfaces (FR1, FR3) |
| `prescription` | id, elder_id, photo_url, raw_parse_json, status | hero input (FR5, FR6) |
| `medication` | id, prescription_id, name, dose, frequency, timing, **appearance** (colour/shape/size), confidence, **confirmed** (bool) | confirmation gate lives on this row (FR7, FR8, FR9) |
| `reminder` | id, medication_id, anchor (e.g. "after breakfast"), spoken_text | generated only from `confirmed=true` meds (FR13, FR14) |
| `intake_event` | id, medication_id, timestamp, taken (bool) | "did I take it?" + adherence (FR15, FR39) |
| `memory` | id, elder_id, type (appointment / doctor-note / session-summary / fact), content, created_at | every memory query (FR19, FR21) |
| `health_log` | id, elder_id, timestamp, type (symptom/mood), content, significant (bool) | passive logging → doctor timeline (FR24, FR25, FR26) |
| `alert` | id, elder_id, trigger, timestamp, notified | red-flag + "tell my family" (FR29, FR30) |
| `consent` | id, elder_id, scope, granted_at | single spoken consent at onboarding (v1); per-share tooling is future (FR4/FR42) |

**Key invariants (enforced at the DB/service layer):**
- A `reminder` may exist only for a `medication` with `confirmed=true` — the confirmation gate (FR9, DC-3) is a hard data constraint, not just UI.
- `medication.appearance` is populated from the authoritative pill source (§4), **never** from Gemini output (DC-3).
- Store **extracted facts, not raw audio** (NFR6): `memory` / `health_log` hold text, audio is ephemeral.

## 7. Feature integration — one pipeline

Every v1 feature sits on a single flow; there is no second subsystem to build:

```
Prescription photo ──▶ Gemini parse ──▶ medication rows (confirmed=false)
                                          │  + appearance lookup (authoritative source, §4)
                                          ▼
                       Caregiver CONFIRMS on web  ← the gate (FR9)
                                          │  sets confirmed=true
                                          ▼
                   reminder rows generated ──▶ fire spoken at routine time (FR13/FR14)
                                          │                       │
                          ┌───────────────┤                       ▼
                          ▼               ▼                 intake_event (FR15)
                  voice companion   conversation                   │
                  reads `memory`    ──▶ Gemini extract ──▶ health_log (FR24–26)
                  (FR19)                                           │
                          └──────────────── DATABASE (§6) ─────────┤
                                                                   ▼
                                    ┌──────────────────────────────┴───────┐
                                    ▼                                       ▼
                         Caregiver dashboard                     Doctor dashboard
                         "she's okay" = latest interaction        read-query: adherence
                         + confirm gate (FR34, FR9)               (intake) + timeline
                                                                  (health_log) "since
                                                                  last visit" (FR39–41)
```

Red-flag safety (FR28–30) is a keyword match on the voice input that writes an `alert` row and notifies the guardian — a thin branch off the conversation loop, not a separate system.

**Suggested 5-week sequence** (build order = spine-first):
1. **Setup + voice loop** — Expo skeleton, Supabase schema (§6), auth, Gemini wired, STT→Gemini→TTS.
2. **Hero pt.1** — photo capture → Gemini parse → `medication` rows (pending).
3. **Hero pt.2** — appearance lookup + caregiver confirmation gate → generate `reminder` rows.
4. **Reminders + memory** — reminders fire spoken, `intake_event` logging, the three memory queries.
5. **Dashboards + safety + polish** — caregiver "she's okay", doctor read-only view, passive logging, red-flag script, demo prep.

**Resolve before week 3 (ties to OQ-3):** the Malaysian pill-appearance source feeds `medication.appearance` — the input to the most impressive feature. If NPRA Quest3+ has no usable appearance data, the realistic FYP fallback is a **small hand-curated appearance table for the ~10 demo medications** (honest for a pilot, and stated as such).
