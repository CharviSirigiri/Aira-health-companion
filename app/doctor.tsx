import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  useWindowDimensions 
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { useTranslation } from '@/services/localization';
import {
  getMedications,
  getIntakeEvents,
  getHealthLogs,
  getMemories,
  addMemory,
  resetDatabase,
  Medication,
  IntakeEvent,
  HealthLog,
  Memory
} from '@/services/database';

export default function DoctorPortal() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  // Authentication & Selection States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [doctorPasscode, setDoctorPasscode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Patient Data States
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [medications, setMedications] = useState<Medication[]>([]);
  const [intakeEvents, setIntakeEvents] = useState<IntakeEvent[]>([]);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [mems, setMems] = useState<Memory[]>([]);

  // Clinical inputs
  const [noteContent, setNoteContent] = useState('');
  const [appointmentContent, setAppointmentContent] = useState('');

  // Sample static patient list for doctor
  const patients = [
    {
      id: 'elder-susan',
      name: 'Susan',
      age: 70,
      gender: 'Female',
      conditions: 'Diabetes Type II, Hypertension, Hypothyroidism',
      caregiver: "Susan's Daughter",
      lastVisit: '2026-07-10'
    },
    {
      id: 'patient-abu',
      name: 'Abu Bin Bakar',
      age: 68,
      gender: 'Male',
      conditions: 'Chronic Kidney Disease, Gout',
      caregiver: 'Ahmad (Son)',
      lastVisit: '2026-06-25'
    },
    {
      id: 'patient-mei',
      name: 'Mei Ling Tan',
      age: 74,
      gender: 'Female',
      conditions: 'Osteoarthritis, Mild Cognitive Impairment',
      caregiver: 'Tan Sze (Daughter)',
      lastVisit: '2026-07-02'
    }
  ];

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientData(selectedPatientId);
    }
  }, [selectedPatientId]);

  const loadPatientData = async (patientId: string) => {
    try {
      const meds = await getMedications(patientId);
      setMedications(meds);
      const events = await getIntakeEvents(patientId);
      setIntakeEvents(events);
      const lg = await getHealthLogs(patientId);
      setLogs(lg);
      const m = await getMemories(patientId);
      setMems(m);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = () => {
    if (!doctorName.trim() || !doctorPasscode.trim()) {
      alert('Please enter a clinical name and passcode PIN.');
      return;
    }
    setIsLoggedIn(true);
  };

  const handleAddDoctorNote = async () => {
    if (!noteContent.trim() || !selectedPatientId) return;
    try {
      await addMemory({
        elder_id: selectedPatientId,
        type: 'doctor-note',
        content: `Doktor Ramesh berpesan: ${noteContent.trim()}`,
      });
      setNoteContent('');
      await loadPatientData(selectedPatientId);
      alert(t('doctorAddNoteSuccess'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAppointment = async () => {
    if (!appointmentContent.trim() || !selectedPatientId) return;
    try {
      await addMemory({
        elder_id: selectedPatientId,
        type: 'appointment',
        content: `Temujanji klinik seterusnya ialah pada ${appointmentContent.trim()}`,
      });
      setAppointmentContent('');
      await loadPatientData(selectedPatientId);
      alert(t('doctorScheduleApptSuccess'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPatientData = async () => {
    if (!selectedPatientId) return;
    try {
      await resetDatabase();
      await loadPatientData(selectedPatientId);
      alert('Patient intake history reset for evaluation simulation.');
    } catch (e) {
      console.error(e);
    }
  };

  const calculateAdherence = () => {
    if (intakeEvents.length === 0) return { rate: 100, taken: 0, total: 0 };
    const taken = intakeEvents.filter(e => e.taken).length;
    const total = intakeEvents.length;
    return {
      rate: Math.round((taken / total) * 100),
      taken,
      total
    };
  };

  const stats = calculateAdherence();
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.conditions.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Login screen layout
  if (!isLoggedIn) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.loginCard}>
          <View style={styles.clinicalHeader}>
            <IconSymbol name="chevron.left.forwardslash.chevron.right" size={28} color="#10B981" />
            <Text style={styles.clinicalTitle}>Clinical Access Portal</Text>
          </View>
          <Text style={styles.clinicalSub}>{`AIRA Doctor's Web Dashboard - Secure Clinical Verification.`}</Text>
          
          <Text style={styles.loginLabel}>Clinical Doctor Name</Text>
          <TextInput
            style={styles.loginInput}
            placeholder="e.g. Dr. Ramesh"
            placeholderTextColor="#94A3B8"
            value={doctorName}
            onChangeText={setDoctorName}
          />

          <Text style={styles.loginLabel}>Clinical PIN Passcode</Text>
          <TextInput
            style={styles.loginInput}
            placeholder="Enter clinical PIN code"
            placeholderTextColor="#94A3B8"
            secureTextEntry={true}
            value={doctorPasscode}
            onChangeText={setDoctorPasscode}
          />

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>Authorized Clinical Login</Text>
          </TouchableOpacity>
        </View>
        <RoleSwitcher />
      </View>
    );
  }

  // Patient Selection layout
  if (!selectedPatientId) {
    return (
      <View style={styles.selectContainer}>
        <View style={styles.selectHeader}>
          <Text style={styles.selectTitle}>Clinician Panel: {doctorName}</Text>
          <TouchableOpacity style={styles.signOutBtn} onPress={() => setIsLoggedIn(false)}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.selectScroll}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search patients by name or condition..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <Text style={styles.sectionHeading}>My Active Patient List</Text>
          {filteredPatients.map(p => (
            <TouchableOpacity 
              key={p.id} 
              style={styles.patientListItem}
              onPress={() => setSelectedPatientId(p.id)}
            >
              <View style={styles.patientListMain}>
                <Text style={styles.patientListName}>{p.name}</Text>
                <Text style={styles.patientListMeta}>{p.gender}, {p.age} yrs | Last Visit: {p.lastVisit}</Text>
                <Text style={styles.patientListConditions}>Conditions: {p.conditions}</Text>
              </View>
              <View style={styles.openBtn}>
                <Text style={styles.openBtnText}>Open Review</Text>
                <IconSymbol name="chevron.left.forwardslash.chevron.right" size={14} color="#10B981" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <RoleSwitcher />
      </View>
    );
  }

  // Loaded Patient dashboard
  const activePatient = patients.find(p => p.id === selectedPatientId);

  return (
    <View style={styles.container}>
      {/* Watermark Indicator */}
      <View style={styles.watermark}>
        <Text style={styles.watermarkText}>
          ⚠️ {t('doctorWatermark')}
        </Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setSelectedPatientId(null)}
          >
            <IconSymbol name="chevron.left.forwardslash.chevron.right" size={16} color="#64748B" />
            <Text style={styles.backButtonText}>Patients List</Text>
          </TouchableOpacity>
          <View style={styles.titleArea}>
            <IconSymbol name="chevron.left.forwardslash.chevron.right" size={24} color="#10B981" />
            <Text style={styles.headerText}>{t('doctorClinicalReview')}</Text>
          </View>
        </View>
        <Text style={styles.headerSub}>
          Patient: <Text style={{ fontWeight: '600' }}>{activePatient?.name} ({activePatient?.age} yrs, {activePatient?.gender})</Text> | Chronic: <Text style={{ fontStyle: 'italic' }}>{activePatient?.conditions}</Text>
        </Text>
      </View>

      {/* Content wrapper with responsiveness */}
      <View style={styles.contentWrapper}>
        {isDesktop ? (
          <View style={styles.desktopSplitLayout}>
            {/* Left sidebar: Stats, appointments, actions */}
            <View style={styles.clinicalSidebar}>
              {/* Adherence Rate Card */}
              <View style={styles.sidebarCard}>
                <Text style={styles.cardTitle}>{t('doctorAdherenceSummary')}</Text>
                <View style={styles.adherenceStatsRow}>
                  <View style={styles.circleProgressContainer}>
                    <Text style={styles.progressPercent}>{stats.rate}%</Text>
                    <Text style={styles.progressSub}>{t('doctorAdherence')}</Text>
                  </View>
                  <View style={styles.statsDetails}>
                    <Text style={styles.statLabel}>{t('doctorTotalLogs')}:</Text>
                    <Text style={styles.statVal}>{stats.total} {t('doctorTotalLogsSuffix')}</Text>
                    <Text style={styles.statLabel}>{t('doctorSuccessfulIntakes')}:</Text>
                    <Text style={styles.statVal}>{stats.taken} {t('doctorSuccessfulIntakesSuffix')}</Text>
                  </View>
                </View>
              </View>

              {/* Reset patient data trigger */}
              <View style={styles.sidebarCard}>
                <Text style={styles.cardTitle}>Simulate Reset</Text>
                <Text style={styles.cardInstruction}>
                  Clear Susans intake timelines to evaluate adherence tracking behavior.
                </Text>
                <TouchableOpacity style={styles.resetTimelineBtn} onPress={handleResetPatientData}>
                  <Text style={styles.resetTimelineBtnText}>Reset Adherence Timelines</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Right details scrollpane */}
            <ScrollView contentContainerStyle={styles.desktopScrollPane}>
              {/* Timeline since last visit */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>{t('doctorSinceLastVisit')}</Text>
                  <Text style={styles.deltaBadge}>{t('doctor7DayDelta')}</Text>
                </View>
                <Text style={styles.cardInstruction}>
                  {t('doctorSinceLastVisitInst')}
                </Text>

                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <View key={log.id} style={[styles.timelineItem, index === 0 && styles.firstTimelineItem]}>
                      <View style={styles.timelinePoint} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineDate}>
                          {new Date(log.at).toLocaleDateString()} at {new Date(log.at).toLocaleTimeString()}
                        </Text>
                        <Text style={styles.timelineBody}>{log.content}</Text>
                        {log.significant && <Text style={styles.timelineSig}>⚠️ {t('caregiverSignificant')}</Text>}
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>{t('doctorNoSymptoms')}</Text>
                )}
              </View>

              {/* Clinical Note Writer */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('doctorWriteNoteTitle')}</Text>
                <Text style={styles.cardInstruction}>
                  {t('doctorWriteNoteInst')}
                </Text>

                <TextInput
                  style={styles.textArea}
                  placeholder={t('doctorNotePlaceholder')}
                  placeholderTextColor="#94A3B8"
                  multiline={true}
                  numberOfLines={3}
                  value={noteContent}
                  onChangeText={setNoteContent}
                />
                <TouchableOpacity style={styles.submitBtn} onPress={handleAddDoctorNote}>
                  <Text style={styles.submitBtnText}>{t('doctorAddNoteBtn')}</Text>
                </TouchableOpacity>
              </View>

              {/* Appointment Scheduler */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('doctorScheduleApptTitle')}</Text>
                <Text style={styles.cardInstruction}>
                  {t('doctorScheduleApptInst')}
                </Text>

                <TextInput
                  style={styles.textInput}
                  placeholder={t('doctorApptPlaceholder')}
                  placeholderTextColor="#94A3B8"
                  value={appointmentContent}
                  onChangeText={setAppointmentContent}
                />
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#10B981' }]} onPress={handleAddAppointment}>
                  <Text style={styles.submitBtnText}>{t('doctorScheduleApptBtn')}</Text>
                </TouchableOpacity>
              </View>

              {/* Active Memories */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('doctorActiveMemories')}</Text>
                {mems.length > 0 ? (
                  mems.map(mem => (
                    <View key={mem.id} style={styles.memRow}>
                      <View style={styles.memHeader}>
                        <Text style={styles.memType}>{mem.type.toUpperCase()}</Text>
                        <Text style={styles.memDate}>{new Date(mem.created_at).toLocaleDateString()}</Text>
                      </View>
                      <Text style={styles.memBody}>{mem.content}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>{t('doctorNoMemories')}</Text>
                )}
              </View>
            </ScrollView>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            {/* Adherence Summary */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('doctorAdherenceSummary')}</Text>
              <View style={styles.adherenceStatsRow}>
                <View style={styles.circleProgressContainer}>
                  <Text style={styles.progressPercent}>{stats.rate}%</Text>
                  <Text style={styles.progressSub}>{t('doctorAdherence')}</Text>
                </View>
                <View style={styles.statsDetails}>
                  <Text style={styles.statLabel}>{t('doctorTotalLogs')}:</Text>
                  <Text style={styles.statVal}>{stats.total} {t('doctorTotalLogsSuffix')}</Text>
                  <Text style={styles.statLabel}>{t('doctorSuccessfulIntakes')}:</Text>
                  <Text style={styles.statVal}>{stats.taken} {t('doctorSuccessfulIntakesSuffix')}</Text>
                </View>
              </View>
            </View>

            {/* Since Last Visit */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>{t('doctorSinceLastVisit')}</Text>
                <Text style={styles.deltaBadge}>{t('doctor7DayDelta')}</Text>
              </View>
              <Text style={styles.cardInstruction}>
                {t('doctorSinceLastVisitInst')}
              </Text>

              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <View key={log.id} style={[styles.timelineItem, index === 0 && styles.firstTimelineItem]}>
                    <View style={styles.timelinePoint} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineDate}>
                        {new Date(log.at).toLocaleDateString()} at {new Date(log.at).toLocaleTimeString()}
                      </Text>
                      <Text style={styles.timelineBody}>{log.content}</Text>
                      {log.significant && <Text style={styles.timelineSig}>⚠️ {t('caregiverSignificant')}</Text>}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>{t('doctorNoSymptoms')}</Text>
              )}
            </View>

            {/* Clinical Note Writer */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('doctorWriteNoteTitle')}</Text>
              <Text style={styles.cardInstruction}>
                {t('doctorWriteNoteInst')}
              </Text>

              <TextInput
                style={styles.textArea}
                placeholder={t('doctorNotePlaceholder')}
                placeholderTextColor="#94A3B8"
                multiline={true}
                numberOfLines={3}
                value={noteContent}
                onChangeText={setNoteContent}
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddDoctorNote}>
                <Text style={styles.submitBtnText}>{t('doctorAddNoteBtn')}</Text>
              </TouchableOpacity>
            </View>

            {/* Appointment Scheduler */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('doctorScheduleApptTitle')}</Text>
              <Text style={styles.cardInstruction}>
                {t('doctorScheduleApptInst')}
              </Text>

              <TextInput
                style={styles.textInput}
                placeholder={t('doctorApptPlaceholder')}
                placeholderTextColor="#94A3B8"
                value={appointmentContent}
                onChangeText={setAppointmentContent}
              />
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#10B981' }]} onPress={handleAddAppointment}>
                <Text style={styles.submitBtnText}>{t('doctorScheduleApptBtn')}</Text>
              </TouchableOpacity>
            </View>

            {/* Active Memories */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('doctorActiveMemories')}</Text>
              {mems.length > 0 ? (
                mems.map(mem => (
                  <View key={mem.id} style={styles.memRow}>
                    <View style={styles.memHeader}>
                      <Text style={styles.memType}>{mem.type.toUpperCase()}</Text>
                      <Text style={styles.memDate}>{new Date(mem.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.memBody}>{mem.content}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>{t('doctorNoMemories')}</Text>
              )}
            </View>

            {/* Simulation Operations */}
            <View style={[styles.card, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.cardTitle, { color: '#EF4444' }]}>Administrative Operations</Text>
              <TouchableOpacity style={styles.resetBtnMobile} onPress={handleResetPatientData}>
                <Text style={styles.resetBtnMobileText}>Reset Patient Adherence History</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
      <RoleSwitcher />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loginCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  clinicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clinicalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#065F46',
    marginLeft: 8,
  },
  clinicalSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 20,
  },
  loginLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 14,
    textTransform: 'uppercase',
  },
  loginInput: {
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
  loginBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  selectContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  selectHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  signOutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  signOutText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  selectScroll: {
    padding: 20,
  },
  searchBox: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    color: '#1E293B',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  patientListItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  patientListMain: {
    flex: 1,
    marginRight: 10,
  },
  patientListName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  patientListMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  patientListConditions: {
    fontSize: 12,
    color: '#0D9488',
    marginTop: 4,
    fontWeight: '500',
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openBtnText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  watermark: {
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  watermarkText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backButtonText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 8,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  contentWrapper: {
    flex: 1,
  },
  desktopSplitLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  clinicalSidebar: {
    width: 300,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    padding: 20,
    gap: 16,
  },
  sidebarCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resetTimelineBtn: {
    height: 38,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  resetTimelineBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  desktopScrollPane: {
    flex: 1,
    padding: 24,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  deltaBadge: {
    fontSize: 10,
    backgroundColor: '#ECFDF5',
    color: '#065F46',
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  cardInstruction: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  adherenceStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleProgressContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  progressPercent: {
    fontSize: 20,
    fontWeight: '800',
    color: '#065F46',
  },
  progressSub: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  statsDetails: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  statVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    position: 'relative',
    paddingLeft: 20,
    paddingBottom: 16,
    borderLeftWidth: 1.5,
    borderLeftColor: '#E2E8F0',
  },
  firstTimelineItem: {
    borderLeftColor: '#E2E8F0',
  },
  timelinePoint: {
    position: 'absolute',
    left: -6.5,
    top: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  timelineContent: {
    flex: 1,
  },
  timelineDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 4,
  },
  timelineBody: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 18,
  },
  timelineSig: {
    fontSize: 9,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 4,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1E293B',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#1E293B',
    marginBottom: 12,
  },
  submitBtn: {
    height: 42,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  memRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  memHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  memType: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    backgroundColor: '#E2E8F0',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  memDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  memBody: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  resetBtnMobile: {
    height: 38,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  resetBtnMobileText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
