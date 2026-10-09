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
    console.warn('⚠️ Judge0 configured but unavailable. Falling back to LocalGccJudge.');
  }

  if (ENV.JUDGE_TYPE === 'docker') {
    const dockerJudge = new DockerJudge();
    if (await dockerJudge.isAvailable()) {
      console.log('⚡ Active Judge: DockerJudge');
      activeJudgeInstance = dockerJudge;
      return activeJudgeInstance;
    }
    console.warn('⚠️ Docker configured but unavailable. Falling back to LocalGccJudge.');
  }

  // Default fallback: LocalGccJudge
  const localJudge = new LocalGccJudge();
  activeJudgeInstance = localJudge;
  console.log(`⚡ Active Judge: ${localJudge.name}`);
  return activeJudgeInstance;
}
