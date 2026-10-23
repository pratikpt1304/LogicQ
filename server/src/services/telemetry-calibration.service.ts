import { prisma } from '../utils/prisma.js';

export interface PercentileStats {
  count: number;
  min: number;
  p50: number; // Median
  p85: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
}

export interface CalibrationReport {
  testId?: string;
  totalAttemptsAnalyzed: number;
  activeStudentsCount: number;
  baselineNoiseFloor: {
    singleTabSwitchRatePercent: number; // % of attempts with <= 1 tab switch (likely benign OS popup/notification)
    singleFullScreenExitRatePercent: number;
    medianFocusLossDurationSec: number;
  };
  metrics: {
    tabSwitches: PercentileStats;
    focusLossDurationSec: PercentileStats;
    codeBurstRatio: PercentileStats;
    actualSolveTimeSec: PercentileStats;
    keystrokes: PercentileStats;
  };
  calibratedThresholds: {
    tabSwitches: { normalMax: number; moderateMin: number; highMin: number; criticalMin: number };
    focusLossSec: { normalMax: number; moderateMin: number; highMin: number; criticalMin: number };
    codeBurstRatio: { normalMax: number; moderateMin: number; highMin: number; criticalMin: number };
  };
  policyRecommendation: {
    minimumReviewThreshold: string;
    advisoryOnly: boolean;
    automatedPenaltyEnabled: boolean;
    notice: string;
  };
}

function calculatePercentiles(values: number[]): PercentileStats {
  if (values.length === 0) {
    return { count: 0, min: 0, p50: 0, p85: 0, p90: 0, p95: 0, p99: 0, max: 0, mean: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, val) => acc + val, 0);

  const getPercentile = (p: number) => {
    const idx = Math.min(count - 1, Math.max(0, Math.floor((p / 100) * count)));
    return sorted[idx];
  };

  return {
    count,
    min: sorted[0],
    p50: getPercentile(50),
    p85: getPercentile(85),
    p90: getPercentile(90),
    p95: getPercentile(95),
    p99: getPercentile(99),
    max: sorted[count - 1],
    mean: +(sum / count).toFixed(2),
  };
}

export class TelemetryCalibrationService {
  /**
   * Generates empirical statistical calibration benchmarks for a test or global cohort.
   * Enables institutional department faculty to calibrate noise floors before live exams.
   */
  static async calibrateTestTelemetry(testId?: string): Promise<CalibrationReport> {
    const whereClause: any = {};
    if (testId) {
      whereClause.assignment = { testId };
    }

    const attempts = await prisma.assessmentQuestionAttempt.findMany({
      where: whereClause,
      select: {
        id: true,
        tabSwitchCount: true,
        focusLossCount: true,
        totalFocusLossDurationMs: true,
        fullScreenExitCount: true,
        largestBurstChars: true,
        codeBurstRatio: true,
        totalKeystrokes: true,
        actualTimeTakenSec: true,
        assignment: {
          select: {
            studentId: true,
          },
        },
      },
    });

    const totalAttempts = attempts.length;
    const uniqueStudents = new Set(attempts.map((a) => a.assignment?.studentId).filter(Boolean));

    const tabSwitchesList = attempts.map((a) => a.tabSwitchCount || 0);
    const focusLossSecList = attempts.map((a) => Math.round((a.totalFocusLossDurationMs || 0) / 1000));
    const codeBurstRatioList = attempts.map((a) => +(a.codeBurstRatio || 0).toFixed(2));
    const solveTimesList = attempts.map((a) => a.actualTimeTakenSec || 0);
    const keystrokesList = attempts.map((a) => a.totalKeystrokes || 0);

    const tabStats = calculatePercentiles(tabSwitchesList);
    const focusLossStats = calculatePercentiles(focusLossSecList);
    const burstStats = calculatePercentiles(codeBurstRatioList);
    const solveStats = calculatePercentiles(solveTimesList);
    const keyStats = calculatePercentiles(keystrokesList);

    // Baseline Noise Floor estimation
    const benignTabSwitches = attempts.filter((a) => (a.tabSwitchCount || 0) <= 1).length;
    const benignFullscreen = attempts.filter((a) => (a.fullScreenExitCount || 0) <= 1).length;
    const singleTabRate = totalAttempts > 0 ? +((benignTabSwitches / totalAttempts) * 100).toFixed(1) : 100;
    const singleFullscreenRate = totalAttempts > 0 ? +((benignFullscreen / totalAttempts) * 100).toFixed(1) : 100;

    // Calibrated thresholds
    const calibratedThresholds = {
      tabSwitches: {
        normalMax: Math.max(1, tabStats.p50),
        moderateMin: Math.max(2, tabStats.p85),
        highMin: Math.max(4, tabStats.p95),
        criticalMin: Math.max(6, tabStats.p99),
      },
      focusLossSec: {
        normalMax: Math.max(5, focusLossStats.p50),
        moderateMin: Math.max(15, focusLossStats.p85),
        highMin: Math.max(30, focusLossStats.p95),
        criticalMin: Math.max(60, focusLossStats.p99),
      },
      codeBurstRatio: {
        normalMax: Math.max(0.3, burstStats.p50),
        moderateMin: Math.max(0.5, burstStats.p85),
        highMin: Math.max(0.7, burstStats.p95),
        criticalMin: Math.max(0.85, burstStats.p99),
      },
    };

    return {
      testId,
      totalAttemptsAnalyzed: totalAttempts,
      activeStudentsCount: uniqueStudents.size,
      baselineNoiseFloor: {
        singleTabSwitchRatePercent: singleTabRate,
        singleFullScreenExitRatePercent: singleFullscreenRate,
        medianFocusLossDurationSec: focusLossStats.p50,
      },
      metrics: {
        tabSwitches: tabStats,
        focusLossDurationSec: focusLossStats,
        codeBurstRatio: burstStats,
        actualSolveTimeSec: solveStats,
        keystrokes: keyStats,
      },
      calibratedThresholds,
      policyRecommendation: {
        minimumReviewThreshold: 'HIGH (>= P95) with >= 2 Correlated Behavioral Signals',
        advisoryOnly: true,
        automatedPenaltyEnabled: false,
        notice:
          'Under DPDP and Institutional Assessment Policy, telemetry signals serve strictly as advisory indicators for human faculty review. No automated mark deductions may be applied from telemetry alone.',
      },
    };
  }
}
