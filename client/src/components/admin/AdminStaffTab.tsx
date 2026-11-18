import React, { useState } from 'react';
import {
  Copy,
  Check,
  Crown,
  Shield,
  GraduationCap,
  Eye,
  EyeOff,
  UserCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  KeyRound,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface StaffAccount {
  role: string;
  roleLabel: string;
  email: string;
  password: string;
  fullName: string;
  designation: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  cardBorder: string;
  cardBg: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

const STAFF_ACCOUNTS: StaffAccount[] = [
  {
    role: 'ADMIN',
    roleLabel: 'Super Admin',
    email: 'logicqarena@gmail.com',
    password: 'password123',
    fullName: 'LogicQ Arena',
    designation: 'Platform Administrator',
    description: 'Root platform access — system configuration, purge/reset tools, database maintenance, full telemetry audit logs & user role assignment.',
    icon: Crown,
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    cardBorder: 'border-amber-200 dark:border-amber-500/30',
    cardBg: 'bg-gradient-to-br from-amber-50/40 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900',
    badgeBg: 'bg-amber-50 dark:bg-amber-500/15',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-200/80 dark:border-amber-500/30',
  },
  {
    role: 'ADMIN',
    roleLabel: 'Super Admin',
    email: 'hariprasathset@sanjivani.edu.in',
    password: 'password123',
    fullName: 'Hariprasath (Admin)',
    designation: 'Platform Administrator',
    description: 'Root platform access — system configuration, purge/reset tools, database maintenance, full telemetry audit logs & user role assignment.',
    icon: Crown,
    iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    cardBorder: 'border-indigo-200 dark:border-indigo-500/30',
    cardBg: 'bg-gradient-to-br from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-500/15',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBorder: 'border-indigo-200/80 dark:border-indigo-500/30',
  },
  {
    role: 'FACULTY',
    roleLabel: 'Faculty (Hariprasad Sir)',
    email: 'hariprasad.logicq@gmail.com',
    password: 'LogicQ@Hariprasad2026',
    fullName: 'Hariprasad Sir',
    designation: 'Course Lead / Professor',
    description: 'Division management, assessments creation & review, question authoring, live proctor telemetry inspection & code testing access without student restrictions.',
    icon: GraduationCap,
    iconBg: 'bg-teal-500/10 dark:bg-teal-500/20',
    iconColor: 'text-teal-600 dark:text-teal-400',
    cardBorder: 'border-teal-200 dark:border-teal-500/30',
    cardBg: 'bg-gradient-to-br from-teal-50/40 via-white to-white dark:from-teal-950/20 dark:via-slate-900 dark:to-slate-900',
    badgeBg: 'bg-teal-50 dark:bg-teal-500/15',
    badgeText: 'text-teal-700 dark:text-teal-300',
    badgeBorder: 'border-teal-200/80 dark:border-teal-500/30',
  },
];

const HIERARCHY_STEPS = [
  {
    tier: 'Tier 1',
    name: 'Super Admin',
    scope: 'Full Platform Root Control',
    color: 'from-amber-500 to-orange-600',
    border: 'border-amber-300 dark:border-amber-600',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  {
    tier: 'Tier 2',
    name: 'HOD / Dean / VC',
    scope: 'Governance & Analytics Audit',
    color: 'from-purple-500 to-indigo-600',
    border: 'border-purple-300 dark:border-purple-600',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  },
  {
    tier: 'Tier 3',
    name: 'Faculty / Course Lead',
    scope: 'Cohort Management & Solving Access',
    color: 'from-blue-500 to-cyan-600',
    border: 'border-blue-300 dark:border-blue-600',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  {
    tier: 'Tier 4',
    name: 'Student Candidate',
    scope: 'Proctored Assessment & Practice',
    color: 'from-slate-400 to-slate-600',
    border: 'border-slate-300 dark:border-slate-700',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
];

const PERMISSIONS = [
  {
    feature: 'Admin Portal Access',
    desc: 'Access to /admin dashboard and management views',
    superAdmin: true,
    hod: true,
    faculty: true,
    student: false,
  },
  {
    feature: 'System Config & Purge Tools',
    desc: 'System reset, purge caches, database sync tools',
    superAdmin: true,
    hod: false,
    faculty: false,
    student: false,
  },
  {
    feature: 'Student Enrolment & Status',
    desc: 'View students, bind verification, identity records',
    superAdmin: 'All Cohorts',
    hod: 'Read-Only (All)',
    faculty: 'Own Cohort',
    student: false,
  },
  {
    feature: 'Question Bank Authoring',
    desc: 'Create, edit questions, adjust test cases and starter code',
    superAdmin: true,
    hod: false,
    faculty: true,
    student: false,
  },
  {
    feature: 'Integrity & AI Viva Monitoring',
    desc: 'Live telemetry, violation timeline, incident logs & AI viva audits',
    superAdmin: true,
    hod: true,
    faculty: true,
    student: false,
  },
  {
    feature: 'Reports & Accreditation Export',
    desc: 'Download CSV/PDF reports, NBA/NAAC accreditation metrics',
    superAdmin: true,
    hod: true,
    faculty: true,
    student: false,
  },
  {
    feature: 'Direct Problem Solving Access',
    desc: 'Open editor, run code and verify test cases without proctor lock',
    superAdmin: true,
    hod: true,
    faculty: true,
    student: false,
  },
  {
    feature: 'Screenshot & Screen Recording Exemption',
    desc: 'Exempt from anti-screenshot shields, PrintScreen blocks & blur blackout',
    superAdmin: true,
    hod: true,
    faculty: true,
    student: false,
  },
  {
    feature: 'Exam Proctored Workspace',
    desc: 'Mandatory fullscreen, anti-cheat detection, tab-switch monitoring',
    superAdmin: 'Bypassed',
    hod: 'Bypassed',
    faculty: 'Bypassed',
    student: 'Strictly Enforced',
  },
];

function PermBadge({ val }: { val: boolean | string }) {
  if (val === false) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400">
        <XCircle className="w-4 h-4" />
      </span>
    );
  }
  if (val === true) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-4 h-4" />
      </span>
    );
  }
  const isEnforced = val === 'Strictly Enforced';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
        isEnforced
          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
          : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
      }`}
    >
      <Check className="w-3 h-3" />
      <span>{val}</span>
    </span>
  );
}

function CredentialField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(label !== 'Password');

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      toast.success(`${label} copied!`);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 transition hover:border-slate-300 dark:hover:border-slate-600">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-0.5">
          {label}
        </div>
        <div className="text-xs sm:text-sm font-mono font-semibold text-slate-800 dark:text-slate-100 truncate select-all">
          {label === 'Password' && !show ? '••••••••••••••••' : value}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {label === 'Password' && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            title={show ? 'Hide Password' : 'Show Password'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          title={`Copy ${label}`}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export const AdminStaffTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Staff Accounts & Role Hierarchy
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 text-[10px] font-bold">
                  <Sparkles className="w-3 h-3" />
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Multi-tier institutional access control for Super Admin, HOD/Dean, Faculty and Students.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Staff Accounts: <strong className="text-slate-900 dark:text-white font-bold">{STAFF_ACCOUNTS.length}</strong>
            </span>
          </div>
        </div>

        {/* 2. Visual Role Hierarchy Flow */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            Role Hierarchy & Access Levels
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {HIERARCHY_STEPS.map((h, i) => (
              <div
                key={i}
                className="relative bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${h.badge}`}>
                      {h.tier}
                    </span>
                    {i < HIERARCHY_STEPS.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {h.name}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  {h.scope}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Staff Accounts Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Official Staff Credentials
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Copy credentials to log into the respective staff portal. Passwords can be revealed or copied with 1 click.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {STAFF_ACCOUNTS.map((acc, i) => {
            const Icon = acc.icon;
            return (
              <div
                key={i}
                className={`bg-white dark:bg-slate-900 rounded-2xl border ${acc.cardBorder} p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between space-y-4`}
              >
                {/* Account Header */}
                <div className="flex items-start gap-3.5">
                  <div className={`w-11 h-11 rounded-xl ${acc.iconBg} ${acc.iconColor} flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {acc.fullName}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${acc.badgeBg} ${acc.badgeText} ${acc.badgeBorder}`}>
                        {acc.roleLabel}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {acc.designation}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {acc.description}
                    </p>
                  </div>
                </div>

                {/* Credentials Strip */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <CredentialField label="Email" value={acc.email} />
                  <CredentialField label="Password" value={acc.password} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Permissions Matrix Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Role Permissions Matrix
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparison of functional capabilities across all 4 access levels.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-5 font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px] min-w-[240px]">
                  Capability / Feature
                </th>
                <th className="py-3 px-4 text-center font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider text-[11px]">
                  Super Admin
                </th>
                <th className="py-3 px-4 text-center font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider text-[11px]">
                  HOD / Dean / VC
                </th>
                <th className="py-3 px-4 text-center font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider text-[11px]">
                  Faculty
                </th>
                <th className="py-3 px-4 text-center font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                  Student
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {PERMISSIONS.map((perm, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-slate-800 dark:text-slate-100">
                      {perm.feature}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {perm.desc}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <PermBadge val={perm.superAdmin} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <PermBadge val={perm.hod} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <PermBadge val={perm.faculty} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <PermBadge val={perm.student} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
