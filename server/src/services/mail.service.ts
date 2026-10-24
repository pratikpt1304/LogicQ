import nodemailer from 'nodemailer';
import { Resend } from 'resend';
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

class ResendMailService implements IMailService {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
    console.log('[ResendMailService] Initialized Resend HTTP API (Port 443 HTTPS)');
  }

  async sendMail(options: MailOptions): Promise<boolean> {
    try {
      const from = process.env.RESEND_FROM || 'LogicQ Arena <onboarding@resend.dev>';
      const { data, error } = await this.resend.emails.send({
        from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        console.error('[ResendMailService] Delivery error:', error);
        return false;
      }

      console.log(`[ResendMailService] Successfully dispatched email to ${options.to} (ID: ${data?.id})`);
      return true;
    } catch (err: any) {
      console.error(`[ResendMailService] Exception sending email to ${options.to}:`, err?.message || err);
      return false;
    }
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
          connectionTimeout: 4000,
          greetingTimeout: 4000,
          socketTimeout: 4000,
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
          connectionTimeout: 4000,
          greetingTimeout: 4000,
          socketTimeout: 4000,
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
        console.warn(`[NodemailerMailService] Transporter unavailable for ${options.to}`);
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

class GoogleAppsScriptMailService implements IMailService {
  private url: string;

  constructor(url: string) {
    this.url = url;
    console.log('[GoogleAppsScriptMailService] Initialized Google Apps Script Web App Dispatcher');
  }

  async sendMail(options: MailOptions): Promise<boolean> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text || options.subject,
        }),
      });

      const data: any = await response.json().catch(() => null);
      if (data && data.status === 'error') {
        console.error(`[GoogleAppsScriptMailService] GAS error:`, data.message || data.error);
        return false;
      }

      console.log(`[GoogleAppsScriptMailService] Successfully sent to ${options.to} via Google Apps Script`);
      return response.status < 400;
    } catch (err: any) {
      console.error(`[GoogleAppsScriptMailService] Error sending to ${options.to}:`, err?.message || err);
      return false;
    }
  }
}

class ChainedMailService implements IMailService {
  private providers: IMailService[];

  constructor(providers: IMailService[]) {
    this.providers = providers;
  }

  async sendMail(options: MailOptions): Promise<boolean> {
    for (const provider of this.providers) {
      try {
        const success = await provider.sendMail(options);
        if (success) return true;
      } catch {
        console.warn('[ChainedMailService] Provider attempt failed, falling back to next provider...');
      }
    }
    return false;
  }
}

export function getMailService(): IMailService {
  const gasUrl = process.env.GAS_MAIL_URL || (ENV as any).GAS_MAIL_URL || 'https://script.google.com/macros/s/AKfycbxjaWOh9cU5QuwsoW30kQsRmYRb8AFO0_O8_wXXezLFJb-B0v_CCyZPKDTDcd1qBKV3/exec';
  if (gasUrl) {
    return new GoogleAppsScriptMailService(gasUrl);
  }

  return new ConsoleMailService();
}

export const mailService: IMailService = getMailService();
