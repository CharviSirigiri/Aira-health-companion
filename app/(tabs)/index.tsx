import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Animated, Platform } from 'react-native';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RoleSwitcher } from '@/components/RoleSwitcher';
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

        <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage}>
          <IconSymbol name="paperplane.fill" size={14} color="#0D9488" />
          <Text style={styles.langToggleText}>
            {language === 'ms' ? t('langToggleMs') : t('langToggleEn')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
        {/* Reminder notification Banner (FR13 / FR14) */}
        {activeReminderToShow && (
          <View style={styles.reminderBanner}>
            <View style={styles.reminderHeader}>
              <IconSymbol name="person.crop.circle.badge.exclamationmark" size={24} color="#B91C1C" />
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
                <IconSymbol name="house.fill" size={22} color="#fff" />
                <Text style={styles.confirmIntakeText}>
                  {t('elderReminderButton')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.speakReminderBtn}
                onPress={() => void speakOutput(activeReminderToShow.spoken_text)}
              >
                <IconSymbol name="person.crop.circle.badge.exclamationmark" size={20} color="#B91C1C" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* AI Reply Bubble and status indicator */}
        <View style={styles.chatSection}>
          <Text style={styles.companionLabel}>
            {t('elderCompanionLabel')}
          </Text>
          <View style={styles.replyBox}>
            <Text style={styles.replyText}>{statusText}</Text>
            {isAiLoading && (
              <Text style={styles.loadingPulse}>
                {t('elderThinking')}
              </Text>
            )}
          </View>
        </View>

        {/* Voice Transcript Feedback */}
        {(stt.isListening || voiceRecorder.isRecording || isTranscribing) && (
          <View>
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

            {/* Quick Speech Suggestion Bubbles */}
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>
                {language === 'ms' ? 'Sentuh contoh arahan suara:' : 'Tap a sample voice command:'}
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
                    💊 {language === 'ms' ? 'Sudahkah saya makan ubat?' : 'Did I take my medicine?'}
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
                    🩺 {language === 'ms' ? 'Apa pesanan doktor?' : 'What did the doctor say?'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.suggestionBubble}
                  onPress={() => {
                    stt.stopListening();
                    handleUserSpeech(language === 'ms' ? 'Bilakah temujanji saya yang seterusnya?' : 'When is my next appointment?');
                  }}
                >
                  <Text style={styles.suggestionText}>
                    📅 {language === 'ms' ? 'Bila temujanji seterusnya?' : 'When is next appointment?'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.suggestionBubble}
                  onPress={() => {
                    stt.stopListening();
                    handleUserSpeech(language === 'ms' ? 'Saya rasa pening kepala hari ini' : 'I feel dizzy today');
                  }}
                >
                  <Text style={styles.suggestionText}>
                    🤢 {language === 'ms' ? 'Saya rasa pening kepala' : 'I feel dizzy'}
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
                    🚨 {language === 'ms' ? 'Tolong hubungi keluarga!' : 'Contact family!'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Conversation Log preview */}
        <View style={styles.logCard}>
          <Text style={styles.logCardTitle}>
            {t('elderTodayConversation')}
          </Text>
          {messages.slice(-3).map((msg, index) => (
            <View key={index} style={styles.logMessageRow}>
              <Text style={styles.logRoleText}>
                {msg.role === 'user' ? 'Susan: ' : 'AI: '}
              </Text>
              <Text style={styles.logMessageText} numberOfLines={2}>
                {msg.text}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Voice Control Pad */}
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

      {/* Persistent global switcher */}
      <RoleSwitcher />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F0F9FF', // Calming light sky-blue background
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4FE',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  langToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0D9488',
    marginLeft: 6,
  },
  contentScroll: {
    padding: 16,
    paddingBottom: 220,
  },
  reminderBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#B91C1C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    marginLeft: 8,
  },
  reminderBody: {
    fontSize: 15,
    color: '#7F1D1D',
    lineHeight: 22,
    marginBottom: 16,
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmIntakeBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmIntakeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },
  speakReminderBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSection: {
    marginBottom: 20,
  },
  companionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D9488',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  replyBox: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  replyText: {
    fontSize: 17,
    color: '#1E293B',
    lineHeight: 25,
    fontWeight: '500',
  },
  loadingPulse: {
    marginTop: 8,
    fontSize: 12,
    color: '#0D9488',
    fontStyle: 'italic',
  },
  transcriptContainer: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  transcriptHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
    color: '#0C4A6E',
    fontStyle: 'italic',
  },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
  },
  logMessageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  logRoleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  logMessageText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
  },
  controlPad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  simInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 48,
    width: '100%',
    marginBottom: 16,
  },
  simTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  sendTextBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 80,
  },
  pulseCircle: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(13, 148, 136, 0.25)',
  },
  micBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  micBtnActive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  micInstruction: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '600',
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionBubble: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '600',
  },
});






