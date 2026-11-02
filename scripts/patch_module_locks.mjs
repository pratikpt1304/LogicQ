import fs from 'fs';

const filePath = 'client/src/pages/TopicPracticeHubPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports for practice module problems
const importTarget = `import { TOPIC_PRACTICE_DATA, TopicPracticeItem } from '../data/topic-practice.data.js';`;
const importReplacement = `import { TOPIC_PRACTICE_DATA, TopicPracticeItem } from '../data/topic-practice.data.js';
import { PRACTICE_MODULE_1_PROBLEMS } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../data/practice-module4.data.js';
import { Lock } from 'lucide-react';`;

// 2. Add unlock logic function before return
const logicInsertTarget = `  // Module-aware topic navigation (Each module has 25 topics)`;

const logicCode = `  // Progressive Unlock Chain:
  // Module 1 Practice (25/25) -> Unlocks Lab Internal 1
  // Lab Internal 1 Complete -> Unlocks Module 2 Practice
  // Module 2 Practice (25/25) -> Unlocks Lab Internal 2
  // Lab Internal 2 Complete -> Unlocks Module 3 Practice
  // Module 3 Practice (25/25) -> Unlocks Lab Internal 3
  // Lab Internal 3 Complete -> Unlocks Module 4 Practice
  // Module 4 Practice (25/25) -> Unlocks Lab Internal 4

  const m1PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 1 && solvedTopics.includes(t.id)).length;
  const isM1PracticeComplete = m1PracticeSolved >= 25;

  const m2PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 2 && solvedTopics.includes(t.id)).length;
  const isM2PracticeComplete = m2PracticeSolved >= 25;

  const m3PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 3 && solvedTopics.includes(t.id)).length;
  const isM3PracticeComplete = m3PracticeSolved >= 25;

  const m4PracticeSolved = TOPIC_PRACTICE_DATA.filter((t) => t.moduleIndex === 4 && solvedTopics.includes(t.id)).length;
  const isM4PracticeComplete = m4PracticeSolved >= 25;

  // Lab Internal Problem Checks
  const m1LabSlugs = PRACTICE_MODULE_1_PROBLEMS.map((p) => p.slug);
  const m1LabSolved = m1LabSlugs.filter((s) => solvedTopics.includes(s)).length;
  const isLab1Complete = Boolean(
    m1LabSolved >= 20 ||
    m1LabSolved >= m1LabSlugs.length ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('logicq_practice_report_control-structures'))
  );

  const m2LabSlugs = PRACTICE_MODULE_2_PROBLEMS.map((p) => p.slug);
  const m2LabSolved = m2LabSlugs.filter((s) => solvedTopics.includes(s)).length;
  const isLab2Complete = Boolean(
    m2LabSolved >= 20 ||
    m2LabSolved >= m2LabSlugs.length ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('logicq_practice_report_pointers-and-functions'))
  );

  const m3LabSlugs = PRACTICE_MODULE_3_PROBLEMS.map((p) => p.slug);
  const m3LabSolved = m3LabSlugs.filter((s) => solvedTopics.includes(s)).length;
  const isLab3Complete = Boolean(
    m3LabSolved >= 20 ||
    m3LabSolved >= m3LabSlugs.length ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('logicq_practice_report_arrays-and-strings'))
  );

  const getModuleUnlockInfo = (moduleIndex: number): { isUnlocked: boolean; lockReason: string } => {
    if (user?.role === 'ADMIN') return { isUnlocked: true, lockReason: '' };
    if (moduleIndex === 1) return { isUnlocked: true, lockReason: '' };

    if (moduleIndex === 2) {
      if (!isM1PracticeComplete) {
        return {
          isUnlocked: false,
          lockReason: \`Complete all 25 practice questions in Module 1 (\${m1PracticeSolved}/25 solved) to unlock Lab Internal 1 first.\`,
        };
      }
      if (!isLab1Complete) {
        return {
          isUnlocked: false,
          lockReason: \`Complete Lab Internal 1 Continuous Evaluation to unlock Module 2 Practice.\`,
        };
      }
      return { isUnlocked: true, lockReason: '' };
    }

    if (moduleIndex === 3) {
      if (!getModuleUnlockInfo(2).isUnlocked || !isM2PracticeComplete) {
        return {
          isUnlocked: false,
          lockReason: \`Complete all 25 practice questions in Module 2 (\${m2PracticeSolved}/25 solved) and Lab Internal 2 first.\`,
        };
      }
      if (!isLab2Complete) {
        return {
          isUnlocked: false,
          lockReason: \`Complete Lab Internal 2 Continuous Evaluation to unlock Module 3 Practice.\`,
        };
      }
      return { isUnlocked: true, lockReason: '' };
    }

    if (moduleIndex === 4) {
      if (!getModuleUnlockInfo(3).isUnlocked || !isM3PracticeComplete) {
        return {
          isUnlocked: false,
          lockReason: \`Complete all 25 practice questions in Module 3 (\${m3PracticeSolved}/25 solved) and Lab Internal 3 first.\`,
        };
      }
      if (!isLab3Complete) {
        return {
          isUnlocked: false,
          lockReason: \`Complete Lab Internal 3 Continuous Evaluation to unlock Module 4 Practice.\`,
        };
      }
      return { isUnlocked: true, lockReason: '' };
    }

    return { isUnlocked: true, lockReason: '' };
  };

  // Module-aware topic navigation (Each module has 25 topics)`;

// 3. Update handleOpenTopic guard
const openGuardTarget = `  const handleOpenTopic = async (topic: TopicPracticeItem) => {
    // 1. Automatically launch full screen on Practice click`;

const openGuardReplacement = `  const handleOpenTopic = async (topic: TopicPracticeItem) => {
    const unlockInfo = getModuleUnlockInfo(topic.moduleIndex);
    if (!unlockInfo.isUnlocked) {
      toast.error(unlockInfo.lockReason || '🔒 This module is locked!');
      return;
    }

    // 1. Automatically launch full screen on Practice click`;

// 4. Update the 4 Module Cards block
const moduleCardsTarget = `            ].map((block) => {
              const isSelected = selectedModuleFilter === block.id;
              const pct = block.total > 0 ? Math.round((block.solved / block.total) * 100) : 0;

              return (
                <div
                  key={block.id}
                  onClick={() => {
                    setSelectedModuleFilter(block.id);
                    setTimeout(() => {
                      document.getElementById('practice-topic-list-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  }}
                  className={\`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group shadow-sm hover:shadow-md \${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 shadow-emerald-500/10'
                      : 'border-[var(--border-line)] bg-[var(--bg-panel)] hover:border-emerald-500/40 hover:bg-[var(--bg-surface)]'
                  }\`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={\`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border \${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-line)]'
                        }\`}
                      >
                        Module {block.id}
                      </span>
                      <span className="text-xs font-mono font-semibold text-emerald-400">
                        {block.solved}/{block.total} ({pct}%)
                      </span>
                    </div>

                    <h3
                      className={\`font-extrabold text-base transition-colors \${
                        isSelected ? 'text-emerald-400' : 'text-[var(--text-main)] group-hover:text-emerald-400'
                      }\`}
                    >
                      {block.name}
                    </h3>

                    <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                      {block.subtitle}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-line)]/60 space-y-2">
                    <div className="w-full bg-[var(--bg-surface)] h-1.5 rounded-full overflow-hidden border border-[var(--border-line)]/50">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                        style={{ width: \`\${pct}%\` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                      <span>{isSelected ? 'Viewing Topics Listed Below ↓' : 'Click to View Topics'}</span>
                      <ChevronRight className={\`w-3.5 h-3.5 transition-transform \${isSelected ? 'rotate-90 text-emerald-400' : 'group-hover:translate-x-1'}\`} />
                    </div>
                  </div>
                </div>
              );
            })}`;

const moduleCardsReplacement = `            ].map((block) => {
              const isSelected = selectedModuleFilter === block.id;
              const pct = block.total > 0 ? Math.round((block.solved / block.total) * 100) : 0;
              const unlockInfo = getModuleUnlockInfo(block.id);
              const isLocked = !unlockInfo.isUnlocked;

              return (
                <div
                  key={block.id}
                  onClick={() => {
                    if (isLocked) {
                      toast.warning(\`🔒 \${unlockInfo.lockReason}\`);
                      return;
                    }
                    setSelectedModuleFilter(block.id);
                    setTimeout(() => {
                      document.getElementById('practice-topic-list-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  }}
                  className={\`p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between group shadow-sm hover:shadow-md \${
                    isLocked
                      ? 'border-[var(--border-line)] bg-[var(--bg-surface)]/50 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 shadow-emerald-500/10 cursor-pointer'
                      : 'border-[var(--border-line)] bg-[var(--bg-panel)] hover:border-emerald-500/40 hover:bg-[var(--bg-surface)] cursor-pointer'
                  }\`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      {isLocked ? (
                        <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border bg-amber-500/15 text-amber-400 border-amber-500/30 inline-flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>Locked</span>
                        </span>
                      ) : (
                        <span
                          className={\`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border \${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-line)]'
                          }\`}
                        >
                          Module {block.id}
                        </span>
                      )}
                      <span className="text-xs font-mono font-semibold text-emerald-400">
                        {block.solved}/{block.total} ({pct}%)
                      </span>
                    </div>

                    <h3
                      className={\`font-extrabold text-base transition-colors \${
                        isLocked
                          ? 'text-[var(--text-muted)]'
                          : isSelected
                          ? 'text-emerald-400'
                          : 'text-[var(--text-main)] group-hover:text-emerald-400'
                      }\`}
                    >
                      {block.name}
                    </h3>

                    <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                      {isLocked ? unlockInfo.lockReason : block.subtitle}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-line)]/60 space-y-2">
                    <div className="w-full bg-[var(--bg-surface)] h-1.5 rounded-full overflow-hidden border border-[var(--border-line)]/50">
                      <div
                        className={\`h-full rounded-full transition-all duration-300 \${
                          isLocked ? 'bg-slate-600' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        }\`}
                        style={{ width: \`\${pct}%\` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                      {isLocked ? (
                        <span className="text-amber-400/90 text-[11px] flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>Requires Lab Internal {block.id - 1}</span>
                        </span>
                      ) : (
                        <span>{isSelected ? 'Viewing Topics Listed Below ↓' : 'Click to View Topics'}</span>
                      )}
                      {!isLocked && (
                        <ChevronRight className={\`w-3.5 h-3.5 transition-transform \${isSelected ? 'rotate-90 text-emerald-400' : 'group-hover:translate-x-1'}\`} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}`;

// 5. Update Topic List Section to show locked panel if selected module is locked
const topicListTarget = `        {/* 3. TOPIC LIST FOR SELECTED MODULE (Numbered Item List) */}
        <div id="practice-topic-list-section" className="space-y-3 pt-2">
          {/* Header of selected module + quick search */}`;

const topicListReplacement = `        {/* 3. TOPIC LIST FOR SELECTED MODULE (Numbered Item List) */}
        <div id="practice-topic-list-section" className="space-y-3 pt-2">
          {!getModuleUnlockInfo(selectedModuleFilter).isUnlocked ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-[var(--bg-panel)] border border-amber-500/20 bg-amber-500/5 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Lock className="w-7 h-7 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[var(--text-main)] font-mono uppercase tracking-wider">
                  Module {selectedModuleFilter} Practice is Locked
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono max-w-lg mx-auto">
                  {getModuleUnlockInfo(selectedModuleFilter).lockReason}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                <Link
                  to="/lab-internal"
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Go to Lab Internal Continuous Evaluation &rarr;</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedModuleFilter(1)}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-medium border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)]"
                >
                  Back to Module 1
                </button>
              </div>
            </div>
          ) : (
            <>
          {/* Header of selected module + quick search */}`;

const topicListEndTarget = `                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>`;

const topicListEndReplacement = `                    </div>
                  </div>
                );
              })}
            </div>
          )}
            </>
          )}
        </div>
      </div>`;

let normalized = content.replace(/\r\n/g, '\n');

if (!normalized.includes(importTarget.replace(/\r\n/g, '\n'))) {
  console.error('Import target not found!');
  process.exit(1);
}
normalized = normalized.replace(importTarget.replace(/\r\n/g, '\n'), importReplacement.replace(/\r\n/g, '\n'));

if (!normalized.includes(logicInsertTarget.replace(/\r\n/g, '\n'))) {
  console.error('Logic target not found!');
  process.exit(1);
}
normalized = normalized.replace(logicInsertTarget.replace(/\r\n/g, '\n'), logicCode.replace(/\r\n/g, '\n'));

if (!normalized.includes(openGuardTarget.replace(/\r\n/g, '\n'))) {
  console.error('Open guard target not found!');
  process.exit(1);
}
normalized = normalized.replace(openGuardTarget.replace(/\r\n/g, '\n'), openGuardReplacement.replace(/\r\n/g, '\n'));

if (!normalized.includes(moduleCardsTarget.replace(/\r\n/g, '\n'))) {
  console.error('Module cards target not found!');
  process.exit(1);
}
normalized = normalized.replace(moduleCardsTarget.replace(/\r\n/g, '\n'), moduleCardsReplacement.replace(/\r\n/g, '\n'));

if (!normalized.includes(topicListTarget.replace(/\r\n/g, '\n'))) {
  console.error('Topic list target not found!');
  process.exit(1);
}
normalized = normalized.replace(topicListTarget.replace(/\r\n/g, '\n'), topicListReplacement.replace(/\r\n/g, '\n'));

if (!normalized.includes(topicListEndTarget.replace(/\r\n/g, '\n'))) {
  console.error('Topic list end target not found!');
  process.exit(1);
}
normalized = normalized.replace(topicListEndTarget.replace(/\r\n/g, '\n'), topicListEndReplacement.replace(/\r\n/g, '\n'));

fs.writeFileSync(filePath, normalized.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully updated TopicPracticeHubPage.tsx with progressive locking');
