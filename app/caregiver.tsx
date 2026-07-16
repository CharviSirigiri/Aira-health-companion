import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator } from 'react-native';
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
  Medication,
  HealthLog,
  Alert as AlertType,
  Elder
} from '@/services/database';
import { parsePrescription } from '@/services/gemini';

export default function CaregiverDashboard() {
  const { t } = useTranslation();
  const [elder, setElder] = useState<Elder | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  
  // OCR Parsing States
  const [isParsing, setIsParsing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newParsedMeds, setNewParsedMeds] = useState<Medication[]>([]);
  const [appearances, setAppearances] = useState<{ [medId: string]: string }>({});

  // Onboarding Routine States
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
      }
      const meds = await getMedications('elder-susan');
      setMedications(meds);
      const alrts = await getAlerts('elder-susan');
      setAlerts(alrts);
      const lg = await getHealthLogs('elder-susan');
      setLogs(lg);
    } catch (err) {
      console.error(err);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <IconSymbol name="paperplane.fill" size={24} color="#D01C8B" />
          <Text style={styles.headerText}>{t('caregiverPortal')}</Text>
        </View>
        <Text style={styles.headerSub}>{t('caregiverHeaderSub')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
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

        {/* Active Medications list */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('caregiverScheduledMeds')}</Text>
          {medications.filter(m => m.confirmed).length > 0 ? (
            medications.filter(m => m.confirmed).map(m => (
              <View key={m.id} style={styles.activeMedRow}>
                <View>
                  <Text style={styles.activeMedName}>{m.name} ({m.dose})</Text>
                  <Text style={styles.activeMedDetails}>{m.frequency} - {m.timing}</Text>
                  <Text style={styles.activeMedAppearance}>{t('caregiverAppearance')}: {m.appearance}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRejectMed(m.id)}>
                  <IconSymbol name="person.crop.circle.badge.exclamationmark" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('caregiverNoMeds')}</Text>
          )}
        </View>
      </ScrollView>

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
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 8,
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  cardInstruction: {
    fontSize: 13,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  lastSeen: {
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
  },
  alertTime: {
    fontSize: 11,
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
    fontSize: 11,
    fontWeight: '600',
  },
  noAlertsText: {
    fontSize: 13,
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
    fontSize: 14,
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
    fontSize: 14,
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
    fontSize: 13,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  ocrSub: {
    fontSize: 12,
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
    fontSize: 15,
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
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  ocrMedDetail: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 13,
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
    flex: 2,
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
  rejectMedBtn: {
    flex: 1,
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
    fontSize: 11,
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
    fontSize: 11,
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
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  activeMedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
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
});
