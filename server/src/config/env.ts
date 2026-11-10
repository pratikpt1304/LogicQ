import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  
  // JWT (High entropy rotated secrets)
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'lq_sec_9f7a8b1c4d2e3f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'lq_ref_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '2h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Judge
  JUDGE_TYPE: (process.env.JUDGE_TYPE || 'local_gcc') as 'local_gcc' | 'judge0' | 'docker' | 'remote',
  JUDGE_SERVICE_URL: process.env.JUDGE_SERVICE_URL || 'http://localhost:5050',
  JUDGE_SERVICE_SECRET: process.env.JUDGE_SERVICE_SECRET || '',
  GCC_PATH: process.env.GCC_PATH || '',
  JUDGE0_URL: process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com',
  JUDGE0_KEY: process.env.JUDGE0_KEY || '',
  JUDGE0_HOST: process.env.JUDGE0_HOST || 'judge0-ce.p.rapidapi.com',

  // Queue
  REDIS_URL: process.env.REDIS_URL || '',

  // Mail
  GAS_MAIL_URL: process.env.GAS_MAIL_URL || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_FROM: process.env.RESEND_FROM || 'LogicQ Arena <onboarding@resend.dev>',
  MAIL_PROVIDER: (process.env.MAIL_PROVIDER || 'smtp') as 'console' | 'smtp',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '465', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'LogicQ Arena <no-reply@logicq.io>',
};
