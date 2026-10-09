import { IJudge, ExecutionResult, Verdict } from './judge.interface.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const execFileAsync = promisify(execFile);

export class DockerJudge implements IJudge {
  readonly name = 'DockerJudge';

  async isAvailable(): Promise<boolean> {
    try {
      await execFileAsync('docker', ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  async compileAndRun(
    code: string,
    stdin: string,
    timeLimitMs: number = 1000,
    memoryLimitMb: number = 64
  ): Promise<ExecutionResult> {
    const tempId = uuidv4();
    const tempDir = path.join(os.tmpdir(), `logicq_docker_${tempId}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const sourceFile = path.join(tempDir, 'solution.c');
    const inputFile = path.join(tempDir, 'input.txt');
    fs.writeFileSync(sourceFile, code, 'utf8');
    fs.writeFileSync(inputFile, stdin, 'utf8');

    try {
      const dockerArgs = [
        'run',
        '--rm',
        '--network', 'none',
        '-m', `${memoryLimitMb}m`,
        '--cpus', '0.5',
        '-v', `${tempDir}:/workspace:ro`,
        'gcc:alpine',
        'sh', '-c',
        `gcc -O2 -std=c11 -o /tmp/sol /workspace/solution.c && /tmp/sol < /workspace/input.txt`,
      ];

      const startTime = performance.now();
      const { stdout, stderr } = await execFileAsync('docker', dockerArgs, {
        timeout: timeLimitMs + 5000,
        maxBuffer: 1024 * 1024,
      });
      const runtimeMs = Math.round(performance.now() - startTime);

      return {
        verdict: Verdict.ACCEPTED,
        runtimeMs,
        stdout,
        stderr,
      };
    } catch (err: any) {
      if (err.killed || err.signal === 'SIGTERM') {
        return { verdict: Verdict.TIME_LIMIT_EXCEEDED, runtimeMs: timeLimitMs };
      }
      return {
        verdict: Verdict.RUNTIME_ERROR,
        runtimeMs: 0,
        stderr: err.stderr || err.message,
      };
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }
}
