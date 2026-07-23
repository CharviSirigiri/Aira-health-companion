import { supabase } from './supabase';

// Single pilot elder for the FYP scope. Call sites throughout the app pass
// the legacy hardcoded id 'elder-susan'; we resolve it to the real Supabase
// row id here so no caller needs to change.
const PILOT_ELDER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
function resolveElderId(elderId: string): string {
  return elderId === 'elder-susan' ? PILOT_ELDER_ID : elderId;
}

export interface Elder {
  id: string;
  name: string;
  language: 'en' | 'ms';
  routine_json: {
    wake: string;
    breakfast: string;
    lunch: string;
    tea: string;
    dinner: string;
    sleep: string;
  };
  persona: string;
  last_interaction: string;
  created_at: string;
}

export interface Caregiver {
  id: string;
  elder_id: string;
  name: string;
}

export interface Doctor {
  id: string;
  elder_id: string;
  name: string;
}

export interface Prescription {
  id: string;
  elder_id: string;
  photo_url: string;
  raw_parse_json: any;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
}

export interface Medication {
  id: string;
  prescription_id: string;
  name: string;
  dose: string;
  frequency: string;
  timing: string;
  appearance: string; // colour, shape, size (caregiver confirmed)
  appearance_photo_url?: string;
  confidence: number;
  confirmed: boolean;
}

export interface Reminder {
  id: string;
  medication_id: string;
  anchor: string; // e.g. 'breakfast', 'dinner'
  spoken_text: string;
}

export interface IntakeEvent {
  id: string;
  medication_id: string;
  taken: boolean;
  at: string;
}

export interface Memory {
  id: string;
  elder_id: string;
  type: 'appointment' | 'doctor-note' | 'session-summary' | 'fact';
  content: string;
  created_at: string;
}

export interface HealthLog {
  id: string;
  elder_id: string;
  type: 'symptom' | 'mood';
  content: string;
  significant: boolean;
  at: string;
}

export interface Alert {
  id: string;
  elder_id: string;
  trigger: string;
  notified: boolean;
  at: string;
}

export interface Consent {
  id: string;
  elder_id: string;
  scope: string;
  granted_at: string;
}

function mapIntakeEvent(row: any): IntakeEvent {
  return { id: row.id, medication_id: row.medication_id, taken: row.taken, at: row.timestamp };
}

function mapHealthLog(row: any): HealthLog {
  return { id: row.id, elder_id: row.elder_id, type: row.type, content: row.content, significant: row.significant, at: row.timestamp };
}

function mapAlert(row: any): Alert {
  return { id: row.id, elder_id: row.elder_id, trigger: row.trigger, notified: row.notified, at: row.timestamp };
}

// Database helper functions (API interface)

export async function getElder(elderId: string): Promise<Elder | undefined> {
  const { data, error } = await supabase.from('elder').select('*').eq('id', resolveElderId(elderId)).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function updateElder(elder: Elder): Promise<void> {
  const { error } = await supabase
    .from('elder')
    .update({ language: elder.language, persona: elder.persona, routine_json: elder.routine_json })
    .eq('id', elder.id);
  if (error) throw error;

  try {
    const { syncScheduledReminders } = require('./reminders');
    await syncScheduledReminders();
  } catch (error) {
    console.error('Failed to sync scheduled reminders after updateElder:', error);
  }
}

export async function getMedications(elderId: string): Promise<Medication[]> {
  const eid = resolveElderId(elderId);
  const { data: prescriptions, error: presError } = await supabase.from('prescription').select('id').eq('elder_id', eid);
  if (presError) throw presError;
  const presIds = (prescriptions || []).map(p => p.id);
  if (presIds.length === 0) return [];

  const { data, error } = await supabase.from('medication').select('*').in('prescription_id', presIds);
  if (error) throw error;
  return data || [];
}

export async function getMedicationById(medicationId: string): Promise<Medication | undefined> {
  const { data, error } = await supabase.from('medication').select('*').eq('id', medicationId).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function getReminderById(reminderId: string): Promise<Reminder | undefined> {
  const { data, error } = await supabase.from('reminder').select('*').eq('id', reminderId).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function addPrescription(prescription: Omit<Prescription, 'id' | 'created_at'>): Promise<Prescription> {
  const { data, error } = await supabase
    .from('prescription')
    .insert({
      elder_id: resolveElderId(prescription.elder_id),
      photo_url: prescription.photo_url,
      raw_parse_json: prescription.raw_parse_json,
      status: prescription.status,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addMedication(med: Omit<Medication, 'id' | 'confirmed'> & { confirmed?: boolean }): Promise<Medication> {
  const { data, error } = await supabase
    .from('medication')
    .insert({
      prescription_id: med.prescription_id,
      name: med.name,
      dose: med.dose,
      frequency: med.frequency,
      timing: med.timing,
      appearance: med.appearance || '',
      confidence: med.confidence,
      confirmed: med.confirmed ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getReminders(elderId: string): Promise<Reminder[]> {
  const meds = await getMedications(elderId);
  const medIds = meds.map(m => m.id);
  if (medIds.length === 0) return [];
  const { data, error } = await supabase.from('reminder').select('*').in('medication_id', medIds);
  if (error) throw error;
  return data || [];
}

// THE SAFETY GATE, enforced by the database service (AD-3):
// a reminder cannot be created for a medicine that isn't confirmed.
// (Also enforced at the database layer by the trigger_enforce_reminder_confirmation trigger.)
export async function addReminder(reminder: Omit<Reminder, 'id'>): Promise<Reminder> {
  const med = await getMedicationById(reminder.medication_id);
  if (!med) {
    throw new Error('Medication not found');
  }
  if (!med.confirmed) {
    throw new Error('Cannot create a reminder for an unconfirmed medication');
  }

  const { data, error } = await supabase
    .from('reminder')
    .insert({ medication_id: reminder.medication_id, anchor: reminder.anchor, spoken_text: reminder.spoken_text })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReminder(reminderId: string): Promise<void> {
  const { error } = await supabase.from('reminder').delete().eq('id', reminderId);
  if (error) throw error;
}

export async function confirmMedication(medicationId: string, appearance: string, appearancePhotoUrl?: string): Promise<void> {
  const med = await getMedicationById(medicationId);
  if (!med) throw new Error('Medication not found');

  const { error: updateError } = await supabase
    .from('medication')
    .update({ confirmed: true, appearance, appearance_photo_url: appearancePhotoUrl ?? null })
    .eq('id', medicationId);
  if (updateError) throw updateError;

  // Resolve the elder's language for the spoken reminder text.
  const { data: presRow, error: presError } = await supabase
    .from('prescription')
    .select('elder_id')
    .eq('id', med.prescription_id)
    .single();
  if (presError) throw presError;

  const { data: elderRow, error: elderError } = await supabase
    .from('elder')
    .select('language')
    .eq('id', presRow.elder_id)
    .single();
  if (elderError) throw elderError;

  // Auto-generate reminders based on timing/frequency
  // AD-4: Pill appearance is written only via the caregiver confirmation path
  const mapping: { [key: string]: string } = {
    'breakfast': 'breakfast',
    'sarapan': 'breakfast',
    'pagi': 'breakfast',
    'lunch': 'lunch',
    'tengahari': 'lunch',
    'dinner': 'dinner',
    'malam': 'dinner',
    'sleep': 'sleep',
    'tidur': 'sleep',
  };

  let anchor = 'breakfast';
  const timingLower = (med.timing || '').toLowerCase();
  for (const key of Object.keys(mapping)) {
    if (timingLower.includes(key)) {
      anchor = mapping[key];
      break;
    }
  }

  const spokenText = (elderRow.language === 'ms')
    ? `Sila ambil ubat ${med.name} (${med.dose}) anda sekarang. Ubat ini adalah ${appearance}.`
    : `Please take your ${med.name} (${med.dose}) now. It is a ${appearance}.`;

  // Replace any existing reminders for this medication with a fresh one.
  const { error: deleteError } = await supabase.from('reminder').delete().eq('medication_id', medicationId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from('reminder')
    .insert({ medication_id: medicationId, anchor, spoken_text: spokenText });
  if (insertError) throw insertError;

  try {
    const { syncScheduledReminders } = require('./reminders');
    await syncScheduledReminders();
  } catch (error) {
    console.error('Failed to sync scheduled reminders after confirmMedication:', error);
  }
}

export async function rejectMedication(medicationId: string): Promise<void> {
  // reminder/intake_event rows cascade-delete via their medication_id FK.
  const { error } = await supabase.from('medication').delete().eq('id', medicationId);
  if (error) throw error;

  try {
    const { syncScheduledReminders } = require('./reminders');
    await syncScheduledReminders();
  } catch (error) {
    console.error('Failed to sync scheduled reminders after rejectMedication:', error);
  }
}

export async function addIntakeEvent(event: Omit<IntakeEvent, 'id' | 'at'>): Promise<IntakeEvent> {
  const { data, error } = await supabase
    .from('intake_event')
    .insert({ medication_id: event.medication_id, taken: event.taken })
    .select()
    .single();
  if (error) throw error;
  return mapIntakeEvent(data);
}

export async function getIntakeEvents(elderId: string): Promise<IntakeEvent[]> {
  const meds = await getMedications(elderId);
  const medIds = meds.map(m => m.id);
  if (medIds.length === 0) return [];
  const { data, error } = await supabase.from('intake_event').select('*').in('medication_id', medIds);
  if (error) throw error;
  return (data || []).map(mapIntakeEvent);
}

export async function getMemories(elderId: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memory')
    .select('*')
    .eq('elder_id', resolveElderId(elderId))
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addMemory(memory: Omit<Memory, 'id' | 'created_at'>): Promise<Memory> {
  const { data, error } = await supabase
    .from('memory')
    .insert({ elder_id: resolveElderId(memory.elder_id), type: memory.type, content: memory.content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getHealthLogs(elderId: string): Promise<HealthLog[]> {
  const { data, error } = await supabase
    .from('health_log')
    .select('*')
    .eq('elder_id', resolveElderId(elderId))
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapHealthLog);
}

export async function addHealthLog(log: Omit<HealthLog, 'id' | 'at'>): Promise<HealthLog> {
  const { data, error } = await supabase
    .from('health_log')
    .insert({ elder_id: resolveElderId(log.elder_id), type: log.type, content: log.content, significant: log.significant })
    .select()
    .single();
  if (error) throw error;
  return mapHealthLog(data);
}

export async function getAlerts(elderId: string): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('alert')
    .select('*')
    .eq('elder_id', resolveElderId(elderId))
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAlert);
}

export async function addAlert(alert: Omit<Alert, 'id' | 'at' | 'notified'>): Promise<Alert> {
  const { data, error } = await supabase
    .from('alert')
    .insert({ elder_id: resolveElderId(alert.elder_id), trigger: alert.trigger, notified: false })
    .select()
    .single();
  if (error) throw error;
  return mapAlert(data);
}

export async function markAlertNotified(alertId: string): Promise<void> {
  const { error } = await supabase.from('alert').update({ notified: true }).eq('id', alertId);
  if (error) throw error;
}

// Clears intake history for an elder's medications (evaluation/demo convenience).
// Scoped to intake_event only — this is a shared production database now, so a
// full-database wipe (as the old local-mock resetDatabase() did) is no longer safe.
export async function resetIntakeHistory(elderId: string): Promise<void> {
  const meds = await getMedications(elderId);
  const medIds = meds.map(m => m.id);
  if (medIds.length === 0) return;
  const { error } = await supabase.from('intake_event').delete().in('medication_id', medIds);
  if (error) throw error;
}
