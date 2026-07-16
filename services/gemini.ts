import { Medication, Memory, HealthLog } from './database';

const GEMINI_OCR_MODEL_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Helper to get API key from environment
function getGeminiApiKey(): string | null {
  // Check if standard expo environment variable exists
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
      return process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    }
  }
  return null;
}

/**
 * Rx Parse: Reads a prescription image (base64) and parses it into structured JSON.
 * Respects AD-6: schema-validated JSON with confidence scores.
 * Respects AD-4: does NOT populate appearance, only name, dose, frequency, timing.
 */
export async function parsePrescription(imageBase64: string): Promise<{
  medications: Omit<Medication, 'id' | 'confirmed' | 'prescription_id' | 'appearance'>[];
}> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    console.log('No Gemini API key found, running in SIMULATION mode.');
    // Simulated prescription reading response
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate latency
    return {
      medications: [
        {
          name: 'Amlodipine',
          dose: '5mg',
          frequency: 'Sekali sehari (Once daily)',
          timing: 'Malam (Dinner/Bedtime)',
          confidence: 0.95,
        },
        {
          name: 'Metformin',
          dose: '500mg',
          frequency: 'Dua kali sehari (Twice daily)',
          timing: 'Selepas sarapan & makan malam (After breakfast & dinner)',
          confidence: 0.88,
        },
        {
          name: 'Paracetamol (Low Confidence Sample)',
          dose: '500mg (Sila sahkan)',
          frequency: 'Bila perlu (As needed)',
          timing: 'Setiap 4-6 jam',
          confidence: 0.45, // Low confidence flags for caregiver review
        }
      ]
    };
  }

  try {
    const prompt = `Read this prescription photo. List each medication as JSON with these exact fields: name, dose, frequency, timing, and a confidence number from 0 to 1 for how sure you are. If a field is unreadable, set it to null and lower the confidence. Do not guess. Respond with only JSON.`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            medications: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  dose: { type: 'STRING' },
                  frequency: { type: 'STRING' },
                  timing: { type: 'STRING' },
                  confidence: { type: 'NUMBER' },
                },
                required: ['name', 'dose', 'frequency', 'timing', 'confidence'],
              },
            },
          },
          required: ['medications'],
        },
      },
    };

    const response = await fetch(`${GEMINI_OCR_MODEL_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error('Empty response from Gemini');

    return JSON.parse(textResponse);
  } catch (error) {
    console.error('Failed to parse prescription via Gemini, returning simulation fallback:', error);
    throw error;
  }
}

/**
 * Voice transcription: record the user's spoken message and turn it into text.
 * This is the audio input side of the voice loop.
 */
export async function transcribeVoiceMessage(
  audioBase64: string,
  mimeType: string,
  language: 'en' | 'ms' = 'en'
): Promise<{
  transcript: string;
}> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    console.log(`No Gemini API key found, running voice transcription in ${language.toUpperCase()} SIMULATION mode.`);
    await new Promise(resolve => setTimeout(resolve, 1200));
    return {
      transcript: language === 'ms'
        ? 'Saya mahu tanya tentang ubat saya'
        : 'I want to ask about my medicine',
    };
  }

  const prompt = language === 'ms'
    ? 'Transkripsikan rakaman suara ini dengan tepat. Pulangkan hanya JSON dengan medan transcript. Kekalkan bahasa asal pengguna. Jangan jawab soalan pengguna.'
    : 'Transcribe this voice recording faithfully. Return only JSON with a transcript field. Keep the original language. Do not answer the user yet.';

  const response = await fetch(`${GEMINI_OCR_MODEL_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            transcript: { type: 'STRING' },
          },
          required: ['transcript'],
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) throw new Error('Empty transcription response from Gemini');

  return JSON.parse(textResponse);
}

/**
 * Converse (AD-9): Warm, elderly-friendly conversational AI companion.
 * Integrates external memories (AD-10) for context.
 * Performs keyword distress filtering BEFORE calling AI (AD-9).
 */
export async function generateCompanionReply(
  userText: string,
  history: { role: 'user' | 'model'; text: string }[],
  memories: Memory[],
  medications: Medication[],
  language: 'en' | 'ms' = 'en'
): Promise<{
  replyText: string;
  extractedSymptom?: Omit<HealthLog, 'id' | 'elder_id' | 'at'>;
  raisedAlert?: string;
}> {
  // AD-9: Red-flag check BEFORE the model.
  const lowerText = userText.toLowerCase();
  const redFlags = ['sakit dada', 'chest pain', 'sesak nafas', 'trouble breathing', 'slurred speech', 'susah cakap', 'lemah kaki tangan', 'sudah pengsan', 'stroke'];
  for (const flag of redFlags) {
    if (lowerText.includes(flag)) {
      return {
        replyText: language === 'ms'
          ? 'Bahaya! Sila hubungi talian kecemasan 999 atau ahli keluarga anda dengan segera. Saya telah menghantar isyarat kecemasan kepada keluarga anda.'
          : 'Danger! Please call emergency services 999 or call your family immediately. I have notified your family.',
        raisedAlert: `Red flag triggered by user speech: "${userText}"`
      };
    }
  }

  // User-initiated distress helper
  if (lowerText.includes('tolong hubungi keluarga') || lowerText.includes('hubungi anak') || lowerText.includes('call my family') || lowerText.includes('hubungi keluarga') || lowerText.includes('contact family')) {
    return {
      replyText: language === 'ms'
        ? 'Baiklah, saya sedang menghubungi anak atau keluarga anda sekarang. Bertenang ya, mereka akan dimaklumkan.'
        : 'Okay, I am contacting your family now. Please stay calm, they are being notified.',
      raisedAlert: `User explicitly requested distress contact: "${userText}"`
    };
  }

  const apiKey = getGeminiApiKey();

  // Create context from confirmed medications and memories based on active language
  const medContext = medications
    .filter(m => m.confirmed)
    .map(m => {
      if (language === 'ms') {
        return `- ${m.name} (${m.dose}), kekerapan: ${m.frequency}, masa: ${m.timing}. Rupa ubat: ${m.appearance}.`;
      } else {
        return `- ${m.name} (${m.dose}), frequency: ${m.frequency}, timing: ${m.timing}. Appearance: ${m.appearance}.`;
      }
    })
    .join('\n');

  const memoryContext = memories
    .slice(0, 5)
    .map(m => `- [${m.type}] ${m.content} (${language === 'ms' ? 'Disimpan pada' : 'Saved on'}: ${new Date(m.created_at).toLocaleDateString()})`)
    .join('\n');

  const systemInstructionMs = `Anda adalah peneman kesihatan AI yang hangat, penyayang, dan sabar bernama "AIRA" untuk warga emas Susan.
Bahasa utama yang digunakan adalah Bahasa Melayu (Malay) yang mudah difahami oleh warga emas di Malaysia.

PERATURAN PENTING (INVARIANTS):
1. [DC-1] Jangan berikan sebarang diagnosis atau nasihat klinikal perubatan. Jangan katakan "anda sihat" atau "tiada apa yang perlu dirisaukan".
2. [DC-2] Berikan kehangatan dan hubungan manusia. Jika warga emas mengadu sakit atau bimbang, dengar dengan empati, katakan anda akan mencatatkannya untuk makluman keluarga/doktor, dan berpesan untuk berehat atau menghubungi keluarga jika bertambah teruk.
3. [DC-4] Ingat maklumat kesihatan berikut untuk membantu Susan jika dia bertanya:
MEDIKASI SEMASA:
${medContext || 'Tiada maklumat ubat yang disahkan buat masa ini.'}

MEMORI/TEMUJANJI/NOTA DOKTOR:
${memoryContext || 'Tiada nota kesihatan atau temujanji yang direkodkan.'}

PANDUAN PERTANYAAN LAZIM:
- Jika dia bertanya "Sudahkah saya ambil ubat?" atau berkaitan, rujuk rekod yang dia nyatakan.
- Jika dia menyebut simptom baru (seperti pening, penat, sakit kaki), berikan jawapan empati: "Saya telah catat bahawa anda berasa [simptom]. Saya akan maklumkan kepada anak/keluarga anda supaya mereka tahu. Jangan bimbang, tetapi jika berasa teruk, sila berehat ya."

Jangan sesekali mereka-reka maklumat ubat jika tiada dalam senarai di atas.`;

  const systemInstructionEn = `You are a warm, caring, and patient AI health companion named "AIRA" for the elderly Susan.
The primary language is English, spoken in a clear, easy-to-understand manner for seniors.

CRITICAL RULES (INVARIANTS):
1. [DC-1] Never make any medical diagnosis or clinical judgment. Never say "you are fine" or "there is nothing to worry about".
2. [DC-2] Provide human connection and warmth. If she complains of pain or worry, listen with empathy, say you will record it for her daughter/doctor to see, and advise her to rest or contact her family if it worsens.
3. [DC-4] Remember the following health information to assist Susan if she asks:
CURRENT MEDICATIONS:
${medContext || 'No confirmed medication information available at this time.'}

MEMORIES/APPOINTMENTS/DOCTOR NOTES:
${memoryContext || 'No health notes or appointments recorded.'}

FREQUENTLY ASKED QUESTIONS GUIDE:
- If she asks "Have I taken my medicine?" or similar, refer to the records.
- If she mentions a new symptom (e.g., headache, feeling tired, leg pain), reply empathetically: "I have noted that you are feeling [symptom]. I will let your daughter/family know so they are aware. Please rest and let them know if it gets worse."

Never fabricate medication information not present in the list above.`;

  const systemInstruction = language === 'ms' ? systemInstructionMs : systemInstructionEn;

  if (!apiKey) {
    console.log(`No Gemini API key found, running converse in ${language.toUpperCase()} SIMULATION mode.`);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate latency

    let replyText = language === 'ms'
      ? 'Saya bersedia mendengar. Sudahkah anda makan ubat hari ini?'
      : 'I am ready to listen. Have you taken your medicine today?';
    let extractedSymptom: Omit<HealthLog, 'id' | 'elder_id' | 'at'> | undefined;

    // Direct simulated logic to make the companion feel real during dry runs
    if (lowerText.includes('ubat') || lowerText.includes('medicine')) {
      if (lowerText.includes('sudah') || lowerText.includes('ambil') || lowerText.includes('makan') || lowerText.includes('yes') || lowerText.includes('taken')) {
        replyText = language === 'ms'
          ? 'Bagus! Sentiasa makan ubat mengikut masa yang ditetapkan ya. Semoga anda sihat sentiasa. Ada apa-apa lagi yang boleh saya bantu?'
          : 'Great! Always take your medication at the scheduled time. Wish you good health. Is there anything else I can help you with?';
      } else {
        replyText = language === 'ms'
          ? 'Adakah anda ingin saya bacakan senarai ubat anda? Anda mempunyai ubat Metformin 500mg untuk diambil selepas sarapan.'
          : 'Would you like me to read your medication list? You have Metformin 500mg scheduled after breakfast.';
      }
    } else if (lowerText.includes('temujanji') || lowerText.includes('appointment') || lowerText.includes('klinik') || lowerText.includes('doctor')) {
      replyText = language === 'ms'
        ? 'Mengikut catatan saya, temujanji klinik anda seterusnya ialah pada hari Khamis depan jam 10:00 pagi di Klinik Kesihatan. Ada apa-apa lagi yang ingin anda tanyakan?'
        : 'According to my records, your next clinic appointment is scheduled for next Thursday at 10:00 AM at the Health Clinic. Is there anything else you want to ask?';
    } else if (lowerText.includes('pening') || lowerText.includes('headache') || lowerText.includes('sakit') || lowerText.includes('demam') || lowerText.includes('fever') || lowerText.includes('dizzy')) {
      const symptom = (lowerText.includes('pening') || lowerText.includes('dizzy')) ? (language === 'ms' ? 'pening kepala' : 'dizziness') : (language === 'ms' ? 'kurang sihat' : 'unwell');
      replyText = language === 'ms'
        ? `Oh Susan, saya simpati mendengar anda rasa ${symptom}. Saya sudah catatkan ini ke dalam log kesihatan anda supaya anak anda boleh melihatnya nanti. Sila minum air dan berehat ya.`
        : `Oh Susan, I am sorry to hear you are feeling ${symptom}. I have logged this in your health diary so your daughter can see it later. Please drink some water and rest.`;
      
      extractedSymptom = {
        type: 'symptom',
        content: language === 'ms'
          ? `Susan mengadu rasa ${symptom}.`
          : `Susan complained of feeling ${symptom}.`,
        significant: true,
      };
    } else if (lowerText.includes('siapa') || lowerText.includes('nama') || lowerText.includes('who are you') || lowerText.includes('name')) {
      replyText = language === 'ms'
        ? 'Saya adalah AIRA, teman kesihatan AI anda yang sedia menemani anda setiap hari. Saya boleh mengingatkan anda makan ubat dan menyimpan nota doktor.'
        : 'I am AIRA, your AI health companion here to keep you company every day. I can remind you to take your medicine and save doctor notes.';
    } else {
      replyText = language === 'ms'
        ? 'Saya faham. Terima kasih kerana berkongsi. Saya sentiasa ada di sini untuk mendengar dan menemani anda.'
        : 'I understand. Thank you for sharing. I am always here to listen and keep you company.';
    }

    return { replyText, extractedSymptom };
  }

  try {
    // Format conversation history for Gemini
    const contents = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }],
    }));
    
    // Add current user turn
    contents.push({
      role: 'user',
      parts: [{ text: userText }],
    });

    const response = await fetch(`${GEMINI_OCR_MODEL_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const replyText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';


    // Run passive extraction: Check if conversation indicates a symptom or mood
    let extractedSymptom: Omit<HealthLog, 'id' | 'elder_id' | 'at'> | undefined;
    
    const symptomKeywords = [
      { kw: 'pening', termMs: 'Pening / Vertigo', termEn: 'Dizziness / Vertigo' },
      { kw: 'sakit kepala', termMs: 'Pening kepala / Sakit kepala', termEn: 'Headache' },
      { kw: 'headache', termMs: 'Pening kepala / Sakit kepala', termEn: 'Headache' },
      { kw: 'dizzy', termMs: 'Pening / Vertigo', termEn: 'Dizziness / Vertigo' },
      { kw: 'muntah', termMs: 'Loya / Muntah', termEn: 'Nausea / Vomiting' },
      { kw: 'loya', termMs: 'Loya / Muntah', termEn: 'Nausea / Vomiting' },
      { kw: 'vomit', termMs: 'Loya / Muntah', termEn: 'Nausea / Vomiting' },
      { kw: 'nausea', termMs: 'Loya / Muntah', termEn: 'Nausea / Vomiting' },
      { kw: 'batuk', termMs: 'Batuk / Selesema', termEn: 'Cough / Cold' },
      { kw: 'cough', termMs: 'Batuk / Selesema', termEn: 'Cough / Cold' },
      { kw: 'selesema', termMs: 'Batuk / Selesema', termEn: 'Cough / Cold' },
      { kw: 'flu', termMs: 'Batuk / Selesema', termEn: 'Cough / Cold' },
      { kw: 'demam', termMs: 'Demam', termEn: 'Fever' },
      { kw: 'fever', termMs: 'Demam', termEn: 'Fever' },
      { kw: 'lemah', termMs: 'Keletihan / Rasa Lemah', termEn: 'Fatigue / Weakness' },
      { kw: 'penat', termMs: 'Keletihan / Rasa Lemah', termEn: 'Fatigue / Weakness' },
      { kw: 'tired', termMs: 'Keletihan / Rasa Lemah', termEn: 'Fatigue / Weakness' },
      { kw: 'sakit lutut', termMs: 'Sakit sendi / Sakit lutut', termEn: 'Joint / Knee pain' },
      { kw: 'sakit kaki', termMs: 'Sakit kaki', termEn: 'Leg pain' },
    ];

    for (const item of symptomKeywords) {
      if (lowerText.includes(item.kw)) {
        extractedSymptom = {
          type: 'symptom',
          content: language === 'ms'
            ? `Pesakit mengadu ${item.termMs} semasa perbualan: "${userText}"`
            : `Patient complained of ${item.termEn} during conversation: "${userText}"`,
          significant: true,
        };
        break;
      }
    }

    return { replyText, extractedSymptom };
  } catch (error) {
    console.error('Failed to get Gemini response, returning fallback:', error);
    return {
      replyText: language === 'ms'
        ? 'Minta maaf, saya mengalami masalah sambungan. Boleh anda ulangi semula?'
        : 'Sorry, I encountered a connection issue. Could you repeat that?'
    };
  }
}


