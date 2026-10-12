import { Router } from 'express';
import { CheckerController } from '../controllers/checker.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

export const checkerRouter = Router();

// Checker routes are accessible by 'CHECKER' and 'ADMIN' (for supervisor oversight)
checkerRouter.use(authenticate, requireRole(['CHECKER', 'ADMIN']));

checkerRouter.get('/reviews', CheckerController.getMyReviews);
checkerRouter.post('/reviews/:id/decision', CheckerController.submitDecision);
checkerRouter.put('/reviews/:id/decision', CheckerController.submitDecision);

export default checkerRouter;
