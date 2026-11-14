import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  ExternalLink,
  Copy,
  Check,
  Settings,
  AlertCircle,
  CheckCircle2,
  Radio,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { OpenWaService, OpenWaConfig, DEFAULT_OPENWA_CONFIG } from '../../services/openWa.service.js';

interface WhatsAppBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  test: {
    id: string;
    title: string;
    durationMinutes: number;
    totalMarks: number;
    sectionTarget?: string;
    unitTarget?: string | number;
  } | null;
}

export const WhatsAppBroadcastModal: React.FC<WhatsAppBroadcastModalProps> = ({
  isOpen,
  onClose,
  test,
}) => {
  const [recipient, setRecipient] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [config, setConfig] = useState<OpenWaConfig>(DEFAULT_OPENWA_CONFIG);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      OpenWaService.getRemoteConfig().then((cfg) => {
        setConfig(cfg);
        if (cfg.defaultChatId) {
          setRecipient(cfg.defaultChatId);
        }
      });
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen || !test) return null;

  const messageText = OpenWaService.formatTestAlert(test);
  const directShareUrl = OpenWaService.getDirectShareUrl(messageText, recipient);

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    toast.success('WhatsApp announcement copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSettings = async () => {
    await OpenWaService.saveRemoteConfig({
      ...config,
      defaultChatId: recipient || config.defaultChatId,
    });
    toast.success('OpenWA configuration saved!');
    setShowSettings(false);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await OpenWaService.testConnection(
        config.gatewayUrl,
        config.sessionId,
        config.apiKey
      );
      setTestResult(result);
      if (result.success) {
        toast.success('OpenWA Gateway connected successfully!');
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendViaGateway = async () => {
    if (!recipient.trim()) {
      toast.error('Please enter a target WhatsApp Group ID or Student Phone Number.');
      return;
    }

    setIsSending(true);
    try {
      const res = await OpenWaService.sendViaGateway({
        chatId: recipient,
        text: messageText,
        gatewayUrl: config.gatewayUrl,
        sessionId: config.sessionId,
        apiKey: config.apiKey,
      });

      if (res.success) {
        toast.success(`Assessment alert dispatched via OpenWA! (ID: ${res.messageId})`);
        // Save recipient as default
        OpenWaService.saveRemoteConfig({ ...config, defaultChatId: recipient });
        onClose();
      } else {
        toast.error(res.error || 'Failed to dispatch via OpenWA.');
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#141932] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/80 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Broadcast Assessment on WhatsApp
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold">
                  OpenWA Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Notify student cohorts instantly with verified exam credentials and instructions.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Target Recipient Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Recipient WhatsApp Group ID or Phone Number
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. 12036302484329@g.us (Group) or 919876543210 (Mobile)"
                className="flex-1 px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${
                  showSettings
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
                title="Configure OpenWA Gateway"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Gateway Settings</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Enter a 12-digit Indian mobile number (e.g. <code className="font-mono text-emerald-600 dark:text-emerald-400">919876543210</code>) or an OpenWA Group ID (ending in <code className="font-mono text-emerald-600 dark:text-emerald-400">@g.us</code>).
            </p>
          </div>

          {/* Gateway Settings Accordion */}
          {showSettings && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-500" />
                  OpenWA Server Gateway Configuration
                </span>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
                >
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                    Gateway URL
                  </span>
                  <input
                    type="text"
                    value={config.gatewayUrl}
                    onChange={(e) => setConfig({ ...config, gatewayUrl: e.target.value })}
                    placeholder="http://localhost:3000"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                    Session ID
                  </span>
                  <input
                    type="text"
                    value={config.sessionId}
                    onChange={(e) => setConfig({ ...config, sessionId: e.target.value })}
                    placeholder="default"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                    API Key (X-API-Key, Optional)
                  </span>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="Enter API key if enabled in OpenWA"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white/10 dark:hover:bg-white/20 text-xs font-medium transition"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {/* Message Preview (WhatsApp Chat Bubble Simulation) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Live WhatsApp Message Preview
              </span>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#e5ddd5]/60 dark:bg-[#0b141a] border border-slate-200 dark:border-white/10 font-sans">
              <div className="max-w-md bg-white dark:bg-[#1f2c34] p-3.5 rounded-2xl rounded-tl-sm shadow-sm space-y-2 border border-black/5 dark:border-white/5">
                <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                  {messageText}
                </div>
                <div className="text-[10px] text-slate-400 text-right font-mono flex items-center justify-end gap-1">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <Check className="w-3 h-3 text-emerald-500" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <a
            href={directShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold transition shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in WhatsApp Web / App</span>
          </a>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSendViaGateway}
              disabled={isSending}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending via OpenWA...' : 'Send via OpenWA Gateway'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
