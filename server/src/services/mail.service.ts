import nodemailer from 'nodemailer';
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
    console.log('\n================== [LOGICQ MAIL SERVICE - CONSOLE] ==================');
    console.log(`TO:      ${options.to}`);
    console.log(`FROM:    ${ENV.MAIL_FROM}`);
    console.log(`SUBJECT: ${options.subject}`);
    console.log('------------------------- CONTENT -------------------------');
    console.log(options.text || options.html);
    console.log('=====================================================================\n');
    return true;
  }
}

class NodemailerMailService implements IMailService {
  private transporter: any = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    try {
      const user = ENV.SMTP_USER || process.env.SMTP_USER || '';
      const pass = (ENV.SMTP_PASS || process.env.SMTP_PASS || '').replace(/\s+/g, '');
      const host = ENV.SMTP_HOST || process.env.SMTP_HOST || '';
      const port = ENV.SMTP_PORT || parseInt(process.env.SMTP_PORT || '465', 10);

      if (!user || !pass) {
        console.warn('[NodemailerMailService] SMTP_USER or SMTP_PASS is missing in environment.');
        return;
      }

      const isGmail = host.includes('gmail') || user.endsWith('@gmail.com');

      if (isGmail) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user,
            pass,
          },
        });
        console.log(`[NodemailerMailService] Initialized Gmail SMTP for ${user}`);
      } else {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user,
            pass,
          },
        });
        console.log(`[NodemailerMailService] Initialized Custom SMTP at ${host}:${port} for ${user}`);
      }
    } catch (err: any) {
      console.error('[NodemailerMailService] Failed to initialize transporter:', err?.message || err);
    }
  }

  async sendMail(options: MailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.initTransporter();
      }
      if (!this.transporter) {
        console.warn(`[NodemailerMailService] Transporter unavailable. Falling back to console log for ${options.to}`);
        console.log(`[FALLBACK MAIL] To: ${options.to} | Subject: ${options.subject}`);
        return false;
      }

      const fromAddress = ENV.MAIL_FROM || `LogicQ Arena <${ENV.SMTP_USER}>`;

      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text || options.subject,
        html: options.html,
      });

      console.log(`[Nodemailer] Successfully delivered email to ${options.to} (MessageId: ${info.messageId})`);
      return true;
    } catch (err: any) {
      console.error(`[Nodemailer] Error sending email to ${options.to}:`, err?.message || err);
      return false;
    }
  }
}

export const mailService: IMailService =
  ENV.MAIL_PROVIDER === 'smtp' || Boolean((ENV.SMTP_USER || process.env.SMTP_USER) && (ENV.SMTP_PASS || process.env.SMTP_PASS))
    ? new NodemailerMailService()
    : new ConsoleMailService();
