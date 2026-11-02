import fs from 'fs';

const filePath = 'client/src/pages/TopicPracticeHubPage.tsx';
let c = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add proctoring refs right before Anti-Cheat useEffect
const refTarget = `  // Anti-Cheat: Tab Switch & Clipboard Guard while topic workspace is active`;

const refCode = `  // Proctoring telemetry refs
  const codeRef = useRef(code);
  useEffect(() => { codeRef.current = code; }, [code]);
  const elapsedSecondsRef = useRef(elapsedSeconds);
  useEffect(() => { elapsedSecondsRef.current = elapsedSeconds; }, [elapsedSeconds]);
  const charsTypedRef = useRef(0);
  const keystrokesRef = useRef(0);
  const fullscreenExitsRef = useRef(0);

  const getTypingVelocityCPM = () => {
    const minutes = Math.max(10, elapsedSecondsRef.current) / 60;
    return Math.round(charsTypedRef.current / minutes);
  };

  // Anti-Cheat: Tab Switch & Clipboard Guard while topic workspace is active`;

if (!c.includes(refTarget)) {
  console.error('refTarget not found!');
  process.exit(1);
}
c = c.replace(refTarget, refCode);

// 2. Replace the Anti-Cheat useEffect block
const effectTarget = `  // Anti-Cheat: Tab Switch & Clipboard Guard while topic workspace is active
  useEffect(() => {
    if (!activeTopic || !user?.id) return;

    const handleVisibility = () => {
      if (document.hidden) {
        FirestoreDataService.saveProctoringTelemetry(user.id, {
          tabSwitchCount: 1,
          lastIncidentAt: new Date().toISOString(),
        }).catch(() => {});
        api.post('/practice/topics/telemetry', {
          topicId: activeTopic.id,
          tabSwitchDelta: 1,
          currentCode: code,
        }).catch(() => {});
        toast.warning('⚠️ Tab Switch Detected! Proctored telemetry records all window unfocus events.');
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      FirestoreDataService.saveProctoringTelemetry(user.id, {
        copyPasteAttempts: 1,
        lastIncidentAt: new Date().toISOString(),
      }).catch(() => {});
      api.post('/practice/topics/telemetry', {
        topicId: activeTopic.id,
        copyPasteDelta: 1,
        currentCode: code,
      }).catch(() => {});
      toast.error('🚫 Pasting is strictly blocked! Manual typing is required.');
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('paste', handlePaste);
    };
  }, [activeTopic, user?.id]);`;

const effectReplacement = `  // Anti-Cheat: Tab Switch, Clipboard Guard & Fullscreen Monitor while topic workspace is active
  useEffect(() => {
    if (!activeTopic || !user?.id) return;

    const handleVisibility = () => {
      if (document.hidden) {
        FirestoreDataService.saveProctoringTelemetry(user.id, {
          tabSwitchCount: 1,
          lastIncidentAt: new Date().toISOString(),
        }).catch(() => {});
        api.post('/practice/topics/telemetry', {
          topicId: activeTopic.id,
          tabSwitchDelta: 1,
          currentCode: codeRef.current,
          elapsedSec: elapsedSecondsRef.current,
          typingVelocityCPM: getTypingVelocityCPM(),
          eventLog: {
            event: 'TAB_SWITCH',
            detail: 'Student switched tab or window unfocused',
            elapsedSec: elapsedSecondsRef.current,
          },
        }).catch(() => {});
        toast.warning('⚠️ Tab Switch Detected! Proctored telemetry records all window unfocus events.');
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      FirestoreDataService.saveProctoringTelemetry(user.id, {
        copyPasteAttempts: 1,
        lastIncidentAt: new Date().toISOString(),
      }).catch(() => {});
      api.post('/practice/topics/telemetry', {
        topicId: activeTopic.id,
        copyPasteDelta: 1,
        currentCode: codeRef.current,
        elapsedSec: elapsedSecondsRef.current,
        typingVelocityCPM: getTypingVelocityCPM(),
        eventLog: {
          event: 'PASTE_BLOCKED',
          detail: 'External copy-paste attempt blocked by proctoring guard',
          elapsedSec: elapsedSecondsRef.current,
        },
      }).catch(() => {});
      toast.error('🚫 Pasting is strictly blocked! Manual typing is required.');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && activeTopic) {
        fullscreenExitsRef.current += 1;
        FirestoreDataService.saveProctoringTelemetry(user.id, {
          fullscreenExitCount: 1,
          lastIncidentAt: new Date().toISOString(),
        }).catch(() => {});
        api.post('/practice/topics/telemetry', {
          topicId: activeTopic.id,
          fullscreenExitDelta: 1,
          currentCode: codeRef.current,
          elapsedSec: elapsedSecondsRef.current,
          typingVelocityCPM: getTypingVelocityCPM(),
          eventLog: {
            event: 'FULLSCREEN_EXIT',
            detail: 'Student exited full screen examination mode',
            elapsedSec: elapsedSecondsRef.current,
          },
        }).catch(() => {});
        toast.warning('⚠️ Fullscreen Exit Detected! Please remain in full screen examination mode.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [activeTopic, user?.id]);`;

if (!c.includes(effectTarget)) {
  console.error('effectTarget not found!');
  process.exit(1);
}
c = c.replace(effectTarget, effectReplacement);

// 3. Update handleCodeChange to track character deltas and keystrokes
const codeChangeTarget = `  const handleCodeChange = (newCode: string) => {
    setCode(newCode);`;

const codeChangeReplacement = `  const handleCodeChange = (newCode: string) => {
    const delta = Math.abs(newCode.length - (codeRef.current?.length || 0));
    charsTypedRef.current += delta;
    keystrokesRef.current += 1;
    codeRef.current = newCode;
    setCode(newCode);`;

if (!c.includes(codeChangeTarget)) {
  console.error('codeChangeTarget not found!');
  process.exit(1);
}
c = c.replace(codeChangeTarget, codeChangeReplacement);

// 4. Reset typing counters in handleOpenTopic
const openTarget = `    // Track topic open: increments attemptsCount every time question is opened`;

const openReplacement = `    // Reset per-question proctoring counters
    charsTypedRef.current = 0;
    keystrokesRef.current = 0;
    fullscreenExitsRef.current = 0;

    // Track topic open: increments attemptsCount every time question is opened`;

if (!c.includes(openTarget)) {
  console.error('openTarget not found!');
  process.exit(1);
}
c = c.replace(openTarget, openReplacement);

// 5. In handleRunOpenTest, log compile attempt and pass velocity on solve
const solveTarget = `        // 2. Sync to backend practice API with full details, code, and solve time
        api.post('/practice/topics/solve', {
          topicId: activeTopic.id,
          moduleSlug: activeTopic.moduleSlug,
          moduleIndex: activeTopic.moduleIndex,
          topicTitle: activeTopic.topicTitle,
          difficulty: activeTopic.problem.difficulty,
          code,
          timeTakenSeconds: elapsedSeconds,
        }).catch(() => {});`;

const solveReplacement = `        // 2. Sync to backend practice API with full details, code, solve time, and typing velocity
        const velocity = getTypingVelocityCPM();
        api.post('/practice/topics/solve', {
          topicId: activeTopic.id,
          moduleSlug: activeTopic.moduleSlug,
          moduleIndex: activeTopic.moduleIndex,
          topicTitle: activeTopic.topicTitle,
          difficulty: activeTopic.problem.difficulty,
          code,
          timeTakenSeconds: elapsedSeconds,
          typingVelocityCPM: velocity,
        }).catch(() => {});`;

if (!c.includes(solveTarget)) {
  console.error('solveTarget not found!');
  process.exit(1);
}
c = c.replace(solveTarget, solveReplacement);

fs.writeFileSync(filePath, c.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully patched TopicPracticeHubPage.tsx with fullscreen monitoring, velocity tracking, and activity logs!');
