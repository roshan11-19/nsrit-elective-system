-- ==============================================================================
-- AUTOMATION FOR ELECTIVE SYSTEM (AES) — CLEAN DATABASE RESET & SCHEMA
-- ==============================================================================
--
-- ROLES:
-- 1. admin: Institution-Level College Administrator (Registers Coordinators, Controls OE Batch Allotment Drives, Master Reports)
-- 2. coordinator: Department / Branch Coordinator (Curriculum Upload, PE Batch Allotment Drive Control, Offering PE & OE Subjects, Students Management)
-- 3. student: Student (Selects PE and eligible Open Elective subjects in FIFO order)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. CLEAN RESET: DROP ALL EXISTING TABLES & FUNCTIONS
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.allotments CASCADE;
DROP TABLE IF EXISTS public.elective_preferences CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.curriculum CASCADE;
DROP TABLE IF EXISTS public.selection_windows CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.submit_and_allot_preferences CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Admin, Coordinators & Registered Students)
-- ------------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    roll_number VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'coordinator', 'admin')),
    branch VARCHAR(50), -- Department Branch (e.g. 'CSE', 'ECE', 'AIML'), 'ALL' for Admin
    section VARCHAR(20) DEFAULT 'A',
    regulation VARCHAR(50) DEFAULT 'AR23',
    admitted_batch VARCHAR(50) DEFAULT '2024-2028',
    semester INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lowercase email unique index for case-insensitive logins
CREATE UNIQUE INDEX idx_profiles_email_lower ON public.profiles (LOWER(TRIM(email)));

-- Uppercase roll number unique index (ensures unique Hall Ticket / Staff ID across profiles)
CREATE UNIQUE INDEX idx_profiles_roll_upper ON public.profiles (UPPER(TRIM(roll_number))) WHERE roll_number IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 2. SELECTION WINDOWS TABLE (Batch Allotment Drive Controls)
-- PE: Operated by Department Coordinators
-- OE: Operated by Institution College Administrator
-- ------------------------------------------------------------------------------
CREATE TABLE public.selection_windows (
    id VARCHAR(100) PRIMARY KEY, -- e.g. WINDOW_2024_2028_SEM5_PE_CSE, WINDOW_2024_2028_SEM5_OE
    batch VARCHAR(50) NOT NULL,
    branch VARCHAR(50) NOT NULL DEFAULT 'ALL', -- 'CSE', 'ECE', etc. for PE; 'ALL' for OE
    semester INTEGER NOT NULL DEFAULT 5,
    elective_type VARCHAR(10) NOT NULL DEFAULT 'PE' CHECK (elective_type IN ('PE', 'OE')),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'CLOSED')),
    title VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. CURRICULUM TABLE (Uploaded Batch-Wise Master Syllabus Catalog)
-- ------------------------------------------------------------------------------
CREATE TABLE public.curriculum (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch VARCHAR(50) NOT NULL, -- Normalized e.g. '2024-2028'
    branch VARCHAR(50) NOT NULL, -- Offering Department Branch (e.g. 'CSE', 'ECE')
    regulation VARCHAR(50) DEFAULT 'AR23',
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
    elective_type VARCHAR(10) NOT NULL CHECK (elective_type IN ('PE', 'OE')),
    elective_number INTEGER NOT NULL DEFAULT 1, -- e.g. 1 for PE-1 / OE-1, 2 for PE-2 / OE-2, etc.
    subject_code VARCHAR(50) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_curriculum_batch_subject UNIQUE (batch, branch, subject_code)
);

-- ------------------------------------------------------------------------------
-- 4. SUBJECTS TABLE (Active Offered Elective Courses for Student Selection)
-- ------------------------------------------------------------------------------
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_code VARCHAR(50) NOT NULL UNIQUE,
    subject_name VARCHAR(255) NOT NULL,
    elective_type VARCHAR(10) NOT NULL CHECK (elective_type IN ('PE', 'OE')),
    elective_number INTEGER NOT NULL DEFAULT 1, -- e.g. 1 for PE-1 / OE-1, 2 for PE-2 / OE-2, 3 for PE-3, etc.
    branch VARCHAR(50) NOT NULL, -- Offering Department Branch (e.g. 'CSE', 'ECE')
    offered_branches JSONB NOT NULL DEFAULT '["ALL"]'::jsonb, -- Targeted eligible branches for OE (e.g. ["ECE", "MECH", "CIVIL"])
    admitted_batch VARCHAR(50) NOT NULL DEFAULT '2024-2028',
    regulation VARCHAR(50) DEFAULT 'AR23',
    semester INTEGER NOT NULL DEFAULT 5,
    seats INTEGER NOT NULL CHECK (seats >= 0),
    available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. ELECTIVE PREFERENCES TABLE (Locked Priorities Ordered 1..N per Elective Number)
-- ------------------------------------------------------------------------------
CREATE TABLE public.elective_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    elective_type VARCHAR(10) NOT NULL CHECK (elective_type IN ('PE', 'OE')),
    elective_number INTEGER NOT NULL DEFAULT 1,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL CHECK (priority > 0),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_elective_subject UNIQUE (student_id, elective_type, elective_number, subject_id),
    CONSTRAINT uq_student_elective_priority UNIQUE (student_id, elective_type, elective_number, priority)
);

-- ------------------------------------------------------------------------------
-- 6. ALLOTMENTS TABLE (Instant Real-Time FIFO Seat Allocation Record)
-- ------------------------------------------------------------------------------
CREATE TABLE public.allotments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    roll_number VARCHAR(50),
    student_email VARCHAR(255) NOT NULL,
    elective_type VARCHAR(10) NOT NULL CHECK (elective_type IN ('PE', 'OE')),
    elective_number INTEGER NOT NULL DEFAULT 1,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    priority_selected INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'ALLOTTED' CHECK (status IN ('ALLOTTED', 'NOT_ALLOTTED', 'WAITLISTED', 'CANCELLED')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    allotted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_elective UNIQUE (student_id, elective_type, elective_number)
);

-- ------------------------------------------------------------------------------
-- 7. AUDIT LOGS TABLE (Immutable Override and Reset Log)
-- ------------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coordinator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- PERFORMANCE INDEXES (High-Speed FIFO, Filtering & Isolation)
-- ------------------------------------------------------------------------------
CREATE INDEX idx_curriculum_lookup ON public.curriculum (batch, branch, semester, elective_type, elective_number);
CREATE INDEX idx_preferences_fifo ON public.elective_preferences (elective_type, submitted_at ASC, id ASC);
CREATE INDEX idx_allotments_student ON public.allotments (student_id, elective_type);
CREATE INDEX idx_allotments_subject ON public.allotments (subject_id, status);
CREATE INDEX idx_subjects_lookup ON public.subjects (elective_type, branch, semester, admitted_batch);
CREATE INDEX idx_profiles_branch ON public.profiles (branch, role);
CREATE INDEX idx_selection_windows_lookup ON public.selection_windows (batch, branch, semester, elective_type, status);

-- ------------------------------------------------------------------------------
-- 8. ATOMIC REAL-TIME FIFO SUBMISSION & ALLOTMENT ENGINE (POSTGRESQL RPC)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_and_allot_preferences(
    p_student_id UUID,
    p_elective_type VARCHAR(10),
    p_subject_priorities JSONB -- Array of { subject_id, priority, elective_number }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student RECORD;
    v_pref RECORD;
    v_subj RECORD;
    v_slot RECORD;
    v_submitted_at TIMESTAMPTZ := NOW();
    v_assigned_subject_id UUID := NULL;
    v_assigned_priority INT := NULL;
    v_status VARCHAR(30) := 'WAITLISTED';
    v_allotted BOOLEAN := FALSE;
    v_slots_allotted JSONB := '[]'::jsonb;
BEGIN
    -- 1. Verify student exists in profiles
    SELECT * INTO v_student FROM public.profiles WHERE id = p_student_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student not found in registered database.';
    END IF;

    -- 2. Loop through each distinct elective number
    FOR v_slot IN 
        SELECT DISTINCT COALESCE(x.elective_number, 1) AS slot_num 
        FROM jsonb_to_recordset(p_subject_priorities) AS x(subject_id UUID, priority INT, elective_number INT)
        ORDER BY slot_num ASC
    LOOP
        -- Delete prior draft preferences and allotment for this elective
        DELETE FROM public.elective_preferences 
        WHERE student_id = p_student_id AND elective_type = p_elective_type AND elective_number = v_slot.slot_num;

        DELETE FROM public.allotments 
        WHERE student_id = p_student_id AND elective_type = p_elective_type AND elective_number = v_slot.slot_num;

        v_allotted := FALSE;
        v_assigned_subject_id := NULL;
        v_assigned_priority := NULL;
        v_status := 'WAITLISTED';

        FOR v_pref IN 
            SELECT * FROM jsonb_to_recordset(p_subject_priorities) AS x(subject_id UUID, priority INT, elective_number INT)
            WHERE COALESCE(x.elective_number, 1) = v_slot.slot_num
            ORDER BY priority ASC
        LOOP
            INSERT INTO public.elective_preferences (
                student_id,
                elective_type,
                elective_number,
                subject_id,
                priority,
                submitted_at
            ) VALUES (
                p_student_id,
                p_elective_type,
                v_slot.slot_num,
                v_pref.subject_id,
                v_pref.priority,
                v_submitted_at
            );

            -- Check seat availability atomically in priority order with row lock
            IF NOT v_allotted THEN
                SELECT id, available_seats INTO v_subj
                FROM public.subjects
                WHERE id = v_pref.subject_id AND available_seats > 0
                FOR UPDATE;

                IF FOUND AND v_subj.available_seats > 0 THEN
                    -- Decrement seat atomically
                    UPDATE public.subjects
                    SET available_seats = available_seats - 1,
                        updated_at = NOW()
                    WHERE id = v_subj.id;

                    v_assigned_subject_id := v_subj.id;
                    v_assigned_priority := v_pref.priority;
                    v_status := 'ALLOTTED';
                    v_allotted := TRUE;
                END IF;
            END IF;
        END LOOP;

        -- Create Allotment record for this elective
        INSERT INTO public.allotments (
            student_id,
            roll_number,
            student_email,
            elective_type,
            elective_number,
            subject_id,
            priority_selected,
            status,
            submitted_at,
            allotted_at
        ) VALUES (
            p_student_id,
            v_student.roll_number,
            v_student.email,
            p_elective_type,
            v_slot.slot_num,
            v_assigned_subject_id,
            v_assigned_priority,
            v_status,
            v_submitted_at,
            NOW()
        );

        v_slots_allotted := v_slots_allotted || jsonb_build_object(
            'elective_number', v_slot.slot_num,
            'status', v_status,
            'allotted_subject_id', v_assigned_subject_id,
            'priority_selected', v_assigned_priority
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'slots', v_slots_allotted,
        'submitted_at', v_submitted_at
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elective_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allotments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 9.1 PROFILES POLICIES
CREATE POLICY "Allow all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 9.2 CURRICULUM POLICIES
CREATE POLICY "Allow all on curriculum" ON public.curriculum FOR ALL USING (true) WITH CHECK (true);

-- 9.3 SUBJECTS POLICIES
CREATE POLICY "Allow all on subjects" ON public.subjects FOR ALL USING (true) WITH CHECK (true);

-- 9.4 SELECTION WINDOWS POLICIES
CREATE POLICY "Allow all on selection_windows" ON public.selection_windows FOR ALL USING (true) WITH CHECK (true);

-- 9.5 ELECTIVE PREFERENCES POLICIES
CREATE POLICY "Allow all on preferences" ON public.elective_preferences FOR ALL USING (true) WITH CHECK (true);

-- 9.6 ALLOTMENTS POLICIES
CREATE POLICY "Allow all on allotments" ON public.allotments FOR ALL USING (true) WITH CHECK (true);

-- 9.7 AUDIT LOGS POLICIES
CREATE POLICY "Allow all on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 10. FRESH SEED DATA (Admin & Department Coordinators)
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (id, email, roll_number, name, role, branch, section, regulation, admitted_batch, semester)
VALUES 
('a0000000-0000-0000-0000-000000000001', 'nsritelectivesystem@gmail.com', 'ADMIN-01', 'College Administrator', 'admin', 'ALL', 'Admin', 'Autonomous', NULL, 1),
('c0000000-0000-0000-0000-000000000001', 'cse.coordinator@college.edu', 'COORD-CSE-01', 'CSE Academic Coordinator', 'coordinator', 'CSE', 'Admin', 'AR23', NULL, 5),
('c0000000-0000-0000-0000-000000000002', 'ece.coord@college.edu', 'COORD-ECE-01', 'ECE Academic Coordinator', 'coordinator', 'ECE', 'Admin', 'AR23', NULL, 5),
('c0000000-0000-0000-0000-000000000003', 'coordinator@college.edu', 'COORD-CSE-02', 'CSE Academic Coordinator (General)', 'coordinator', 'CSE', 'Admin', 'AR23', NULL, 5)
ON CONFLICT (email) DO UPDATE SET 
  name = EXCLUDED.name,
  roll_number = EXCLUDED.roll_number,
  role = EXCLUDED.role;


