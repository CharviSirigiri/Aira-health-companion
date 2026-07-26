import * as Speech from 'expo-speech';
import { setAudioModeAsync, createAudioPlayer, AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import type { Language } from './localization';
import { getElder } from './database';
import { synthesizeSpeech } from './gemini';

// Gemini TTS prebuilt voices, picked to match each persona's character.
const PERSONA_VOICE_MAP: Record<string, string> = {
  warm: 'Sulafat', // "Warm"
  friendly: 'Achird', // "Friendly"
  patient: 'Vindemiatrix', // "Gentle"
};

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToUint8Array(base64: string): Uint8Array {
  const cleaned = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const byteLength = Math.floor((cleaned.length * 6) / 8);
  const bytes = new Uint8Array(byteLength);
  let byteIndex = 0;
  let bits = 0;
  let bitCount = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const value = BASE64_CHARS.indexOf(cleaned[i]);
    if (value === -1) continue;
    bits = (bits << 6) | value;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      bytes[byteIndex++] = (bits >> bitCount) & 0xff;
    }
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result += BASE64_CHARS[(chunk >> 18) & 0x3f] + BASE64_CHARS[(chunk >> 12) & 0x3f] +
      BASE64_CHARS[(chunk >> 6) & 0x3f] + BASE64_CHARS[chunk & 0x3f];
  }
  const remaining = bytes.length - i;
  if (remaining === 1) {
    const chunk = bytes[i] << 16;
    result += BASE64_CHARS[(chunk >> 18) & 0x3f] + BASE64_CHARS[(chunk >> 12) & 0x3f] + '==';
  } else if (remaining === 2) {
    const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8);
    result += BASE64_CHARS[(chunk >> 18) & 0x3f] + BASE64_CHARS[(chunk >> 12) & 0x3f] +
      BASE64_CHARS[(chunk >> 6) & 0x3f] + '=';
  }
  return result;
}

// Gemini TTS returns headerless raw 16-bit PCM — wrap it in a WAV header so
// expo-audio (which expects a recognizable container format) can play it.
function buildWavHeader(dataLength: number, sampleRate: number): Uint8Array {
  const header = new Uint8Array(44);
  const view = new DataView(header.buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) header[offset + i] = str.charCodeAt(i);
  };
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  return header;
}

let currentTtsPlayer: AudioPlayer | null = null;

// Monotonic token so that if two speakCompanionText calls ever overlap
// (e.g. the mount greeting and a quick-tap question fired close together),
// only the most recent one actually plays — older calls detect they've been
// superseded and quietly no-op instead of talking over the new one.
let speechToken = 0;

function stopCurrentTtsPlayer(): void {
  if (currentTtsPlayer) {
    try { currentTtsPlayer.remove(); } catch { /* already released */ }
    currentTtsPlayer = null;
  }
}

async function speakWithGeminiTts(text: string, voiceName: string, token: number): Promise<void> {
  const result = await synthesizeSpeech(text, voiceName);
  if (!result) throw new Error('Gemini TTS unavailable (simulation mode)');
  if (token !== speechToken) return; // superseded while awaiting the network call

  const pcmBytes = base64ToUint8Array(result.base64Pcm);
  const header = buildWavHeader(pcmBytes.length, result.sampleRate);
  const wavBytes = new Uint8Array(header.length + pcmBytes.length);
  wavBytes.set(header, 0);
  wavBytes.set(pcmBytes, header.length);
  const wavBase64 = uint8ArrayToBase64(wavBytes);

  const fileUri = `${FileSystem.cacheDirectory || ''}aira-tts-${Date.now()}.wav`;
  await FileSystem.writeAsStringAsync(fileUri, wavBase64, { encoding: FileSystem.EncodingType.Base64 });
  if (token !== speechToken) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
    return;
  }

  stopCurrentTtsPlayer();

  return new Promise((resolve, reject) => {
    try {
      const player = createAudioPlayer(fileUri);
      currentTtsPlayer = player;

      const subscription = player.addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish) {
          subscription.remove();
          player.remove();
          if (currentTtsPlayer === player) currentTtsPlayer = null;
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
          resolve();
        }
      });

      player.play();
    } catch (error) {
      reject(error);
    }
  });
}

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

  if (voiceName.includes('google')) {
    score += 15;
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

export async function configureVoicePlaybackAudioMode(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      // setAudioModeAsync merges with prior state, so allowsRecording must be
      // reset explicitly here — otherwise it persists from the last recording
      // session and keeps iOS in PlayAndRecord mode, which routes to the
      // earpiece by default regardless of shouldRouteThroughEarpiece.
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'duckOthers',
    });
  } catch (error) {
    console.warn('Unable to configure playback audio mode:', error);
  }
}

export async function configureVoiceRecordingAudioMode(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'doNotMix',
    });
  } catch (error) {
    console.warn('Unable to configure recording audio mode:', error);
  }
}

export async function speakCompanionText(text: string, language: Language): Promise<void> {
  if (!text.trim()) return;

  const myToken = ++speechToken;

  // Stop whatever is currently playing/speaking immediately, so a new turn
  // never talks over a still-finishing one.
  await Speech.stop();
  stopCurrentTtsPlayer();

  await configureVoicePlaybackAudioMode();
  if (myToken !== speechToken) return; // superseded while awaiting

  let persona = 'warm';
  try {
    const elder = await getElder('elder-susan');
    if (elder?.persona) persona = elder.persona.toLowerCase();
  } catch (error) {
    console.warn('Failed to load elder persona for voice adjustments:', error);
  }
  if (myToken !== speechToken) return;

  try {
    const voiceName = PERSONA_VOICE_MAP[persona] || PERSONA_VOICE_MAP.warm;
    await speakWithGeminiTts(text, voiceName, myToken);
    return;
  } catch (error) {
    console.warn('Gemini TTS unavailable, falling back to device speech:', error);
  }

  if (myToken !== speechToken) return; // superseded during the Gemini attempt

  // Fallback: on-device TTS (also used when Gemini simulation mode is on).
  let pitch = 1.0;
  let rate = 0.85; // Default slightly slower rate for senior comprehension
  if (persona === 'warm') {
    pitch = 0.95;
    rate = 0.85;
  } else if (persona === 'patient') {
    pitch = 1.0;
    rate = 0.75;
  } else if (persona === 'friendly') {
    pitch = 1.05;
    rate = 0.9;
  }

  const voice = await resolveCompanionVoice(language);
  if (myToken !== speechToken) return; // superseded while resolving the voice

  Speech.speak(text, {
    language: getSpeechLanguageCode(language),
    pitch,
    rate,
    voice,
    volume: 1.0,
    // Reuse the app's own audio session (configured above via
    // configureVoicePlaybackAudioMode, shouldRouteThroughEarpiece: false)
    // instead of iOS's separate speech session, which otherwise ignores
    // that routing and defaults to the earpiece after a recording session.
    useApplicationAudioSession: true,
  });
}
