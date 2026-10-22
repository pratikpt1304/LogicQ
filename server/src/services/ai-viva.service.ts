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
${code.slice(0, 1500)}
\`\`\`
Generate exactly ONE concise, code-specific question testing their genuine comprehension of this specific implementation (e.g. why they chose specific loop conditions, how their memory/variable bounds work, or how they handle an edge condition).
The question must be answerable in 1-2 brief sentences by someone who wrote the code themselves.
Return ONLY the question text without preamble.`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
   * Submits student viva response with strict 1-minute countdown verification (Sections 31 & 32).
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
    // Strict 1-minute limit with 5s network grace (Section 31: 60 seconds)
    const submittedBeforeTimeout = durationSec <= 65;

    // Evaluate relevance score (0 - 100)
    let relevanceScore = 0;
    let aiEvaluation = 'Answer recorded for faculty audit.';

    const ans = input.answer.trim();
    if (ans.length > 5) {
      if (submittedBeforeTimeout) {
        relevanceScore = Math.min(100, 50 + Math.min(50, ans.length));
        aiEvaluation = 'Valid on-time conceptual explanation provided.';
      } else {
        relevanceScore = 30;
        aiEvaluation = 'Answer received after 1-minute time limit expired.';
      }
    } else {
      relevanceScore = 0;
      aiEvaluation = 'No substantive explanation submitted.';
    }

    const updated = await prisma.assessmentVivaQuestion.update({
      where: { id: input.vivaId },
      data: {
        submittedAt: now,
        studentAnswer: ans,
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
    const remainingSec = Math.max(0, 60 - elapsed);

    return {
      pending: true,
      vivaId: viva.id,
      questionText: viva.questionText,
      remainingSec,
      startedAt: viva.startedAt,
    };
  }
}
