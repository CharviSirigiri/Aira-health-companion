---
title: "PRD: AI Health Companion"
status: v1-core-locked
created: 2026-07-13
updated: 2026-07-14
---

# PRD: AI Health Companion

> **Status:** v1 core locked (assumptions resolved 2026-07-14). The `[ASSUMPTION]` tags have been converted into decisions or explicit pilot-tune items. Tech/mechanism detail lives in `addendum.md`.

## 1. Overview

AI Health Companion is a **voice-led health companion** for older adults with chronic conditions who cannot read small text, cannot type, or cannot read at all — often holding a prescription written in a language they do not read. For the person receiving care, **voice is the entire experience**; screens exist only for the family and clinicians who support her.

Its sharp edge — a feature no shipping product offers — is: **photograph a prescription → a verified medication schedule that describes each pill aloud (colour, shape, size) in the user's own language**, so someone who cannot read the label can still take the right pill at the right time. Around that wedge sits a **remembering** companion that holds the user's health story (medications, symptoms, appointments), a **passive** health log built from conversation, a **safety floor** that connects her to family, and **web dashboards** for the caregiver and doctor.

**v1 goal is proof, not scale:** that the wedge works reliably and safely for the people who need it most, and that connection (not medical reassurance) retains them.

**Non-negotiable posture:** the product makes **no clinical judgement** and never tells the user whether she is medically okay. It retains her through **memory and connection, not diagnosis** — the safer and more defensible position.

## 2. Goals & Success Metrics

Measured at **pilot scale**. Order matters — Metric 0 gates the rest.

| # | Goal | Success signal | Counter-metric (what would mean we're gaming it) |
|---|------|----------------|--------------------------------------------------|
| **0** | **Validation gate** (before heavy build) | In ~10 conversations with real elderly users, a clear majority say *being remembered/connected* — not medically reassured — is a reason they'd return. Decisive evidence = the *reason* users give + absence of reassurance-seeking. | Users who only want the app to tell them they're okay → retention model is wrong. |
| **1** | **Safety** (cannot be missed) | **Zero unflagged medication errors** — every low-confidence Rx reading is caught by the confirmation gate, never turned into a silent wrong reminder. | A wrong-but-*confident* reading is failure regardless of any other metric. |
| **2** | **Hero feature works on real input** | On real, messy prescriptions, schedule parsed correctly **≥90%** (post-confirmation); pill-appearance descriptions match the actual medication for covered languages. | High accuracy only on clean typed samples. |
| **3** | **The user comes back** | Pilot elder interacts **≥5 days/week**, still using at **day 30**, with memory queries ("did I take it?", "what did the doctor say?") as recurring *unprompted* behaviour. | Engagement driven by notifications/nagging, not self-initiated queries. |
| **4** | **Adherence improves** | Self- or family-confirmed medication adherence rises vs each user's baseline. | — |
| **5** | **The family stays** | Paying caregiver trusts the "she's okay" signal, feels less anxious, would recommend. | Caregiver checks the app anxiously *more* (signal isn't trusted). |
| **6** | **The doctor uses it** | Dashboard opened in pilot appointments and rated useful for prep. | — |

**Explicitly not success:** downloads, minutes talked, or any vanity metric.

## 3. Users & Stakeholders

Three people touch the product; each has a different job — which is also the business shape.

- **The care recipient — the user (free).** *Susan, 70*, diabetes + high blood pressure + thyroid, cannot read her English prescription. Regimen is genuinely complex (two diabetes meds at different times, thyroid once daily, BP three times daily; several pills look alike). Lives entirely in **voice**. Success = right pill at the right time, holds her own health story, keeps her independence. Speaks Malay; handed English scripts.
- **The adult child — the buyer (paid tier).** *Susan's daughter*, worries from across town. Discovers, sets up, and pays. Job = configuration + peace of mind via a **web dashboard**: knows mum is engaging, sends a voice note the companion relays warmly, is alerted only if something is genuinely wrong.
- **The doctor — the reviewer.** Seen only through a **read-only web dashboard**. Job = a better appointment: a one-minute, patient-reported summary of adherence, symptoms, and mood since last visit.

**Business model (context, not v1 scope):** free forever for the elder; paid caregiver tier is the product; long-run B2B2C — insurers/care systems fund it for adherence outcomes.

## 4. Non-Negotiable Design Constraints

These govern many requirements below and are **locks**, not preferences (from the forge + brainstorm):

- **DC-1 — No clinical judgement, ever.** Never names a condition, never says "probably fine," never triages.
- **DC-2 — Reassurance by connection, not diagnosis.** Worry is heard, logged, and carried to humans — not graded safe by a machine.
- **DC-3 — Hero feature never guesses.** Pill appearance from an authoritative database, not model output; a confirmation gate that never auto-activates a schedule from a photo alone.
- **DC-4 — The app carries 100% of the memory burden.** Forgetting is the *default assumption*, never an error state.
- **DC-5 — Multimodal accessibility floor.** "Voice-first," not "voice-only" — taps/single-button fallback so mute/aphasic users aren't excluded.
- **DC-6 — Trust is the entire moat.** Anti-scam, coercion-safe, honest-about-being-AI, consent-as-conversation, elder owns her data.
- **DC-7 — Extraction is invisible.** If the user ever feels *studied*, the companion is broken.
- **DC-8 — Patient-reported, not medical advice.** This framing appears wherever logged health data is shown to any human.

## 5. Scope (v1)

> **v1 = the 5-week FYP core build.** The scope below is deliberately ruthless: a single, coherent *spine* — the database and the one pipeline (photo → confirm → schedule → reminders → memory → dashboards) that every feature hangs off (see `addendum.md` §6–7). The elder voice app and both web dashboards are all **views onto one shared database**, which is what makes the window achievable. Everything real but non-essential is moved to **Future Plans** (Section 11), not deleted.

### 5.1 v1 Core — build now (the demo-critical spine)

The features without which there is no product to show. Each keeps its stable FR IDs (Section 7); grouped here by the spine.

- **Voice conversation loop** — elder speaks → Gemini → spoken reply (FR18, FR20).
- **Hero: photo → parsed → confirmed → spoken pill schedule** (the impressive differentiator, FR5–FR9, FR11, FR14).
- **Routine-anchored spoken reminders** (FR2, FR13).
- **Queryable memory** — "did I take it?", "when's my appointment?", "what did the doctor say?" (FR15, FR19) — the retention engine.
- **Basic passive symptom/mood logging** into a health timeline, no forms (FR24, FR26).
- **Caregiver web dashboard** — onboarding, the **confirmation gate**, "she's okay" presence signal (FR1, FR3, FR9, FR34).
- **Doctor web dashboard** — read-only "since last visit" (FR39, FR40, FR41). Cheap to build (a read-query over the spine), high demo value.
- **Safety floor** — hardcoded red-flag script + user-initiated "tell my family" (FR28, FR29, FR30).
- **All design locks (Section 4)** — posture, not build cost; kept in full.

Language for the 5-week core: **English + Malay** as designed, with Malay scoped to the demo path first if time is tight.

### 5.2 Platforms *(decided)*
- **Elder:** dedicated **Android** voice app.
- **Caregiver:** **web** dashboard.
- **Doctor:** **web** dashboard.
- **Data/back end:** single shared relational database (**Supabase / Postgres** recommended — auth + file storage + free tier; see `addendum.md` §6).
- **iOS not a v1 ship target** (Malaysia is Android-dominant). Build framework recommended as **Expo/React Native** so the app still runs on the developer's own iPhone via Expo Go for development/dogfooding — a build-tech decision detailed in `addendum.md`.

### 5.3 Deferred to Future Plans (Section 11) — real features, wrong window
Moved out of the 5-week core to protect the spine — **not** cut from the product:
- **Translation with numeric/back-translation validation** (FR12) — basic translation stays; the rigorous dosage-validation layer is future.
- **Optional pharmacist manual share** (FR10).
- **Silence-based check-in and any auto-escalation** (FR31–FR33) — needs reliable background monitoring; v1 has no silence watcher.
- **Adaptive reminder cadence / rhythm-learning** (FR16), **symptom-continuity detection** (FR27).
- **"Forget that" + auto-expiry** (FR22), **coercion-safe revoke** (FR45), **anti-scam teaching + safe-phrase** (FR43), **honest-about-AI positioning surface** (FR44 as an explicit feature), **data export/deletion tooling** (FR46).
- **Caregiver voice-note relay** (FR37), caregiver soft-suggestion tiered-trust config (FR38), digest/alert-fatigue engine + off-dashboard alert delivery (FR35, FR36), per-share consent tooling (FR4, FR42) — v1 uses a single spoken consent at onboarding.
- **Accessibility tap/non-verbal fallback** (FR23) — retained as a lock (DC-5) but the built fallback is future; re-summonable visual pill card (FR17).
- iOS apps; native caregiver/doctor mobile apps; silence auto-escalation to emergency services; real pharmacy-system integration; voice-biomarker screening, dementia-adaptive mode, refill prediction, appointment companion; community/group features, dedicated hardware; languages beyond English + Malay (Hindi, Telugu earned one at a time); deep EHR / clinical-workflow integration.

## 6. User Journeys

*Authored from the brief; confirm the flows match your intent.*

- **UJ-1 — Onboarding is a family act.** Susan's daughter creates an account on the web dashboard, links Susan's phone, and enters Susan's daily rhythm (wake, meals). Susan's app greets her by voice in Malay. *Decision (v1): caregiver-led onboarding is the **only** v1 path — voice-guided account creation for a non-reading elder is hard to build well in the window; elder self-onboarding → Future Plans.*
- **UJ-2 — New/changed prescription.** Daughter (or Susan, voice-guided) photographs the new script → app parses it, looks up each pill's appearance, flags anything low-confidence → daughter reviews and confirms → *only then* reminders go live. Optional: one-tap share to a pharmacist.
- **UJ-3 — A day of medication.** At mealtime the companion asks "Have you had breakfast? Good — it's time for the small white pill." Susan can ask "did I already take my heart pill?" and get a true answer.
- **UJ-4 — A worry mentioned.** Susan says "my head hurts." The companion listens, quietly logs it (confirming if significant), never diagnoses; if she asks "is this bad?", it offers connection ("I've noted that and your daughter will see it") — not a verdict. Red-flag phrases ("chest pain," "trouble breathing") trigger the fixed "call someone now" script.
- **UJ-5 — She goes quiet.** After a silence window the app tries Susan 2–3 gentle ways; if still no response it alerts the **guardian** (never emergency services), with false-alarm-aware wording.
- **UJ-6 — The doctor visit.** Before the appointment the doctor opens the web dashboard: a one-page, watermarked "since last visit" summary of adherence, symptoms, and mood — reviewable in under a minute.

## 7. Functional Requirements

FRs are grouped by capability; **IDs are global and stable**. `[ASSUMPTION]` marks an inferred detail. Each FR carries a scope tag against the 5-week core build (Section 5): **`{v1}`** = build now; **`{future}`** = deferred to Section 11. The `{future}` items keep their IDs so nothing is lost — they are sequenced, not deleted.

**Scope map (build list at a glance):**

| Capability | `{v1}` — build now | `{future}` — deferred |
|---|---|---|
| 7.1 Onboarding & Accounts | FR1, FR2, FR3 | FR4 |
| 7.2 Prescription — the hero | FR5, FR6, FR7, FR8, FR9, FR11 | FR10, FR12 |
| 7.3 Reminders | FR13, FR14, FR15 | FR16, FR17 |
| 7.4 Voice Companion & Memory | FR18, FR19, FR20, FR21 | FR22, FR23 |
| 7.5 Passive Logging | FR24, FR25, FR26 | FR27 |
| 7.6 Safety & Escalation | FR28, FR29, FR30 | FR31, FR32, FR33 |
| 7.7 Caregiver surface | FR34 | FR35, FR36, FR37, FR38 |
| 7.8 Doctor dashboard | FR39, FR40, FR41 | FR42 |
| 7.9 Trust, Consent & Data | — (single spoken consent at onboarding) | FR43, FR44, FR45, FR46 |

*Note:* FR15 (query intake) reads on the memory spine; FR14 (spoken pill appearance at reminder time) reuses FR7/FR11 data, so it's near-free once the hero is built. All design **locks** (Section 4) remain in force regardless of scope tag — DC-5 (accessibility) and DC-6 (trust) are honoured as posture in v1 even where their *dedicated* FRs (FR23, FR43–46) are deferred.

### 7.1 Onboarding & Accounts
- **FR1** — Caregiver-led account creation on the web dashboard, linking one or more elder devices. (Elder voice-guided self-onboarding is deferred — see Section 11.)
- **FR2** — Elder profile setup: language (**English/Malay**), voice/persona, and daily routine (wake/meal/sleep times) that anchor reminders.
- **FR3** — Role-based access for elder, caregiver(s), and doctor(view-only), each seeing only their surface.
- **FR4** — Spoken, re-confirmable consent captured at onboarding; per-share consent required before any data reaches the doctor (DC-6, DC-8).

### 7.2 Prescription Capture & Verification — the hero (DC-3)
- **FR5** — Capture a prescription by photo: caregiver-assisted is the primary path; voice-guided elder capture is the fallback.
- **FR6** — Parse the photo into a structured schedule: drug name, dose, frequency, and timing.
- **FR7** — Retrieve each medication's physical appearance (colour, shape, size) from an **authoritative pill database**, never model-generated.
- **FR8** — Produce a per-field **confidence score**; any low-confidence field is flagged for human review rather than accepted.
- **FR9** — **Confirmation gate:** the schedule never activates from a photo alone — a human (caregiver or self) must review and confirm the parsed schedule before any reminder is created.
- **FR10** — Optional **one-tap manual share** of the photo + parsed schedule to a pharmacist (shareable link; no system integration) for an extra check.
- **FR11** — Explain each medication in plain language and **speak its pill-appearance description** in the elder's language (English/Malay).
- **FR12** — Translate medication instructions with **dosage/numeric validation and a back-translation check**, so a translation error can never change a dose.

### 7.3 Medication Reminders
- **FR13** — Deliver **meal-/routine-anchored** reminders spoken aloud ("Have you eaten? It's time for the small white pill"), anchored to FR2 routine, not a raw clock.
- **FR14** — At reminder time, identify the pill **by spoken appearance** so a non-reading user can match it.
- **FR15** — Let the elder query intake by voice ("did I take my heart pill today?") and get a truthful answer (links to memory, FR19).
- **FR16** — **Adaptive cadence:** learn the elder's rhythm, consolidate reminders, and avoid over-nagging (DC-4).
- **FR17** — Re-summonable pill reference ("what does my heart pill look like?"). The *spoken* re-ask is already covered in v1 by FR11 + FR15 (memory); the deferred part is a dedicated **visual pill card** (Section 11).

### 7.4 Voice Companion & Memory (retention engine)
- **FR18** — Voice is the elder's primary interface: she speaks and listens, never navigates menus or reads text.
- **FR19** — **Persistent, queryable external memory:** medications, appointments, past conversation ("what did the doctor say last week?", "when is my appointment?").
- **FR20** — Warm, emotionally consistent conversation with a stable persona and **infinite, judgement-free re-explanation**.
- **FR21** — Per-session summarisation, stored, to build continuity.
- **FR22** — **"Forget that"** voice command plus auto-expiry of sensitive items (DC-6).
- **FR23** — **Accessibility floor:** a tap/single-button/non-verbal path so users who cannot speak clearly are not excluded (DC-5).

### 7.5 Passive Health Logging (DC-7)
- **FR24** — Passively extract symptoms and mood from ordinary conversation — **no forms**.
- **FR25** — **Conservative extraction:** confirm before logging anything clinically significant; never silently record a serious symptom.
- **FR26** — Build an automatic **health timeline** from extracted items, feeding memory and the doctor view.
- **FR27** — Surface **symptom continuity** ("you mentioned feeling tired on Monday and Wednesday too") without interpreting it.

### 7.6 Safety & Escalation (DC-1, DC-2)
- **FR28** — **No clinical judgement:** the companion never names a condition, never says "probably fine," never triages.
- **FR29** — **Hardcoded red-flag script:** fixed phrases (chest pain, slurred speech, sudden weakness, trouble breathing) trigger a fixed "call someone now" response — a first-aid poster, not AI triage.
- **FR30** — **User-initiated distress** ("my chest hurts") notifies the guardian.
- **FR31** — **Silence-based check-in:** after a silence window, try the elder 2–3 gentle ways, then alert the **guardian only** (never emergency services).
- **FR32** — **False-alarm-aware handling** for the "phone left in the kitchen" case (graduated, non-alarming wording).
- **FR33** — Elder pre-sets her own **who/when escalation preferences** (coercion-safe: she controls this).

### 7.7 Family / Caregiver Surface — web (DC-2)
- **FR34** — **"She's okay" presence signal** — a single, calm status.
- **FR35** — A **digest, not per-symptom pings**; only red-flags or a worsening/repeating pattern raise a real alert (anti alarm-fatigue).
- **FR36** — Genuine alerts delivered off-dashboard so the caregiver needn't watch the page. Leading channel = **web push + email** (optional SMS); final choice tracked as OQ-4 and made when this deferred feature is built.
- **FR37** — Caregiver can send a **voice note** that the companion relays warmly in the elder's language.
- **FR38** — Caregiver configuration: routine, medication review/confirmation (FR9), and escalation setup — as **soft suggestions requiring the elder's spoken confirmation** (tiered trust).

### 7.8 Doctor Dashboard — web (DC-8)
- **FR39** — Read-only view of adherence, symptom trends, and mood over time.
- **FR40** — A one-page **"since last visit"** delta, printable, reviewable in under a minute.
- **FR41** — **"Patient-reported, not medical advice"** watermark throughout; summaries always show gaps/uncertainty (never over-trusted).
- **FR42** — **Per-share consent:** nothing reaches the doctor unless the elder has said "share this" (FR4).

### 7.9 Trust, Consent & Data Controls (DC-6)
- **FR43** — **Anti-scam behaviour:** the companion never asks for money or passwords, teaches the elder this, and honours a safe-phrase.
- **FR44** — **Honest-about-being-AI:** never fakes personhood or reciprocated love; positioned as a bridge to humans, not a replacement.
- **FR45** — **Coercion-safe access:** the elder can privately revoke a controlling relative's access.
- **FR46** — **Data ownership + export** for the elder, and deletion on request.

## 8. Non-Functional Requirements

Pilot-grade targets for a solo, Gemini-based build — v1 core scoped to a **~5-week FYP window** (the earlier ~6-month figure covered the full feature set now split into Future Plans). Thresholds tagged `[ASSUMPTION]` are starting points to tune.

- **NFR1 — Voice recognition quality (first-class).** ASR tuned for accented/quiet **elderly English and Malay** speech. **Firm policy:** on uncertainty the app **confirms rather than guesses** (ties to NFR9). A numeric word-error-rate target is intentionally *not* fixed pre-pilot — it is tuned against real accented/quiet speech during the pilot (OQ-5). The firm requirement is the confirm-don't-guess behaviour, not a threshold number.
- **NFR2 — Medication safety bar (hard constraint).** Zero unflagged medication errors: every low-confidence parse is caught by FR8/FR9. A wrong-but-flagged reading is acceptable; a wrong-but-confident one is a defect.
- **NFR3 — Hero accuracy.** ≥90% correct schedule parse on **real, messy** prescriptions after the confirmation step (ties to Metric 2).
- **NFR4 — Translation integrity.** No translation may alter a dose; enforced by FR12's numeric validation + back-translation.
- **NFR5 — Conversational latency.** Voice round-trip fast enough to feel like a conversation. **Target ≤ 2.5 s**; acceptable ≤ 4 s under poor connectivity. If slower, the app plays an audible "let me think" holding cue rather than leaving dead air.
- **NFR6 — Privacy & data protection.** Compliance with Malaysia's **PDPA**; store **extracted facts, not raw audio**, where possible; ephemeral audio handling; encryption in transit and at rest.
- **NFR7 — Consent & coercion-safety.** Consent is spoken, re-confirmable, and revocable; the elder can privately revoke caregiver access (FR45).
- **NFR8 — Accessibility.** Web dashboards (caregiver, doctor) meet **WCAG 2.1 AA**. The elder app meets the DC-5 floor via **voice + a large-target one-tap confirm**; the fuller non-verbal/tap path (FR23) is deferred, so v1's practical floor is *voice-plus-single-confirm*, not full non-verbal operation.
- **NFR9 — Graceful degradation / fail-safe.** Any uncertainty (ASR, OCR, parse) degrades to a confirmation, never a silent wrong action.
- **NFR10 — Availability & reminders reliability.** Reminders fire from **on-device scheduling** so they still trigger under flaky connectivity (decided). Full offline operation (offline conversation/parse) is **out of v1** — those degrade to "I need a connection for that" rather than failing silently (NFR9).
- **NFR11 — Regulatory posture.** The product stays a **consumer wellness app** (no diagnosis) pending Malaysian **MDA** classification; it is not marketed or built as a medical device.
- **NFR12 — Data retention & deletion.** Auto-expiry of sensitive items (FR22), full export (FR46), and deletion on request.

## 9. Assumptions & Open Questions

**Phase-blocking (resolve before/early in build):**
- **OQ-1 — Retention validation (Metric 0).** The model rests on connection retaining users without medical reassurance. **This is unvalidated** — run ~10 real elder conversations before heavy build. *Single largest open risk.*
- **OQ-2 — Regulatory classification.** Confirm the app (esp. prescription-reading and any pattern-flagging) stays outside medical-device classification under the Malaysian **MDA** framework; obtain local regulatory counsel. *Open action.*
- **OQ-3 — Authoritative pill-appearance data for Malaysia.** US NDC/RxImage does not apply. Identify a source (e.g. **NPRA Quest3+** product data / manufacturer data); imprint/appearance **coverage is an open risk** to the hero feature (FR7).

**Non-blocking (track, revisit):**
- **OQ-4** — Caregiver alert channel (web push + email leading vs adding SMS / a thin mobile push wrapper). Non-blocking: FR36 is itself deferred to Future Plans, so this resolves when that feature is built.
- **OQ-5** — Malay elderly **ASR/TTS quality** ceiling with Gemini; validate on real accented/quiet speech early (NFR1).
- **OQ-6** — Pharmacist manual-share (FR10) depends on a willing pharmacist; confirm this is realistic in the pilot community.
- **OQ-7** — Data-privacy handling of family relationships for users who may not fully grasp digital consent (NFR6/NFR7).

## 10. Risks (summary)

Detailed mitigations live in the product brief; the load-bearing ones:
- **Detrimental reliance** (deepest) → mitigated by DC-1/DC-2, hardcoded red-flag script, bridge-to-humans design.
- **Medication error** → authoritative pill data, confirmation gate, optional pharmacist share, "zero unflagged errors" bar.
- **Regulatory / device classification** → no-diagnosis posture (NFR11) + OQ-2.
- **Data privacy** → PDPA compliance, data ownership, coercion-safe design (NFR6/7).
- **ASR/OCR ceiling** → quality bar + confirm-don't-guess (NFR1/NFR9).
- **Unproven retention** → the validation gate (OQ-1) tests it cheaply first.

## 11. Future / Vision (out of v1)

### 11.1 Deferred FRs — earned, not abandoned (next after the 5-week core)
These are specified and ready; they were sequenced out of the core build to protect the spine, and are the natural first extensions once v1 proves out:
- **Trust & data controls (DC-6 made concrete):** FR43 anti-scam + safe-phrase, FR44 honest-about-AI surface, FR45 coercion-safe revoke, FR46 data export/deletion, FR4 + FR42 per-share consent tooling.
- **Caregiver depth:** FR35 digest/alert-fatigue engine, FR36 off-dashboard alert delivery (web push + email/SMS), FR37 voice-note relay, FR38 tiered-trust soft-suggestion config.
- **Safety escalation:** FR31 silence-based check-in, FR32 false-alarm-aware handling, FR33 elder-set escalation preferences (then, further out, auto-escalation to emergency services).
- **Hero & reminders depth:** FR12 translation with numeric/back-translation validation, FR10 pharmacist manual share, FR16 adaptive cadence, FR17 visual pill card.
- **Memory & logging depth:** FR22 "forget that" + auto-expiry, FR23 tap/non-verbal accessibility path (DC-5 built out), FR27 symptom-continuity surfacing.

### 11.2 Vision
Language coverage grows English+Malay → +Hindi → +Telugu, each earned by proven reliability. The doctor dashboard deepens toward clinical workflows; passive logging matures into ethically-gated signals (voice screening, sustained-low-mood) always surfaced to humans, never diagnostic; refill prediction, appointment companion, and dementia-adaptive mode extend the care. Further out: a care-network platform and a maturing B2B2C payer model. The through-line never changes — assume forgetting, refuse clinical judgement, earn trust before reach.
