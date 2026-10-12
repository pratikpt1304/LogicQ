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
  RETENTION_DAYS_UNGRADED_FINAL: 180,
} as const;

export type AllowedUploadMimeType = (typeof UPLOAD_CONFIG.ALLOWED_MIME_TYPES)[number];

/**
 * Verifies the magic bytes (file header signature) of a buffer against the claimed MIME type.
 * Rejects empty files, zero-byte files, and disguised executables/HTML/SVG/ZIP/C files.
 */
export function verifyMagicBytes(buffer: Buffer, claimedMimeType: string): {
  valid: boolean;
  detectedMimeType?: AllowedUploadMimeType;
  reason?: string;
} {
  if (!buffer || buffer.length < 8) {
    return { valid: false, reason: 'File is empty or corrupted.' };
  }

  if (buffer.length > UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES) {
    return { valid: false, reason: 'File exceeds the 5 MB limit.' };
  }

  // Check JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    if (claimedMimeType !== 'image/jpeg') {
      return { valid: false, reason: 'File header is JPEG but extension/MIME type does not match.' };
    }
    return { valid: true, detectedMimeType: 'image/jpeg' };
  }

  // Check PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    if (claimedMimeType !== 'image/png') {
      return { valid: false, reason: 'File header is PNG but extension/MIME type does not match.' };
    }
    return { valid: true, detectedMimeType: 'image/png' };
  }

  // Check WebP: "RIFF" .... "WEBP"
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    if (claimedMimeType !== 'image/webp') {
      return { valid: false, reason: 'File header is WebP but extension/MIME type does not match.' };
    }
    return { valid: true, detectedMimeType: 'image/webp' };
  }

  // Check PDF: "%PDF-"
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    if (claimedMimeType !== 'application/pdf') {
      return { valid: false, reason: 'File header is PDF but extension/MIME type does not match.' };
    }
    // Scan PDF for active scripts or embedded actions (/JS, /JavaScript, /Launch, /EmbeddedFiles, /OpenAction)
    const pdfText = buffer.toString('latin1');
    const dangerousPatterns = [
      /\/JavaScript\b/i,
      /\/JS\b/i,
      /\/Launch\b/i,
      /\/EmbeddedFiles\b/i,
      /\/RichMedia\b/i,
      /\/SubmitForm\b/i,
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(pdfText)) {
        return {
          valid: false,
          reason: 'PDF contains active scripts or embedded actions (/JavaScript, /JS, /Launch) which are not allowed.',
        };
      }
    }
    return { valid: true, detectedMimeType: 'application/pdf' };
  }

  return {
    valid: false,
    reason: 'Unsupported or disguised file format. Only genuine JPG, PNG, WebP, and PDF files are accepted.',
  };
}

/**
 * Strips EXIF / APP1 metadata segments (including GPS location and camera serials) from JPEG buffers.
 */
export function stripJpegExif(buffer: Buffer): Buffer {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer;
  }

  const chunks: Buffer[] = [buffer.subarray(0, 2)]; // SOI marker FF D8
  let offset = 2;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      // Reached compressed image scan data
      chunks.push(buffer.subarray(offset));
      break;
    }

    const marker = buffer[offset + 1];
    // SOS (Start of Scan, FF DA) or EOI (End of Image, FF D9)
    if (marker === 0xda || marker === 0xd9) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    // Standalone markers without length
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(buffer.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2 || offset + 2 + segmentLength > buffer.length) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    // Strip APP1 (0xE1 - EXIF/XMP) and APP13 (0xED - IPTC) segments
    if (marker !== 0xe1 && marker !== 0xed) {
      chunks.push(buffer.subarray(offset, offset + 2 + segmentLength));
    }

    offset += 2 + segmentLength;
  }

  return Buffer.concat(chunks);
}
