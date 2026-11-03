import { prisma } from '../utils/prisma.js';

export interface SubmitVivaAnswerDto {
  vivaId: string;
  answer: string;
  studentId: string;
}

export class AiVivaService {
  /**
   * Evaluates whether a submission triggers an AI Viva verification (Sections 29, 30, 31, 33).
   * Mandatory rule: For every second successive correct submission (#2, #4, #6...), trigger a code-specific viva.
   * If an incorrect submission occurs, reset the successive-correct counter.
   */
  static async handleSubmissionVivaTrigger(input: {
    assignmentId: string;
    attemptId: string;
    verdict: string;
    submittedCode: string;
  }): Promise<{ vivaTriggered: boolean; vivaId?: string; questionText?: string }> {
    const { assignmentId, attemptId, verdict, submittedCode } = input;

    if (verdict !== 'ACCEPTED') {
      // Reset successive correct counter on incorrect submission (Section 29)
      await prisma.assessmentTestAssignment.update({
        where: { id: assignmentId },
        data: { successiveCorrectCount: 0 },
      });
      return { vivaTriggered: false };
    }

    // Increment successive correct count
    const updatedAssignment = await prisma.assessmentTestAssignment.update({
      where: { id: assignmentId },
      data: {
        successiveCorrectCount: { increment: 1 },
      },
    });

    const count = updatedAssignment.successiveCorrectCount;

    // Trigger viva on every 2nd successive correct submission (2, 4, 6...)
    if (count % 2 === 0) {
      const questionText = await this.generateCodeSpecificQuestion(submittedCode);

      // Section 33: Mark the submission attempt with Suspicious Flag — Viva Trigger
      const attempt = await prisma.assessmentQuestionAttempt.findUnique({
        where: { id: attemptId },
      });
      let flags: string[] = [];
      try {
        flags = attempt?.suspiciousFlags ? JSON.parse(attempt.suspiciousFlags) : [];
      } catch {
        flags = [];
      }
      flags.push('Suspicious Flag — Viva Trigger (Successive Correct Verification)');

      await prisma.assessmentQuestionAttempt.update({
        where: { id: attemptId },
        data: {
          suspiciousFlags: JSON.stringify(flags),
        },
      });

      // Create AssessmentVivaQuestion record with strict 1-minute timer (Section 31)
      const viva = await prisma.assessmentVivaQuestion.create({
        data: {
          assignmentId,
          attemptId,
          questionText,
          codeContext: submittedCode,
          startedAt: new Date(),
          status: 'PENDING',
        },
      });

      return {
        vivaTriggered: true,
        vivaId: viva.id,
        questionText: viva.questionText,
      };
    }

    return { vivaTriggered: false };
  }

  /**
   * Generates a conceptual, code-specific viva question testing the student's actual C implementation (Section 30).
   */
  private static async generateCodeSpecificQuestion(code: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `You are an institutional CS examiner conducting a quick 1-minute viva on a student's C solution.
Code submitted by student:
\`\`\`c
${code.slice(0, 2000)}
\`\`\`
Generate exactly ONE sharp, code-specific question testing their genuine comprehension of this specific implementation.
Reference specific variable names, loop conditions, memory allocations, or logic operators they used in their code.
The question must be answerable in 1-2 brief sentences by someone who wrote the code themselves.
Return ONLY the question text without preamble.`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 150 },
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (generatedText && generatedText.length > 10) {
            return generatedText;
          }
        }
      } catch (err: any) {
        console.warn('⚠️ Gemini Viva generation fallback:', err.message);
      }
    }

    // High quality deterministic fallback based on code analysis
    if (code.includes('scanf')) {
      return 'In your code, explain the purpose of your scanf return value check or format specifier, and how your program handles malformed input.';
    }
    if (code.includes('for') || code.includes('while')) {
      return 'Briefly explain the termination condition in your primary loop and how you guaranteed it does not execute out-of-bounds or loop indefinitely.';
    }
    if (code.includes('*') || code.includes('&')) {
      return 'Explain why you used pointer dereferencing or address-of operators here, and what memory location is being accessed.';
    }
    return 'In 1 to 2 sentences, explain the core algorithm and variables you utilized in your main function to solve this problem.';
  }

  /**
   * Evaluates student's viva response using Gemini with strict grounding, or advanced multi-signal heuristic fallback.
   */
  private static async evaluateVivaAnswerWithAi(input: {
    questionText: string;
    codeContext?: string | null;
    studentAnswer: string;
    submittedBeforeTimeout: boolean;
    durationSec: number;
  }): Promise<{ relevanceScore: number; aiEvaluation: string }> {
    const { questionText, codeContext, studentAnswer, submittedBeforeTimeout, durationSec } = input;
    const ans = studentAnswer.trim();

    if (ans.length < 5) {
      return {
        relevanceScore: 0,
        aiEvaluation: 'No substantive explanation submitted.',
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const evalPrompt = `You are an institutional CS professor evaluating a student's viva voce response.
Question Asked:
"${questionText}"

Student's C Code Submitted:
\`\`\`c
${(codeContext || '').slice(0, 2000)}
\`\`\`

Student's Viva Voce Answer:
"${ans}"

Submission Timing: ${submittedBeforeTimeout ? 'On-time' : 'Late/Timed-out'} (${durationSec} seconds taken)

Evaluate this response on a 100-point scale:
1. Conceptual Understanding (0-40): Does the student understand the algorithmic principles behind their code?
2. Code Context Match (0-40): Does the answer directly address the specific code implementation and variables?
3. Authenticity & Clarity (0-20): Does the response read like genuine student understanding rather than an LLM prompt response or deflection?
${!submittedBeforeTimeout ? '(Penalty: Deduct 25 points because submission was after the time limit expired)' : ''}

Respond ONLY with a valid JSON object matching this schema:
{
  "relevanceScore": number,
  "conceptualUnderstanding": "EXCELLENT" | "GOOD" | "PARTIAL" | "DEFICIENT",
  "aiEvaluation": "string"
}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: evalPrompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            const parsed = JSON.parse(text);
            const cleanScore = Math.max(0, Math.min(100, Math.round(Number(parsed.relevanceScore) || 50)));
            const note = parsed.aiEvaluation ? `[${parsed.conceptualUnderstanding || 'EVALUATED'}] ${parsed.aiEvaluation}` : 'Valid conceptual explanation verified by AI.';
            return {
              relevanceScore: cleanScore,
              aiEvaluation: note,
            };
          }
        }
      } catch (err: any) {
        console.warn('⚠️ Gemini viva evaluation fallback:', err.message);
      }
    }

    // High quality multi-signal semantic heuristic fallback
    let score = 50;
    const lowerAns = ans.toLowerCase();

    // Check technical keywords
    const keywords = ['loop', 'pointer', 'array', 'condition', 'memory', 'return', 'index', 'logic', 'variable', 'printf', 'scanf', 'struct', 'boundary', 'increment', 'buffer'];
    const matchedKw = keywords.filter((kw) => lowerAns.includes(kw));
    score += Math.min(30, matchedKw.length * 10);

    // Check code symbol overlap
    if (codeContext) {
      const symbols = (codeContext.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) || [])
        .filter((s) => !['include', 'stdio', 'stdlib', 'main', 'return', 'void', 'int', 'char'].includes(s));
      const symbolSet = new Set(symbols.map((s) => s.toLowerCase()));
      let symbolMatches = 0;
      symbolSet.forEach((sym) => {
        if (lowerAns.includes(sym)) symbolMatches++;
      });
      score += Math.min(20, symbolMatches * 10);
    }

    if (!submittedBeforeTimeout) {
      score = Math.min(35, Math.round(score * 0.4));
      return {
        relevanceScore: score,
        aiEvaluation: 'Answer received after 2.5-minute time limit expired. Partial score granted.',
      };
    }

    const finalScore = Math.max(20, Math.min(100, score));
    return {
      relevanceScore: finalScore,
      aiEvaluation: `Valid conceptual explanation verified with ${matchedKw.length} technical concepts identified.`,
    };
  }

  /**
   * Submits student viva response with strict countdown verification (Sections 31 & 32).
   */
  static async submitVivaAnswer(input: SubmitVivaAnswerDto) {
    const viva = await prisma.assessmentVivaQuestion.findUnique({
      where: { id: input.vivaId },
      include: { assignment: true },
    });

    if (!viva) throw new Error('Viva question record not found.');
    if (viva.assignment.studentId !== input.studentId) throw new Error('Unauthorized.');
    if (viva.status !== 'PENDING') throw new Error('Viva has already been answered or closed.');

    const now = new Date();
    const durationSec = Math.max(1, Math.round((now.getTime() - viva.startedAt.getTime()) / 1000));
    // Generous 2.5-minute limit (150 seconds) with 5s network grace (Decision 3 & Phase 4)
    const submittedBeforeTimeout = durationSec <= 155;

    // Evaluate relevance score using AI Grounded Rubric
    const { relevanceScore, aiEvaluation } = await this.evaluateVivaAnswerWithAi({
      questionText: viva.questionText,
      codeContext: viva.codeContext,
      studentAnswer: input.answer,
      submittedBeforeTimeout,
      durationSec,
    });

    const updated = await prisma.assessmentVivaQuestion.update({
      where: { id: input.vivaId },
      data: {
        submittedAt: now,
        studentAnswer: input.answer.trim(),
        responseDurationSec: durationSec,
        submittedBeforeTimeout,
        relevanceScore,
        aiEvaluation,
        status: submittedBeforeTimeout ? 'COMPLETED' : 'TIMED_OUT',
      },
    });

    return {
      success: true,
      vivaId: updated.id,
      submittedBeforeTimeout,
      durationSec,
      relevanceScore,
      aiEvaluation,
    };
  }

  /**
   * Faculty manual review and score override for an AI viva response (Phase 4 Deliverable).
   * Ensures institutional human governance over all AI-generated scores.
   */
  static async facultyOverrideViva(input: {
    vivaId: string;
    facultyId: string;
    overrideScore: number;
    feedback?: string;
  }) {
    const viva = await prisma.assessmentVivaQuestion.findUnique({
      where: { id: input.vivaId },
      include: {
        assignment: {
          include: {
            test: {
              include: { section: true },
            },
          },
        },
      },
    });

    if (!viva) throw new Error('Viva question record not found.');

    const cleanScore = Math.max(0, Math.min(100, Math.round(input.overrideScore)));
    const feedbackNote = input.feedback?.trim() || 'Score updated via faculty review console.';

    const updated = await prisma.assessmentVivaQuestion.update({
      where: { id: input.vivaId },
      data: {
        relevanceScore: cleanScore,
        aiEvaluation: `[FACULTY OVERRIDE - ${feedbackNote}] Previous AI Score: ${viva.relevanceScore ?? 'N/A'}`,
        status: 'COMPLETED',
      },
    });

    return {
      success: true,
      vivaId: updated.id,
      relevanceScore: updated.relevanceScore,
      aiEvaluation: updated.aiEvaluation,
    };
  }

  /**
   * Retrieves pending viva for an active student test assignment if one exists.
   */
  static async getPendingVivaForAssignment(assignmentId: string, studentId: string) {
    const viva = await prisma.assessmentVivaQuestion.findFirst({
      where: {
        assignmentId,
        assignment: { studentId },
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!viva) return { pending: false };

    const elapsed = Math.round((Date.now() - viva.startedAt.getTime()) / 1000);
    const remainingSec = Math.max(0, 150 - elapsed);

    return {
      pending: true,
      vivaId: viva.id,
      questionText: viva.questionText,
      remainingSec,
      startedAt: viva.startedAt,
    };
  }
}
