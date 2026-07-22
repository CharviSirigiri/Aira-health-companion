import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Animated, Platform } from 'react-native';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { Shadows, Radii } from '@/constants/theme';
import { speakCompanionText } from '@/services/voice';
import { useTranslation } from '@/services/localization';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import {
  getMedications,
  getReminders,
  getMemories,
  addIntakeEvent,
  addHealthLog,
  addAlert,
  Medication,
  Reminder,
  Memory
} from '@/services/database';
import { generateCompanionReply, transcribeVoiceMessage } from '@/services/gemini';

/* eslint-disable react-hooks/exhaustive-deps */

export default function ElderScreen() {
  const { language, t, changeLanguage } = useTranslation();
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [activeReminders, setActiveReminders] = useState<Reminder[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [statusText, setStatusText] = useState<string>('');
  const [inputText, setInputText] = useState(''); // Typed fallback for web/testing
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [activeReminderToShow, setActiveReminderToShow] = useState<Reminder | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const lastProcessedTranscriptRef = useRef('');

  // Speech To Text hook linked directly to dynamic localization state
  const stt = useSpeechToText(language === 'ms' ? 'ms-MY' : 'en-US');
  const voiceRecorder = useVoiceRecorder();
  
  useEffect(() => {
    loadData();
    // Warm greeting on mount/language toggle
    const timer = setTimeout(() => {
      greetUser();
    }, 1000);
    return () => clearTimeout(timer);
  }, [language]);

  // Listen for local scheduled notifications
  useEffect(() => {
    // 1. Foreground listener
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data as any;
      console.log('Foreground notification received:', data);
      
      if (data && data.reminderId) {
        const reminder: Reminder = {
          id: data.reminderId,
          medication_id: data.medicationId,
          anchor: '', // not strictly needed for rendering banner
          spoken_text: data.spokenText
        };
        
        // Show banner immediately on screen
        setActiveReminderToShow(reminder);
        
        // Add to active reminders list if not present
        setActiveReminders(prev => {
          if (prev.some(r => r.id === reminder.id)) return prev;
          return [reminder, ...prev];
        });

        // Speak the reminder immediately
        void speakOutput(data.spokenText);
      }
    });

    // 2. Clicked/tapped listener
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      console.log('Notification tapped:', data);

      if (data && data.reminderId) {
        const reminder: Reminder = {
          id: data.reminderId,
          medication_id: data.medicationId,
          anchor: '',
          spoken_text: data.spokenText
        };

        // Show banner immediately on screen
        setActiveReminderToShow(reminder);
        
        // Add to active reminders list if not present
        setActiveReminders(prev => {
          if (prev.some(r => r.id === reminder.id)) return prev;
          return [reminder, ...prev];
        });

        // Speak the reminder immediately
        void speakOutput(data.spokenText);
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [language]);

  // Breathing animation for microphone when listening
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (stt.isListening) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [stt.isListening]);

  // Visual shake for warning alerts
  const runShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const loadData = async () => {
    try {
      const meds = await getMedications('elder-susan');
      setMedications(meds);
      const rems = await getReminders('elder-susan');
      setActiveReminders(rems);
      if (rems.length > 0) {
        setActiveReminderToShow(rems[0]);
      } else {
        setActiveReminderToShow(null);
      }
      const mems = await getMemories('elder-susan');
      setMemories(mems);
    } catch (e) {
      console.error(e);
    }
  };

  const greetUser = () => {
    const greeting = t('elderGreeting');
    setStatusText(greeting);
    void speakOutput(greeting);
    setMessages([{ role: 'model', text: greeting }]);
  };

  const speakOutput = async (text: string) => {
    await speakCompanionText(text, language);
  };

  const toggleLanguage = async () => {
    const newLang = language === 'ms' ? 'en' : 'ms';
    await changeLanguage(newLang);
  };

  const processRecordedVoice = async (audioUri: string) => {
    setIsTranscribing(true);
    setStatusText(language === 'ms' ? 'Sedang menyalin suara anda...' : 'Transcribing your voice...');

    try {
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, { encoding: 'base64' });
      const mimeType = audioUri.toLowerCase().endsWith('.webm') ? 'audio/webm' : 'audio/mp4';
      const { transcript } = await transcribeVoiceMessage(audioBase64, mimeType, language);
      const cleanTranscript = transcript.trim();

      if (!cleanTranscript) {
        throw new Error('Empty transcript from voice input');
      }

      lastProcessedTranscriptRef.current = cleanTranscript;
      await handleUserSpeech(cleanTranscript);
    } catch (error) {
      console.error('Failed to process voice recording:', error);
      const errText = language === 'ms'
        ? 'Maaf, saya tidak dapat memahami suara anda. Sila cuba lagi.'
        : 'Sorry, I could not understand your voice. Please try again.';
      setStatusText(errText);
      void speakOutput(errText);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Handle incoming user request (from speech or simulated keyboard)
  const handleUserSpeech = async (spokenText: string) => {
    if (!spokenText.trim()) return;

    const userMessage = { role: 'user' as const, text: spokenText };
    const conversationHistory = [...messages, userMessage];
    setMessages(conversationHistory);
    setIsAiLoading(true);
    setStatusText(t('elderThinking'));

    try {
      const res = await generateCompanionReply(spokenText, conversationHistory, memories, medications, language);

      setStatusText(res.replyText);
      await speakOutput(res.replyText);
      setMessages(prev => [...prev, { role: 'model', text: res.replyText }]);

      // Trigger passive logs if any (AD-6/AD-11)
      if (res.extractedSymptom) {
        await addHealthLog({
          elder_id: 'elder-susan',
          type: res.extractedSymptom.type,
          content: res.extractedSymptom.content,
          significant: res.extractedSymptom.significant,
        });
        console.log('Passively logged symptom/mood in background:', res.extractedSymptom);
      }

      // Raise safety warnings if red flags triggered (AD-9)
      if (res.raisedAlert) {
        runShakeAnimation();
        await addAlert({
          elder_id: 'elder-susan',
          trigger: res.raisedAlert,
        });
        console.warn('Safety Alert Raised! Notification sent to Caregiver.');
      }
    } catch (error) {
      console.error(error);
      const errText = t('elderGreetingConnectionError');
      setStatusText(errText);
      await speakOutput(errText);
    } finally {
      setIsAiLoading(false);
      setInputText('');
    }
  };

  // Confirm Medication Intake Gate (FR15)
  const handleIntakeConfirm = async (reminder: Reminder) => {
    try {
      // Log event to DB
      await addIntakeEvent({
        medication_id: reminder.medication_id,
        taken: true,
      });

      // Speak warm validation response
      const successText = t('elderIntakeSuccess');
      
      setStatusText(successText);
      await speakOutput(successText);
      setMessages(prev => [...prev, { role: 'model', text: successText }]);

      // Remove reminder from local list (since completed)
      const updatedRems = activeReminders.filter(r => r.id !== reminder.id);
      setActiveReminders(updatedRems);
      if (updatedRems.length > 0) {
        setActiveReminderToShow(updatedRems[0]);
      } else {
        setActiveReminderToShow(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Triggers voice capture
  const handleMicPress = async () => {
    if (isAiLoading || isTranscribing) return;

    if (Platform.OS === 'web' && stt.isSupported) {
      if (stt.isListening) {
        stt.stopListening();
      } else {
        stt.startListening();
      }
      return;
    }

    if (voiceRecorder.isRecording) {
      const uri = await voiceRecorder.stopRecording();
      if (uri) {
        await processRecordedVoice(uri);
      }
      return;
    }

    try {
      await voiceRecorder.startRecording();
      setStatusText(language === 'ms' ? 'Rakaman suara bermula. Sentuh lagi untuk hantar.' : 'Voice recording started. Tap again to send.');
    } catch (error) {
      console.error('Failed to start voice recording:', error);
      const errText = language === 'ms'
        ? 'Saya perlukan kebenaran mikrofon untuk mendengar suara anda.'
        : 'I need microphone permission to hear your voice.';
      setStatusText(errText);
      void speakOutput(errText);
    }
  };

  // STT changes effect
  useEffect(() => {
    if (!stt.isListening) {
      const transcript = stt.transcript.trim();
      if (transcript && transcript !== lastProcessedTranscriptRef.current) {
        lastProcessedTranscriptRef.current = transcript;
        stt.resetTranscript();
        void handleUserSpeech(transcript);
      }
    }
  }, [stt.isListening, stt.transcript]);

  return (
    <Animated.View style={[styles.mainContainer, { transform: [{ translateX: shakeAnim }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.branding}>
          <View style={styles.logoIcon}>
            <IconSymbol name="house.fill" size={20} color="#0D9488" />
          </View>
          <Text style={styles.headerTitle}>{t('appName')}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage}>
            <IconSymbol name="paperplane.fill" size={14} color="#0D9488" />
            <Text style={styles.langToggleText}>
              {language === 'ms' ? t('langToggleMs') : t('langToggleEn')}
            </Text>
          </TouchableOpacity>
          <RoleSwitcher style={styles.headerRoleSwitcher} />
        </View>
      </View>

      {/* Spacious Non-Overlapping Scroll Content Area */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
        {/* Active Reminder notification Banner (FR13 / FR14) */}
        {activeReminderToShow && (
          <View style={styles.reminderBanner}>
            <View style={styles.reminderHeader}>
              <IconSymbol name="person.crop.circle.badge.exclamationmark" size={20} color="#B91C1C" />
              <Text style={styles.reminderTitle}>
                {t('elderReminderTitle')}
              </Text>
            </View>
            <Text style={styles.reminderBody}>{activeReminderToShow.spoken_text}</Text>
            
            <View style={styles.reminderActions}>
              <TouchableOpacity
                style={styles.confirmIntakeBtn}
                onPress={() => handleIntakeConfirm(activeReminderToShow)}
              >
                <IconSymbol name="house.fill" size={18} color="#fff" />
                <Text style={styles.confirmIntakeText}>
                  {t('elderReminderButton')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.speakReminderBtn}
                onPress={() => void speakOutput(activeReminderToShow.spoken_text)}
              >
                <IconSymbol name="person.crop.circle.badge.exclamationmark" size={18} color="#B91C1C" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Hero AIRA Voice Companion Section */}
        <View style={styles.chatSection}>
          <View style={styles.companionHeaderRow}>
            <View style={styles.companionAvatarContainer}>
              <Animated.View style={[styles.companionAvatarRing, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.companionAvatarCore}>
                <IconSymbol name="house.fill" size={18} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.companionMeta}>
              <Text style={styles.companionLabel}>
                {t('elderCompanionLabel')}
              </Text>
              <View style={styles.activeStatusPill}>
                <View style={styles.activeStatusDot} />
                <Text style={styles.activeStatusText}>
                  {isAiLoading ? 'AI Thinking...' : stt.isListening ? 'Listening...' : 'Voice Ready'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.replyBox}>
            <Text style={styles.replyText}>{statusText}</Text>
            {isAiLoading && (
              <View style={styles.loadingRow}>
                <View style={styles.loadingDot} />
                <Text style={styles.loadingPulse}>
                  {t('elderThinking')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Voice Transcript Feedback */}
        {(stt.isListening || voiceRecorder.isRecording || isTranscribing) && (
          <View style={styles.transcriptContainer}>
            <Text style={styles.transcriptHeading}>
              {language === 'ms' ? t('elderListening') : t('elderListening')}
            </Text>
            <Text style={styles.transcriptText}>
              {stt.isListening
                ? (stt.transcript || t('elderSpeakNow'))
                : voiceRecorder.isRecording
                  ? (language === 'ms' ? 'Saya sedang mendengar suara anda...' : 'I am listening to your voice...')
                  : (language === 'ms' ? 'Sedang menyalin suara anda...' : 'Transcribing your voice...')}
            </Text>
          </View>
        )}

        {/* Quick Speech Suggestion Bubbles (1-Tap Accessible Actions) */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>
            {language === 'ms' ? 'Contoh soalan (sentuh 1 kali):' : 'Quick voice commands (1 tap):'}
          </Text>
          <View style={styles.suggestionsGrid}>
            <TouchableOpacity
              style={styles.suggestionBubble}
              onPress={() => {
                stt.stopListening();
                handleUserSpeech(language === 'ms' ? 'Adakah saya sudah makan ubat Metformin hari ini?' : 'Did I take my Metformin today?');
              }}
            >
              <Text style={styles.suggestionText}>
                💊 {language === 'ms' ? 'Sudah makan ubat?' : 'Did I take meds?'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.suggestionBubble}
              onPress={() => {
                stt.stopListening();
                handleUserSpeech(language === 'ms' ? 'Apa pesanan doktor Ramesh?' : 'What did Doctor Ramesh say?');
              }}
            >
              <Text style={styles.suggestionText}>
                🩺 {language === 'ms' ? 'Pesanan doktor?' : 'Doctor notes'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.suggestionBubble, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}
              onPress={() => {
                stt.stopListening();
                handleUserSpeech(language === 'ms' ? 'Tolong hubungi keluarga saya sekarang!' : 'Please contact my family now!');
              }}
            >
              <Text style={[styles.suggestionText, { color: '#991B1B' }]}>
                🚨 {language === 'ms' ? 'Hubungi keluarga!' : 'Contact family'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Voice Control Pad (Fixed Bottom) */}
      <View style={styles.controlPad}>
        {/* Typed fallback for offline/web/dry runs */}
        <View style={styles.simInputContainer}>
          <TextInput
            style={styles.simTextInput}
            placeholder={t('elderTextPlaceholder')}
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleUserSpeech(inputText)}
          />
          {inputText.length > 0 && (
            <TouchableOpacity style={styles.sendTextBtn} onPress={() => handleUserSpeech(inputText)}>
              <IconSymbol name="paperplane.fill" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Large mic button */}
        <View style={styles.micWrapper}>
          <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
          <TouchableOpacity
            style={[styles.micBtn, (stt.isListening || voiceRecorder.isRecording || isTranscribing) && styles.micBtnActive]}
            onPress={handleMicPress}
            activeOpacity={0.8}
          >
            <IconSymbol
              name="mic.fill"
              size={36}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.micInstruction}>
          {voiceRecorder.isRecording || isTranscribing
            ? t('elderMicTapToSend')
            : stt.isListening
              ? t('elderMicTapToSend')
              : t('elderMicPressToSpeak')}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Off-white canvas (eliminates eye fatigue for older eyes)
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingHorizontal: 24,
    paddingBottom: 18,
    backgroundColor: '#FFFFFF', // Pure White header container
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A', // Deep Navy text (High Contrast)
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRoleSwitcher: {
    position: 'relative',
    top: 0,
    right: 0,
    maxWidth: 160,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
  },
  langToggleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D9488', // Safety Teal
    marginLeft: 6,
  },
  scrollArea: {
    flex: 1,
  },
  contentScroll: {
    padding: 16,
    paddingBottom: 24,
  },
  reminderBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 14,
    ...Shadows.sm,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
    marginLeft: 8,
  },
  reminderBody: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confirmIntakeBtn: {
    flex: 1,
    backgroundColor: '#EA580C', // Warm Coral/Orange Action Alert Accent
    borderRadius: Radii.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  confirmIntakeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  speakReminderBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSection: {
    marginBottom: 16,
  },
  companionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  companionAvatarContainer: {
    position: 'relative',
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  companionAvatarRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    opacity: 0.7,
  },
  companionAvatarCore: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0D9488', // Safety Teal Accent
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  companionMeta: {
    flex: 1,
  },
  companionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D9488',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radii.full,
    alignSelf: 'flex-start',
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  activeStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0D9488',
    marginRight: 4,
  },
  activeStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  replyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
  },
  replyText: {
    fontSize: 16,
    color: '#0F172A', // Deep Navy
    lineHeight: 24,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0D9488',
    marginRight: 6,
  },
  loadingPulse: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '700',
    fontStyle: 'italic',
  },
  transcriptContainer: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 14,
  },
  transcriptHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    ...Shadows.sm,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D9488',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionBubble: {
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: Radii.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 13,
    color: '#0F766E',
    fontWeight: '700',
  },
  controlPad: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Shadows.md,
  },
  simInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radii.full,
    paddingHorizontal: 14,
    height: 42,
    width: '100%',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  simTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  sendTextBtn: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: 60,
  },
  pulseCircle: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(13, 148, 136, 0.22)',
  },
  micBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0D9488', // Safety Teal
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#CCFBF1',
    ...Shadows.sm,
  },
  micBtnActive: {
    backgroundColor: '#EA580C', // Warm Coral/Orange
    borderColor: '#FFEDD5',
  },
  micInstruction: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});






