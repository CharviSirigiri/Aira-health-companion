import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Single pilot elder for the FYP scope (matches supabase/schema.sql seed data).
export const PILOT_ELDER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export interface CaregiverProfile {
  id: string;
  elder_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  role: string;
}

export interface DoctorProfile {
  id: string;
  elder_id: string;
  user_id: string | null;
  name: string;
  role: string;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}

// Links the signed-in user to their caregiver row for the pilot elder,
// claiming the seed row on first sign-in (see claim_caregiver in schema.sql).
export async function claimCaregiverProfile(name: string, email: string): Promise<CaregiverProfile> {
  const { data, error } = await supabase.rpc('claim_caregiver', {
    target_elder_id: PILOT_ELDER_ID,
    caregiver_name: name,
    caregiver_email: email,
  });
  if (error) throw error;
  return data as CaregiverProfile;
}

export async function claimDoctorProfile(name: string): Promise<DoctorProfile> {
  const { data, error } = await supabase.rpc('claim_doctor', {
    target_elder_id: PILOT_ELDER_ID,
    doctor_name: name,
  });
  if (error) throw error;
  return data as DoctorProfile;
}

export async function getCaregiverProfile(userId: string): Promise<CaregiverProfile | null> {
  const { data, error } = await supabase.from('caregiver').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDoctorProfile(userId: string): Promise<DoctorProfile | null> {
  const { data, error } = await supabase.from('doctor').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}
