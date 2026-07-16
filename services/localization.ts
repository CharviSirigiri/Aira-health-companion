import React, { createContext, useContext, useState, useEffect } from 'react';
import { getElder, updateElder } from './database';

export type Language = 'en' | 'ms';

const translations = {
  en: {
    appName: 'AIRA',
    langToggle: 'English',
    langToggleMs: 'Bahasa Melayu',
    langToggleEn: 'English',
    close: 'Close',
    loading: 'Loading...',
    home: 'Home',
    explore: 'Explore',

    // Elder App Screen
    elderGreeting: 'Good morning Susan. I am AIRA, your AI health companion. How can I help you today?',
    elderTextPlaceholder: 'Type here if you need a typed fallback...',
    elderCompanionLabel: 'Susan\'s AI Companion (AIRA)',
    elderThinking: 'AIRA is thinking...',
    elderTodayConversation: 'Today\'s Conversation',
    elderSpeakNow: 'Speak now...',
    elderListening: 'Listening (English)...',
    elderMicTapToSend: 'Tap again to send',
    elderMicPressToSpeak: 'Tap to record your voice',
    elderReminderTitle: 'Medication Reminder!',
    elderReminderButton: 'I Have Taken It',
    elderGreetingConnectionError: 'Sorry, I encountered a connection issue. Please try again.',
    elderIntakeSuccess: 'Excellent Susan! I have recorded that you took your medicine. Your daughter will be notified.',

    // Caregiver Dashboard
    caregiverPortal: 'Caregiver Portal',
    caregiverHeaderSub: 'Managing Care for: Susan',
    caregiverSafetyPresence: 'Susan\'s Safety Presence',
    caregiverSusanActive: 'Susan is Active',
    caregiverLastActive: 'Last active',
    caregiverActiveAlerts: 'ACTIVE SECURITY ALERTS',
    caregiverMarkResolved: 'Mark Resolved',
    caregiverNoAlerts: 'No active security warnings.',
    caregiverNewPrescription: 'New Prescription Upload',
    caregiverPrescriptionInst: 'Scan a new paper prescription to automatically extract drug details, verify accuracy, and schedule reminders.',
    caregiverChooseImage: 'Choose Image',
    caregiverSimulateRx: 'Simulate Sample Rx',
    caregiverGeminiParsing: 'Gemini reading prescription details...',
    caregiverVerifyTitle: 'Prescription Readings to Verify',
    caregiverVerifySub: 'Verify details below and input the pill appearance. Note confidence flags.',
    caregiverLowConfidence: 'Low Confidence',
    caregiverDose: 'Dose',
    caregiverFrequency: 'Frequency',
    caregiverTiming: 'Timing',
    caregiverAppearanceLabel: 'Authoritative Pill Appearance:',
    caregiverAppearancePlaceholder: 'e.g. Oval blue capsule / Biji bulat kuning kecil',
    caregiverVerifyBtn: 'Verify & Live Schedule',
    caregiverRejectBtn: 'Reject',
    caregiverSusanRoutine: 'Susan\'s Daily Routine',
    caregiverRoutineInst: 'Configure standard routine timings. Spoken reminders are anchored to these events.',
    caregiverSaveRoutine: 'Save Routine Times',
    caregiverPassiveLogs: 'Passive Health Logs',
    caregiverPassiveInst: 'Symptoms and moods passively identified in Susan\'s conversations (No forms filled by Susan).',
    caregiverSignificant: 'Significant Symptom',
    caregiverNoLogs: 'No symptoms or logs recorded recently.',
    caregiverScheduledMeds: 'Currently Scheduled Medications',
    caregiverAppearance: 'Appearance',
    caregiverNoMeds: 'No confirmed medications live yet.',
    caregiverErrNoAppearance: 'Please input the pill physical appearance before confirming!',
    caregiverSuccessVerified: 'Medication verified and scheduled! Reminders are now live.',
    caregiverSuccessRejected: 'Medication rejected.',
    caregiverSuccessRoutine: 'Routine updated successfully!',
    caregiverRoutineWake: 'Wake Time',
    caregiverRoutineBreakfast: 'Breakfast',
    caregiverRoutineLunch: 'Lunch',
    caregiverRoutineTea: 'Tea Time',
    caregiverRoutineDinner: 'Dinner',
    caregiverRoutineSleep: 'Sleep Time',

    // Doctor Portal
    doctorWatermark: 'PATIENT-REPORTED LOGS — NOT CLINICAL ADVICE',
    doctorClinicalReview: 'Clinical Patient Review',
    doctorHeaderSub: 'Patient: Susan (70 yrs) | Target Pilot: Malaysia',
    doctorAdherenceSummary: 'Medication Adherence Summary',
    doctorAdherence: 'Adherence',
    doctorTotalLogs: 'Total Logs Tracked',
    doctorTotalLogsSuffix: 'entries',
    doctorSuccessfulIntakes: 'Successful Intakes',
    doctorSuccessfulIntakesSuffix: 'doses',
    doctorSinceLastVisit: 'Since Last Visit Timeline',
    doctor7DayDelta: '7-day delta',
    doctorSinceLastVisitInst: 'Passive symptom logs extracted from Susan\'s speech logs. Review patient wellness trends in 30 seconds.',
    doctorNoSymptoms: 'No symptoms reported in last 7 days.',
    doctorWriteNoteTitle: 'Write Note for Susan\'s AI Memory',
    doctorWriteNoteInst: 'Add critical instructions Susan can query directly via her voice companion (e.g. "What did the doctor say?").',
    doctorNotePlaceholder: 'e.g. Reduce white rice, take diabetes meds every morning after eating.',
    doctorAddNoteBtn: 'Add Note to Memory',
    doctorAddNoteSuccess: 'Doctor note added to Susan\'s companion memory successfully!',
    doctorScheduleApptTitle: 'Schedule Next Clinic Appointment',
    doctorScheduleApptInst: 'Set the next appointment date. Susan can ask "When is my next appointment?" to hear it.',
    doctorApptPlaceholder: 'e.g. Next Thursday at 10:00 AM at the Health Clinic',
    doctorScheduleApptBtn: 'Schedule Appointment',
    doctorScheduleApptSuccess: 'Appointment added to Susan\'s companion memory successfully!',
    doctorActiveMemories: 'Active Companion Memory Records',
    doctorNoMemories: 'No memories recorded yet.',

    // Role Switcher
    switchTitle: 'Switch Dashboard View',
    switchSub: 'Test the full relational pipeline on a single device:',
    roleElderTitle: 'Elder App (Susan)',
    roleElderDesc: 'Voice-led, big buttons. Susan listens, speaks, & confirms intakes.',
    roleCaregiverTitle: 'Caregiver Dashboard',
    roleCaregiverDesc: 'Upload Rx photos, verify OCR readings, add appearance, and set routines.',
    roleDoctorTitle: 'Doctor Portal',
    roleDoctorDesc: 'Read-only summary of Susan\'s adherence, symptoms timeline, & clinical notes.',

    // Help & Features Screen
    helpTitle: 'Help & Features',
    helpHeading: 'Learn how to use AIRA',
    helpBody: 'AIRA is a voice-first health companion that assists Susan in managing medications, routines, and doctor appointments.',
    helpVoiceCommandsTitle: 'Voice Commands to Try',
    helpVoiceCmd1: 'Did I take my Metformin today?',
    helpVoiceCmd2: 'What did the doctor say?',
    helpVoiceCmd3: 'When is my next appointment?',
    helpSystemNotesTitle: 'System Safety Locks',
    helpLock1Title: 'No Diagnosis Triage',
    helpLock1Desc: 'AIRA never diagnoses or provides clinical advice. Triage remains fully human-led.',
    helpLock2Title: 'Confirmation Gate',
    helpLock2Desc: 'Pill appearance must be verified by a caregiver before reminders go live.',
  },
  ms: {
    appName: 'AIRA',
    langToggle: 'Bahasa Melayu',
    langToggleMs: 'Bahasa Melayu',
    langToggleEn: 'English',
    close: 'Tutup',
    loading: 'Memuatkan...',
    home: 'Laman Utama',
    explore: 'Teroka',

    // Elder App Screen
    elderGreeting: 'Selamat pagi Susan. Saya AIRA, teman kesihatan AI anda. Ada apa-apa yang anda ingin tanyakan hari ini?',
    elderTextPlaceholder: 'Tulis di sini untuk bercakap...',
    elderCompanionLabel: 'Peneman AI Susan (AIRA)',
    elderThinking: 'AIRA sedang berfikir...',
    elderTodayConversation: 'Perbualan Hari Ini',
    elderSpeakNow: 'Sila bercakap sekarang...',
    elderListening: 'Mendengar (Melayu)...',
    elderMicTapToSend: 'Sentuh lagi untuk hantar',
    elderMicPressToSpeak: 'Sentuh untuk rakam suara anda',
    elderReminderTitle: 'Peringatan Ubat Semasa!',
    elderReminderButton: 'Saya Sudah Makan Ubat',
    elderGreetingConnectionError: 'Maaf, saya menghadapi masalah menyambung talian. Sila cuba lagi.',
    elderIntakeSuccess: 'Bagus Susan! Saya telah rekodkan bahawa anda telah mengambil ubat anda. Anak anda juga akan dimaklumkan.',

    // Caregiver Dashboard
    caregiverPortal: 'Portal Penjaga',
    caregiverHeaderSub: 'Mengurus Penjagaan untuk: Susan',
    caregiverSafetyPresence: 'Kehadiran Keselamatan Susan',
    caregiverSusanActive: 'Susan Aktif',
    caregiverLastActive: 'Terakhir aktif',
    caregiverActiveAlerts: 'AMARAN KESELAMATAN AKTIF',
    caregiverMarkResolved: 'Tandakan Selesai',
    caregiverNoAlerts: 'Tiada amaran keselamatan aktif.',
    caregiverNewPrescription: 'Muat Naik Preskripsi Baru',
    caregiverPrescriptionInst: 'Imbas preskripsi kertas baru untuk mengekstrak butiran ubat secara automatik, mengesahkan ketepatan, dan menjadualkan peringatan.',
    caregiverChooseImage: 'Pilih Gambar',
    caregiverSimulateRx: 'Simulasi Sampel Rx',
    caregiverGeminiParsing: 'Gemini sedang membaca butiran preskripsi...',
    caregiverVerifyTitle: 'Peti Bacaan Preskripsi untuk Disahkan',
    caregiverVerifySub: 'Sahkan butiran di bawah dan masukkan rupa bentuk ubat. Ambil perhatian pada penunjuk tahap keyakinan.',
    caregiverLowConfidence: 'Keyakinan Rendah',
    caregiverDose: 'Dos',
    caregiverFrequency: 'Kekerapan',
    caregiverTiming: 'Masa',
    caregiverAppearanceLabel: 'Rupa Bentuk Ubat yang Sah:',
    caregiverAppearancePlaceholder: 'cth. Kapsul biru bujur / Biji bulat kuning kecil',
    caregiverVerifyBtn: 'Sahkan & Jadualkan',
    caregiverRejectBtn: 'Tolak',
    caregiverSusanRoutine: 'Rutin Harian Susan',
    caregiverRoutineInst: 'Konfigurasikan masa rutin standard. Peringatan suara akan disandarkan pada waktu ini.',
    caregiverSaveRoutine: 'Simpan Waktu Rutin',
    caregiverPassiveLogs: 'Log Kesihatan Pasif',
    caregiverPassiveInst: 'Simptom dan emosi yang dikenal pasti secara pasif daripada perbualan Susan (Tiada borang diisi oleh Susan).',
    caregiverSignificant: 'Simptom Penting',
    caregiverNoLogs: 'Tiada simptom atau log direkodkan baru-baru ini.',
    caregiverScheduledMeds: 'Ubat-ubatan yang Dijadualkan Sekarang',
    caregiverAppearance: 'Rupa',
    caregiverNoMeds: 'Tiada ubat yang disahkan aktif lagi.',
    caregiverErrNoAppearance: 'Sila masukkan rupa bentuk fizikal ubat sebelum mengesahkan!',
    caregiverSuccessVerified: 'Ubat telah disahkan dan dijadualkan! Peringatan kini aktif.',
    caregiverSuccessRejected: 'Ubat ditolak.',
    caregiverSuccessRoutine: 'Rutin berjaya dikemas kini!',
    caregiverRoutineWake: 'Waktu Bangun',
    caregiverRoutineBreakfast: 'Sarapan',
    caregiverRoutineLunch: 'Makan Tengahari',
    caregiverRoutineTea: 'Minum Petang',
    caregiverRoutineDinner: 'Makan Malam',
    caregiverRoutineSleep: 'Waktu Tidur',

    // Doctor Portal
    doctorWatermark: 'LOG LAPORAN PESAKIT — BUKAN NASIHAT KLINIKAL',
    doctorClinicalReview: 'Semakan Klinikal Pesakit',
    doctorHeaderSub: 'Pesakit: Susan (70 thn) | Rintis Sasaran: Malaysia',
    doctorAdherenceSummary: 'Ringkasan Pematuhan Ubat',
    doctorAdherence: 'Pematuhan',
    doctorTotalLogs: 'Jumlah Log Dikesan',
    doctorTotalLogsSuffix: 'rekod',
    doctorSuccessfulIntakes: 'Pengambilan Berjaya',
    doctorSuccessfulIntakesSuffix: 'dos',
    doctorSinceLastVisit: 'Garis Masa Sejak Lawatan Terakhir',
    doctor7DayDelta: 'Perbezaan 7 hari',
    doctorSinceLastVisitInst: 'Log simptom pasif yang diekstrak daripada rekod suara Susan. Semak trend kesihatan pesakit dalam 30 saat.',
    doctorNoSymptoms: 'Tiada simptom dilaporkan dalam tempoh 7 hari yang lalu.',
    doctorWriteNoteTitle: 'Tulis Nota untuk Memori AI Susan',
    doctorWriteNoteInst: 'Tambah arahan penting yang boleh ditanya oleh Susan terus melalui teman suaranya (cth. "Apa kata doktor?").',
    doctorNotePlaceholder: 'cth. Kurangkan makan nasi lemak, ambil ubat kencing manis setiap pagi lepas makan sahaja.',
    doctorAddNoteBtn: 'Tambah Nota ke Memori',
    doctorAddNoteSuccess: 'Nota doktor berjaya ditambah ke memori teman Susan!',
    doctorScheduleApptTitle: 'Jadualkan Temujanji Klinik Seterusnya',
    doctorScheduleApptInst: 'Tetapkan tarikh temujanji seterusnya. Susan boleh bertanya "Bilakah temujanji saya yang seterusnya?" untuk mendengarnya.',
    doctorApptPlaceholder: 'cth. Hari Khamis depan jam 10:00 pagi di Klinik Kesihatan',
    doctorScheduleApptBtn: 'Jadualkan Temujanji',
    doctorScheduleApptSuccess: 'Temujanji berjaya ditambah ke memori teman Susan!',
    doctorActiveMemories: 'Rekod Memori Teman Aktif',
    doctorNoMemories: 'Tiada memori direkodkan lagi.',

    // Role Switcher
    switchTitle: 'Tukar Pandangan Papan Pemuka',
    switchSub: 'Uji keseluruhan saluran hubungan pada satu peranti:',
    roleElderTitle: 'Aplikasi Susan (AIRA)',
    roleElderDesc: 'Berasaskan suara, butang besar. Susan mendengar, bercakap, & mengesahkan pengambilan.',
    roleCaregiverTitle: 'Papan Pemuka Penjaga',
    roleCaregiverDesc: 'Muat naik foto Rx, sahkan bacaan OCR, tambah rupa bentuk ubat, dan tetapkan rutin.',
    roleDoctorTitle: 'Portal Doktor',
    roleDoctorDesc: 'Ringkasan baca-sahaja pematuhan Susan, garis masa simptom, & nota klinikal.',

    // Help & Features Screen
    helpTitle: 'Bantuan & Ciri-ciri',
    helpHeading: 'Ketahui cara menggunakan AIRA',
    helpBody: 'AIRA ialah teman kesihatan berasaskan suara yang membantu Susan menguruskan ubat-ubatan, rutin harian, dan temujanji doktor.',
    helpVoiceCommandsTitle: 'Arahan Suara untuk Dicuba',
    helpVoiceCmd1: 'Adakah saya sudah makan ubat Metformin hari ini?',
    helpVoiceCmd2: 'Apa pesanan doktor?',
    helpVoiceCmd3: 'Bilakah temujanji saya yang seterusnya?',
    helpSystemNotesTitle: 'Kunci Keselamatan Sistem',
    helpLock1Title: 'Tiada Diagnosis',
    helpLock1Desc: 'AIRA tidak pernah membuat diagnosis atau memberikan nasihat klinikal. Diagnosis kekal dipandu sepenuhnya oleh manusia.',
    helpLock2Title: 'Pintu Pengesahan',
    helpLock2Desc: 'Rupa bentuk ubat mesti disahkan oleh penjaga sebelum peringatan mula diaktifkan.',
  }
};

export type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  language: Language;
  t: (key: TranslationKey) => string;
  changeLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  // Load language settings from DB on mount
  useEffect(() => {
    async function loadLang() {
      try {
        const elder = await getElder('elder-susan');
        if (elder && (elder.language === 'en' || elder.language === 'ms')) {
          setLanguageState(elder.language);
        } else {
          // Default is English as requested
          setLanguageState('en');
        }
      } catch (e) {
        console.error('Error loading language from DB:', e);
        setLanguageState('en');
      }
    }
    loadLang();
  }, []);

  const changeLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    try {
      const elder = await getElder('elder-susan');
      if (elder) {
        elder.language = newLang;
        await updateElder(elder);
      }
    } catch (e) {
      console.error('Error updating language in DB:', e);
    }
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || String(key);
  };

  return React.createElement(
    LanguageContext.Provider,
    { value: { language, t, changeLanguage } },
    children
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};


