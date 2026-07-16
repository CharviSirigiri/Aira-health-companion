---
title: "Day 1 — Full To-Do Checklist (Windows 11, beginner-friendly)"
status: draft
created: 2026-07-14
goal: Install every tool, create every free account, and see a blank app run on your real phone.
---

# Day 1 — Complete To-Do List

**Today's finish line:** a blank starter app is running on your real Android phone, and all your free accounts + tools are ready.
**Time:** about 3–5 hours (mostly downloads and installs — go at your own pace).
**Cost:** $0. No card needed anywhere. If any site asks for payment, stop — wrong page.

> **Keep a "secrets" note open** (Notepad or your phone's notes). Every time you make an account, jot the email + password there. You'll thank yourself later.

---

## PHASE 0 — Before you touch anything (5 min)

- [ ] You're on your **Windows 11 PC**.
- [ ] Your **Android phone** is charged and nearby, with its **Wi-Fi ON**.
- [ ] Your PC and phone are on the **same Wi-Fi network** (very important later).
- [ ] Open a blank **Notepad** file and title it "Project Secrets" — for saving logins.

---

## PHASE 1 — Install Node.js (15 min)

*Node.js is the engine that runs all the app-building tools. Install it first — other things depend on it.*

- [ ] Go to **https://nodejs.org**
- [ ] Click the big button that says **"LTS"** (Long Term Support — the stable one). Do NOT pick "Current".
- [ ] Open the downloaded file (`node-vXX-x64.msi`) from your Downloads folder.
- [ ] Click **Next** through the installer. Keep all default choices. Accept the licence. Click **Install**. (If Windows asks "Do you want to allow this app to make changes?" click **Yes**.)
- [ ] If it shows a checkbox like "Automatically install the necessary tools" — you can **leave it unchecked** (you don't need it).
- [ ] Click **Finish**.
- [ ] **Verify it worked:** press the **Windows key**, type `powershell`, open **Windows PowerShell**. In the blue window type:
  ```
  node -v
  ```
  Press Enter. You should see a version like `v20.x.x` or `v22.x.x`.
- [ ] Also type:
  ```
  npm -v
  ```
  You should see another version number (like `10.x.x`).

✅ **Phase 1 done when** both commands show version numbers (not errors).

> If you get "node is not recognized": close PowerShell, reopen it (it needs to reload), and try again. Still failing? Restart the PC and retry.

---

## PHASE 2 — Install VS Code (10 min)

*VS Code is where you'll write and run your code.*

- [ ] Go to **https://code.visualstudio.com**
- [ ] Click **Download for Windows**.
- [ ] Open the downloaded file (`VSCodeUserSetup-...exe`).
- [ ] Accept the agreement → **Next**.
- [ ] On the "Select Additional Tasks" screen, **tick "Add to PATH"** (usually already ticked) and tick **"Add 'Open with Code' action"** (handy). Then **Next → Install → Finish**.
- [ ] Open **VS Code** once to confirm it launches.

✅ **Phase 2 done when** VS Code opens.

---

## PHASE 3 — Install Git (10 min)

*Git saves versions of your code and connects it to GitHub (your online backup).*

- [ ] Go to **https://git-scm.com/download/win**
- [ ] It should auto-download the 64-bit installer. Open it.
- [ ] Click **Next** through the screens — **the defaults are fine for everything**. (There are many screens; just keep clicking Next.)
- [ ] Click **Install → Finish**.
- [ ] **Verify:** open a **new** PowerShell window and type:
  ```
  git --version
  ```
  You should see something like `git version 2.xx`.
- [ ] Tell Git who you are (use your real name + the email you'll use for GitHub):
  ```
  git config --global user.name "Your Name"
  git config --global user.email "you@example.com"
  ```

✅ **Phase 3 done when** `git --version` shows a number.

---

## PHASE 4 — Create your free accounts (30 min)

*Make all four now. Save each login in your "Project Secrets" note.*

### 4a. GitHub (your code backup)
- [ ] Go to **https://github.com** → **Sign up**.
- [ ] Use your student email if you have one (helps with the next step).
- [ ] Verify your email (check inbox, click the link).
- [ ] **Optional but worth it:** apply for the **GitHub Student Developer Pack** at **https://education.github.com/pack** — free tools and credits for students. (Approval can take a day or two, so start it now and move on.)

### 4b. Expo (turns your code into a phone app)
- [ ] Go to **https://expo.dev** → **Sign up**.
- [ ] Verify email. Save the login.

### 4c. Supabase (your database + logins + storage)
- [ ] Go to **https://supabase.com** → **Start your project** / **Sign in**.
- [ ] Easiest: **"Continue with GitHub"** (uses the account you just made).
- [ ] You do NOT need to create a project today — that's Day 5. Just having the account is enough.

### 4d. Google AI Studio (your free Gemini AI)
- [ ] Go to **https://aistudio.google.com**
- [ ] **Sign in with your Google account**. Accept the terms.
- [ ] You do NOT need the API key today — that's Day 2. Just confirm you can log in.

✅ **Phase 4 done when** all four accounts are created and saved in your note.

---

## PHASE 5 — Set up your phone (15 min)

- [ ] On your Android phone, open the **Google Play Store**.
- [ ] Search **"Expo Go"** → **Install**.
- [ ] Search **"Google Translate"** → **Install** (you'll use it on Day 3).
- [ ] **Add the Malay speaking voice:** go to phone **Settings** → search **"Text-to-speech"** (or Settings → System → Languages & input → Text-to-speech output) → tap the gear/settings → **Install voice data** → find **Bahasa Melayu** → download it.
- [ ] Double-check your phone is on the **same Wi-Fi** as your PC.

✅ **Phase 5 done when** Expo Go + Google Translate are installed and a Malay TTS voice is downloaded.

---

## PHASE 6 — Create your app project (20 min)

- [ ] Open **PowerShell** (Windows key → type `powershell` → Enter).
- [ ] Move to your Desktop so the project is easy to find:
  ```
  cd $HOME\Desktop
  ```
- [ ] Create the app (this downloads a ready-made starter — it may take a few minutes):
  ```
  npx create-expo-app@latest health-companion
  ```
  - If it asks "Ok to proceed? (y)" type **y** and Enter.
  - Wait until it says it's finished.
- [ ] Open the new project folder in VS Code:
  ```
  cd health-companion
  code .
  ```
  (`code .` opens the current folder in VS Code. If that command isn't found, just open VS Code → **File → Open Folder** → pick the `health-companion` folder on your Desktop.)

✅ **Phase 6 done when** the `health-companion` folder is open in VS Code and you can see its files on the left.

---

## PHASE 7 — Run the app on your phone (15 min)

- [ ] In VS Code, open the built-in terminal: menu **Terminal → New Terminal**.
- [ ] Start the app:
  ```
  npx expo start
  ```
- [ ] **If Windows pops up a Firewall warning**, tick **"Private networks"** and click **"Allow access"**. (This lets your phone reach the app.)
- [ ] A **QR code** appears in the terminal.
- [ ] On your phone, open the **Expo Go** app → tap **"Scan QR code"** → point it at the QR code on your screen.
- [ ] Wait — it will bundle and then load your app on the phone (first time is slowest).

✅ **Phase 7 done when** the starter app appears on your phone showing its default screen. **This is the big Day 1 win. 🎉**

> **If it won't connect:**
> - Make sure phone + PC are on the **same Wi-Fi**.
> - In the terminal, press the **`s`** key to switch modes, or stop it (`Ctrl+C`) and run `npx expo start --tunnel` (slower but works across tricky networks).
> - In Expo Go you can also tap **"Enter URL manually"** and type the `exp://...` address shown in your terminal.

---

## PHASE 8 — Save your work to GitHub (optional, 15 min)

*Good habit: back up your code online. Skip if you're tired — but do it before Day 4.*

- [ ] In the VS Code terminal (make sure you're in the `health-companion` folder), run:
  ```
  git add .
  git commit -m "Day 1: starter app running"
  ```
  (create-expo-app usually already set up Git; if `git commit` complains there's nothing set up, run `git init` first, then the two commands above.)
- [ ] On **github.com**, click **New repository** (green button) → name it `health-companion` → keep it **Private** → **Create repository**.
- [ ] GitHub shows you commands under **"…or push an existing repository"**. Copy the two lines that look like:
  ```
  git remote add origin https://github.com/YOURNAME/health-companion.git
  git branch -M main
  git push -u origin main
  ```
  Paste them into your VS Code terminal and run. Sign in to GitHub if a window pops up.

✅ **Phase 8 done when** your code shows up on your GitHub repository page.

> Prefer clicking over typing? Install **GitHub Desktop** (desktop.github.com) — it does the same thing with buttons.

---

## PHASE 9 — End-of-Day-1 check ✅

Tick these off — if all are true, Day 1 is complete:
- [ ] `node -v`, `npm -v`, and `git --version` all show version numbers
- [ ] VS Code installed and can open your project
- [ ] All 4 accounts created & saved: GitHub, Expo, Supabase, Google AI Studio
- [ ] Phone has Expo Go + Google Translate + a Malay voice installed
- [ ] The starter app **runs on your real phone**
- [ ] (Optional) Code backed up to GitHub

**Nothing you built today is "the product" yet — today was about proving your tools work end-to-end.** Tomorrow (Day 2) is the exciting one: testing whether Gemini can read a real prescription, using just a website. 🚀

---

## Quick reference — commands you used today
| Command | What it does |
|---|---|
| `node -v` / `npm -v` | Check Node installed |
| `git --version` | Check Git installed |
| `cd $HOME\Desktop` | Go to your Desktop folder |
| `npx create-expo-app@latest health-companion` | Make the starter app |
| `cd health-companion` | Go into the project folder |
| `code .` | Open the folder in VS Code |
| `npx expo start` | Run the app (shows the QR code) |
| `Ctrl + C` | Stop the running app in the terminal |
