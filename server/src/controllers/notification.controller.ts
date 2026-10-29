import { Request, Response } from 'express';
import { mailService } from '../services/mail.service.js';
import { prisma } from '../utils/prisma.js';

export class NotificationController {
  /**
   * Dispatches a Daily Challenge reminder to a student via email
   * and returns pre-formatted WhatsApp share content.
   */
  static async sendDailyReminder(req: Request, res: Response) {
    try {
      const authUser = (req as any).user;
      const targetEmail = (req.body?.email || authUser?.email || '').trim().toLowerCase();
      const studentName = req.body?.name || authUser?.fullName || authUser?.name || 'Coder';
      const streak = Number(req.body?.streak ?? authUser?.currentStreak ?? 1);
      const problemTitle = req.body?.problemTitle || "Today's C Programming Challenge";
      const problemUrl = req.body?.problemUrl || 'https://logicq-clanguage.web.app/daily';

      // 1. WhatsApp pre-formatted payload
      const whatsappText = `🔥 *LogicQ Daily C Programming Challenge* 🔥\n\nHey ${studentName}! Don't let your ${streak}-day streak break today.\n\n⚡ *Challenge:* ${problemTitle}\n💎 *Reward:* +25 Academic XP\n⏱️ *Time:* ~10 mins\n\n👉 *Solve Now on Phone or Laptop:*\n${problemUrl}\n\nCompete on the Sanjivani University daily leaderboard! 🚀`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

      // If email is requested or available, send rich HTML digest
      let emailDispatched = false;
      if (targetEmail && targetEmail.includes('@')) {
        const emailSubject = `🔥 Today's C Challenge: ${problemTitle} | LogicQ Daily Streak`;
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: #13192b; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; }
    .title { font-size: 20px; font-weight: 800; color: #ffffff; margin: 16px 0 8px 0; }
    .desc { font-size: 13px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .stats-box { background: #0c101d; border: 1px solid #243048; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; justify-content: space-around; text-align: center; }
    .stat-val { font-size: 18px; font-weight: 900; color: #38bdf8; }
    .stat-lbl { font-size: 10px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
    .btn { display: block; text-align: center; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 14px 24px; border-radius: 12px; margin-top: 16px; }
    .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 24px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">🔥 LOGICQ MORNING STREAK ALERT</span>
    <h2 class="title">Hey ${studentName}, your daily C challenge is waiting!</h2>
    <p class="desc">Keep your <strong>${streak}-day coding streak</strong> alive before midnight. Daily practice builds the rock-solid problem solving instincts demanded in technical interviews.</p>
    
    <div class="stats-box">
      <div>
        <div class="stat-val" style="color: #f59e0b;">${streak} Days 🔥</div>
        <div class="stat-lbl">Active Streak</div>
      </div>
      <div>
        <div class="stat-val" style="color: #10b981;">+25 XP 💎</div>
        <div class="stat-lbl">Points Reward</div>
      </div>
      <div>
        <div class="stat-val" style="color: #6366f1;">C11 GCC ⚡</div>
        <div class="stat-lbl">Compiler Sandbox</div>
      </div>
    </div>

    <div style="background: rgba(99, 102, 241, 0.08); border-left: 4px solid #6366f1; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
      <div style="font-size: 11px; color: #818cf8; font-weight: bold; text-transform: uppercase;">Today's Featured Problem</div>
      <div style="font-size: 15px; font-weight: bold; color: #ffffff; margin-top: 4px;">${problemTitle}</div>
    </div>

    <a href="${problemUrl}" class="btn">🚀 Solve Today's Challenge Now</a>

    <div class="footer">
      Sanjivani University • Department of Computer Science & Engineering<br>
      Automated daily learning digest powered by LogicQ Arena.
    </div>
  </div>
</body>
</html>
        `;

        try {
          emailDispatched = await mailService.sendMail({
            to: targetEmail,
            subject: emailSubject,
            html: emailHtml,
            text: `LogicQ Daily C Challenge: ${problemTitle}\nSolve now: ${problemUrl}`,
          });
        } catch (mailErr) {
          console.warn('[NotificationController] Mail dispatch notice:', mailErr);
        }
      }

      return res.status(200).json({
        success: true,
        message: emailDispatched
          ? `Daily challenge reminder dispatched to ${targetEmail}!`
          : 'Daily challenge WhatsApp payload generated successfully!',
        emailDispatched,
        whatsappText,
        whatsappUrl,
      });
    } catch (err: any) {
      console.error('[NotificationController] Error in sendDailyReminder:', err);
      return res.status(500).json({
        success: false,
        message: err?.message || 'Failed to dispatch daily reminder.',
      });
    }
  }

  /**
   * Broadcasts the daily challenge announcement to an entire class section via email and WhatsApp payload
   */
  static async broadcastSectionDailyReminder(req: Request, res: Response) {
    try {
      const { sectionId, problemTitle, problemUrl } = req.body;
      if (!sectionId) {
        return res.status(400).json({ success: false, message: 'sectionId is required' });
      }

      const title = problemTitle || "Today's C Programming Challenge";
      const url = problemUrl || 'https://logicq-clanguage.web.app/daily';

      // Find all students in section
      const section = await prisma.section.findUnique({
        where: { id: sectionId },
        include: {
          students: {
            include: {
              student: {
                select: {
                  email: true,
                  fullName: true,
                },
              },
            },
          },
        },
      });

      const recipientEmails = (section?.students || [])
        .map((ss: any) => ss.student?.email?.trim().toLowerCase())
        .filter((e: any) => typeof e === 'string' && e.includes('@'));

      const sectionDisplayName = section?.sectionName || 'Class Section';
      const whatsappText = `📢 *Class Announcement: Today's Daily C Challenge is Live!* 🚀\n\nDear students of ${sectionDisplayName},\nPlease complete today's practical C programming problem:\n\n⚡ *Problem:* ${title}\n🎯 *Academic Reward:* +25 Points\n👉 *Solve Here:* ${url}\n\nEnsure submission before 11:59 PM IST for attendance & streak credit!`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

      // Dispatch async batch emails
      let sentCount = 0;
      for (const email of recipientEmails.slice(0, 50)) {
        try {
          await mailService.sendMail({
            to: email,
            subject: `📢 [${sectionDisplayName}] Today's C Programming Problem: ${title}`,
            html: `<p>Dear Student,</p><p>Today's C programming challenge is ready on LogicQ: <strong>${title}</strong>.</p><p><a href="${url}">Click here to solve now</a></p>`,
          });
          sentCount++;
        } catch {
          // ignore individual error in batch
        }
      }

      return res.status(200).json({
        success: true,
        message: `Broadcast complete! ${sentCount} students notified via email.`,
        sentCount,
        totalEnrolled: recipientEmails.length,
        whatsappText,
        whatsappUrl,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err?.message || 'Failed to broadcast section reminder.',
      });
    }
  }

  /**
   * Broadcasts alert when a new test or assignment is created for a section
   */
  static async broadcastNewTestAssigned(req: Request, res: Response) {
    try {
      const { testTitle, sectionId, sectionName, durationMinutes, questionCount } = req.body;
      const title = testTitle || 'New Lab Assessment';
      const duration = durationMinutes || 60;
      const qCount = questionCount || 20;
      const testUrl = 'https://logicq-clanguage.web.app/student/tests';

      let sectionDisplayName = sectionName || 'Class Section';
      let recipientEmails: string[] = [];

      if (sectionId) {
        const section = await prisma.section.findUnique({
          where: { id: sectionId },
          include: {
            students: {
              include: {
                student: {
                  select: { email: true, fullName: true },
                },
              },
            },
          },
        });
        if (section) {
          sectionDisplayName = section.sectionName;
          recipientEmails = (section.students || [])
            .map((ss: any) => ss.student?.email?.trim().toLowerCase())
            .filter((e: any) => typeof e === 'string' && e.includes('@'));
        }
      }

      const whatsappText = `📢 *NEW LAB ASSESSMENT ASSIGNED on LogicQ!* 🚀\n\nDear Students of *${sectionDisplayName}*,\nYour faculty mentor has scheduled a new proctored lab test:\n\n📝 *Test:* ${title}\n⏱️ *Duration:* ${duration} Minutes\n❓ *Questions:* ${qCount} Questions\n🎯 *Evaluation:* Auto-graded with C11 GCC & Proctoring\n\n👉 *Start Your Test Here:*\n${testUrl}\n\nPlease join and complete this session before the scheduled deadline! ⚡`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

      // Dispatch async emails
      let sentCount = 0;
      for (const email of recipientEmails.slice(0, 50)) {
        try {
          await mailService.sendMail({
            to: email,
            subject: `📢 [New Test Assigned]: ${title} (${duration} mins) - ${sectionDisplayName}`,
            html: `
              <div style="font-family: Arial, sans-serif; background: #0c101d; color: #fff; padding: 24px; border-radius: 12px; max-width: 500px;">
                <h2 style="color: #6366f1; margin-top: 0;">New Lab Assessment Assigned</h2>
                <p>A new practical test <strong>${title}</strong> has been scheduled for <strong>${sectionDisplayName}</strong>.</p>
                <div style="background: #1e293b; padding: 12px; border-radius: 8px; margin: 16px 0;">
                  <div>⏱️ <strong>Duration:</strong> ${duration} Minutes</div>
                  <div>❓ <strong>Questions:</strong> ${qCount} Questions</div>
                </div>
                <a href="${testUrl}" style="display: block; text-align: center; background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: bold;">Start Assessment Test</a>
              </div>
            `,
          });
          sentCount++;
        } catch {}
      }

      return res.status(200).json({
        success: true,
        message: `Notification dispatched to ${sentCount} students via email & WhatsApp ready!`,
        sentCount,
        whatsappText,
        whatsappUrl,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err?.message || 'Failed to dispatch test notification.',
      });
    }
  }
}
