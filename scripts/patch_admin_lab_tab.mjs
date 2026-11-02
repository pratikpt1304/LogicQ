import fs from 'fs';

const filePath = 'client/src/pages/admin/AdminDashboardPage.tsx';
let c = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const target = `                <span>Plagiarism Radar</span>
              </button>
            </div>`;

const repl = `                <span>Plagiarism Radar</span>
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
              </button>
            </div>`;

if (!c.includes(target)) {
  console.error('Target not found!');
  console.log('Looking for variations...');
  const idx = c.indexOf('Plagiarism Radar');
  if (idx !== -1) {
    console.log('Found "Plagiarism Radar" at char:', idx);
    console.log('Context:', JSON.stringify(c.substring(idx, idx + 200)));
  }
  process.exit(1);
}

c = c.replace(target, repl);
fs.writeFileSync(filePath, c.replace(/\n/g, '\r\n'), 'utf8');
console.log('✓ Lab Internal Submissions tab button added to admin.');
