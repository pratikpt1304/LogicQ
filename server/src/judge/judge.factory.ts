import { IJudge } from './judge.interface.js';
import { LocalGccJudge } from './local-gcc.judge.js';
import { Judge0Judge } from './judge0.judge.js';
import { DockerJudge } from './docker.judge.js';
import { ENV } from '../config/env.js';

let activeJudgeInstance: IJudge | null = null;

export async function getJudge(): Promise<IJudge> {
  if (activeJudgeInstance) {
    return activeJudgeInstance;
  }

  if (ENV.JUDGE_TYPE === 'judge0') {
    const judge0 = new Judge0Judge();
    if (await judge0.isAvailable()) {
      console.log('⚡ Active Judge: Judge0Judge');
      activeJudgeInstance = judge0;
      return activeJudgeInstance;
    }
    throw new Error('JUDGE_UNAVAILABLE: Configured Judge0 execution service is unavailable.');
  }

  if (ENV.JUDGE_TYPE === 'docker') {
    const dockerJudge = new DockerJudge();
    if (await dockerJudge.isAvailable()) {
      console.log('⚡ Active Judge: DockerJudge');
      activeJudgeInstance = dockerJudge;
      return activeJudgeInstance;
    }
    throw new Error('JUDGE_UNAVAILABLE: Configured Docker execution service is unavailable.');
  }

  // Default fallback: LocalGccJudge (real GCC compiler)
  const localJudge = new LocalGccJudge();
  if (await localJudge.isAvailable()) {
    activeJudgeInstance = localJudge;
    console.log(`⚡ Active Judge: ${localJudge.name}`);
    return activeJudgeInstance;
  }

  throw new Error(
    'JUDGE_UNAVAILABLE: Code execution service is temporarily unavailable. No real C compiler sandbox could be reached.'
  );
}

