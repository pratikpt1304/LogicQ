import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  
  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'logicq_super_secret_access_token_jwt_key_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'logicq_super_secret_refresh_token_jwt_key_2026',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Judge
  JUDGE_TYPE: (process.env.JUDGE_TYPE || 'local_gcc') as 'local_gcc' | 'judge0' | 'docker',
  GCC_PATH: process.env.GCC_PATH || '',
  JUDGE0_URL: process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com',
  JUDGE0_KEY: process.env.JUDGE0_KEY || '',
  JUDGE0_HOST: process.env.JUDGE0_HOST || 'judge0-ce.p.rapidapi.com',

  // Queue
  REDIS_URL: process.env.REDIS_URL || '',

  // Mail
  RESEND_API_KEY: process.env.RESEND_API_KEY || 're_GqGbrzoo_DKfnUEBFnqipy7VCcz1Pn5DS',
  RESEND_FROM: process.env.RESEND_FROM || 'LogicQ Arena <onboarding@resend.dev>',
  MAIL_PROVIDER: (process.env.MAIL_PROVIDER || 'smtp') as 'console' | 'smtp',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '465', 10),
  SMTP_USER: process.env.SMTP_USER || 'logicqarena@gmail.com',
  SMTP_PASS: process.env.SMTP_PASS || 'twzlhqrtshcafwvr',
  MAIL_FROM: process.env.MAIL_FROM || 'LogicQ Arena <logicqarena@gmail.com>',
};
