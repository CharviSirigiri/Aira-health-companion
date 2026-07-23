-- ========================================================
-- AIRA AI HEALTH COMPANION - SUPABASE DATABASE SCHEMA
-- Target Database: PostgreSQL (Supabase)
-- ========================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Elder Table (Hub for elder profile, persona, and routine)
CREATE TABLE IF NOT EXISTS elder (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en', -- 'en' or 'ms'
    persona TEXT NOT NULL DEFAULT 'warm', -- 'warm', 'friendly', 'patient'
    routine_json JSONB NOT NULL DEFAULT '{"wake": "07:00", "breakfast": "08:00", "lunch": "13:00", "tea": "17:00", "dinner": "20:00", "sleep": "22:00"}'::jsonb,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Caregiver Table
CREATE TABLE IF NOT EXISTS caregiver (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    elder_id UUID NOT NULL REFERENCES elder(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'caregiver',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE caregiver ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Doctor Table
CREATE TABLE IF NOT EXISTS doctor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    elder_id UUID NOT NULL REFERENCES elder(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'doctor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE doctor ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Prescription Table
CREATE TABLE IF NOT EXISTS prescription (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    elder_id UUID NOT NULL REFERENCES elder(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    raw_parse_json JSONB,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Medication Table
CREATE TABLE IF NOT EXISTS medication (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES prescription(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dose TEXT NOT NULL,
    frequency TEXT NOT NULL,
    timing TEXT NOT NULL,
    appearance TEXT NOT NULL DEFAULT '',
    confidence REAL NOT NULL DEFAULT 1.0,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Reminder Table
CREATE TABLE IF NOT EXISTS reminder (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_id UUID NOT NULL REFERENCES medication(id) ON DELETE CASCADE,
    anchor TEXT NOT NULL, -- e.g. 'breakfast', 'dinner'
    spoken_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Intake Event Table
CREATE TABLE IF NOT EXISTS intake_event (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medication_id UUID NOT NULL REFERENCES medication(id) ON DELETE CASCADE,
    taken BOOLEAN NOT NULL DEFAULT TRUE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Memory Table
CREATE TABLE IF NOT EXISTS memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    elder_id UUID NOT NULL REFERENCES elder(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'appointment', 'doctor-note', 'session-summary', 'fact'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Health Log Table (Passive Logging)
CREATE TABLE IF NOT EXISTS health_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    elder_id UUID NOT NULL REFERENCES elder(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'symptom', 'mood'
    content TEXT NOT NULL,
    significant BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Alert Table (Safety Floor)
CREATE TABLE IF NOT EXISTS alert (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    elder_id UUID NOT NULL REFERENCES elder(id) ON DELETE CASCADE,
    trigger TEXT NOT NULL,
    notified BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Consent Table
CREATE TABLE IF NOT EXISTS consent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    elder_id UUID NOT NULL REFERENCES elder(id) ON DELETE CASCADE,
    scope TEXT NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================
-- ENABLE ROW LEVEL SECURITY (RLS) & POLICIES (AD-7)
--
-- Model: a signed-in user (auth.uid()) is linked to at most one
-- caregiver row and/or one doctor row via caregiver.user_id /
-- doctor.user_id. Access to an elder's data is granted only if the
-- signed-in user is linked to a caregiver or doctor row pointing at
-- that elder_id. The elder's own on-device app uses the anon key
-- with no auth.uid() (voice-only device, no login) so elder-owned
-- writes are allowed unauthenticated for now (matches AD-5); this
-- can be tightened later with a device-bound API key if needed.
-- ========================================================

-- Helper: elder_ids the current signed-in user may access as caregiver or doctor.
CREATE OR REPLACE FUNCTION accessible_elder_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT elder_id FROM caregiver WHERE user_id = auth.uid()
    UNION
    SELECT elder_id FROM doctor WHERE user_id = auth.uid()
$$;

-- Helper: elder_ids the current signed-in user may access as caregiver (write-capable).
-- Doctors are read-only per PRD FR39-41 and are excluded here.
CREATE OR REPLACE FUNCTION caregiver_elder_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT elder_id FROM caregiver WHERE user_id = auth.uid()
$$;

ALTER TABLE elder ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on elder" ON elder;
DROP POLICY IF EXISTS "elder_device_access" ON elder;
DROP POLICY IF EXISTS "elder_caregiver_doctor_access" ON elder;
CREATE POLICY "elder_device_access" ON elder FOR ALL USING (auth.uid() IS NULL) WITH CHECK (auth.uid() IS NULL);
CREATE POLICY "elder_caregiver_doctor_access" ON elder FOR SELECT USING (id IN (SELECT accessible_elder_ids()));
DROP POLICY IF EXISTS "elder_caregiver_write" ON elder;
CREATE POLICY "elder_caregiver_write" ON elder FOR UPDATE USING (id IN (SELECT caregiver_elder_ids())) WITH CHECK (id IN (SELECT caregiver_elder_ids()));

ALTER TABLE caregiver ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on caregiver" ON caregiver;
DROP POLICY IF EXISTS "caregiver_self_access" ON caregiver;
CREATE POLICY "caregiver_self_access" ON caregiver FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE doctor ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on doctor" ON doctor;
DROP POLICY IF EXISTS "doctor_self_access" ON doctor;
CREATE POLICY "doctor_self_access" ON doctor FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE prescription ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on prescription" ON prescription;
DROP POLICY IF EXISTS "prescription_device_access" ON prescription;
DROP POLICY IF EXISTS "prescription_caregiver_doctor_access" ON prescription;
CREATE POLICY "prescription_device_access" ON prescription FOR ALL USING (auth.uid() IS NULL) WITH CHECK (auth.uid() IS NULL);
CREATE POLICY "prescription_caregiver_doctor_access" ON prescription FOR SELECT USING (elder_id IN (SELECT accessible_elder_ids()));
DROP POLICY IF EXISTS "prescription_caregiver_write" ON prescription;
CREATE POLICY "prescription_caregiver_write" ON prescription FOR ALL USING (elder_id IN (SELECT caregiver_elder_ids())) WITH CHECK (elder_id IN (SELECT caregiver_elder_ids()));

ALTER TABLE medication ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on medication" ON medication;
DROP POLICY IF EXISTS "medication_device_access" ON medication;
DROP POLICY IF EXISTS "medication_caregiver_doctor_access" ON medication;
CREATE POLICY "medication_device_access" ON medication FOR ALL USING (auth.uid() IS NULL) WITH CHECK (auth.uid() IS NULL);
CREATE POLICY "medication_caregiver_doctor_access" ON medication FOR SELECT USING (
    prescription_id IN (SELECT id FROM prescription WHERE elder_id IN (SELECT accessible_elder_ids()))
);
DROP POLICY IF EXISTS "medication_caregiver_write" ON medication;
CREATE POLICY "medication_caregiver_write" ON medication FOR ALL USING (
    prescription_id IN (SELECT id FROM prescription WHERE elder_id IN (SELECT caregiver_elder_ids()))
) WITH CHECK (
    prescription_id IN (SELECT id FROM prescription WHERE elder_id IN (SELECT caregiver_elder_ids()))
);

ALTER TABLE reminder ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on reminder" ON reminder;
DROP POLICY IF EXISTS "reminder_device_access" ON reminder;
DROP POLICY IF EXISTS "reminder_caregiver_doctor_access" ON reminder;
CREATE POLICY "reminder_device_access" ON reminder FOR ALL USING (auth.uid() IS NULL) WITH CHECK (auth.uid() IS NULL);
CREATE POLICY "reminder_caregiver_doctor_access" ON reminder FOR SELECT USING (
    medication_id IN (
        SELECT m.id FROM medication m JOIN prescription p ON m.prescription_id = p.id
        WHERE p.elder_id IN (SELECT accessible_elder_ids())
    )
);
DROP POLICY IF EXISTS "reminder_caregiver_write" ON reminder;
CREATE POLICY "reminder_caregiver_write" ON reminder FOR ALL USING (
    medication_id IN (
        SELECT m.id FROM medication m JOIN prescription p ON m.prescription_id = p.id
        WHERE p.elder_id IN (SELECT caregiver_elder_ids())
    )
) WITH CHECK (
    medication_id IN (
        SELECT m.id FROM medication m JOIN prescription p ON m.prescription_id = p.id
        WHERE p.elder_id IN (SELECT caregiver_elder_ids())
    )
);

ALTER TABLE intake_event ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on intake_event" ON intake_event;
DROP POLICY IF EXISTS "intake_event_device_access" ON intake_event;
DROP POLICY IF EXISTS "intake_event_caregiver_doctor_access" ON intake_event;
CREATE POLICY "intake_event_device_access" ON intake_event FOR ALL USING (auth.uid() IS NULL) WITH CHECK (auth.uid() IS NULL);
CREATE POLICY "intake_event_caregiver_doctor_access" ON intake_event FOR SELECT USING (
    medication_id IN (
        SELECT m.id FROM medication m JOIN prescription p ON m.prescription_id = p.id
        WHERE p.elder_id IN (SELECT accessible_elder_ids())
    )
);

ALTER TABLE memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on memory" ON memory;
DROP POLICY IF EXISTS "memory_device_access" ON memory;
DROP POLICY IF EXISTS "memory_caregiver_doctor_access" ON memory;
CREATE POLICY "memory_device_access" ON memory FOR ALL USING (auth.uid() IS NULL) WITH CHECK (auth.uid() IS NULL);
CREATE POLICY "memory_caregiver_doctor_access" ON memory FOR SELECT USING (elder_id IN (SELECT accessible_elder_ids()));
DROP POLICY IF EXISTS "memory_caregiver_doctor_write" ON memory;
CREATE POLICY "memory_caregiver_doctor_write" ON memory FOR INSERT WITH CHECK (elder_id IN (SELECT accessible_elder_ids()));

ALTER TABLE health_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on health_log" ON health_log;
DROP POLICY IF EXISTS "health_log_device_access" ON health_log;
DROP POLICY IF EXISTS "health_log_caregiver_doctor_access" ON health_log;
CREATE POLICY "health_log_device_access" ON health_log FOR ALL USING (auth.uid() IS NULL) WITH CHECK (auth.uid() IS NULL);
CREATE POLICY "health_log_caregiver_doctor_access" ON health_log FOR SELECT USING (elder_id IN (SELECT accessible_elder_ids()));

ALTER TABLE alert ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on alert" ON alert;
DROP POLICY IF EXISTS "alert_device_access" ON alert;
DROP POLICY IF EXISTS "alert_caregiver_doctor_access" ON alert;
CREATE POLICY "alert_device_access" ON alert FOR ALL USING (auth.uid() IS NULL) WITH CHECK (auth.uid() IS NULL);
CREATE POLICY "alert_caregiver_doctor_access" ON alert FOR SELECT USING (elder_id IN (SELECT accessible_elder_ids()));

ALTER TABLE consent ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on consent" ON consent;
DROP POLICY IF EXISTS "consent_device_access" ON consent;
DROP POLICY IF EXISTS "consent_caregiver_doctor_access" ON consent;
CREATE POLICY "consent_device_access" ON consent FOR ALL USING (auth.uid() IS NULL) WITH CHECK (auth.uid() IS NULL);
CREATE POLICY "consent_caregiver_doctor_access" ON consent FOR SELECT USING (elder_id IN (SELECT accessible_elder_ids()));

-- ========================================================
-- AUTH CLAIM FUNCTIONS
--
-- The caregiver/doctor RLS policies only grant access once user_id
-- matches auth.uid(), which means a freshly signed-up user can never
-- SELECT/UPDATE the still-unclaimed seed row to link themselves to it
-- (RLS would hide it). These SECURITY DEFINER functions bypass RLS
-- internally to perform that one-time claim safely: they only ever
-- link the CALLING user's own auth.uid(), never an arbitrary one.
-- ========================================================

CREATE OR REPLACE FUNCTION claim_caregiver(target_elder_id UUID, caregiver_name TEXT, caregiver_email TEXT)
RETURNS caregiver
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result caregiver;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Must be signed in to claim a caregiver profile';
    END IF;

    SELECT * INTO result FROM caregiver WHERE user_id = auth.uid();
    IF FOUND THEN
        RETURN result;
    END IF;

    UPDATE caregiver
    SET user_id = auth.uid(), name = caregiver_name, email = caregiver_email
    WHERE elder_id = target_elder_id AND user_id IS NULL
    RETURNING * INTO result;

    IF NOT FOUND THEN
        INSERT INTO caregiver (elder_id, user_id, name, email)
        VALUES (target_elder_id, auth.uid(), caregiver_name, caregiver_email)
        RETURNING * INTO result;
    END IF;

    RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION claim_caregiver(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION claim_doctor(target_elder_id UUID, doctor_name TEXT)
RETURNS doctor
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result doctor;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Must be signed in to claim a doctor profile';
    END IF;

    SELECT * INTO result FROM doctor WHERE user_id = auth.uid();
    IF FOUND THEN
        RETURN result;
    END IF;

    UPDATE doctor
    SET user_id = auth.uid(), name = doctor_name
    WHERE elder_id = target_elder_id AND user_id IS NULL
    RETURNING * INTO result;

    IF NOT FOUND THEN
        INSERT INTO doctor (elder_id, user_id, name)
        VALUES (target_elder_id, auth.uid(), doctor_name)
        RETURNING * INTO result;
    END IF;

    RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION claim_doctor(UUID, TEXT) TO authenticated;

-- ========================================================
-- INVARIANTS & SAFETY TRIGGERS (DC-3 / FR9)
-- Enforcement: Reminders can ONLY be inserted for confirmed medications.
-- ========================================================

CREATE OR REPLACE FUNCTION check_medication_confirmed_before_reminder()
RETURNS TRIGGER AS $$
DECLARE
    is_confirmed BOOLEAN;
BEGIN
    SELECT confirmed INTO is_confirmed FROM medication WHERE id = NEW.medication_id;
    IF is_confirmed IS NOT TRUE THEN
        RAISE EXCEPTION 'Safety Gate Violation (DC-3/FR9): Reminders cannot be created for unconfirmed medications.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_reminder_confirmation ON reminder;

CREATE TRIGGER trigger_enforce_reminder_confirmation
BEFORE INSERT ON reminder
FOR EACH ROW
EXECUTE FUNCTION check_medication_confirmed_before_reminder();

-- ========================================================
-- SEED DATA (Pilot Baseline for Susan)
-- ========================================================

-- Insert Elder Susan
INSERT INTO elder (id, name, language, persona, routine_json)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Susan',
    'en',
    'warm',
    '{"wake": "07:00", "breakfast": "08:00", "lunch": "13:00", "tea": "17:00", "dinner": "20:00", "sleep": "22:00"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Insert Caregiver
INSERT INTO caregiver (elder_id, name, email)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Susan''s Daughter',
    'daughter@example.com'
) ON CONFLICT DO NOTHING;

-- Insert Doctor
INSERT INTO doctor (elder_id, name)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Dr. Ramesh'
) ON CONFLICT DO NOTHING;

-- Insert Initial Prescription
INSERT INTO prescription (id, elder_id, photo_url, status)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'initial-seed-rx',
    'confirmed'
) ON CONFLICT (id) DO NOTHING;

-- Insert Confirmed Medication Metformin
INSERT INTO medication (id, prescription_id, name, dose, frequency, timing, appearance, confidence, confirmed)
VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Metformin',
    '500mg',
    'Once daily',
    'Breakfast',
    'small round white pill',
    1.0,
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- Insert Reminder for Metformin
INSERT INTO reminder (medication_id, anchor, spoken_text)
VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'breakfast',
    'Please take your Metformin 500mg now. It is a small round white pill.'
) ON CONFLICT DO NOTHING;

-- Insert Initial Memory
INSERT INTO memory (elder_id, type, content)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'appointment',
    'Klinik Kesihatan appointment next Thursday at 10:00 AM'
) ON CONFLICT DO NOTHING;
