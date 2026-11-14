import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';

export interface OpenWaConfig {
  gatewayUrl: string;
  sessionId: string;
  apiKey: string;
  defaultChatId: string;
  enabled: boolean;
}

export const DEFAULT_OPENWA_CONFIG: OpenWaConfig = {
  gatewayUrl: 'http://localhost:3000',
  sessionId: 'default',
  apiKey: '',
  defaultChatId: '',
  enabled: true,
};

const STORAGE_KEY = 'logicq_openwa_config';

export class OpenWaService {
  /**
   * Loads config from local storage or returns defaults
   */
  static getLocalConfig(): OpenWaConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_OPENWA_CONFIG, ...JSON.parse(saved) };
      }
    } catch {}
    return { ...DEFAULT_OPENWA_CONFIG };
  }

  /**
   * Saves config to local storage
   */
  static saveLocalConfig(config: OpenWaConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {}
  }

  /**
   * Loads remote config from Firestore (shared among faculty)
   */
  static async getRemoteConfig(): Promise<OpenWaConfig> {
    try {
      const snap = await getDoc(doc(db, 'system_configs', 'openwa'));
      if (snap.exists()) {
        const data = snap.data() as Partial<OpenWaConfig>;
        const merged = { ...DEFAULT_OPENWA_CONFIG, ...data };
        this.saveLocalConfig(merged);
        return merged;
      }
    } catch {}
    return this.getLocalConfig();
  }

  /**
   * Saves remote config to Firestore
   */
  static async saveRemoteConfig(config: OpenWaConfig): Promise<void> {
    this.saveLocalConfig(config);
    try {
      await setDoc(doc(db, 'system_configs', 'openwa'), config, { merge: true });
    } catch (err) {
      console.warn('Could not persist OpenWA config to Firestore:', err);
    }
  }

  /**
   * Standardizes a phone number or group ID into OpenWA chatId format
   * - Personal number: 919876543210 -> 919876543210@c.us
   * - Group ID: 12036302484329@g.us -> unchanged
   */
  static formatChatId(input: string): string {
    const clean = input.trim();
    if (!clean) return '';
    if (clean.includes('@c.us') || clean.includes('@g.us')) {
      return clean;
    }
    // If only digits, treat as personal WhatsApp number
    const digitsOnly = clean.replace(/[^0-9]/g, '');
    if (digitsOnly) {
      return `${digitsOnly}@c.us`;
    }
    return clean;
  }

  /**
   * Formats official academic test alert message for WhatsApp
   */
  static formatTestAlert(test: {
    id: string;
    title: string;
    durationMinutes: number;
    totalMarks: number;
    sectionTarget?: string;
    unitTarget?: string | number;
  }): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://logicq-clanguage.web.app';
    const examUrl = `${baseUrl}/exam/${encodeURIComponent(test.id)}`;

    const unitStr =
      test.unitTarget && test.unitTarget !== 'ALL'
        ? `Unit ${test.unitTarget}`
        : 'All Units (Comprehensive Syllabus)';

    return [
      `🚨 *LOGICQ ACADEMIC ASSESSMENT ALERT* 🚨`,
      ``,
      `Dear Students,`,
      `A new practical programming test has been activated on the LogicQ portal:`,
      ``,
      `📝 *Title:* ${test.title}`,
      `⏱️ *Duration:* ${test.durationMinutes} Minutes`,
      `🎯 *Total Marks:* ${test.totalMarks} Marks`,
      `📚 *Scope:* ${unitStr}`,
      `🛡️ *Proctoring:* Active (Full-Screen & Tab Lock Enabled)`,
      ``,
      `👉 *Direct Exam Portal:*`,
      `${examUrl}`,
      ``,
      `⚠️ *Important Instructions:*`,
      `• Log in with your verified institutional PRN.`,
      `• Do not exit full-screen mode or switch browser tabs.`,
      `• Real-time GCC 14.2 compiler deterministic grading is active.`,
      ``,
      `— *LogicQ Academic Examination Board*`,
    ].join('\n');
  }

  /**
   * Generates direct wa.me share URL for 1-click fallback
   */
  static getDirectShareUrl(text: string, phone?: string): string {
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  /**
   * Tests connection to the OpenWA Gateway
   */
  static async testConnection(gatewayUrl: string, sessionId: string, apiKey?: string): Promise<{ success: boolean; message: string }> {
    try {
      const cleanUrl = gatewayUrl.replace(/\/$/, '');
      const url = `${cleanUrl}/api/sessions/${encodeURIComponent(sessionId)}/status`;
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
      });

      if (!res.ok) {
        return {
          success: false,
          message: `Gateway responded with HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const data = await res.json().catch(() => ({}));
      return {
        success: true,
        message: `Connected successfully! Session "${sessionId}" is active.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Connection failed. Ensure OpenWA server is running and accessible.',
      };
    }
  }

  /**
   * Dispatches text message via the OpenWA REST API Gateway
   * Endpoint: POST /api/sessions/{sessionId}/messages/send-text
   */
  static async sendViaGateway(options: {
    chatId: string;
    text: string;
    gatewayUrl?: string;
    sessionId?: string;
    apiKey?: string;
  }): Promise<{ success: boolean; error?: string; messageId?: string }> {
    const config = this.getLocalConfig();
    const gatewayUrl = (options.gatewayUrl || config.gatewayUrl || 'http://localhost:3000').replace(/\/$/, '');
    const sessionId = options.sessionId || config.sessionId || 'default';
    const apiKey = options.apiKey !== undefined ? options.apiKey : config.apiKey;

    const formattedChatId = this.formatChatId(options.chatId);
    if (!formattedChatId) {
      return { success: false, error: 'Recipient WhatsApp Number or Group ID is required.' };
    }

    const endpoint = `${gatewayUrl}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
        body: JSON.stringify({
          chatId: formattedChatId,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return {
          success: false,
          error: `OpenWA API error (HTTP ${response.status}): ${errorText || response.statusText}`,
        };
      }

      const resData = await response.json().catch(() => ({}));
      return {
        success: true,
        messageId: resData?.id || resData?.messageId || 'OK',
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Could not connect to OpenWA Gateway at ${gatewayUrl}. Please verify the server is running or use the direct WhatsApp Web share button. (${err?.message})`,
      };
    }
  }
}
