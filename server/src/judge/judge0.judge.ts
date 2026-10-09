import { IJudge, ExecutionResult, Verdict } from './judge.interface.js';
import { ENV } from '../config/env.js';

export class Judge0Judge implements IJudge {
  readonly name = 'Judge0Judge';

  async isAvailable(): Promise<boolean> {
    return Boolean(ENV.JUDGE0_URL && ENV.JUDGE0_KEY);
  }

  async compileAndRun(
    code: string,
    stdin: string,
    timeLimitMs: number = 1000,
    memoryLimitMb: number = 64
  ): Promise<ExecutionResult> {
    if (!ENV.JUDGE0_URL) {
      throw new Error('Judge0 URL not configured');
    }

    const timeLimitSec = timeLimitMs / 1000;
    const memoryLimitKb = memoryLimitMb * 1024;

    const payload = {
      source_code: Buffer.from(code).toString('base64'),
      language_id: 50, // C (GCC 9.2.0)
      stdin: Buffer.from(stdin).toString('base64'),
      cpu_time_limit: timeLimitSec,
      memory_limit: memoryLimitKb,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': ENV.JUDGE0_KEY,
      'X-RapidAPI-Host': ENV.JUDGE0_HOST,
    };

    const response = await fetch(`${ENV.JUDGE0_URL}/submissions?base64_encoded=true&wait=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Judge0 API request failed with status: ${response.status}`);
    }

    const data = (await response.json()) as any;

    const decode = (str: string | null) =>
      str ? Buffer.from(str, 'base64').toString('utf8') : '';

    const stdout = decode(data.stdout);
    const stderr = decode(data.stderr);
    const compileOutput = decode(data.compile_output);
    const runtimeMs = Math.round((parseFloat(data.time) || 0) * 1000);
    const memoryKb = data.memory || 0;

    let verdict = Verdict.ACCEPTED;
    const statusId = data.status?.id;

    if (statusId === 3) {
      verdict = Verdict.ACCEPTED;
    } else if (statusId === 4) {
      verdict = Verdict.WRONG_ANSWER;
    } else if (statusId === 5) {
      verdict = Verdict.TIME_LIMIT_EXCEEDED;
    } else if (statusId === 6) {
      verdict = Verdict.COMPILE_ERROR;
    } else if (statusId >= 7 && statusId <= 12) {
      verdict = Verdict.RUNTIME_ERROR;
    }

    return {
      verdict,
      runtimeMs,
      memoryKb,
      stdout,
      stderr,
      compileOutput,
    };
  }
}
