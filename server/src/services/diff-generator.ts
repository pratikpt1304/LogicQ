import { VisibleDiffView } from '../judge/judge.interface.js';

function normalizeLineEndings(str: string = ''): string {
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Generates an educational, line-by-line diff comparing expected vs actual program output.
 */
export function generateDiff(expected: string = '', actual: string = ''): VisibleDiffView {
  const normExpected = normalizeLineEndings(expected);
  const normActual = normalizeLineEndings(actual);

  const isExactMatch = normExpected === normActual;

  // Check if stripping all trailing whitespace across lines makes them identical
  const strippedExpected = normExpected
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();
  const strippedActual = normActual
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();

  const hasWhitespaceDifference =
    !isExactMatch &&
    (strippedExpected === strippedActual ||
      normExpected.replace(/\s+/g, ' ').trim() === normActual.replace(/\s+/g, ' ').trim());

  const expectedLines = normExpected === '' ? [] : normExpected.split('\n');
  const actualLines = normActual === '' ? [] : normActual.split('\n');

  // If trailing empty string from newline, strip it if symmetrical
  if (expectedLines.length > 0 && expectedLines[expectedLines.length - 1] === '') {
    expectedLines.pop();
  }
  if (actualLines.length > 0 && actualLines[actualLines.length - 1] === '') {
    actualLines.pop();
  }

  const diffLines: VisibleDiffView['diffLines'] = [];
  const maxLines = Math.max(expectedLines.length, actualLines.length);

  for (let i = 0; i < maxLines; i++) {
    const expLine = expectedLines[i];
    const actLine = actualLines[i];

    if (expLine !== undefined && actLine !== undefined) {
      if (expLine === actLine) {
        diffLines.push({
          type: 'EQUAL',
          expectedLineNumber: i + 1,
          actualLineNumber: i + 1,
          expectedContent: expLine,
          actualContent: actLine,
        });
      } else {
        diffLines.push({
          type: 'REPLACE',
          expectedLineNumber: i + 1,
          actualLineNumber: i + 1,
          expectedContent: expLine,
          actualContent: actLine,
        });
      }
    } else if (expLine !== undefined) {
      // Missing in actual output
      diffLines.push({
        type: 'DELETE',
        expectedLineNumber: i + 1,
        expectedContent: expLine,
      });
    } else if (actLine !== undefined) {
      // Extra line in actual output
      diffLines.push({
        type: 'INSERT',
        actualLineNumber: i + 1,
        actualContent: actLine,
      });
    }
  }

  // Generate remediation tip
  let remediationTip: string | undefined;
  if (!isExactMatch) {
    if (hasWhitespaceDifference) {
      remediationTip =
        'Whitespace mismatch detected: Check for extra trailing spaces or newline differences at the end of output lines.';
    } else if (actualLines.length === 0) {
      remediationTip =
        'Your program produced no standard output. Ensure your printf() calls execute and include fflush(stdout); if needed.';
    } else if (
      actualLines.some((al) => /^(enter|result|the result is|output:?)/i.test(al.trim())) &&
      !expectedLines.some((el) => /^(enter|result|the result is|output:?)/i.test(el.trim()))
    ) {
      remediationTip =
        'Prompt label mismatch: Do not print prompt messages like "Enter number:" or "Result: " unless specifically asked in the problem statement.';
    } else if (
      expectedLines.length === actualLines.length &&
      expectedLines.every((el, idx) => el.toLowerCase() === (actualLines[idx] || '').toLowerCase())
    ) {
      remediationTip =
        'Case sensitivity mismatch: Check the exact capitalization of letters (e.g. "Yes" vs "YES" or "hello" vs "Hello").';
    } else {
      remediationTip =
        'Output mismatch: Compare your actual output against the expected format carefully.';
    }
  }

  return {
    isExactMatch,
    hasWhitespaceDifference,
    expected,
    actual,
    diffLines,
    remediationTip,
  };
}
