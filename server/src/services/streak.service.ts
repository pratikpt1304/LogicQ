import { prisma } from '../utils/prisma.js';
import { getTodayIST, getYesterdayIST } from '../utils/ist.js';

export async function updateUserStreak(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  isNewDay: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, longestStreak: true, lastSolvedDate: true },
  });

  if (!user) throw new Error('User not found');

  const todayIST = getTodayIST();
  const yesterdayIST = getYesterdayIST();

  if (user.lastSolvedDate === todayIST) {
    // Already solved today, keep current streak
    return {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      isNewDay: false,
    };
  }

  let newStreak = 1;
  if (user.lastSolvedDate === yesterdayIST) {
    // Consecutive daily solve!
    newStreak = user.currentStreak + 1;
  } else {
    // Missed one or more days, resets to 1
    newStreak = 1;
  }

  const newLongest = Math.max(user.longestStreak, newStreak);

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastSolvedDate: todayIST,
    },
  });

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    isNewDay: true,
  };
}
