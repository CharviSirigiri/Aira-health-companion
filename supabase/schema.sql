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

-- 3. Doctor Table
CREATE TABLE IF NOT EXISTS doctor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    elder_id UUID NOT NULL REFERENCES elder(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'doctor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
-- ENABLE ROW LEVEL SECURITY (RLS) & POLICIES
-- ========================================================

ALTER TABLE elder ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on elder" ON elder;
CREATE POLICY "Allow public read write on elder" ON elder FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE caregiver ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on caregiver" ON caregiver;
CREATE POLICY "Allow public read write on caregiver" ON caregiver FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE doctor ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on doctor" ON doctor;
CREATE POLICY "Allow public read write on doctor" ON doctor FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE prescription ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on prescription" ON prescription;
CREATE POLICY "Allow public read write on prescription" ON prescription FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE medication ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on medication" ON medication;
CREATE POLICY "Allow public read write on medication" ON medication FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE reminder ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on reminder" ON reminder;
CREATE POLICY "Allow public read write on reminder" ON reminder FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE intake_event ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on intake_event" ON intake_event;
CREATE POLICY "Allow public read write on intake_event" ON intake_event FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on memory" ON memory;
CREATE POLICY "Allow public read write on memory" ON memory FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE health_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on health_log" ON health_log;
CREATE POLICY "Allow public read write on health_log" ON health_log FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE alert ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on alert" ON alert;
CREATE POLICY "Allow public read write on alert" ON alert FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE consent ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write on consent" ON consent;
CREATE POLICY "Allow public read write on consent" ON consent FOR ALL USING (true) WITH CHECK (true);

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
