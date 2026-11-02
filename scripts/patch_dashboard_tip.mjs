import fs from 'fs';

// Add DailyCTipPopup import and usage in DashboardPage
const filePath = 'client/src/pages/DashboardPage.tsx';
let c = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add import
const importTarget = `import { StreakReminderBanner } from '../components/dashboard/StreakReminderBanner.js';`;
const importReplace = `import { StreakReminderBanner } from '../components/dashboard/StreakReminderBanner.js';
import { DailyCTipPopup } from '../components/dashboard/DailyCTipPopup.js';`;

if (!c.includes(importTarget)) {
  // Try fallback – find any component import from dashboard folder
  console.warn('DashboardPage: StreakReminderBanner import not found, trying fallback...');
  // Find OnlineCompilerCard
  const alt = `import { OnlineCompilerCard } from '../components/dashboard/OnlineCompilerCard.js';`;
  if (c.includes(alt)) {
    c = c.replace(alt, `import { OnlineCompilerCard } from '../components/dashboard/OnlineCompilerCard.js';
import { DailyCTipPopup } from '../components/dashboard/DailyCTipPopup.js';`);
    console.log('✓ DashboardPage: DailyCTipPopup import added (fallback).');
  } else {
    console.error('Could not find import anchor!');
    process.exit(1);
  }
} else {
  c = c.replace(importTarget, importReplace);
  console.log('✓ DashboardPage: DailyCTipPopup import added.');
}

// 2. Insert <DailyCTipPopup /> just before the closing of the return JSX
// Find the last </div> before export ends
const returnTarget = `  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">`;
const returnReplace = `  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
      {/* Daily C Tip Popup - shown once per day on load */}
      {isStudent && <DailyCTipPopup />}`;

if (!c.includes(returnTarget)) {
  console.warn('DashboardPage: return target not found, trying to add DailyCTipPopup at different spot...');
} else {
  c = c.replace(returnTarget, returnReplace);
  console.log('✓ DashboardPage: DailyCTipPopup rendered.');
}

fs.writeFileSync(filePath, c.replace(/\n/g, '\r\n'), 'utf8');
console.log('✓ DashboardPage: saved.');
