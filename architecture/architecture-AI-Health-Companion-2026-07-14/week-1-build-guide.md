---
title: "Week 1 Build Guide — AI Health Companion (beginner-friendly, $0)"
status: draft
created: 2026-07-14
for: solo student dev, 5-week FYP; Week 1 = set up + prove the two risky things
---

# Week 1 — Set up your tools & prove the two scary parts

**Goal of Week 1 (in one sentence):** get your computer and phone ready, then *prove* the two things that could sink the whole project — (1) can the phone understand & speak **Malay**, and (2) can Gemini read a **real prescription photo**. Everything else in weeks 2–5 is normal app-building; these two are the unknowns, so we test them first while it's cheap to change course.

**Everything here is free.** You will not enter a credit card anywhere. If a website asks for payment, stop — you took a wrong turn.

**Rough time:** ~4–6 focused hours a day for 5 days. If a day takes longer, that's normal — setup always does.

---

## Part A — Your shopping list (do this before Day 1)

These are the free accounts and free software you'll need. Create/install all of them first so you're not interrupted later. Think of it as laying out ingredients before cooking.

### Accounts to create (all free, no card)
| # | Account | Where | What it's for (plain English) |
|---|---|---|---|
| 1 | **GitHub** | github.com | A safe online backup of your code. Also get the free **GitHub Student Developer Pack** at education.github.com/pack — free perks for students. |
| 2 | **Expo** | expo.dev | The service that turns your code into a phone app. |
| 3 | **Supabase** | supabase.com | Your "back end" — the database, user logins, and photo storage, all in one. |
| 4 | **Google AI Studio** | aistudio.google.com | Where you get your free **Gemini** key (the AI that reads prescriptions and chats). |

### Software to install on your computer (all free)
| # | Software | Where | What it does |
|---|---|---|---|
| 1 | **Node.js** (choose the "LTS" version) | nodejs.org | The engine that runs all the app-building tools. Install this first. |
| 2 | **VS Code** | code.visualstudio.com | The program you'll write and edit code in. |
| 3 | **Git** | git-scm.com | Saves versions of your code and connects to GitHub. |

### On your phone (a real Android phone)
| # | Thing | Where | What it's for |
|---|---|---|---|
| 1 | **Expo Go** app | Google Play Store | Lets you see your app running on your real phone instantly. |
| 2 | **Google Translate** app | Google Play Store | We'll use its microphone to test Malay speech recognition — no code needed. |
| 3 | Malay language for text-to-speech | Phone **Settings → Language & input → Text-to-speech** → make sure a Malay (Bahasa Melayu) voice is installed | So the phone can *speak* Malay. |

### Physical things to gather
- Your **Android phone** (for testing) and its **USB cable**.
- **2–3 real prescription photos** — messy, handwritten or printed, ideally the kind your users actually get. (Ask family/friends, or use ones you can find — for testing only.)
- The **actual pill boxes/strips** for a few medicines (you'll photograph these later as the "what the pill looks like" data).

> **Check before starting Day 1:** all 4 accounts created, all 3 programs installed, Expo Go + Google Translate on your phone. ✅

---

## Part B — The 5 days

Each day has: **Goal → Why → Steps → "You're done when…"**. Do them in order; each builds on the last.

---

### Day 1 — Make a blank app appear on your phone

**Goal:** prove your tools work by getting an empty starter app running on your real phone.

**Why:** before building anything clever, confirm the "computer → phone" pipeline works. This is the single most encouraging milestone — you'll *see your app*.

**Steps:**
1. Open VS Code. Open its built-in terminal: menu **Terminal → New Terminal**.
2. Check Node installed — type this and press Enter:
   ```
   node -v
   ```
   You should see a version number (like `v20.x`). If you see an error, Node didn't install — reinstall from nodejs.org.
3. Create the app (this downloads a starter project):
   ```
   npx create-expo-app@latest health-companion
   ```
   When it asks anything, just press Enter for defaults. Wait for it to finish.
4. Go into the new folder and start it:
   ```
   cd health-companion
   npx expo start
   ```
   A **QR code** appears in the terminal.
5. On your phone, open **Expo Go** and scan that QR code (your phone and computer must be on the **same Wi-Fi**).

**You're done when…** the starter app appears on your phone and shows some default text. That's it — your whole toolchain works. 🎉

---

### Day 2 — Prove Gemini can read a real prescription (no coding!)

**Goal:** upload a real prescription photo to Gemini and get back a clean list of medicines. This is your hero feature — test it *before* writing any app code.

**Why:** if Gemini can't read messy real scripts, the whole product changes. Find out now, on a website, for free.

**Steps (all on a website — zero code):**
1. Go to **aistudio.google.com** and sign in with Google.
2. Click to start a new prompt/chat.
3. **Upload** one of your real prescription photos.
4. Paste this instruction:
   ```
   Read this prescription photo. List each medication as JSON with these
   fields: name, dose, frequency, timing, and a confidence number from 0 to 1
   for how sure you are. If a field is unreadable, set it to null and lower the
   confidence. Do not guess.
   ```
5. Look at the answer. Does it correctly pull out the drug names, doses, and timing? Try your other 2 photos too.
6. **Get your free key for later:** in AI Studio, click **Get API key** → create one → copy it into a safe note. (You'll use this in Day 4. Never share it or put it on the internet.)

**You're done when…** Gemini gives you a sensible medication list from at least one real photo, *and* you've saved your API key somewhere safe.

> **If it struggles:** try clearer photos, or add "The prescription may be handwritten and in Malaysia" to the instruction. Note honestly how well it did — this tells you how much the human confirmation step (later) will need to catch.

---

### Day 3 — Prove the phone can understand & speak Malay (no coding!)

**Goal:** test both halves of voice — *listening* to Malay and *speaking* Malay — using apps already on the phone.

**Why:** on-device voice is what keeps this project free. But Malay quality for elderly/accented speech is unproven. This is the biggest technical risk — test it today.

**Steps:**
1. **Test LISTENING (speech → text):**
   - Open the **Google Translate** app, set the left language to **Malay**.
   - Tap the **microphone** and speak a few Malay sentences an elderly user might say (e.g. *"Saya sudah makan ubat pagi tadi"* — "I already took my morning medicine"). If you can, ask an older relative to say them in their natural accent.
   - Does the text come out right? Note how accurate it is.
2. **Test SPEAKING (text → voice):**
   - Phone **Settings → Language & input → Text-to-speech output**.
   - Set language to **Bahasa Melayu**, tap **Play / Listen to an example**.
   - Does it sound clear and natural enough for an elderly person to follow?

**You're done when…** you have an honest verdict on both: *listening good enough? speaking clear enough?*

> **This decides your voice plan:**
> - **Both good** → great, use the free on-device voice as planned.
> - **Listening weak** → you'll instead send the recorded audio to Gemini to transcribe (Plan B, still free). Note this now; it slightly changes Day 4.

---

### Day 4 — Wire the talking loop: speak → AI → hear a reply

**Goal:** a single screen with a button: you talk, it thinks (Gemini), it talks back. The heart of the product.

**Why:** this proves the full voice conversation works end to end, using your saved Gemini key.

**Steps (back in VS Code, in your `health-companion` folder):**
1. Add the "make the phone talk" tool:
   ```
   npx expo install expo-speech
   ```
2. Test just the speaking first. In your main screen file, make a button that runs:
   ```js
   import * as Speech from 'expo-speech';
   Speech.speak('Selamat pagi, sudah makan ubat?', { language: 'ms-MY' });
   ```
   Run `npx expo start`, open on your phone, tap the button — the phone should speak Malay.
3. Add recording + Gemini. For Week 1, the simplest reliable path is: **record your voice → send the audio to Gemini → Gemini replies with text → speak the text.** (This uses Gemini for both understanding and answering, so you don't fight with extra voice libraries yet.)
   - Record audio using Expo's audio module.
   - Send it to Gemini using your API key.
   - Speak Gemini's reply with `Speech.speak(...)`.

> **Important safety habit (start it now):** don't put your Gemini key directly in the app. For Week 1 testing it's okay to hardcode it *temporarily* just to see it work, but before you show anyone or put code on GitHub, move the key into a **Supabase Edge Function** (a tiny piece of server code) so it never ships to a phone. We'll set that up properly in Week 2; just know the key is a secret.

**You're done when…** you press a button, say something, and the phone speaks a Gemini reply back. Even if it's rough, the loop is alive.

---

### Day 5 — Build the database (copy-paste, no deep coding)

**Goal:** create your Supabase project and all your data tables in one go.

**Why:** this is the "spine" everything else plugs into. Doing it now means weeks 2–5 just read and write to it.

**Steps:**
1. Go to **supabase.com**, sign in, click **New Project**. Give it a name (e.g. `health-companion`), set a database password (save it), pick the nearest region (Singapore for Malaysia). Wait ~2 minutes for it to build.
2. In the left menu, open **SQL Editor** → **New query**.
3. **Paste the entire block from Part C below** and click **Run**. This creates all your tables at once.
4. Check the left menu **Table Editor** — you should see all the tables listed.
5. In **Project Settings → API**, copy your **Project URL** and **anon key** into your safe note (your app will use these later).

**You're done when…** all the tables appear in Supabase's Table Editor. Your back end exists. ✅

---

## Part C — The database setup (paste this into Supabase SQL Editor)

This creates all your tables and the safety rule that a reminder can never exist for an unconfirmed medicine.

```sql
-- ELDER: the care recipient — the hub everything links to
create table elder (
  id uuid primary key default gen_random_uuid(),
  name text,
  language text default 'en',          -- 'en' or 'ms'
  routine_json jsonb,                   -- e.g. {"wake":"07:00","breakfast":"08:00",...}
  persona text,
  last_interaction timestamptz,         -- powers the caregiver "she's okay" signal
  created_at timestamptz default now()
);

-- CAREGIVER & DOCTOR: linked to an elder
create table caregiver (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid references elder(id),
  auth_user uuid,                       -- links to a Supabase login
  name text
);
create table doctor (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid references elder(id),
  auth_user uuid,
  name text
);

-- PRESCRIPTION: the photo the caregiver uploads (the hero input)
create table prescription (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid references elder(id),
  photo_url text,
  raw_parse_json jsonb,                 -- Gemini's raw reading
  status text default 'pending',        -- pending | confirmed | rejected
  created_at timestamptz default now()
);

-- MEDICATION: each medicine parsed from a prescription
create table medication (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid references prescription(id),
  name text,
  dose text,
  frequency text,
  timing text,
  appearance text,                      -- colour/shape/size (human-confirmed)
  appearance_photo_url text,            -- caregiver's photo of the real pill
  confidence numeric,                   -- from Gemini; low = must be reviewed
  confirmed boolean default false       -- THE SAFETY GATE
);

-- REMINDER: only ever created for a CONFIRMED medication
create table reminder (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid references medication(id),
  anchor text,                          -- e.g. 'after breakfast'
  spoken_text text
);

-- INTAKE_EVENT: records "did she take it" (powers "did I take my pill?")
create table intake_event (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid references medication(id),
  taken boolean,
  at timestamptz default now()
);

-- MEMORY: facts she can ask about (appointments, doctor notes, chat summaries)
create table memory (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid references elder(id),
  type text,                            -- appointment | doctor-note | session-summary | fact
  content text,
  created_at timestamptz default now()
);

-- HEALTH_LOG: symptoms/mood picked up from conversation (no forms)
create table health_log (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid references elder(id),
  type text,                            -- symptom | mood
  content text,
  significant boolean default false,
  at timestamptz default now()
);

-- ALERT: red-flag phrases or "tell my family"
create table alert (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid references elder(id),
  trigger text,
  notified boolean default false,
  at timestamptz default now()
);

-- CONSENT: the elder's spoken agreement (kept simple for v1)
create table consent (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid references elder(id),
  scope text,
  granted_at timestamptz default now()
);

-- THE SAFETY GATE, enforced by the database itself:
-- a reminder cannot be created for a medicine that isn't confirmed.
create or replace function enforce_confirmed_before_reminder()
returns trigger as $$
begin
  if (select confirmed from medication where id = new.medication_id) is not true then
    raise exception 'Cannot create a reminder for an unconfirmed medication';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger reminder_requires_confirmed
before insert on reminder
for each row execute function enforce_confirmed_before_reminder();
```

You don't need to understand every line. The key idea: the last part means **even a buggy app can never schedule a pill reminder that a human hasn't confirmed** — that's your safety story, built into the foundation.

---

## Part D — If something goes wrong (common beginner snags)

| Problem | Likely cause | Fix |
|---|---|---|
| `node -v` gives an error | Node.js not installed / terminal not restarted | Reinstall Node (LTS), close and reopen VS Code |
| App won't load in Expo Go | Phone and computer on different Wi-Fi | Put both on the same network; or in the terminal press `s` then try "tunnel" mode |
| QR code won't scan | Camera/permissions | In Expo Go, use "Enter URL manually" with the link shown in the terminal |
| Phone won't speak Malay | Malay TTS voice not installed | Settings → Text-to-speech → install Bahasa Melayu voice data |
| Malay speech recognition is poor | On-device model weak for accents | Switch to Plan B: send recorded audio to Gemini to transcribe (still free) |
| Gemini reads prescriptions badly | Blurry photo / hard handwriting | Better lighting/photos; remember the human confirmation step is designed to catch this |
| "Where do I put my Gemini key?" | — | Temporarily in code for Week-1 testing only; move to a Supabase Edge Function before sharing code |

---

## Part E — End-of-Week-1 checklist

By Friday you should have:
- [ ] All accounts + software installed (Part A)
- [ ] A blank app running on your real phone (Day 1)
- [ ] An honest verdict: **can Gemini read your real prescriptions?** (Day 2)
- [ ] An honest verdict: **is Malay listening & speaking good enough on the phone?** (Day 3)
- [ ] A working "talk → AI → reply" loop, even if rough (Day 4)
- [ ] Your Supabase database with all tables created (Day 5)
- [ ] Your secrets saved safely: Gemini key, Supabase URL + anon key

**The two verdicts (Gemini reading + Malay voice) are the real deliverable.** If both look good, Week 2 (building the real prescription→schedule feature) is on solid ground. If either is weak, you now know early and can adjust — which is exactly what Week 1 is for.

---

*Next: Week 2 will turn Day 2's prescription-reading test into the real feature — photo upload, the caregiver confirmation screen, and the safety gate — all saving into the database you built on Day 5.*
