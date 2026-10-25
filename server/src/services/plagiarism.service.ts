/**
 * plagiarism.service.ts
 * Advanced Structural Plagiarism & Code Similarity Detection Engine for LogicQ
 *
 * Implements:
 * 1. C-Language Lexical Normalization:
 *    - Strips comments (block & line) and unnecessary whitespace.
 *    - Replaces user-defined identifiers (variable, function, parameter names)
 *      with positional canonical register tokens ($v0, $v1, $v2...) to defeat
 *      variable renaming obfuscation.
 *    - Normalizes numeric literals and string literals to canonical tokens ($NUM, $STR).
 *    - Normalizes control structure equivalents (e.g. loops and branch tokens).
 * 2. Winnowing Algorithm (MOSS-standard Fingerprinting):
 *    - Generates k-gram hashes over the normalized token stream.
 *    - Uses a sliding window of size w to select minimum hashes (fingerprints).
 * 3. Jaccard & Containment Similarity Coefficients:
 *    - Jaccard: |A ∩ B| / |A ∪ B|
 *    - Containment: |A ∩ B| / min(|A|, |B|) (detects when one solution is a copy-paste subset of another).
 * 4. Pairwise Batch Scanning:
 *    - Compares all submissions for a problem and flags suspicious similarities above threshold.
 */

import { prisma } from '../utils/prisma.js';

export interface Token {
  type: 'KEYWORD' | 'IDENTIFIER' | 'LITERAL_NUM' | 'LITERAL_STR' | 'OPERATOR' | 'PUNCTUATION' | 'TYPE';
  value: string;
}

export interface PlagiarismComparisonResult {
  similarity: number;          // 0.0 to 1.0 (combined Jaccard + Containment weighted score)
  jaccardScore: number;       // Exact token fingerprint overlap ratio
  containmentScore: number;   // Subset copy-paste ratio
  riskLevel: 'CLEAN' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  matchedFingerprintsCount: number;
  totalFingerprintsA: number;
  totalFingerprintsB: number;
  normalizedTokenCountA: number;
  normalizedTokenCountB: number;
}

export interface SuspiciousPair {
  submissionAId: string;
  submissionBId: string;
  userAId: string;
  userBId: string;
  userAName: string;
  userBName: string;
  userAPrn?: string | null;
  userBPrn?: string | null;
  similarity: number;
  riskLevel: 'MODERATE' | 'HIGH' | 'CRITICAL';
  submittedAtA: Date;
  submittedAtB: Date;
  codeA?: string;
  codeB?: string;
}

export interface PlagiarismReport {
  problemId: string;
  problemTitle?: string;
  totalSubmissionsAnalyzed: number;
  flaggedPairsCount: number;
  threshold: number;
  scannedAt: string;
  pairs: SuspiciousPair[];
}

const C_KEYWORDS = new Set([
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
  'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static',
  'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while'
]);

const C_TYPES = new Set([
  'int', 'float', 'double', 'char', 'void', 'long', 'short', 'unsigned', 'signed',
  'size_t', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t'
]);

// 64-bit FNV-1a Hash implementation for string hashing
function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export class PlagiarismService {
  /**
   * Tokenizes C source code into clean structural tokens.
   */
  static tokenize(code: string): Token[] {
    // 1. Remove comments
    const stripped = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/[^\r\n]*/g, ' ');

    const tokens: Token[] = [];
    const regex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|==|!=|<=|>=|\+\+|--|&&|\|\||->|<<|>>|[+\-*/%&=<>!~|^?:.,;(){}[\]]/g;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(stripped)) !== null) {
      const val = match[0];

      if (val.startsWith('"') || val.startsWith("'")) {
        tokens.push({ type: 'LITERAL_STR', value: '$STR' });
      } else if (/^\d/.test(val)) {
        tokens.push({ type: 'LITERAL_NUM', value: '$NUM' });
      } else if (C_TYPES.has(val)) {
        tokens.push({ type: 'TYPE', value: val });
      } else if (C_KEYWORDS.has(val)) {
        tokens.push({ type: 'KEYWORD', value: val });
      } else if (/^[a-zA-Z_]/.test(val)) {
        tokens.push({ type: 'IDENTIFIER', value: val });
      } else if (['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '++', '--'].includes(val)) {
        tokens.push({ type: 'OPERATOR', value: val });
      } else {
        tokens.push({ type: 'PUNCTUATION', value: val });
      }
    }

    return tokens;
  }

  /**
   * Normalizes tokens to defeat variable/identifier renaming.
   * Maps each unique identifier encountered in order to $v0, $v1, $v2...
   */
  static normalizeIdentifiers(tokens: Token[]): string[] {
    const idMap = new Map<string, string>();
    let idCounter = 0;

    const normalized: string[] = [];

    for (const t of tokens) {
      if (t.type === 'IDENTIFIER') {
        let canonical = idMap.get(t.value);
        if (!canonical) {
          canonical = `$v${idCounter++}`;
          idMap.set(t.value, canonical);
        }
        normalized.push(canonical);
      } else if (t.type === 'KEYWORD') {
        // Standardize loop keywords: 'for' and 'while' both execute repetitive logic
        if (t.value === 'for' || t.value === 'while') {
          normalized.push('$LOOP');
        } else {
          normalized.push(t.value);
        }
      } else {
        normalized.push(t.value);
      }
    }

    return normalized;
  }

  /**
   * Winnowing Algorithm:
   * Selects fingerprint hashes using sliding window over k-grams.
   *
   * @param tokens Normalized token string list
   * @param k Size of each k-gram (default: 5)
   * @param w Window size for winnowing (default: 4)
   */
  static winnow(tokens: string[], k: number = 5, w: number = 4): Set<number> {
    if (tokens.length < k) {
      // For very short codes, hash whatever tokens exist
      const hash = fnv1a(tokens.join(' '));
      return new Set([hash]);
    }

    // 1. Generate k-gram hashes
    const hashes: number[] = [];
    for (let i = 0; i <= tokens.length - k; i++) {
      const kgram = tokens.slice(i, i + k).join(' ');
      hashes.push(fnv1a(kgram));
    }

    // 2. Winnow sliding window to pick minimums
    const fingerprints = new Set<number>();
    const n = hashes.length;

    if (n <= w) {
      let minHash = hashes[0];
      for (const h of hashes) {
        if (h < minHash) minHash = h;
      }
      fingerprints.add(minHash);
      return fingerprints;
    }

    let minPos = -1;
    for (let i = 0; i <= n - w; i++) {
      let minVal = hashes[i];
      let curMinPos = i;

      for (let j = 1; j < w; j++) {
        if (hashes[i + j] <= minVal) {
          minVal = hashes[i + j];
          curMinPos = i + j;
        }
      }

      if (curMinPos !== minPos) {
        fingerprints.add(minVal);
        minPos = curMinPos;
      }
    }

    return fingerprints;
  }

  /**
   * Compares two C source codes and calculates similarity score & risk level.
   */
  static compareCodes(codeA: string, codeB: string): PlagiarismComparisonResult {
    const tokensA = this.tokenize(codeA);
    const tokensB = this.tokenize(codeB);

    const normA = this.normalizeIdentifiers(tokensA);
    const normB = this.normalizeIdentifiers(tokensB);

    const fpsA = this.winnow(normA, 5, 4);
    const fpsB = this.winnow(normB, 5, 4);

    let matchCount = 0;
    for (const h of fpsA) {
      if (fpsB.has(h)) matchCount++;
    }

    const unionCount = new Set([...fpsA, ...fpsB]).size;
    const jaccard = unionCount > 0 ? matchCount / unionCount : 0;

    const minSize = Math.min(fpsA.size, fpsB.size);
    const containment = minSize > 0 ? matchCount / minSize : 0;

    // Combined score: 60% Jaccard + 40% Containment
    const rawScore = 0.6 * jaccard + 0.4 * containment;
    const similarity = Math.round(rawScore * 1000) / 1000;

    let riskLevel: 'CLEAN' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'CLEAN';
    if (similarity >= 0.85) {
      riskLevel = 'CRITICAL';
    } else if (similarity >= 0.70) {
      riskLevel = 'HIGH';
    } else if (similarity >= 0.50) {
      riskLevel = 'MODERATE';
    } else if (similarity >= 0.30) {
      riskLevel = 'LOW';
    }

    return {
      similarity,
      jaccardScore: Math.round(jaccard * 1000) / 1000,
      containmentScore: Math.round(containment * 1000) / 1000,
      riskLevel,
      matchedFingerprintsCount: matchCount,
      totalFingerprintsA: fpsA.size,
      totalFingerprintsB: fpsB.size,
      normalizedTokenCountA: normA.length,
      normalizedTokenCountB: normB.length,
    };
  }

  /**
   * Scans all accepted / active submissions for a problem to detect plagiarism between students.
   */
  static async scanProblem(problemId: string, threshold: number = 0.70): Promise<PlagiarismReport> {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { id: true, title: true },
    });

    // Fetch the latest accepted or submitted code per distinct student
    const submissions = await prisma.submission.findMany({
      where: { problemId },
      select: {
        id: true,
        userId: true,
        code: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            fullName: true,
            prn: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Pick latest submission per user
    const userSubmissionMap = new Map<string, typeof submissions[0]>();
    for (const sub of submissions) {
      if (!userSubmissionMap.has(sub.userId)) {
        userSubmissionMap.set(sub.userId, sub);
      }
    }

    const uniqueSubmissions = Array.from(userSubmissionMap.values());
    const flaggedPairs: SuspiciousPair[] = [];

    // Pairwise comparison (O(N^2))
    for (let i = 0; i < uniqueSubmissions.length; i++) {
      for (let j = i + 1; j < uniqueSubmissions.length; j++) {
        const subA = uniqueSubmissions[i];
        const subB = uniqueSubmissions[j];

        // Skip comparing user with self
        if (subA.userId === subB.userId) continue;

        const result = this.compareCodes(subA.code, subB.code);

        if (result.similarity >= threshold) {
          flaggedPairs.push({
            submissionAId: subA.id,
            submissionBId: subB.id,
            userAId: subA.userId,
            userBId: subB.userId,
            userAName: subA.user.displayName || subA.user.fullName || subA.user.username,
            userBName: subB.user.displayName || subB.user.fullName || subB.user.username,
            userAPrn: subA.user.prn,
            userBPrn: subB.user.prn,
            similarity: result.similarity,
            riskLevel: result.riskLevel as 'MODERATE' | 'HIGH' | 'CRITICAL',
            submittedAtA: subA.createdAt,
            submittedAtB: subB.createdAt,
            codeA: subA.code,
            codeB: subB.code,
          });
        }
      }
    }

    // Sort by similarity descending
    flaggedPairs.sort((a, b) => b.similarity - a.similarity);

    return {
      problemId,
      problemTitle: problem?.title || 'Unknown Problem',
      totalSubmissionsAnalyzed: uniqueSubmissions.length,
      flaggedPairsCount: flaggedPairs.length,
      threshold,
      scannedAt: new Date().toISOString(),
      pairs: flaggedPairs,
    };
  }
}
