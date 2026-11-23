-- =========================================================================
-- LOGICQ NEXT-GEN SUPABASE POSTGRESQL SCHEMA (UNLIMITED BANDWIDTH)
-- Designed for High-Concurrency Live Assessments & 100+ Problem Practice Arena
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENROLLED STUDENTS & USERS ROSTER
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    prn TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'STUDENT',
    section TEXT DEFAULT 'Div A',
    roll_number TEXT,
    mobile_number TEXT,
    profile_complete BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_prn ON public.students(prn);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_students_section ON public.students(section);

-- 2. ASSESSMENT TESTS & LAB PRACTICAL DEFINITIONS
CREATE TABLE IF NOT EXISTS public.assessment_tests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    section_target TEXT DEFAULT 'All',
    status TEXT DEFAULT 'UPCOMING', -- UPCOMING | ACTIVE | COMPLETED
    duration_minutes INTEGER DEFAULT 60,
    total_marks NUMERIC DEFAULT 20,
    questions JSONB DEFAULT '[]'::jsonb,
    anti_cheating_rotation BOOLEAN DEFAULT true,
    attendance_confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TEST ATTENDANCE ROSTER (Continuous Assessment)
CREATE TABLE IF NOT EXISTS public.test_attendance (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL,
    student_prn TEXT NOT NULL,
    student_name TEXT,
    student_email TEXT,
    is_present BOOLEAN DEFAULT true,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_test_student_attendance UNIQUE (test_id, student_prn)
);

CREATE INDEX IF NOT EXISTS idx_attendance_test_prn ON public.test_attendance(test_id, student_prn);

-- 4. STUDENT EXAM LOCKS & PROCTORING RADAR
CREATE TABLE IF NOT EXISTS public.student_locks (
    student_prn TEXT PRIMARY KEY,
    is_locked BOOLEAN DEFAULT false,
    reason TEXT,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ASSESSMENT SUBMISSIONS & CODE STORAGE
CREATE TABLE IF NOT EXISTS public.assessment_submissions (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL,
    student_prn TEXT NOT NULL,
    student_name TEXT,
    student_email TEXT,
    academic_score NUMERIC DEFAULT 0,
    fullscreen_exits INTEGER DEFAULT 0,
    tab_switch_count INTEGER DEFAULT 0,
    copy_paste_attempts INTEGER DEFAULT 0,
    total_keystrokes INTEGER DEFAULT 0,
    cpm NUMERIC DEFAULT 0,
    typing_velocity_cpm NUMERIC DEFAULT 0,
    q1 JSONB,
    q2 JSONB,
    status TEXT DEFAULT 'SUBMITTED',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_test_sub UNIQUE (test_id, student_prn)
);

CREATE INDEX IF NOT EXISTS idx_subs_test_prn ON public.assessment_submissions(test_id, student_prn);

-- 6. TOPIC PRACTICE PROGRESS (100 Problems Progress)
CREATE TABLE IF NOT EXISTS public.practice_progress (
    student_prn TEXT PRIMARY KEY,
    student_email TEXT,
    solved_topic_ids JSONB DEFAULT '[]'::jsonb,
    total_solved INTEGER DEFAULT 0,
    last_solved_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. STUDENT RAISED ISSUES & MENTOR DISPATCH TICKETS
CREATE TABLE IF NOT EXISTS public.raised_issues (
    id TEXT PRIMARY KEY,
    question_id TEXT,
    question_title TEXT,
    context_type TEXT DEFAULT 'PRACTICE',
    category TEXT DEFAULT 'OTHER',
    description TEXT NOT NULL,
    student_id TEXT,
    student_name TEXT,
    student_prn TEXT NOT NULL,
    student_email TEXT,
    student_phone TEXT,
    student_whatsapp TEXT,
    status TEXT DEFAULT 'OPEN', -- OPEN | IN_PROGRESS | RESOLVED
    assigned_to TEXT,
    assigned_email TEXT,
    assigned_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_prn ON public.raised_issues(student_prn);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.raised_issues(status);

-- Enable Realtime WebSockets on critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_tests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_locks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.raised_issues;

-- Public read/write policy for LogicQ Client (with anon key)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to students" ON public.students FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.assessment_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to assessment_tests" ON public.assessment_tests FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.test_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to test_attendance" ON public.test_attendance FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.student_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to student_locks" ON public.student_locks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to assessment_submissions" ON public.assessment_submissions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.practice_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to practice_progress" ON public.practice_progress FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.raised_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access to raised_issues" ON public.raised_issues FOR ALL USING (true) WITH CHECK (true);
