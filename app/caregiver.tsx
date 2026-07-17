import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  ActivityIndicator, 
  useWindowDimensions, 
  Modal, 
  Pressable 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { useTranslation } from '@/services/localization';
import {
  getElder,
  updateElder,
  getMedications,
  confirmMedication,
  rejectMedication,
  addPrescription,
  addMedication,
  getAlerts,
  getHealthLogs,
  markAlertNotified,
  getReminders,
  resetDatabase,
  loadDatabase,
  saveDatabase,
  Medication,
  HealthLog,
  Alert as AlertType,
  Elder,
  Reminder,
  Caregiver
} from '@/services/database';
import { parsePrescription } from '@/services/gemini';
import { triggerTestReminder, syncScheduledReminders } from '@/services/reminders';

export default function CaregiverDashboard() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  // Authentication & Onboarding state
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [onboardStep, setOnboardStep] = useState<number>(1);
  const [caregiverName, setCaregiverName] = useState<string>('');
  const [caregiverEmail, setCaregiverEmail] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [elderLanguage, setElderLanguage] = useState<'en' | 'ms'>('en');
  const [elderPersona, setElderPersona] = useState<string>('warm');

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'prescriptions' | 'routine'>('overview');

  // Core data states
  const [elder, setElder] = useState<Elder | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  // OCR Parsing States
  const [isParsing, setIsParsing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newParsedMeds, setNewParsedMeds] = useState<Medication[]>([]);
  const [appearances, setAppearances] = useState<{ [medId: string]: string }>({});
  const [sharingMed, setSharingMed] = useState<Medication | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Daily Routine States
  const [routine, setRoutine] = useState({
    wake: '07:00',
    breakfast: '08:00',
    lunch: '13:00',
    tea: '17:00',
    dinner: '20:00',
    sleep: '22:00',
  });

  const routineLabels: { [key: string]: any } = {
    wake: 'caregiverRoutineWake',
    breakfast: 'caregiverRoutineBreakfast',
    lunch: 'caregiverRoutineLunch',
    tea: 'caregiverRoutineTea',
    dinner: 'caregiverRoutineDinner',
    sleep: 'caregiverRoutineSleep',
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const e = await getElder('elder-susan');
      if (e) {
        setElder(e);
        setRoutine(e.routine_json);
        setElderLanguage(e.language);
        setElderPersona(e.persona || 'warm');
      }
      const meds = await getMedications('elder-susan');
      setMedications(meds);
      const alrts = await getAlerts('elder-susan');
      setAlerts(alrts);
      const lg = await getHealthLogs('elder-susan');
      setLogs(lg);
      const rems = await getReminders('elder-susan');
      setReminders(rems);

      // Check if caregiver was previously onboarded (custom name loaded)
      const db = await loadDatabase();
      const cg = db.caregivers.find((c: Caregiver) => c.elder_id === 'elder-susan');
      if (cg && cg.name && cg.name !== "Susan's Daughter") {
        setCaregiverName(cg.name);
        setIsOnboarded(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Onboarding Complete Handler (FR1 / FR2 / UJ-1)
  const handleCompleteOnboarding = async () => {
    if (!caregiverName.trim() || !caregiverEmail.trim() || !pairingCode.trim()) {
      alert('Please fill in all details.');
      return;
    }

    try {
      // 1. Update elder details
      const e = await getElder('elder-susan');
      if (e) {
        const updated = {
          ...e,
          language: elderLanguage,
          persona: elderPersona,
          routine_json: routine,
        };
        await updateElder(updated);
        setElder(updated);
      }

      // 2. Save caregiver profile in DB
      const db = await loadDatabase();
      const cg = db.caregivers.find((c: Caregiver) => c.elder_id === 'elder-susan');
      if (cg) {
        cg.name = caregiverName;
      }
      await saveDatabase(db);

      // 3. Sync reminders based on new routine timings
      await syncScheduledReminders();

      setIsOnboarded(true);
      await loadData();
      alert('Onboarding completed successfully! Elder device synchronized.');
    } catch (error) {
      console.error(error);
      alert('Failed to complete onboarding.');
    }
  };

  // Reset Onboarding / Log Out helper (for debugging/evaluation convenience)
  const handleResetPortal = async () => {
    try {
      await resetDatabase();
      setCaregiverName('');
      setCaregiverEmail('');
      setPairingCode('');
      setNewParsedMeds([]);
      setSelectedImage(null);
      setIsOnboarded(false);
      setOnboardStep(1);
      setActiveTab('overview');
      await loadData();
      alert('Caregiver portal has been reset to fresh onboarding state.');
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateRoutine = async () => {
    if (!elder) return;
    try {
      const updated = {
        ...elder,
        routine_json: routine,
      };
      await updateElder(updated);
      setElder(updated);
      alert(t('caregiverSuccessRoutine'));
    } catch (e) {
      console.error(e);
    }
  };

  // Prescription Upload and Parsing (FR5 / FR6)
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert("Permission to access camera roll is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedImage(asset.uri);
      triggerOcrParsing(asset.base64 || '');
    }
  };

  const handleSimulateUpload = () => {
    setSelectedImage('https://via.placeholder.com/300x400.png?text=Prescription+Sample');
    triggerOcrParsing('');
  };

  const triggerOcrParsing = async (base64: string) => {
    setIsParsing(true);
    setNewParsedMeds([]);
    try {
      const res = await parsePrescription(base64);
      
      const pres = await addPrescription({
        elder_id: 'elder-susan',
        photo_url: selectedImage || 'simulated',
        raw_parse_json: res,
        status: 'pending',
      });

      const medsToReview: Medication[] = [];
      for (const m of res.medications) {
        const added = await addMedication({
          prescription_id: pres.id,
          name: m.name,
          dose: m.dose,
          frequency: m.frequency,
          timing: m.timing,
          appearance: '',
          confidence: m.confidence,
        });
        medsToReview.push(added);
      }
      setNewParsedMeds(medsToReview);
    } catch (e) {
      console.error(e);
      alert('Failed to parse prescription.');
    } finally {
      setIsParsing(false);
    }
  };

  // Confirmation Gate Action (FR9 / AD-3)
  const handleConfirmMed = async (medId: string) => {
    const appText = appearances[medId] || '';
    if (!appText.trim()) {
      alert(t('caregiverErrNoAppearance'));
      return;
    }

    try {
      await confirmMedication(medId, appText);
      setNewParsedMeds(prev => prev.filter(m => m.id !== medId));
      await loadData();
      alert(t('caregiverSuccessVerified'));
    } catch (e) {
      console.error(e);
      alert("Error confirming medication.");
    }
  };

  const handleRejectMed = async (medId: string) => {
    try {
      await rejectMedication(medId);
      setNewParsedMeds(prev => prev.filter(m => m.id !== medId));
      await loadData();
      alert(t('caregiverSuccessRejected'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await markAlertNotified(alertId);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestAlarm = async (medId: string) => {
    const rem = reminders.find(r => r.medication_id === medId);
    if (!rem) {
      alert("No reminder found for this medication. Please verify it first.");
      return;
    }
    try {
      await triggerTestReminder(rem.id);
      alert("Test alarm scheduled! It will trigger on Susan's device in 2 seconds.");
    } catch (e) {
      console.error(e);
      alert("Failed to schedule test alarm.");
    }
  };

  // Pharmacist Share Trigger (FR10)
  const handleTriggerShare = (med: Medication) => {
    setSharingMed(med);
    setIsCopied(false);
  };

  const handleCopyShareLink = () => {
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Render Onboarding Views
  const renderOnboardingStep1 = () => (
    <View style={styles.onboardCard}>
      <Text style={styles.onboardTitle}>1. Create Caregiver Account</Text>
      <Text style={styles.onboardSub}>{`Create an account to synchronize data and coordinate care with Susan's clinical team.`}</Text>
      
      <Text style={styles.onboardLabel}>Your Name</Text>
      <TextInput
        style={styles.onboardInput}
        placeholder="e.g. Susan's Daughter"
        placeholderTextColor="#94A3B8"
        value={caregiverName}
        onChangeText={setCaregiverName}
      />

      <Text style={styles.onboardLabel}>Email Address</Text>
      <TextInput
        style={styles.onboardInput}
        placeholder="e.g. daughter@example.com"
        placeholderTextColor="#94A3B8"
        keyboardType="email-address"
        autoCapitalize="none"
        value={caregiverEmail}
        onChangeText={setCaregiverEmail}
      />

      <Text style={styles.onboardLabel}>Security Passcode</Text>
      <TextInput
        style={styles.onboardInput}
        placeholder="Enter safe passcode"
        placeholderTextColor="#94A3B8"
        secureTextEntry={true}
      />

      <TouchableOpacity 
        style={[styles.onboardBtn, (!caregiverName.trim() || !caregiverEmail.trim()) && styles.onboardBtnDisabled]}
        onPress={() => setOnboardStep(2)}
        disabled={!caregiverName.trim() || !caregiverEmail.trim()}
      >
        <Text style={styles.onboardBtnText}>{`Next: Link Susan's Device`}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOnboardingStep2 = () => (
    <View style={styles.onboardCard}>
      <Text style={styles.onboardTitle}>{`2. Sync Susan's Device`}</Text>
      <Text style={styles.onboardSub}>{`Enter the sync pairing code from Susan's voice assistant to link accounts.`}</Text>
      
      <View style={styles.pairingCodeBox}>
        <Text style={styles.pairingCodeLabel}>Elder Assistant Pairing Code:</Text>
        <Text style={styles.pairingCodeText}>AIRA-8902</Text>
      </View>

      <Text style={styles.onboardLabel}>Enter Pairing Code</Text>
      <TextInput
        style={styles.onboardInput}
        placeholder="e.g. AIRA-8902"
        placeholderTextColor="#94A3B8"
        autoCapitalize="characters"
        value={pairingCode}
        onChangeText={setPairingCode}
      />

      <Text style={styles.onboardLabel}>Elder Preferred Language</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, elderLanguage === 'en' && styles.toggleBtnActive]}
          onPress={() => setElderLanguage('en')}
        >
          <Text style={[styles.toggleBtnText, elderLanguage === 'en' && styles.toggleBtnTextActive]}>English</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, elderLanguage === 'ms' && styles.toggleBtnActive]}
          onPress={() => setElderLanguage('ms')}
        >
          <Text style={[styles.toggleBtnText, elderLanguage === 'ms' && styles.toggleBtnTextActive]}>Bahasa Melayu</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.onboardLabel}>Voice Persona</Text>
      <View style={styles.toggleRow}>
        {['warm', 'friendly', 'patient'].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.toggleBtn, elderPersona === p && styles.toggleBtnActive]}
            onPress={() => setElderPersona(p)}
          >
            <Text style={[styles.toggleBtnText, elderPersona === p && styles.toggleBtnTextActive]}>
              {p.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.btnNavRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setOnboardStep(1)}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.nextBtn, !pairingCode.trim() && styles.onboardBtnDisabled]}
          onPress={() => setOnboardStep(3)}
          disabled={!pairingCode.trim()}
        >
          <Text style={styles.onboardBtnText}>Next: Set Routine</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOnboardingStep3 = () => (
    <View style={styles.onboardCard}>
      <Text style={styles.onboardTitle}>3. Configure Routine Times</Text>
      <Text style={styles.onboardSub}>{`Set Susan's daily milestones. Medication reminders will align to these times naturally.`}</Text>
      
      <View style={styles.routineGridContainer}>
        {Object.keys(routine).map(key => (
          <View key={key} style={styles.routineRowInline}>
            <Text style={styles.routineLabelInline}>{t(routineLabels[key] || key).toUpperCase()}</Text>
            <TextInput
              style={styles.routineInputInline}
              value={routine[key as keyof typeof routine]}
              onChangeText={text => setRoutine(prev => ({ ...prev, [key]: text }))}
            />
          </View>
        ))}
      </View>

      <View style={styles.btnNavRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setOnboardStep(2)}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.nextBtn}
          onPress={handleCompleteOnboarding}
        >
          <Text style={styles.onboardBtnText}>Complete & Link</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isOnboarded) {
    return (
      <View style={styles.onboardContainer}>
        <View style={styles.onboardHeader}>
          <Text style={styles.onboardBrand}>AIRA CARE</Text>
          <View style={styles.stepsRow}>
            {[1, 2, 3].map(step => (
              <View 
                key={step} 
                style={[
                  styles.stepDot, 
                  onboardStep >= step && styles.stepDotActive,
                  onboardStep === step && styles.stepDotCurrent
                ]} 
              />
            ))}
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.onboardScroll}>
          {onboardStep === 1 && renderOnboardingStep1()}
          {onboardStep === 2 && renderOnboardingStep2()}
          {onboardStep === 3 && renderOnboardingStep3()}
        </ScrollView>
        <RoleSwitcher />
      </View>
    );
  }

  // Dashboard content components
  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Presence Indicator Card (FR34) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('caregiverSafetyPresence')}</Text>
        <View style={styles.presenceRow}>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.statusText}>{t('caregiverSusanActive')}</Text>
          </View>
          <Text style={styles.lastSeen}>
            {t('caregiverLastActive')}: {elder ? new Date(elder.last_interaction).toLocaleTimeString() : 'Recent'}
          </Text>
        </View>

        {/* Active Alerts */}
        {alerts.filter(a => !a.notified).length > 0 ? (
          <View style={styles.alertBox}>
            <Text style={styles.alertBoxTitle}>⚠️ {t('caregiverActiveAlerts')}</Text>
            {alerts.filter(a => !a.notified).map(al => (
              <View key={al.id} style={styles.alertItem}>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertText}>{al.trigger}</Text>
                  <Text style={styles.alertTime}>{new Date(al.at).toLocaleTimeString()}</Text>
                </View>
                <TouchableOpacity
                  style={styles.resolveBtn}
                  onPress={() => handleResolveAlert(al.id)}
                >
                  <Text style={styles.resolveBtnText}>{t('caregiverMarkResolved')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noAlertsText}>✅ {t('caregiverNoAlerts')}</Text>
        )}
      </View>

      {/* Passive Conversation Logs (FR26) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('caregiverPassiveLogs')}</Text>
        <Text style={styles.cardInstruction}>
          {t('caregiverPassiveInst')}
        </Text>
        {logs.length > 0 ? (
          logs.map(log => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <Text style={[styles.logType, log.significant && styles.significantLog]}>
                  {log.type.toUpperCase()} {log.significant && '⚠️'}
                </Text>
                <Text style={styles.logDate}>{new Date(log.at).toLocaleDateString()} {new Date(log.at).toLocaleTimeString()}</Text>
              </View>
              <Text style={styles.logBody}>{log.content}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>{t('caregiverNoLogs')}</Text>
        )}
      </View>
    </View>
  );

  const renderPrescriptionsTab = () => (
    <View style={styles.tabContent}>
      {/* Prescription Photo Upload (FR5 / FR6) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('caregiverNewPrescription')}</Text>
        <Text style={styles.cardInstruction}>
          {t('caregiverPrescriptionInst')}
        </Text>

        <View style={styles.uploadButtons}>
          <TouchableOpacity style={styles.pickImageBtn} onPress={handlePickImage}>
            <IconSymbol name="house.fill" size={20} color="#fff" />
            <Text style={styles.btnText}>{t('caregiverChooseImage')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.simulateBtn} onPress={handleSimulateUpload}>
            <Text style={styles.simulateBtnText}>{t('caregiverSimulateRx')}</Text>
          </TouchableOpacity>
        </View>

        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            {isParsing && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#D01C8B" />
                <Text style={styles.loadingText}>{t('caregiverGeminiParsing')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Review Parsed Medications Confirmation Gate (FR8 / FR9 / AD-3) */}
        {newParsedMeds.length > 0 && (
          <View style={styles.ocrReviewSection}>
            <Text style={styles.ocrHeading}>🔍 {t('caregiverVerifyTitle')}</Text>
            <Text style={styles.ocrSub}>
              {t('caregiverVerifySub')}
            </Text>

            {newParsedMeds.map(med => (
              <View key={med.id} style={styles.ocrMedItem}>
                <View style={styles.ocrMedHeader}>
                  <Text style={styles.ocrMedName}>{med.name}</Text>
                  {med.confidence < 0.8 && (
                    <View style={styles.warningBadge}>
                      <Text style={styles.warningText}>⚠️ {t('caregiverLowConfidence')} ({Math.round(med.confidence * 100)}%)</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.ocrMedDetail}>{t('caregiverDose')}: {med.dose}</Text>
                <Text style={styles.ocrMedDetail}>{t('caregiverFrequency')}: {med.frequency}</Text>
                <Text style={styles.ocrMedDetail}>{t('caregiverTiming')}: {med.timing}</Text>

                {/* Appearance Input Gate (AD-4) */}
                <Text style={styles.inputLabel}>{t('caregiverAppearanceLabel')}</Text>
                <TextInput
                  style={styles.appearanceInput}
                  placeholder={t('caregiverAppearancePlaceholder')}
                  placeholderTextColor="#94A3B8"
                  value={appearances[med.id] || ''}
                  onChangeText={txt => setAppearances(prev => ({ ...prev, [med.id]: txt }))}
                />

                <View style={styles.medActions}>
                  <TouchableOpacity
                    style={styles.confirmMedBtn}
                    onPress={() => handleConfirmMed(med.id)}
                  >
                    <Text style={styles.confirmMedBtnText}>{t('caregiverVerifyBtn')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.shareMedBtn}
                    onPress={() => handleTriggerShare(med)}
                  >
                    <IconSymbol name="paperplane.fill" size={16} color="#475569" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectMedBtn}
                    onPress={() => handleRejectMed(med.id)}
                  >
                    <Text style={styles.rejectMedBtnText}>{t('caregiverRejectBtn')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderRoutineTab = () => (
    <View style={styles.tabContent}>
      {/* Active Medications list */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('caregiverScheduledMeds')}</Text>
        {medications.filter(m => m.confirmed).length > 0 ? (
          medications.filter(m => m.confirmed).map(m => (
            <View key={m.id} style={styles.activeMedRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeMedName}>{m.name} ({m.dose})</Text>
                <Text style={styles.activeMedDetails}>{m.frequency} - {m.timing}</Text>
                <Text style={styles.activeMedAppearance}>{t('caregiverAppearance')}: {m.appearance}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => handleTestAlarm(m.id)} style={styles.actionIconBtn}>
                  <IconSymbol name="paperplane.fill" size={16} color="#0D9488" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRejectMed(m.id)} style={styles.actionIconBtn}>
                  <IconSymbol name="person.crop.circle.badge.exclamationmark" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>{t('caregiverNoMeds')}</Text>
        )}
      </View>

      {/* Routine Times Configuration (FR2) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('caregiverSusanRoutine')}</Text>
        <Text style={styles.cardInstruction}>
          {t('caregiverRoutineInst')}
        </Text>

        <View style={styles.routineGrid}>
          {Object.keys(routine).map(key => (
            <View key={key} style={styles.routineInputRow}>
              <Text style={styles.routineLabel}>{t(routineLabels[key] || key).toUpperCase()}:</Text>
              <TextInput
                style={styles.routineInput}
                value={routine[key as keyof typeof routine]}
                onChangeText={text => setRoutine(prev => ({ ...prev, [key]: text }))}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.saveRoutineBtn} onPress={handleUpdateRoutine}>
          <Text style={styles.saveRoutineBtnText}>{t('caregiverSaveRoutine')}</Text>
        </TouchableOpacity>
      </View>

      {/* Database Operations (Reset Portal) */}
      <View style={[styles.card, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
        <Text style={[styles.cardTitle, { color: '#DC2626' }]}>Administrative Operations</Text>
        <Text style={styles.cardInstruction}>
          Reset the portal status to simulate account onboarding and pairings from scratch.
        </Text>
        <TouchableOpacity style={styles.resetBtn} onPress={handleResetPortal}>
          <Text style={styles.resetBtnText}>Reset Portal & Onboarding</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.titleArea}>
            <IconSymbol name="paperplane.fill" size={24} color="#D01C8B" />
            <Text style={styles.headerText}>{t('caregiverPortal')}</Text>
          </View>
          <Text style={styles.headerSub}>
            Caregiver: <Text style={{ fontWeight: '600' }}>{caregiverName || "Susan's Daughter"}</Text> | Linked Elder: <Text style={{ fontWeight: '600' }}>Susan</Text>
          </Text>
        </View>
      </View>

      {/* Tab Selectors */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'prescriptions' && styles.tabItemActive]}
          onPress={() => setActiveTab('prescriptions')}
        >
          <Text style={[styles.tabText, activeTab === 'prescriptions' && styles.tabTextActive]}>Upload Rx</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'routine' && styles.tabItemActive]}
          onPress={() => setActiveTab('routine')}
        >
          <Text style={[styles.tabText, activeTab === 'routine' && styles.tabTextActive]}>Meds & Routine</Text>
        </TouchableOpacity>
      </View>

      {/* Main Responsive Grid layout */}
      <View style={styles.mainContainer}>
        {isDesktop ? (
          <View style={styles.desktopLayout}>
            {/* Sidebar info */}
            <View style={styles.sidebar}>
              <Text style={styles.sidebarTitle}>Patient Summary</Text>
              <View style={styles.patientInfoBox}>
                <Text style={styles.patientName}>Susan</Text>
                <Text style={styles.patientMeta}>Age: 70 | Malaysia Pilot</Text>
                <View style={styles.divider} />
                <Text style={styles.patientDetailLabel}>Primary Language</Text>
                <Text style={styles.patientDetailVal}>{elderLanguage === 'ms' ? 'Bahasa Melayu' : 'English'}</Text>
                <Text style={styles.patientDetailLabel}>Voice Persona</Text>
                <Text style={styles.patientDetailVal}>{elderPersona.toUpperCase()}</Text>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleResetPortal}>
                <Text style={styles.logoutBtnText}>Reset Portal</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView contentContainerStyle={styles.desktopContent}>
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'prescriptions' && renderPrescriptionsTab()}
              {activeTab === 'routine' && renderRoutineTab()}
            </ScrollView>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'prescriptions' && renderPrescriptionsTab()}
            {activeTab === 'routine' && renderRoutineTab()}
          </ScrollView>
        )}
      </View>

      {/* Pharmacist Share Modal (FR10) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={sharingMed !== null}
        onRequestClose={() => setSharingMed(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSharingMed(null)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share with Pharmacist</Text>
            <Text style={styles.modalSub}>Manual verification check shareable link configuration.</Text>

            {sharingMed && (
              <View style={styles.medDetailReviewBox}>
                <Text style={styles.reviewMedName}>{sharingMed.name} ({sharingMed.dose})</Text>
                <Text style={styles.reviewMedDetail}>{sharingMed.frequency} | {sharingMed.timing}</Text>
              </View>
            )}

            <Text style={styles.shareLinkLabel}>Verification URL:</Text>
            <View style={styles.shareLinkContainer}>
              <Text numberOfLines={1} style={styles.shareLinkText}>
                https://aira.care/verify/rx?id={sharingMed?.id || 'med-id'}
              </Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyShareLink}>
                <Text style={styles.copyBtnText}>{isCopied ? 'Copied' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>

            {/* Simulated QR Code */}
            <View style={styles.qrSimulatorBox}>
              <View style={styles.qrMockCode}>
                <View style={[styles.qrCorner, { top: 6, left: 6 }]} />
                <View style={[styles.qrCorner, { top: 6, right: 6 }]} />
                <View style={[styles.qrCorner, { bottom: 6, left: 6 }]} />
                <View style={styles.qrInnerBlock} />
              </View>
              <Text style={styles.qrInstruction}>Scan to check verified dosage</Text>
            </View>

            <TouchableOpacity 
              style={styles.whatsAppShareBtn}
              onPress={() => {
                alert(`Mock link sent to pharmacist! Link: https://aira.care/verify/rx?id=${sharingMed?.id}`);
                setSharingMed(null);
              }}
            >
              <Text style={styles.whatsAppBtnText}>Send to Pharmacist (Lee)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSharingMed(null)}>
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Persistent global switcher */}
      <RoleSwitcher />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  onboardContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
  },
  onboardHeader: {
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onboardBrand: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D01C8B',
    letterSpacing: 1,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
  },
  stepDotActive: {
    backgroundColor: '#D01C8B',
  },
  stepDotCurrent: {
    width: 24,
  },
  onboardScroll: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  onboardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  onboardSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 20,
  },
  onboardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 14,
    textTransform: 'uppercase',
  },
  onboardInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10,
  },
  onboardBtn: {
    backgroundColor: '#D01C8B',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  onboardBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  onboardBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  pairingCodeBox: {
    backgroundColor: '#FDF2F8',
    borderColor: '#FBCFE8',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  pairingCodeLabel: {
    fontSize: 11,
    color: '#BE185D',
    fontWeight: '600',
    marginBottom: 4,
  },
  pairingCodeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#BE185D',
    letterSpacing: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  toggleBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  toggleBtnActive: {
    borderColor: '#D01C8B',
    backgroundColor: '#FDF2F8',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#BE185D',
  },
  btnNavRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  backBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 2,
    height: 46,
    backgroundColor: '#D01C8B',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routineGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 12,
  },
  routineRowInline: {
    width: '46%',
    marginBottom: 10,
  },
  routineLabelInline: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  routineInputInline: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 13,
    color: '#0F172A',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleContainer: {
    flexDirection: 'column',
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 8,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#D01C8B',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#D01C8B',
  },
  mainContainer: {
    flex: 1,
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 250,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    padding: 20,
    justifyContent: 'space-between',
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  patientInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  patientMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  patientDetailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 8,
  },
  patientDetailVal: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    marginTop: 2,
  },
  logoutBtn: {
    height: 38,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  desktopContent: {
    flex: 1,
    padding: 24,
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
  },
  tabContent: {
    flexDirection: 'column',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  cardInstruction: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  lastSeen: {
    fontSize: 11,
    color: '#64748B',
  },
  alertBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  alertBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 10,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  alertInfo: {
    flex: 1,
    marginRight: 8,
  },
  alertText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
  },
  alertTime: {
    fontSize: 10,
    color: '#EF4444',
    marginTop: 2,
  },
  resolveBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  resolveBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  noAlertsText: {
    fontSize: 12,
    color: '#64748B',
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  pickImageBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#D01C8B',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  btnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  simulateBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulateBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 10,
    backgroundColor: '#F1F5F9',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 12,
    color: '#D01C8B',
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  ocrReviewSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  ocrHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  ocrSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 16,
  },
  ocrMedItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ocrMedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ocrMedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  warningBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#D97706',
  },
  ocrMedDetail: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 6,
  },
  appearanceInput: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    color: '#1E293B',
    marginBottom: 12,
  },
  medActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmMedBtn: {
    flex: 3,
    height: 38,
    backgroundColor: '#10B981',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmMedBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  shareMedBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  rejectMedBtn: {
    flex: 1.5,
    height: 38,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectMedBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  activeMedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activeMedName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  activeMedDetails: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  activeMedAppearance: {
    fontSize: 12,
    color: '#0D9488',
    fontWeight: '500',
    marginTop: 2,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  routineInputRow: {
    width: '47%',
    marginBottom: 10,
  },
  routineLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  routineInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 13,
    color: '#1E293B',
  },
  saveRoutineBtn: {
    height: 40,
    backgroundColor: '#475569',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  saveRoutineBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  resetBtn: {
    height: 38,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  resetBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  logItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  significantLog: {
    color: '#D97706',
  },
  logDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  logBody: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  medDetailReviewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  reviewMedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  reviewMedDetail: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  shareLinkLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  shareLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingLeft: 10,
    height: 38,
    marginBottom: 16,
    overflow: 'hidden',
  },
  shareLinkText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
  },
  copyBtn: {
    backgroundColor: '#475569',
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  qrSimulatorBox: {
    alignItems: 'center',
    marginVertical: 14,
  },
  qrMockCode: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#1E293B',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 3,
    borderColor: '#1E293B',
    backgroundColor: 'transparent',
  },
  qrInnerBlock: {
    width: 50,
    height: 50,
    backgroundColor: '#1E293B',
    opacity: 0.85,
  },
  qrInstruction: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '600',
  },
  whatsAppShareBtn: {
    backgroundColor: '#25D366',
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  whatsAppBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  closeModalBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  closeModalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
});
