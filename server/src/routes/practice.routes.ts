import { Router } from 'express';
import {
  getPracticeModules,
  getPracticeModuleProblems,
  getPracticeProblemDetails,
} from '../controllers/practice.controller.js';
import { optionalAuthenticate } from '../middleware/auth.middleware.js';

export const practiceRouter = Router();

practiceRouter.get('/modules', optionalAuthenticate, getPracticeModules);
practiceRouter.get('/modules/:moduleSlug/problems', optionalAuthenticate, getPracticeModuleProblems);
practiceRouter.get('/problems/:problemSlug', optionalAuthenticate, getPracticeProblemDetails);
practiceRouter.get('/modules/:moduleSlug/problems/:problemSlug', optionalAuthenticate, getPracticeProblemDetails);
