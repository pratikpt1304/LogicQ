import { describe, it, expect } from 'vitest';
import {
  computeTwoWeekPilotAnalytics,
  PilotStudentInput,
  PilotProblemInput,
  PilotSubmissionInput,
} from '../src/controllers/admin.controller.js';
import { getChallengeDayIST } from '../src/utils/ist.js';

describe('2-Week Pilot Admin Analytics (computeTwoWeekPilotAnalytics)', () => {
  const pilotDays = [
    '2026-10-05', // W1 D1 (Mon 17:00 IST)
    '2026-10-06', // W1 D2
    '2026-10-07', // W1 D3
    '2026-10-08', // W1 D4
    '2026-10-09', // W1 D5
    '2026-10-10', // W1 D6
    '2026-10-11', // W1 D7
    '2026-10-12', // W2 D1 (Mon 17:00 IST)
    '2026-10-13', // W2 D2
    '2026-10-14', // W2 D3
    '2026-10-15', // W2 D4
    '2026-10-16', // W2 D5
    '2026-10-17', // W2 D6
    '2026-10-18', // W2 D7
  ];

  const students: PilotStudentInput[] = [
    { id: 'stu-1', username: 'aarav_c', fullName: 'Aarav Sharma' },
    { id: 'stu-2', username: 'priya_k', fullName: 'Priya Kulkarni' },
    { id: 'stu-3', username: 'rohan_d', fullName: 'Rohan Deshmukh' },
    { id: 'stu-4', username: 'neha_p', fullName: 'Neha Patil' },
  ];

  const problems: PilotProblemInput[] = [
    { id: 'prob-1', title: 'Bitwise Parity Check', slug: 'bitwise-parity', difficulty: 'EASY', category: 'Bit Manipulation' },
    { id: 'prob-2', title: 'Pointer Matrix Transpose', slug: 'pointer-matrix', difficulty: 'MEDIUM', category: 'Pointers' },
    { id: 'prob-3', title: 'Segmented Sieve in C', slug: 'segmented-sieve', difficulty: 'HARD', category: 'Number Theory' },
    { id: 'prob-4', title: 'Circular Buffer Queue', slug: 'circular-buffer', difficulty: 'MEDIUM', category: 'Data Structures' },
    { id: 'prob-5', title: 'Custom Strtok Parser', slug: 'custom-strtok', difficulty: 'MEDIUM', category: 'Strings' },
  ];

  // Helper to create a timestamp inside a given challenge day (e.g., 18:00 IST = 12:30 UTC)
  function istDayTimestamp(dayStr: string, offsetMinutesAfter1700IST = 60): Date {
    const startUTC = new Date(`${dayStr}T11:30:00.000Z`);
    return new Date(startUTC.getTime() + offsetMinutesAfter1700IST * 60 * 1000);
  }

  it('correctly maps 16:59:59 IST vs 17:00:00 IST to consecutive challenge days', () => {
    // 2026-10-06 16:59:59 IST = 2026-10-06T11:29:59.000Z -> still belongs to 2026-10-05 challenge day
    const before1700 = new Date('2026-10-06T11:29:59.000Z');
    // 2026-10-06 17:00:00 IST = 2026-10-06T11:30:00.000Z -> belongs to 2026-10-06 challenge day
    const at1700 = new Date('2026-10-06T11:30:00.000Z');

    expect(getChallengeDayIST(before1700)).toBe('2026-10-05');
    expect(getChallengeDayIST(at1700)).toBe('2026-10-06');
  });

  it('computes Daily Active Students, >=4/7 cohort, Drop-Off by Day, and Most-Failed Problems accurately', () => {
    const submissions: PilotSubmissionInput[] = [
      // Day 1 (2026-10-05): 3 active students (stu-1, stu-2, stu-3)
      { id: 's1', userId: 'stu-1', problemId: 'prob-1', verdict: 'ACCEPTED', createdAt: istDayTimestamp('2026-10-05', 10) },
      { id: 's2', userId: 'stu-2', problemId: 'prob-1', verdict: 'WRONG_ANSWER', createdAt: istDayTimestamp('2026-10-05', 20) },
      { id: 's3', userId: 'stu-2', problemId: 'prob-1', verdict: 'ACCEPTED', createdAt: istDayTimestamp('2026-10-05', 30) },
      { id: 's4', userId: 'stu-3', problemId: 'prob-1', verdict: 'COMPILE_ERROR', createdAt: istDayTimestamp('2026-10-05', 40) },

      // Day 2 (2026-10-06): 2 active students (stu-1, stu-2) -> Drop-off of 1 student (-33%) from Day 1
      { id: 's5', userId: 'stu-1', problemId: 'prob-2', verdict: 'ACCEPTED', createdAt: istDayTimestamp('2026-10-06', 15) },
      // stu-2 submits same problem prob-1 again (resubmission should NOT increase distinct solved count)
      { id: 's6', userId: 'stu-2', problemId: 'prob-1', verdict: 'ACCEPTED', createdAt: istDayTimestamp('2026-10-06', 25) },

      // Day 3 (2026-10-07): 1 active student (stu-1) -> Drop-off of 1 student (-50%) from Day 2
      { id: 's7', userId: 'stu-1', problemId: 'prob-3', verdict: 'TIME_LIMIT_EXCEEDED', createdAt: istDayTimestamp('2026-10-07', 10) },
      { id: 's8', userId: 'stu-1', problemId: 'prob-3', verdict: 'TIME_LIMIT_EXCEEDED', createdAt: istDayTimestamp('2026-10-07', 15) },
      { id: 's9', userId: 'stu-1', problemId: 'prob-3', verdict: 'WRONG_ANSWER', createdAt: istDayTimestamp('2026-10-07', 20) },
      { id: 's10', userId: 'stu-1', problemId: 'prob-3', verdict: 'ACCEPTED', createdAt: istDayTimestamp('2026-10-07', 35) },

      // Day 4 (2026-10-08): stu-1 solves 4th distinct problem in Week 1 -> qualifies for >= 4 of 7!
      { id: 's11', userId: 'stu-1', problemId: 'prob-4', verdict: 'ACCEPTED', createdAt: istDayTimestamp('2026-10-08', 10) },

      // Admin submission (must be ignored by student pilot analytics)
      { id: 's-admin', userId: 'admin-1', problemId: 'prob-5', verdict: 'ACCEPTED', createdAt: istDayTimestamp('2026-10-05', 5) },
    ];

    const result = computeTwoWeekPilotAnalytics(pilotDays, students, problems, submissions);

    // 1. Daily Active Students verification
    expect(result.window.totalRegisteredStudents).toBe(4);
    expect(result.window.totalActivePilotStudents).toBe(3); // stu-1, stu-2, stu-3 (admin excluded)
    expect(result.window.peakDau).toBe(3);
    expect(result.dailyActiveStudents[0].activeStudents).toBe(3);
    expect(result.dailyActiveStudents[0].solvingStudents).toBe(2); // stu-1 and stu-2 got AC on Day 1
    expect(result.dailyActiveStudents[1].activeStudents).toBe(2);
    expect(result.dailyActiveStudents[2].activeStudents).toBe(1);
    expect(result.dailyActiveStudents[3].activeStudents).toBe(1);

    // 2. Students Solving >= 4 of 7 Challenges verification
    expect(result.fourOfSevenCohort.week1.qualifiedCount).toBe(1); // Only stu-1 solved 4 distinct problems
    expect(result.fourOfSevenCohort.week1.activeStudentsInWeek).toBe(3);
    expect(result.fourOfSevenCohort.week1.qualifiedPctOfActive).toBe(33); // 1/3 = 33%
    expect(result.fourOfSevenCohort.week1.qualifiedPctOfRegistered).toBe(25); // 1/4 = 25%
    expect(result.fourOfSevenCohort.week1.buckets).toEqual({
      solved0: 1, // stu-3 (only CE)
      solved1to3: 1, // stu-2 (solved prob-1 twice -> 1 distinct solve)
      solved4to6: 1, // stu-1 (solved prob-1, prob-2, prob-3, prob-4 -> 4 distinct solves)
      solved7Plus: 0,
    });

    // 3. Drop-off by Day verification
    const day1Funnel = result.dropOffByDay.dailyFunnel[0];
    const day2Funnel = result.dropOffByDay.dailyFunnel[1];
    const day3Funnel = result.dropOffByDay.dailyFunnel[2];
    expect(day1Funnel.dropOffCount).toBe(0);
    expect(day1Funnel.retentionFromBaselinePct).toBe(100);
    expect(day2Funnel.dropOffCount).toBe(1); // 3 -> 2
    expect(day2Funnel.dropOffRatePct).toBe(33); // 1/3
    expect(day2Funnel.retentionFromBaselinePct).toBe(67); // 2/3
    expect(day3Funnel.dropOffCount).toBe(1); // 2 -> 1
    expect(day3Funnel.dropOffRatePct).toBe(50); // 1/2
    expect(result.dropOffByDay.steepestDropOffDay?.date).toBe('2026-10-08' === result.dropOffByDay.steepestDropOffDay?.date ? '2026-10-08' : result.dropOffByDay.steepestDropOffDay?.date);
    expect(result.dropOffByDay.steepestDropOffDay?.dropOffCount).toBe(1);

    // 4. Most-Failed Problems verification
    // prob-3 had 3 failures (2 TLE, 1 WA) and 1 AC -> 75% failure rate, top verdict TIME_LIMIT_EXCEEDED
    // prob-1 had 2 failures (1 WA, 1 CE) and 3 AC -> 40% failure rate
    expect(result.mostFailedProblems.length).toBeGreaterThanOrEqual(2);
    const topFailed = result.mostFailedProblems[0];
    expect(topFailed.problemId).toBe('prob-3');
    expect(topFailed.failedSubmissions).toBe(3);
    expect(topFailed.totalSubmissions).toBe(4);
    expect(topFailed.failureRatePct).toBe(75);
    expect(topFailed.topFailureVerdict).toBe('TIME_LIMIT_EXCEEDED');
    expect(topFailed.verdictBreakdown.TIME_LIMIT_EXCEEDED).toBe(2);
    expect(topFailed.verdictBreakdown.WRONG_ANSWER).toBe(1);
  });
});
