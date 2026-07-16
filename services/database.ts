import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const DB_FILE_PATH = (FileSystem.documentDirectory || '') + 'health_companion_db.json';

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

export interface DatabaseSchema {
  elders: Elder[];
  caregivers: Caregiver[];
  doctors: Doctor[];
  prescriptions: Prescription[];
  medications: Medication[];
  reminders: Reminder[];
  intake_events: IntakeEvent[];
  memories: Memory[];
  health_logs: HealthLog[];
  alerts: Alert[];
  consents: Consent[];
}

const DEFAULT_DB: DatabaseSchema = {
  elders: [
    {
      id: 'elder-susan',
      name: 'Susan',
      language: 'en',
      routine_json: {
        wake: '07:00',
        breakfast: '08:00',
        lunch: '13:00',
        tea: '17:00',
        dinner: '20:00',
        sleep: '22:00',
      },
      persona: 'warm',
      last_interaction: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ],
  caregivers: [
    {
      id: 'caregiver-daughter',
      elder_id: 'elder-susan',
      name: "Susan's Daughter",
    },
  ],
  doctors: [
    {
      id: 'doctor-ramesh',
      elder_id: 'elder-susan',
      name: 'Dr. Ramesh',
    },
  ],
  prescriptions: [],
  medications: [
    {
      id: 'med-metformin',
      prescription_id: 'initial',
      name: 'Metformin',
      dose: '500mg',
      frequency: 'Once daily',
      timing: 'Breakfast',
      appearance: 'Small round white pill',
      confidence: 1.0,
      confirmed: true,
    },
  ],
  reminders: [
    {
      id: 'rem-metformin',
      medication_id: 'med-metformin',
      anchor: 'breakfast',
      spoken_text: 'Please take your Metformin 500mg now. It is a small round white pill.',
    },
  ],
  intake_events: [
    {
      id: 'intake-1',
      medication_id: 'med-metformin',
      taken: true,
      at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    },
  ],
  memories: [
    {
      id: 'mem-1',
      elder_id: 'elder-susan',
      type: 'doctor-note',
      content: 'Doctor Ramesh advised to reduce sugar intake and always take your diabetes medication after breakfast.',
      created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 'mem-2',
      elder_id: 'elder-susan',
      type: 'appointment',
      content: 'Next clinic appointment is scheduled for next Thursday at 10:00 AM at the Health Clinic.',
      created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    },
  ],
  health_logs: [
    {
      id: 'log-1',
      elder_id: 'elder-susan',
      type: 'symptom',
      content: 'Felt slightly dizzy in the afternoon.',
      significant: true,
      at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
  ],
  alerts: [],
  consents: [
    {
      id: 'consent-1',
      elder_id: 'elder-susan',
      scope: 'all',
      granted_at: new Date().toISOString(),
    },
  ],
};

let cachedDb: DatabaseSchema | null = null;

// Synchronous operations for simplicity, but reads from disk when needed
export async function loadDatabase(): Promise<DatabaseSchema> {
  if (cachedDb) return cachedDb;

  try {
    if (Platform.OS === 'web') {
      const data = localStorage.getItem('health_companion_db');
      if (data) {
        cachedDb = JSON.parse(data);
        return cachedDb!;
      }
    } else {
      const fileInfo = await FileSystem.getInfoAsync(DB_FILE_PATH);
      if (fileInfo.exists) {
        const data = await FileSystem.readAsStringAsync(DB_FILE_PATH);
        cachedDb = JSON.parse(data);
        return cachedDb!;
      }
    }
  } catch (error) {
    console.error('Error loading database, falling back to default:', error);
  }

  // Populate default if not found
  cachedDb = JSON.parse(JSON.stringify(DEFAULT_DB));
  await saveDatabase(cachedDb!);
  return cachedDb!;
}

export async function saveDatabase(db: DatabaseSchema): Promise<void> {
  cachedDb = db;
  try {
    const dataStr = JSON.stringify(db, null, 2);
    if (Platform.OS === 'web') {
      localStorage.setItem('health_companion_db', dataStr);
    } else {
      await FileSystem.writeAsStringAsync(DB_FILE_PATH, dataStr);
    }
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

export async function resetDatabase(): Promise<void> {
  cachedDb = JSON.parse(JSON.stringify(DEFAULT_DB));
  await saveDatabase(cachedDb!);
}

// Database helper functions (API interface)

export async function getElder(elderId: string): Promise<Elder | undefined> {
  const db = await loadDatabase();
  return db.elders.find(e => e.id === elderId);
}

export async function updateElder(elder: Elder): Promise<void> {
  const db = await loadDatabase();
  const idx = db.elders.findIndex(e => e.id === elder.id);
  if (idx !== -1) {
    db.elders[idx] = elder;
    await saveDatabase(db);
  }
}

export async function getMedications(elderId: string): Promise<Medication[]> {
  const db = await loadDatabase();
  // Join prescription and medication to filter by elder_id
  const prescriptions = db.prescriptions.filter(p => p.elder_id === elderId);
  const pIds = new Set(prescriptions.map(p => p.id));
  
  // Also include the 'initial' medications that are always visible
  return db.medications.filter(m => m.prescription_id === 'initial' || pIds.has(m.prescription_id));
}

export async function addPrescription(prescription: Omit<Prescription, 'id' | 'created_at'>): Promise<Prescription> {
  const db = await loadDatabase();
  const newPrescription: Prescription = {
    ...prescription,
    id: `pres-${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString()
  };
  db.prescriptions.push(newPrescription);
  await saveDatabase(db);
  return newPrescription;
}

export async function addMedication(med: Omit<Medication, 'id' | 'confirmed'> & { confirmed?: boolean }): Promise<Medication> {
  const db = await loadDatabase();
  const newMed: Medication = {
    ...med,
    id: `med-${Math.random().toString(36).substr(2, 9)}`,
    confirmed: med.confirmed ?? false
  };
  db.medications.push(newMed);
  await saveDatabase(db);
  return newMed;
}

export async function getReminders(elderId: string): Promise<Reminder[]> {
  const db = await loadDatabase();
  const meds = await getMedications(elderId);
  const medIds = new Set(meds.map(m => m.id));
  return db.reminders.filter(r => medIds.has(r.medication_id));
}

// THE SAFETY GATE, enforced by the database service (AD-3):
// a reminder cannot be created for a medicine that isn't confirmed.
export async function addReminder(reminder: Omit<Reminder, 'id'>): Promise<Reminder> {
  const db = await loadDatabase();
  
  const med = db.medications.find(m => m.id === reminder.medication_id);
  if (!med) {
    throw new Error('Medication not found');
  }
  if (!med.confirmed) {
    throw new Error('Cannot create a reminder for an unconfirmed medication');
  }

  const newReminder: Reminder = {
    ...reminder,
    id: `rem-${Math.random().toString(36).substr(2, 9)}`
  };
  db.reminders.push(newReminder);
  await saveDatabase(db);
  return newReminder;
}

export async function deleteReminder(reminderId: string): Promise<void> {
  const db = await loadDatabase();
  db.reminders = db.reminders.filter(r => r.id !== reminderId);
  await saveDatabase(db);
}

export async function confirmMedication(medicationId: string, appearance: string, appearancePhotoUrl?: string): Promise<void> {
  const db = await loadDatabase();
  const med = db.medications.find(m => m.id === medicationId);
  if (!med) throw new Error('Medication not found');

  med.confirmed = true;
  med.appearance = appearance;
  if (appearancePhotoUrl) {
    med.appearance_photo_url = appearancePhotoUrl;
  }

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

  const spokenText = (db.elders[0]?.language === 'ms')
    ? `Sila ambil ubat ${med.name} (${med.dose}) anda sekarang. Ubat ini adalah ${appearance}.`
    : `Please take your ${med.name} (${med.dose}) now. It is a ${appearance}.`;

  // We delete existing reminders for this med if any, and create a new one
  db.reminders = db.reminders.filter(r => r.medication_id !== medicationId);
  
  // Create reminder under safety constraint (verified confirmed = true in DB)
  const newReminder: Reminder = {
    id: `rem-${Math.random().toString(36).substr(2, 9)}`,
    medication_id: medicationId,
    anchor,
    spoken_text: spokenText
  };
  db.reminders.push(newReminder);
  
  await saveDatabase(db);
}

export async function rejectMedication(medicationId: string): Promise<void> {
  const db = await loadDatabase();
  db.medications = db.medications.filter(m => m.id !== medicationId);
  db.reminders = db.reminders.filter(r => r.medication_id !== medicationId);
  await saveDatabase(db);
}

export async function addIntakeEvent(event: Omit<IntakeEvent, 'id' | 'at'>): Promise<IntakeEvent> {
  const db = await loadDatabase();
  const newEvent: IntakeEvent = {
    ...event,
    id: `intake-${Math.random().toString(36).substr(2, 9)}`,
    at: new Date().toISOString()
  };
  db.intake_events.push(newEvent);
  await saveDatabase(db);
  return newEvent;
}

export async function getIntakeEvents(elderId: string): Promise<IntakeEvent[]> {
  const db = await loadDatabase();
  const meds = await getMedications(elderId);
  const medIds = new Set(meds.map(m => m.id));
  return db.intake_events.filter(e => medIds.has(e.medication_id));
}

export async function getMemories(elderId: string): Promise<Memory[]> {
  const db = await loadDatabase();
  return db.memories.filter(m => m.elder_id === elderId).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addMemory(memory: Omit<Memory, 'id' | 'created_at'>): Promise<Memory> {
  const db = await loadDatabase();
  const newMemory: Memory = {
    ...memory,
    id: `mem-${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString()
  };
  db.memories.push(newMemory);
  await saveDatabase(db);
  return newMemory;
}

export async function getHealthLogs(elderId: string): Promise<HealthLog[]> {
  const db = await loadDatabase();
  return db.health_logs.filter(l => l.elder_id === elderId).sort((a, b) => b.at.localeCompare(a.at));
}

export async function addHealthLog(log: Omit<HealthLog, 'id' | 'at'>): Promise<HealthLog> {
  const db = await loadDatabase();
  const newLog: HealthLog = {
    ...log,
    id: `log-${Math.random().toString(36).substr(2, 9)}`,
    at: new Date().toISOString()
  };
  db.health_logs.push(newLog);
  await saveDatabase(db);
  return newLog;
}

export async function getAlerts(elderId: string): Promise<Alert[]> {
  const db = await loadDatabase();
  return db.alerts.filter(a => a.elder_id === elderId).sort((a, b) => b.at.localeCompare(a.at));
}

export async function addAlert(alert: Omit<Alert, 'id' | 'at' | 'notified'>): Promise<Alert> {
  const db = await loadDatabase();
  const newAlert: Alert = {
    ...alert,
    id: `alert-${Math.random().toString(36).substr(2, 9)}`,
    notified: false,
    at: new Date().toISOString()
  };
  db.alerts.push(newAlert);
  await saveDatabase(db);
  return newAlert;
}

export async function markAlertNotified(alertId: string): Promise<void> {
  const db = await loadDatabase();
  const alert = db.alerts.find(a => a.id === alertId);
  if (alert) {
    alert.notified = true;
    await saveDatabase(db);
  }
}
