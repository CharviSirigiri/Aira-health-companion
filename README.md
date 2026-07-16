# AIRA 🚀

**AIRA** (AI Health Companion) is a voice-first health companion designed for older adults (such as Susan, 70) with complex medication regimens who face language, visual, or typing barriers. 

AIRA ensures medication safety and clinical review through a unified client-BaaS architecture using Expo and a mock Supabase layer.

---

## 🌟 Key Features

1. **Voice-First Elder Interface (AIRA)**
   * Warm, patient, judgment-free voice companion (**AIRA**) speaking in English (default) or Malay.
   * Large-button medication confirmation (Intake Gate).
   * Spoken, routine-anchored medication reminders detailing physical pill appearance.
   * Direct voice querying of past clinical instructions and scheduled appointments.
   * Passive symptom extraction logged automatically from regular conversation.
   * Deterministic safety checks triggering distress alerts for red-flag symptoms.

2. **Caregiver Dashboard**
   * Real-time "She's Okay" presence validation.
   * OCR prescription photo scanning powered by Gemini with low-confidence warning indicators.
   * **The Confirmation Gate:** The definitive safety constraint preventing scheduled reminders from activating until the caregiver confirms the OCR readings and enters the authoritative pill physical appearance.
   * Onboarding routine timeline configurations.

3. **Doctor Portal**
   * Medication adherence rate calculations.
   * Delta timelines summarizing passive symptom logs.
   * Direct note writing and clinic appointment scheduling into Susan's AI memory.

---

## 🛠️ Setup & Running

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Add Gemini API Key (Optional)**
   The application runs in a robust **Simulation Mode** by default. To connect to the real Google Gemini model for live OCR and speech dialogs, export your Gemini API key in the shell:
   ```bash
   # On Windows PowerShell
   $env:EXPO_PUBLIC_GEMINI_API_KEY="your-gemini-api-key"
   ```

3. **Start the app**
   ```bash
   npx expo start
   ```

4. **Run on Web**
   Press **`w`** in the terminal to launch the web dashboard views. Use the floating **Role Switcher** in the bottom-right corner to toggle between the **Elder Screen**, **Caregiver Dashboard**, and **Doctor Portal** instantly.
