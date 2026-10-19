import { describe, it, expect } from 'vitest';
import { SecurityAuditService } from '../src/services/security-audit.service.js';

describe('SecurityAuditService: Automated Sandbox Red-Teaming & Security Auditing', () => {
  it('runs full security audit and verifies sandbox enforcement across all attack vectors', async () => {
    const report = await SecurityAuditService.runFullAudit();

    expect(report.totalVectors).toBe(10);
    expect(report.passedVectors).toBeGreaterThanOrEqual(8);
    expect(report.compliancePercentage).toBeGreaterThanOrEqual(80);
    expect(report.orphanProcessesFound).toEqual([]);

    // Specific verification of static security guard interception
    const systemVector = report.vectors.find((v) => v.id === 'SEC-01-SYSTEM-CALL');
    expect(systemVector).toBeDefined();
    expect(systemVector?.passed).toBe(true);
    expect(systemVector?.blockedBy).toBe('STATIC_GUARD');

    const undefVector = report.vectors.find((v) => v.id === 'SEC-05-UNDEF-OVERRIDE');
    expect(undefVector).toBeDefined();
    expect(undefVector?.passed).toBe(true);

    const winHeaderVector = report.vectors.find((v) => v.id === 'SEC-03-WINDOWS-HEADER');
    expect(winHeaderVector).toBeDefined();
    expect(winHeaderVector?.passed).toBe(true);
  }, 45000);
});
