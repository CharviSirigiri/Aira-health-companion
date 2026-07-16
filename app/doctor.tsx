import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { useTranslation } from '@/services/localization';
import {
  getMedications,
  getIntakeEvents,
  getHealthLogs,
  getMemories,
  addMemory,
  Medication,
  IntakeEvent,
  HealthLog,
  Memory
} from '@/services/database';

export default function DoctorPortal() {
  const { t } = useTranslation();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [intakeEvents, setIntakeEvents] = useState<IntakeEvent[]>([]);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [mems, setMems] = useState<Memory[]>([]);

  // Clinical note inputs
  const [noteContent, setNoteContent] = useState('');
  const [appointmentContent, setAppointmentContent] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const meds = await getMedications('elder-susan');
      setMedications(meds);
      const events = await getIntakeEvents('elder-susan');
      setIntakeEvents(events);
      const lg = await getHealthLogs('elder-susan');
      setLogs(lg);
      const m = await getMemories('elder-susan');
      setMems(m);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to calculate adherence
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

  const handleAddDoctorNote = async () => {
    if (!noteContent.trim()) return;
    try {
      await addMemory({
        elder_id: 'elder-susan',
        type: 'doctor-note',
        content: `Doktor Ramesh berpesan: ${noteContent.trim()}`,
      });
      setNoteContent('');
      await loadData();
      alert(t('doctorAddNoteSuccess'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAppointment = async () => {
    if (!appointmentContent.trim()) return;
    try {
      await addMemory({
        elder_id: 'elder-susan',
        type: 'appointment',
        content: `Temujanji klinik seterusnya ialah pada ${appointmentContent.trim()}`,
      });
      setAppointmentContent('');
      await loadData();
      alert(t('doctorScheduleApptSuccess'));
    } catch (e) {
      console.error(e);
    }
  };

  const stats = calculateAdherence();

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
        <View style={styles.titleArea}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={24} color="#10B981" />
          <Text style={styles.headerText}>{t('doctorClinicalReview')}</Text>
        </View>
        <Text style={styles.headerSub}>{t('doctorHeaderSub')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Adherence Rate Card */}
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

        {/* Since Last Visit Timeline */}
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

        {/* Susan's Companion Memory List */}
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  deltaBadge: {
    fontSize: 11,
    backgroundColor: '#ECFDF5',
    color: '#065F46',
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  cardInstruction: {
    fontSize: 13,
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
    marginRight: 24,
  },
  progressPercent: {
    fontSize: 22,
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
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  statVal: {
    fontSize: 14,
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
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  timelineBody: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  timelineSig: {
    fontSize: 10,
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
    fontSize: 10,
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
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});
