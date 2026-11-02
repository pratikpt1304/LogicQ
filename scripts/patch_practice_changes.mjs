import fs from 'fs';

// ============================================================
// 1. Add "Go to Practice" button on locked Lab Internal cards
// ============================================================
{
  const filePath = 'client/src/pages/PracticeModulesPage.tsx';
  let c = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

  const target = `                  {/* Lock Requirement Box */}
                  <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      {mod.requirementText || 'Complete previous module to unlock.'}
                    </span>
                  </div>
                </div>`;

  if (!c.includes(target)) {
    console.error('PracticeModulesPage: lock box target not found!');
    process.exit(1);
  }

  const replacement = `                  {/* Lock Requirement Box */}
                  <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      {mod.requirementText || 'Complete previous module to unlock.'}
                    </span>
                  </div>

                  {/* Go to Practice Button */}
                  <div className="mt-3">
                    <Link
                      to="/practice"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Go to Practice (Module {mod.order}) \u2192</span>
                    </Link>
                  </div>
                </div>`;

  c = c.replace(target, replacement);
  fs.writeFileSync(filePath, c.replace(/\n/g, '\r\n'), 'utf8');
  console.log('\u2713 PracticeModulesPage: "Go to Practice" button added on locked cards.');
}

// ============================================================
// 2. Add "Lab Internal Submissions" sub-tab in admin panel
// ============================================================
{
  const filePath = 'client/src/pages/admin/AdminDashboardPage.tsx';
  let c = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

  // a) Extend submissionsSubView type
  const stateTarget = `const [submissionsSubView, setSubmissionsSubView] = useState<'feed' | 'practice'>('practice');`;
  const stateReplace = `const [submissionsSubView, setSubmissionsSubView] = useState<'feed' | 'practice' | 'lab-internal'>('practice');`;

  if (!c.includes(stateTarget)) {
    console.error('AdminDashboard: submissionsSubView state not found!');
    process.exit(1);
  }
  c = c.replace(stateTarget, stateReplace);

  // b) Add "Lab Internal Submissions" button tab (after Plagiarism Radar button)
  const tabTarget = `                <button
                 type="button"
                 onClick={() => setActiveTab('anticheat')}
                 className={\`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all \${
                   activeTab === 'anticheat'
                     ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                     : 'bg-slate-100 dark:bg-dark-900/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-slate-200 dark:border-white/[0.08]'
                 }\`}
               >
                 <ShieldAlert className="w-4 h-4 text-rose-500" />
                 <span>Plagiarism Radar</span>
               </button>`;

  const tabReplace = `                <button
                 type="button"
                 onClick={() => setActiveTab('anticheat')}
                 className={\`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all \${
                   activeTab === 'anticheat'
                     ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                     : 'bg-slate-100 dark:bg-dark-900/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-slate-200 dark:border-white/[0.08]'
                 }\`}
               >
                 <ShieldAlert className="w-4 h-4 text-rose-500" />
                 <span>Plagiarism Radar</span>
               </button>
               <button
                 type="button"
                 onClick={() => {
                   setActiveTab('submissions');
                   setSubmissionsSubView('lab-internal');
                 }}
                 className={\`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all \${
                   activeTab === 'submissions' && submissionsSubView === 'lab-internal'
                     ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                     : 'bg-slate-100 dark:bg-dark-900/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-slate-200 dark:border-white/[0.08]'
                 }\`}
               >
                 <BookOpen className="w-4 h-4 text-purple-400" />
                 <span>Lab Internal Submissions</span>
               </button>`;

  if (!c.includes(tabTarget)) {
    // try with slightly different whitespace
    const altTarget = `               <button\r\n                 type="button"\r\n                 onClick={() => setActiveTab('anticheat')}`;
    console.log('Trying alt target approach for tab button...');
    // Instead, do a simpler string replace on the closing of the Plagiarism Radar button block
    const plagiTarget = `                 <span>Plagiarism Radar</span>\n               </button>\n             </div>`;
    const plagiReplace = `                 <span>Plagiarism Radar</span>\n               </button>\n               <button\n                 type="button"\n                 onClick={() => {\n                   setActiveTab('submissions');\n                   setSubmissionsSubView('lab-internal');\n                 }}\n                 className={\`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all \${\n                   activeTab === 'submissions' && submissionsSubView === 'lab-internal'\n                     ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'\n                     : 'bg-slate-100 dark:bg-dark-900/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-slate-200 dark:border-white/[0.08]'\n                 }\`}\n               >\n                 <BookOpen className="w-4 h-4 text-purple-400" />\n                 <span>Lab Internal Submissions</span>\n               </button>\n             </div>`;
    if (!c.includes(plagiTarget)) {
      console.warn('AdminDashboard: lab internal tab insertion point not found, skipping tab button.');
    } else {
      c = c.replace(plagiTarget, plagiReplace);
      console.log('\u2713 AdminDashboard: "Lab Internal Submissions" tab button added (alt).');
    }
  } else {
    c = c.replace(tabTarget, tabReplace);
    console.log('\u2713 AdminDashboard: "Lab Internal Submissions" tab button added.');
  }

  // c) Add the lab-internal submissions view panel (after practice submissionsSubView block)
  const viewTarget = `          {activeTab === 'submissions' && submissionsSubView === 'practice' && (
            <AdminTopicPracticeSubmissions />
          )}`;
  const viewReplace = `          {activeTab === 'submissions' && submissionsSubView === 'practice' && (
            <AdminTopicPracticeSubmissions />
          )}

          {activeTab === 'submissions' && submissionsSubView === 'lab-internal' && (
            <AdminLabInternalSubmissions />
          )}`;

  if (!c.includes(viewTarget)) {
    console.warn('AdminDashboard: practice submissions view target not found, skipping view panel.');
  } else {
    c = c.replace(viewTarget, viewReplace);
    console.log('\u2713 AdminDashboard: Lab Internal submissions view slot added.');
  }

  // d) Add AdminLabInternalSubmissions import if AdminTopicPracticeSubmissions import exists
  const importTarget = `import { AdminTopicPracticeSubmissions } from '../../components/admin/AdminTopicPracticeSubmissions.js';`;
  const importReplace = `import { AdminTopicPracticeSubmissions } from '../../components/admin/AdminTopicPracticeSubmissions.js';
import { AdminLabInternalSubmissions } from '../../components/admin/AdminLabInternalSubmissions.js';`;

  if (c.includes(importTarget)) {
    c = c.replace(importTarget, importReplace);
    console.log('\u2713 AdminDashboard: AdminLabInternalSubmissions import added.');
  } else {
    console.warn('AdminDashboard: AdminTopicPracticeSubmissions import not found, skipping.');
  }

  fs.writeFileSync(filePath, c.replace(/\n/g, '\r\n'), 'utf8');
  console.log('\u2713 AdminDashboard: all lab internal changes saved.');
}

// ============================================================
// 3. Add "Change Password" button in Navbar dropdown
//    (above Dark Mode, max 2 changes per week)
// ============================================================
{
  const filePath = 'client/src/components/layout/Navbar.tsx';
  let c = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

  // Add KeyRound to lucide imports
  const lucideTarget = `  Sun,\n  Moon,`;
  const lucideReplace = `  Sun,\n  Moon,\n  KeyRound,`;
  if (c.includes(lucideTarget)) {
    c = c.replace(lucideTarget, lucideReplace);
  }

  // Add Change Password button above Dark Mode toggle
  const darkModeTarget = `                      {/* Theme Toggle (Inside profile menu, directly above Sign Out) */}`;
  const darkModeReplace = `                      {/* Change Password Button */}
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            const key = \`logicq_pw_change_\${user?.id || 'u'}\`;
                            try {
                              const raw = localStorage.getItem(key);
                              const data = raw ? JSON.parse(raw) : { count: 0, weekStart: Date.now() };
                              const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
                              const now = Date.now();
                              if (now - data.weekStart > oneWeekMs) {
                                data.count = 0;
                                data.weekStart = now;
                              }
                              if (data.count >= 2) {
                                alert('You can only change your password 2 times per week. Please try again next week.');
                                return;
                              }
                              const np = prompt('Enter your new password (min 6 characters):');
                              if (!np || np.length < 6) { alert('Password must be at least 6 characters.'); return; }
                              const np2 = prompt('Confirm new password:');
                              if (np !== np2) { alert('Passwords do not match.'); return; }
                              fetch('/api/auth/change-password', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${localStorage.getItem('logicq_token')}\` },
                                body: JSON.stringify({ newPassword: np }),
                              })
                                .then((r) => r.json())
                                .then((res) => {
                                  if (res.success || res.message) {
                                    data.count++;
                                    localStorage.setItem(key, JSON.stringify(data));
                                    alert(\`Password changed successfully! You have \${2 - data.count} change(s) left this week.\`);
                                  } else {
                                    alert(res.error || 'Failed to change password. Please try again.');
                                  }
                                })
                                .catch(() => alert('Network error. Please try again.'));
                            } catch { alert('Something went wrong. Please try again.'); }
                          }}
                          className="w-[calc(100%-8px)] flex items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-md mx-1 transition-colors text-left group"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-cyan-500 group-hover:rotate-12 transition-transform" />
                          <span className="font-medium">Change Password</span>
                          <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">2/week</span>
                        </button>
                      </div>

                      {/* Theme Toggle (Inside profile menu, directly above Sign Out) */}`;

  if (!c.includes(darkModeTarget)) {
    console.warn('Navbar: Dark Mode target not found, skipping Change Password button.');
  } else {
    c = c.replace(darkModeTarget, darkModeReplace);
    console.log('\u2713 Navbar: "Change Password" button added above Dark Mode.');
  }

  fs.writeFileSync(filePath, c.replace(/\n/g, '\r\n'), 'utf8');
}

console.log('\nAll patches applied!');
