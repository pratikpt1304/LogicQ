import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Calendar,
  Layers,
  Award,
  ExternalLink,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import QRCode from 'qrcode';

interface VerificationData {
  reportId: string;
  scope: 'SINGLE_MODULE' | 'ALL_MODULES';
  moduleSlug: string | null;
  moduleTitle: string;
  status: 'COMPLETED' | 'IN_PROGRESS';
  isComplete: boolean;
  statusLabel: string;
  questionsSolved: number;
  totalQuestions: number;
  completionPercentage: number;
  generatedAt: string;
  verificationNotice: string;
}

export const PublicReportVerificationPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function fetchVerification() {
      if (!reportId) {
        setError('No report ID specified in URL.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/practice/reports/verify/${encodeURIComponent(reportId)}`);
        if (isMounted) {
          if (res.data?.success && res.data?.data) {
            setData(res.data.data);
            try {
              const url = window.location.href;
              const qr = await QRCode.toDataURL(url, {
                width: 180,
                margin: 2,
                color: {
                  dark: '#0C0F1F',
                  light: '#FFFFFF',
                },
              });
              setQrDataUrl(qr);
            } catch (qrErr) {
              console.warn('QR code generation notice:', qrErr);
            }
          } else {
            setError(res.data?.message || 'Report verification record could not be confirmed.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          const msg =
            err.response?.data?.message ||
            'This report verification record could not be found or has expired.';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchVerification();

    return () => {
      isMounted = false;
    };
  }, [reportId]);

  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-xl space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            to="/practice"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#8B9BFF] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to LogicQ Practice</span>
          </Link>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#9AA1C4]">
            Official Audit Registry
          </span>
        </div>

        {/* Verification Card */}
        <div className="glass-card rounded-2xl border border-[#252C4F] bg-[#141932] p-6 sm:p-8 shadow-xl">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-[#8B9BFF] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-[#9AA1C4]">
                Authenticating report token with LogicQ verification ledger...
              </p>
            </div>
          ) : error || !data ? (
            <div className="text-center space-y-4 py-8">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#E8EAF6] font-mono">
                  Report Verification Failed
                </h2>
                <p className="text-xs text-[#9AA1C4] max-w-md mx-auto leading-relaxed">
                  {error || 'The requested verification token is invalid or unrecorded.'}
                </p>
              </div>
              <div className="pt-2 text-xs font-mono text-rose-400 bg-rose-500/5 py-2 px-3 rounded-lg border border-rose-500/20 max-w-sm mx-auto truncate">
                Token: {reportId || 'None'}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Authenticity Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#252C4F] pb-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      data.isComplete
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                    }`}
                  >
                    {data.isComplete ? (
                      <ShieldCheck className="w-6 h-6" />
                    ) : (
                      <FileCheck2 className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#9AA1C4] block">
                      Authenticity Status
                    </span>
                    <h1 className="text-base sm:text-lg font-bold text-[#E8EAF6] font-mono">
                      {data.isComplete ? 'Genuine Verified Completion' : 'Genuine In-Progress Report'}
                    </h1>
                  </div>
                </div>

                <div
                  className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wide uppercase shrink-0 text-center ${
                    data.isComplete
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {data.statusLabel}
                </div>
              </div>

              {/* Zero-PII Notice */}
              <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] flex items-start gap-3">
                <Lock className="w-4 h-4 text-[#8B9BFF] shrink-0 mt-0.5" />
                <p className="text-[11px] font-mono text-[#9AA1C4] leading-relaxed">
                  <strong className="text-[#E8EAF6]">Privacy Guarantee:</strong> This public
                  verification ledger validates academic curriculum integrity without disclosing student
                  identity, PRN, email, or personally identifiable records.
                </p>
              </div>

              {/* Scope & Completion Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] space-y-1">
                  <span className="text-[10px] uppercase text-[#9AA1C4] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#8B9BFF]" />
                    <span>Curriculum Scope</span>
                  </span>
                  <strong className="text-[#E8EAF6] text-sm block">{data.moduleTitle}</strong>
                  <span className="text-[11px] text-[#9AA1C4]">
                    {data.scope === 'ALL_MODULES'
                      ? 'Complete 4-Module Curriculum'
                      : 'Single Practice Module'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] space-y-1">
                  <span className="text-[10px] uppercase text-[#9AA1C4] flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#8B9BFF]" />
                    <span>Curriculum Progress</span>
                  </span>
                  <strong className="text-emerald-400 text-sm block">
                    {data.questionsSolved} / {data.totalQuestions} Solved ({data.completionPercentage}%)
                  </strong>
                  <span className="text-[11px] text-[#9AA1C4]">
                    Active Telemetry Validated
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0C0F1F] border border-[#252C4F] space-y-1 sm:col-span-2">
                  <span className="text-[10px] uppercase text-[#9AA1C4] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#8B9BFF]" />
                    <span>Generation Timestamp</span>
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-[#E8EAF6]">
                      {new Date(data.generatedAt).toUTCString()}
                    </strong>
                    <span className="text-[11px] text-[#9AA1C4]">
                      ({new Date(data.generatedAt).toLocaleString()})
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code and Ledger Token Display */}
              <div className="p-4 rounded-xl bg-[#0C0F1F] border border-[#252C4F] flex flex-col sm:flex-row items-center gap-4">
                {qrDataUrl && (
                  <div className="p-1.5 rounded-lg bg-white shrink-0 shadow-md">
                    <img
                      src={qrDataUrl}
                      alt="Report Verification QR Code"
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                )}
                <div className="space-y-1.5 flex-1 min-w-0 text-center sm:text-left">
                  <span className="text-[10px] font-mono uppercase text-[#9AA1C4] tracking-wider block">
                    Cryptographic Report ID (Unguessable 192-bit Token)
                  </span>
                  <code className="text-[11px] font-mono text-[#8B9BFF] bg-[#141932] px-2.5 py-1.5 rounded-lg border border-[#252C4F] block break-all">
                    {data.reportId}
                  </code>
                  <p className="text-[10px] font-mono text-[#9AA1C4]">
                    Scan QR code or use the unique URL to verify this certificate at any time.
                  </p>
                </div>
              </div>

              {/* Active-Time Note */}
              <div className="text-center pt-2">
                <p className="text-[11px] font-mono text-[#9AA1C4]">
                  Note: All timing metrics represent active solve time accumulated exclusively while the
                  problem interface was open and focused, verified via server telemetry.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
