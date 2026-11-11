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
  private port: number;
  private secure: boolean;

  constructor(port: number = 587, secure: boolean = false) {
    this.port = port;
    this.secure = secure;
    this.initTransporter();
  }

  private initTransporter() {
    try {
      const user = ENV.SMTP_USER || process.env.SMTP_USER || 'logicqarena@gmail.com';
      const pass = (ENV.SMTP_PASS || process.env.SMTP_PASS || 'twzlhqrtshcafwvr').replace(/\s+/g, '');
      const host = ENV.SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';

      if (!user || !pass) {
        console.warn('[NodemailerMailService] SMTP_USER or SMTP_PASS is missing in environment.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host,
        port: this.port,
        secure: this.secure,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 12000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      console.log(`[NodemailerMailService] Initialized SMTP at ${host}:${this.port} (secure=${this.secure}) for ${user}`);
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

      const fromAddress = ENV.MAIL_FROM || `LogicQ Arena <${ENV.SMTP_USER || 'logicqarena@gmail.com'}>`;

      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text || options.subject,
        html: options.html,
      });

      console.log(`[Nodemailer] Successfully delivered email to ${options.to} via port ${this.port} (MessageId: ${info.messageId})`);
      return true;
    } catch (err: any) {
      console.error(`[Nodemailer] Error sending email via port ${this.port} to ${options.to}:`, err?.message || err);
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
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
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
  const providers: IMailService[] = [];

  // 1. Primary: Google Apps Script Web App (dispatches over HTTPS port 443; zero port blocking on hosting platforms like Render)
  const gasUrl = process.env.GAS_MAIL_URL || (ENV as any).GAS_MAIL_URL || 'https://script.google.com/macros/s/AKfycbyKujXwhftWWyvIYmmJolrtTQ2ubwWzsrs88nmdDZcMncXs7fbR1BxdXLDXTriYAkV2/exec';
  if (gasUrl) {
    providers.push(new GoogleAppsScriptMailService(gasUrl));
  }

  // 2. Secondary SMTP: Direct Gmail SMTP using App Password
  const smtpUser = process.env.SMTP_USER || ENV.SMTP_USER || 'logicqarena@gmail.com';
  const smtpPass = (process.env.SMTP_PASS || ENV.SMTP_PASS || 'twzlhqrtshcafwvr').replace(/\s+/g, '');
  if (smtpUser && smtpPass) {
    providers.push(new NodemailerMailService(587, false));
    providers.push(new NodemailerMailService(465, true));
  }

  // 3. Fallback: Console logger
  providers.push(new ConsoleMailService());

  return new ChainedMailService(providers);
}

export const mailService: IMailService = getMailService();
