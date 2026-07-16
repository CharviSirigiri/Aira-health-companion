import * as Speech from 'expo-speech';
import type { Language } from './localization';

let cachedVoicesPromise: Promise<Speech.Voice[]> | null = null;

async function getAvailableVoices(): Promise<Speech.Voice[]> {
  if (!cachedVoicesPromise) {
    cachedVoicesPromise = Speech.getAvailableVoicesAsync().catch(error => {
      cachedVoicesPromise = null;
      throw error;
    });
  }

  return cachedVoicesPromise;
}

function getSpeechLanguageCode(language: Language): string {
  return language === 'ms' ? 'ms-MY' : 'en-US';
}

function scoreVoiceCandidate(voice: Speech.Voice, language: Language): number {
  const langCode = getSpeechLanguageCode(language).toLowerCase();
  const voiceLanguage = (voice.language || '').toLowerCase();
  const voiceName = (voice.name || '').toLowerCase();

  let score = 0;

  if (voiceLanguage === langCode) {
    score += 100;
  } else if (voiceLanguage.startsWith(language)) {
    score += 80;
  } else if (voiceLanguage.startsWith(langCode.split('-')[0])) {
    score += 70;
  }

  if (voice.quality === 'Enhanced') {
    score += 20;
  }

  if (language === 'ms' && (voiceName.includes('bahasa') || voiceName.includes('malay'))) {
    score += 10;
  }

  if (language === 'en' && voiceName.includes('english')) {
    score += 10;
  }

  return score;
}

async function resolveCompanionVoice(language: Language): Promise<string | undefined> {
  try {
    const voices = await getAvailableVoices();
    const bestMatch = voices
      .map(voice => ({ voice, score: scoreVoiceCandidate(voice, language) }))
      .sort((a, b) => b.score - a.score)[0];

    return bestMatch && bestMatch.score > 0 ? bestMatch.voice.identifier : undefined;
  } catch (error) {
    console.warn('Unable to load system voices, using default speaker voice:', error);
    return undefined;
  }
}

export async function speakCompanionText(text: string, language: Language): Promise<void> {
  if (!text.trim()) return;

  await Speech.stop();

  const voice = await resolveCompanionVoice(language);
  Speech.speak(text, {
    language: getSpeechLanguageCode(language),
    pitch: 1.0,
    rate: 0.9,
    voice,
  });
}
