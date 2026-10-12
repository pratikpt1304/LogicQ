import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const uploadRouter = Router();

uploadRouter.use(authenticate);

uploadRouter.get('/my', UploadController.getMyUploads);
uploadRouter.get('/:id/files/:fileId', UploadController.getUploadFile);
uploadRouter.get('/:id', UploadController.getUploadById);
uploadRouter.post('/', UploadController.createUpload);
uploadRouter.put('/:id', UploadController.replaceUpload);
uploadRouter.delete('/:id', UploadController.cancelUpload);
