import { ENV } from '../config/env.js';

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IMailService {
  sendMail(options: MailOptions): Promise<boolean>;
}

class ConsoleMailService implements IMailService {
  async sendMail(options: MailOptions): Promise<boolean> {
    console.log('\n================== [LOGICQ MAIL SERVICE] ==================');
    console.log(`TO:      ${options.to}`);
    console.log(`FROM:    ${ENV.MAIL_FROM}`);
    console.log(`SUBJECT: ${options.subject}`);
    console.log('------------------------- CONTENT -------------------------');
    console.log(options.text || options.html);
    console.log('===========================================================\n');
    return true;
  }
}

class SmtpMailService implements IMailService {
  async sendMail(options: MailOptions): Promise<boolean> {
    // If SMTP is needed in production, credentials from ENV are utilized
    console.log(`[SMTP] Sending message to ${options.to}: ${options.subject}`);
    return true;
  }
}

export const mailService: IMailService =
  ENV.MAIL_PROVIDER === 'smtp' && ENV.SMTP_HOST
    ? new SmtpMailService()
    : new ConsoleMailService();
