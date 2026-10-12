export const UPLOAD_CONFIG = {
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ] as const,
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'] as const,
  MAX_FILES_PER_SUBMISSION: 3,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  MAX_UPLOADS_PER_STUDENT_PER_DAY: 5,
  MAX_NOTE_LENGTH: 1000,
} as const;
