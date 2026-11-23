import { supabase, isSupabaseConfigured } from '../config/supabase.js';

export interface SupabaseStudent {
  id: string;
  prn: string;
  fullName: string;
  email?: string;
  section?: string;
  rollNumber?: string;
  mobileNumber?: string;
}

export interface SupabaseSubmission {
  id: string;
  testId: string;
  studentPrn: string;
  studentName?: string;
  studentEmail?: string;
  academicScore: number;
  fullscreenExits: number;
  tabSwitchCount: number;
  copyPasteAttempts: number;
  totalKeystrokes: number;
  cpm?: number;
  q1?: any;
  q2?: any;
  status: string;
  submittedAt: string;
}

export class SupabaseDataService {
  /**
   * Fetch all students roster
   */
  public static async getStudents(): Promise<SupabaseStudent[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('prn', { ascending: true });
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id,
        prn: s.prn,
        fullName: s.full_name,
        email: s.email,
        section: s.section,
        rollNumber: s.roll_number,
        mobileNumber: s.mobile_number,
      }));
    } catch (err) {
      console.warn('Supabase getStudents error:', err);
      return [];
    }
  }

  /**
   * Fetch assessment submissions for a test
   */
  public static async getSubmissions(testId: string): Promise<SupabaseSubmission[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('assessment_submissions')
        .select('*')
        .eq('test_id', testId);
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id,
        testId: s.test_id,
        studentPrn: s.student_prn,
        studentName: s.student_name,
        studentEmail: s.student_email,
        academicScore: Number(s.academic_score || 0),
        fullscreenExits: Number(s.fullscreen_exits || 0),
        tabSwitchCount: Number(s.tab_switch_count || 0),
        copyPasteAttempts: Number(s.copy_paste_attempts || 0),
        totalKeystrokes: Number(s.total_keystrokes || 0),
        cpm: Number(s.cpm || 0),
        q1: s.q1,
        q2: s.q2,
        status: s.status,
        submittedAt: s.submitted_at,
      }));
    } catch (err) {
      console.warn('Supabase getSubmissions error:', err);
      return [];
    }
  }

  /**
   * Save or update student submission
   */
  public static async saveSubmission(sub: {
    testId: string;
    studentPrn: string;
    studentName?: string;
    studentEmail?: string;
    academicScore?: number;
    fullscreenExits?: number;
    tabSwitchCount?: number;
    copyPasteAttempts?: number;
    totalKeystrokes?: number;
    cpm?: number;
    q1?: any;
    q2?: any;
    status?: string;
  }): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const payload = {
        id: `sub_${sub.studentPrn}_${sub.testId}`,
        test_id: sub.testId,
        student_prn: sub.studentPrn.toUpperCase().trim(),
        student_name: sub.studentName || '',
        student_email: sub.studentEmail || '',
        academic_score: sub.academicScore || 0,
        fullscreen_exits: sub.fullscreenExits || 0,
        tab_switch_count: sub.tabSwitchCount || 0,
        copy_paste_attempts: sub.copyPasteAttempts || 0,
        total_keystrokes: sub.totalKeystrokes || 0,
        cpm: sub.cpm || 0,
        q1: sub.q1 || null,
        q2: sub.q2 || null,
        status: sub.status || 'SUBMITTED',
        submitted_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('assessment_submissions')
        .upsert(payload, { onConflict: 'test_id,student_prn' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase saveSubmission error:', err);
      return false;
    }
  }

  /**
   * Mark attendance
   */
  public static async markAttendance(
    testId: string,
    studentPrn: string,
    isPresent: boolean,
    studentName?: string,
    studentEmail?: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      const payload = {
        id: `att_${testId}_${studentPrn}`,
        test_id: testId,
        student_prn: studentPrn.toUpperCase().trim(),
        student_name: studentName || '',
        student_email: studentEmail || '',
        is_present: isPresent,
        marked_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('test_attendance')
        .upsert(payload, { onConflict: 'test_id,student_prn' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase markAttendance error:', err);
      return false;
    }
  }

  /**
   * Listen to live submissions updates
   */
  public static subscribeToSubmissions(
    testId: string,
    callback: (sub: SupabaseSubmission) => void
  ): () => void {
    if (!isSupabaseConfigured) return () => {};

    const channel = supabase
      .channel(`test_subs_${testId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assessment_submissions',
          filter: `test_id=eq.${testId}`,
        },
        (payload: any) => {
          const s = payload.new;
          if (s) {
            callback({
              id: s.id,
              testId: s.test_id,
              studentPrn: s.student_prn,
              studentName: s.student_name,
              studentEmail: s.student_email,
              academicScore: Number(s.academic_score || 0),
              fullscreenExits: Number(s.fullscreen_exits || 0),
              tabSwitchCount: Number(s.tab_switch_count || 0),
              copyPasteAttempts: Number(s.copy_paste_attempts || 0),
              totalKeystrokes: Number(s.total_keystrokes || 0),
              cpm: Number(s.cpm || 0),
              q1: s.q1,
              q2: s.q2,
              status: s.status,
              submittedAt: s.submitted_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
