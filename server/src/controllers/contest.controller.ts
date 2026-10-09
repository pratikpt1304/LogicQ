import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { getContestScoreboardData } from '../services/contest.service.js';

export async function getContests(req: AuthRequest, res: Response): Promise<void> {
  try {
    const contests = await prisma.contest.findMany({
      orderBy: { startTime: 'desc' },
      include: {
        _count: {
          select: { participants: true, problems: true },
        },
      },
    });

    // Update status based on current time
    const now = new Date();
    const formatted = contests.map((c) => {
      let status = c.status;
      if (now < new Date(c.startTime)) status = 'UPCOMING';
      else if (now >= new Date(c.startTime) && now <= new Date(c.endTime)) status = 'ONGOING';
      else status = 'ENDED';

      return {
        ...c,
        status,
        participantCount: c._count.participants,
        problemCount: c._count.problems,
      };
    });

    res.status(200).json({ success: true, data: { contests: formatted } });
  } catch (err: any) {
    console.error('Get contests error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch contests' });
  }
}

export async function getContestBySlug(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { slug } = req.params;

    const contest = await prisma.contest.findUnique({
      where: { slug },
      include: {
        problems: {
          include: {
            problem: {
              select: {
                id: true,
                slug: true,
                title: true,
                difficulty: true,
                category: true,
                starterCode: true,
                description: true,
                timeLimitMs: true,
                memoryLimitMb: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        participants: {
          where: req.user ? { userId: req.user.userId } : undefined,
        },
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!contest) {
      res.status(404).json({ success: false, message: 'Contest not found' });
      return;
    }

    const now = new Date();
    const isStarted = now >= new Date(contest.startTime);

    // SECURITY: If contest hasn't started, do NOT reveal problem details
    const problems = isStarted
      ? contest.problems.map((cp) => ({
          ...cp.problem,
          points: cp.points,
          orderIndex: cp.orderIndex,
        }))
      : [];

    const isUserRegistered = req.user ? contest.participants.length > 0 : false;

    res.status(200).json({
      success: true,
      data: {
        contest: {
          id: contest.id,
          slug: contest.slug,
          title: contest.title,
          description: contest.description,
          startTime: contest.startTime,
          endTime: contest.endTime,
          durationMinutes: contest.durationMinutes,
          status: now < new Date(contest.startTime) ? 'UPCOMING' : now > new Date(contest.endTime) ? 'ENDED' : 'ONGOING',
          participantCount: contest._count.participants,
          isUserRegistered,
          problems,
        },
      },
    });
  } catch (err: any) {
    console.error('Get contest error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch contest' });
  }
}

export async function joinContest(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const contest = await prisma.contest.findUnique({ where: { id } });
    if (!contest) {
      res.status(404).json({ success: false, message: 'Contest not found' });
      return;
    }

    const participant = await prisma.contestParticipant.upsert({
      where: {
        contestId_userId: {
          contestId: id,
          userId: req.user.userId,
        },
      },
      update: {},
      create: {
        contestId: id,
        userId: req.user.userId,
        score: 0,
        penaltyTime: 0,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Successfully registered for contest',
      data: { participant },
    });
  } catch (err: any) {
    console.error('Join contest error:', err);
    res.status(500).json({ success: false, message: 'Failed to join contest' });
  }
}

export async function getContestScoreboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const scoreboard = await getContestScoreboardData(id);
    res.status(200).json({ success: true, data: scoreboard });
  } catch (err: any) {
    console.error('Get scoreboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch scoreboard' });
  }
}
