import { prisma } from '../utils/prisma.js';
import { QuestionValidationService, TestCaseInput } from './question-validation.service.js';
import crypto from 'crypto';

export interface AiQuestionGenParams {
  module: string;            // e.g. "Module 1 - C Fundamentals"
  section: string;           // "Section 1", "Section 2", "Section 3", "Section 4"
  topic: string;             // e.g. "Nested Loops and Grid Pattern Output"
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  learningOutcome?: string;
  bloomsLevel?: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
  scenarioContext?: string;
}

export interface GeneratedQuestionPayload {
  title: string;
  problemStatement: string;
  scenario: string;
  inputSpecification: string;
  outputSpecification: string;
  constraints: string;
  starterCode: string;
  referenceSolution: string;
  expectedTimeMin: number;
  expectedTimeMax: number;
  testCases: TestCaseInput[];
}

export class AiQuestionService {
  /**
   * Generates an AI question adhering to Sections 3, 4, 6, and 16.
   * Auto-validates using QuestionValidationService (Section 17).
   */
  static async generateAndSaveQuestion(params: AiQuestionGenParams, facultyId?: string) {
    const rawQuestion = await this.produceQuestionPayload(params);

    // Auto-check correctness immediately with GCC sandbox (Section 17)
    const validationOutcome = await QuestionValidationService.validateCandidateQuestion(
      rawQuestion.referenceSolution,
      rawQuestion.testCases
    );

    const slug = `${params.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-6)}`;

    // Create problem in database with validation result
    const problem = await prisma.problem.create({
      data: {
        slug,
        title: rawQuestion.title,
        description: rawQuestion.problemStatement,
        starterCode: rawQuestion.starterCode,
        solutionCode: rawQuestion.referenceSolution,
        difficulty: params.difficulty,
        category: 'Algorithms',
        tags: JSON.stringify([params.module, params.section, params.topic]),
        module: params.module,
        section: params.section,
        topic: params.topic,
        learningOutcome: params.learningOutcome || `Master ${params.topic}`,
        bloomsLevel: params.bloomsLevel || 'APPLY',
        scenario: rawQuestion.scenario,
        inputSpecification: rawQuestion.inputSpecification,
        outputSpecification: rawQuestion.outputSpecification,
        constraints: rawQuestion.constraints,
        expectedTimeMin: rawQuestion.expectedTimeMin,
        expectedTimeMax: rawQuestion.expectedTimeMax,
        validationStatus: validationOutcome.validationStatus,
        validationDetails: JSON.stringify(validationOutcome),
        status: 'DRAFT', // Remains DRAFT until faculty explicitly approves
        testCases: {
          create: rawQuestion.testCases.map((tc, idx) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden ?? (idx === 2),
            orderIndex: idx + 1,
          })),
        },
      },
      include: {
        testCases: { orderBy: { orderIndex: 'asc' } },
      },
    });

    return {
      success: true,
      problem,
      validation: validationOutcome,
    };
  }

  /**
   * Internal generator with Gemini API integration and deterministic fallback.
   */
  private static async produceQuestionPayload(params: AiQuestionGenParams): Promise<GeneratedQuestionPayload> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const geminiRes = await this.callGeminiApi(params, apiKey);
        if (geminiRes) {
          return geminiRes;
        }
      } catch (err: any) {
        console.warn('⚠️ Gemini API call failed, falling back to curriculum catalog:', err.message);
      }
    }

    // High quality deterministic C algorithmic challenge generator
    return this.generateFromCurriculumCatalog(params);
  }

  /**
   * Calls Google Gemini Generative API with strict JSON schema.
   */
  private static async callGeminiApi(
    params: AiQuestionGenParams,
    apiKey: string
  ): Promise<GeneratedQuestionPayload | null> {
    const prompt = `You are a Principal Computer Science Professor generating an AI-resistant C programming assessment question.
Parameters:
- Module: ${params.module}
- Section: ${params.section}
- Topic: ${params.topic}
- Difficulty: ${params.difficulty} (Easy: 2-8 min, Medium: 8-15 min, Hard: 15-25 min)
- Learning Outcome: ${params.learningOutcome || 'Understand and apply core C logic'}
- Bloom's Taxonomy Level: ${params.bloomsLevel || 'APPLY'}
- Real-World Scenario: ${params.scenarioContext || 'Autonomous systems, robotics, or sensor processing'}

Requirements:
1. Provide a scenario-grounded problem statement in clear Markdown.
2. Provide explicit input/output specifications and constraints.
3. Provide starter code in standard C11 with comments.
4. Provide a 100% correct, robust C11 reference solution compiling with GCC.
5. Provide EXACTLY 3 test cases:
   - Test Case 1: Visible (typical input)
   - Test Case 2: Visible (boundary/edge case)
   - Test Case 3: Hidden (complex edge case, NOT duplicate of 1 or 2)

Respond ONLY with a valid JSON object matching this schema:
{
  "title": "string",
  "problemStatement": "string",
  "scenario": "string",
  "inputSpecification": "string",
  "outputSpecification": "string",
  "constraints": "string",
  "starterCode": "string",
  "referenceSolution": "string",
  "expectedTimeMin": number,
  "expectedTimeMax": number,
  "testCases": [
    { "input": "string", "expectedOutput": "string", "isHidden": false, "condition": "Visible Sample 1" },
    { "input": "string", "expectedOutput": "string", "isHidden": false, "condition": "Visible Sample 2" },
    { "input": "string", "expectedOutput": "string", "isHidden": true, "condition": "Server-side Hidden Test 3" }
  ]
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP error ${response.status}: ${await response.text()}`);
    }

    const data: any = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed: GeneratedQuestionPayload = JSON.parse(text);
    return parsed;
  }

  /**
   * Deterministic institutional curriculum challenge generator for C.
   */
  private static generateFromCurriculumCatalog(params: AiQuestionGenParams): GeneratedQuestionPayload {
    const diff = params.difficulty;
    const timeMin = diff === 'EASY' ? 2 : diff === 'MEDIUM' ? 8 : 15;
    const timeMax = diff === 'EASY' ? 8 : diff === 'MEDIUM' ? 15 : 25;

    const idSuffix = crypto.randomInt(100, 999);

    if (params.topic.toLowerCase().includes('loop') || params.topic.toLowerCase().includes('pattern') || diff === 'EASY') {
      return {
        title: `Sensor Threshold Filter [ID-${idSuffix}]`,
        scenario: 'An industrial automation controller monitors temperature sensor stream readings.',
        problemStatement: `### Problem Description\nYou are tasked with developing a telemetry filter for an embedded sensor node. The system reads an integer $N$ representing the count of sensor measurements, followed by $N$ integers.\n\nYour program must calculate and print the count and sum of all readings that strictly exceed an alert threshold $T$.\n\n### Input Format\n- First line: integer $N$ (number of readings).\n- Second line: integer $T$ (threshold value).\n- Third line: $N$ space-separated integers.\n\n### Output Format\nPrint two space-separated integers: the count of readings $> T$ and their total sum.\n\n### Constraints\n- $1 \\le N \\le 1000$\n- $-10^4 \\le T, \\text{reading}_i \\le 10^4$`,
        inputSpecification: 'N on line 1, T on line 2, N integers on line 3.',
        outputSpecification: 'Count and sum separated by a single space, followed by a newline.',
        constraints: '1 <= N <= 1000, -10000 <= readings <= 10000',
        starterCode: `#include <stdio.h>\n\nint main() {\n    int n, threshold;\n    if (scanf("%d %d", &n, &threshold) != 2) return 0;\n    \n    // TODO: Read N readings and count elements > threshold\n    \n    return 0;\n}\n`,
        referenceSolution: `#include <stdio.h>\n\nint main() {\n    int n, threshold;\n    if (scanf("%d %d", &n, &threshold) != 2) return 0;\n    int count = 0;\n    long long sum = 0;\n    for (int i = 0; i < n; i++) {\n        int val;\n        scanf("%d", &val);\n        if (val > threshold) {\n            count++;\n            sum += val;\n        }\n    }\n    printf("%d %lld\\n", count, sum);\n    return 0;\n}\n`,
        expectedTimeMin: timeMin,
        expectedTimeMax: timeMax,
        testCases: [
          { input: '5 10\n5 12 10 15 2', expectedOutput: '2 27', isHidden: false, condition: 'Sample 1' },
          { input: '4 50\n10 20 30 40', expectedOutput: '0 0', isHidden: false, condition: 'Zero matches' },
          { input: '6 0\n-5 10 20 -2 30 -1', expectedOutput: '3 60', isHidden: true, condition: 'Hidden edge test' },
        ],
      };
    }

    if (diff === 'HARD' || params.topic.toLowerCase().includes('pointer') || params.topic.toLowerCase().includes('string')) {
      return {
        title: `Packet Checksum Validator [ID-${idSuffix}]`,
        scenario: 'A network gateway validates variable-length telemetry frames.',
        problemStatement: `### Problem Description\nA secure router receives network packet payloads as a string of lowercase hexadecimal digits. Compute the XOR parity byte across adjacent two-character hexadecimal tokens.\n\n### Input Format\nA single string containing an even number of lowercase hexadecimal characters.\n\n### Output Format\nPrint the computed XOR checksum as a two-digit uppercase hexadecimal value.`,
        inputSpecification: 'A string of hex characters.',
        outputSpecification: 'Two uppercase hex characters followed by newline.',
        constraints: 'Length is even, 2 <= length <= 256',
        starterCode: `#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[300];\n    if (scanf("%299s", s) != 1) return 0;\n    // Compute XOR parity across byte pairs\n    return 0;\n}\n`,
        referenceSolution: `#include <stdio.h>\n#include <string.h>\n#include <stdlib.h>\n\nint main() {\n    char s[300];\n    if (scanf("%299s", s) != 1) return 0;\n    int len = strlen(s);\n    int checksum = 0;\n    for (int i = 0; i < len; i += 2) {\n        char buf[3] = { s[i], s[i+1], '\\0' };\n        int byteVal = (int)strtol(buf, NULL, 16);\n        checksum ^= byteVal;\n    }\n    printf("%02X\\n", checksum);\n    return 0;\n}\n`,
        expectedTimeMin: timeMin,
        expectedTimeMax: timeMax,
        testCases: [
          { input: '1a2b', expectedOutput: '31', isHidden: false, condition: 'Two bytes XOR' },
          { input: 'ff00ff', expectedOutput: '00', isHidden: false, condition: 'Cancelling parity' },
          { input: '0102040810204080', expectedOutput: 'FF', isHidden: true, condition: 'Full bitwise parity' },
        ],
      };
    }

    // Default Medium array/grid processing problem
    return {
      title: `Contiguous Subarray Peak Energy [ID-${idSuffix}]`,
      scenario: 'Solar telemetry analysis: finding maximum contiguous power window.',
      problemStatement: `### Problem Description\nGiven an array of $N$ integers representing solar inverter fluctuations, find the maximum contiguous subarray sum (Kadane algorithm).\n\n### Input Format\n- First line: integer $N$.\n- Second line: $N$ space-separated integers.\n\n### Output Format\nPrint the maximum contiguous sum.`,
      inputSpecification: 'N on line 1, N integers on line 2.',
      outputSpecification: 'A single integer representing maximum subarray sum.',
      constraints: '1 <= N <= 10000, -1000 <= array[i] <= 1000',
      starterCode: `#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) != 1) return 0;\n    // Compute maximum contiguous subarray sum\n    return 0;\n}\n`,
      referenceSolution: `#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) != 1) return 0;\n    long long maxSoFar = -1000000000000LL;\n    long long currentMax = 0;\n    for (int i = 0; i < n; i++) {\n        long long x;\n        scanf("%lld", &x);\n        currentMax += x;\n        if (currentMax > maxSoFar) maxSoFar = currentMax;\n        if (currentMax < 0) currentMax = 0;\n    }\n    printf("%lld\\n", maxSoFar);\n    return 0;\n}\n`,
      expectedTimeMin: timeMin,
      expectedTimeMax: timeMax,
      testCases: [
        { input: '5\n1 2 3 -2 5', expectedOutput: '9', isHidden: false, condition: 'Positive sum' },
        { input: '4\n-1 -2 -3 -4', expectedOutput: '-1', isHidden: false, condition: 'All negative' },
        { input: '8\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', isHidden: true, condition: 'Complex sequence' },
      ],
    };
  }
}
