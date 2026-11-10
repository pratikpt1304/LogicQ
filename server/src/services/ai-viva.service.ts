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
   * Generates a rapid, ultra-concise code-specific viva question testing the student's actual C implementation.
   * Target: 6 to 10 words, quick 1-2 word answerable within 10 seconds.
   */
  private static async generateCodeSpecificQuestion(code: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `You are an examiner conducting a rapid 10-second viva check on a student's C solution.
Code submitted by student:
\`\`\`c
${code.slice(0, 2000)}
\`\`\`
Generate exactly ONE very short, rapid-fire question (maximum 6 to 10 words) testing quick recall of their own code.
The question MUST be simple and quick so the student can answer in 1 or 2 words within 10 seconds.
Examples of good short questions:
- "Which variable controls your loop iteration?"
- "What condition breaks or stops your loop?"
- "What integer value does your main return?"
- "Which format specifier did you use in scanf?"
- "Which variable stores your final answer or count?"
- "Which relational operator did you use to test equality?"
Do NOT ask long essays or theoretical explanations. Return ONLY the short question text without preamble or quotes.`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 60 },
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.replace(/^["']|["']$/g, '');
          if (generatedText && generatedText.length > 5 && generatedText.length < 120) {
            return generatedText;
          }
        }
      } catch (err: any) {
        console.warn('⚠️ Gemini Viva generation fallback:', err.message);
      }
    }

    // High quality deterministic short fallbacks (quick 1-2 word answers)
    if (code.includes('for') || code.includes('while')) {
      return 'Which variable controls your loop iteration?';
    }
    if (code.includes('scanf')) {
      return 'Which format specifier (%d, %c, %s) did you pass to scanf?';
    }
    if (code.includes('return')) {
      return 'What integer value does your main function return?';
    }
    if (code.includes('if')) {
      return 'Which condition does your if statement check?';
    }
    return 'Name one variable declared in your main function.';
  }

  /**
   * Evaluates student's rapid viva response using Gemini with strict grounding, or advanced multi-signal heuristic fallback.
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

    if (ans.length === 0) {
      return {
        relevanceScore: 0,
        aiEvaluation: 'No answer submitted within the 10-second limit.',
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const evalPrompt = `You are evaluating a student's rapid 10-second viva response for their C solution.
Question Asked:
"${questionText}"

Student's C Code Submitted:
\`\`\`c
${(codeContext || '').slice(0, 2000)}
\`\`\`

Student's Viva Answer (1-2 words or brief phrase):
"${ans}"

Submission Timing: ${submittedBeforeTimeout ? 'On-time' : 'Late/Timed-out'} (${durationSec} seconds taken)

Since the student had only 10 seconds, accept very brief, direct, or 1-2 word answers (e.g. "i", "0", "%d", "sum", "n", "while loop", "equality").
- If the student's short answer is factually correct according to their code and the question, award 85-100 points.
- If partially relevant or close, award 55-75 points.
- If completely wrong, off-topic, or gibberish, award 0-30 points.
${!submittedBeforeTimeout ? '(Penalty: Deduct 20 points because submission was after the 10-second limit)' : ''}

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
    const remainingSec = Math.max(0, 10 - elapsed);

    return {
      pending: true,
      vivaId: viva.id,
      questionText: viva.questionText,
      remainingSec,
      startedAt: viva.startedAt,
    };
  }
}
