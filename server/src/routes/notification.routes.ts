import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { optionalAuthenticate, authenticate } from '../middleware/auth.middleware.js';

export const notificationRouter = Router();

// Student daily reminder (Email + WhatsApp payload)
notificationRouter.post('/daily-reminder', optionalAuthenticate, NotificationController.sendDailyReminder);

// Faculty broadcast to class section
notificationRouter.post('/broadcast-section', authenticate, NotificationController.broadcastSectionDailyReminder);
