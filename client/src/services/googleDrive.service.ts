/**
 * LogicQ Google Drive Integration Service
 * 
 * Handles client-side, short-lived token requests for Google Drive backup.
 * Invariant: Drive is strictly optional. All core features work 100% with Firebase only.
 * Invariant: Tokens are held strictly in browser memory/sessionStorage. Zero backend refresh tokens.
 * Invariant: Handled college Workspace blocks with calm notification.
 */

import { auth } from '../config/firebase';
import { GoogleAuthProvider, signInWithPopup, reauthenticateWithPopup, linkWithPopup } from 'firebase/auth';

export interface DriveAuthResult {
  success: boolean;
  accessToken?: string;
  expiresIn?: number;
  error?: 'COLLEGE_WORKSPACE_BLOCKED' | 'USER_CANCELLED' | 'GIS_UNAVAILABLE' | 'UNKNOWN';
  message?: string;
}

export interface DriveBackupResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  error?: string;
  enableUrl?: string;
  message?: string;
}

export interface DriveEnvelope<T = any> {
  schemaVersion: '1.0.0';
  fileType: 'BACKUP' | 'SETTINGS' | 'NOTE' | 'DRAFT';
  updatedAt: number;
  updatedAtIso: string;
  deviceLabel: string;
  userId: string;
  content: T;
}

const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_STORAGE_KEY = 'logicq_drive_access_token';
const EXPIRY_STORAGE_KEY = 'logicq_drive_token_expiry';

export function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Desktop Browser';
  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = 'Device';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  const isPWA = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return `${isPWA ? 'PWA on ' : ''}${browser} (${os})`;
}

export class GoogleDriveService {
  private static gisLoaded = false;
  private static tokenClient: any = null;

  /**
   * Dynamically loads Google Identity Services (GIS) library if not already present
   */
  public static async loadGis(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if ((window as any).google?.accounts?.oauth2) {
      GoogleDriveService.gisLoaded = true;
      return true;
    }

    return new Promise((resolve) => {
      const existingScript = document.getElementById('google-gis-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          GoogleDriveService.gisLoaded = true;
          resolve(true);
        });
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-gis-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        GoogleDriveService.gisLoaded = true;
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  /**
   * Requests a short-lived access token directly from student browser
   */
  public static async requestAccessToken(): Promise<DriveAuthResult> {
    // 1. Check valid cached token
    const cachedToken = GoogleDriveService.getCachedAccessToken();
    if (cachedToken) {
      return {
        success: true,
        accessToken: cachedToken,
        expiresIn: 3600,
      };
    }

    // 2. Try Firebase Auth GoogleAuthProvider (Native to Firebase project, requires 0 extra Client ID config)
    if (auth.currentUser) {
      try {
        const driveProvider = new GoogleAuthProvider();
        driveProvider.addScope(DRIVE_FILE_SCOPE);
        driveProvider.setCustomParameters({ prompt: 'consent' });

        let userCred: any = null;
        const isGoogleLinked = auth.currentUser.providerData.some((p) => p.providerId === 'google.com');

        if (isGoogleLinked) {
          try {
            userCred = await reauthenticateWithPopup(auth.currentUser, driveProvider);
          } catch (reauthErr: any) {
            const errCode = reauthErr?.code;
            if (errCode === 'auth/popup-closed-by-user' || errCode === 'auth/cancelled-popup-request') {
              return { success: false, error: 'USER_CANCELLED', message: 'Google Drive authorization was cancelled.' };
            }
            try {
              userCred = await linkWithPopup(auth.currentUser, driveProvider);
            } catch {
              userCred = await signInWithPopup(auth, driveProvider);
            }
          }
        } else {
          try {
            userCred = await linkWithPopup(auth.currentUser, driveProvider);
          } catch (linkErr: any) {
            const errCode = linkErr?.code;
            if (errCode === 'auth/popup-closed-by-user' || errCode === 'auth/cancelled-popup-request') {
              return { success: false, error: 'USER_CANCELLED', message: 'Google Drive authorization was cancelled.' };
            }
            userCred = await signInWithPopup(auth, driveProvider);
          }
        }

        const credential = GoogleAuthProvider.credentialFromResult(userCred);
        if (credential?.accessToken) {
          const expiresInSec = 3600;
          const expiresAt = Date.now() + expiresInSec * 1000;
          try {
            sessionStorage.setItem(TOKEN_STORAGE_KEY, credential.accessToken);
            sessionStorage.setItem(EXPIRY_STORAGE_KEY, String(expiresAt));
          } catch {
            // Ignore sessionStorage quota errors
          }

          return {
            success: true,
            accessToken: credential.accessToken,
            expiresIn: expiresInSec,
          };
        }
      } catch (fbErr: any) {
        console.error('[GoogleDriveService] Firebase Auth Drive scope error:', fbErr);
        const errCode = fbErr?.code;
        const errMsg = String(fbErr?.message || '');

        if (errCode === 'auth/popup-closed-by-user' || errCode === 'auth/cancelled-popup-request') {
          return {
            success: false,
            error: 'USER_CANCELLED',
            message: 'Google Drive authorization was cancelled.',
          };
        }
        if (errCode === 'auth/operation-not-allowed') {
          return {
            success: false,
            error: 'UNKNOWN',
            message: 'Google Sign-In is not enabled in Firebase Authentication console. Please enable it in Firebase Console.',
          };
        }
        if (errCode === 'auth/admin-restricted-operation' || errMsg.includes('admin_policy_enforced')) {
          return {
            success: false,
            error: 'COLLEGE_WORKSPACE_BLOCKED',
            message: 'Google Drive access was restricted by your Google Workspace administrator. Downloading your backup directly...',
          };
        }
        console.warn('Firebase Auth Google Drive scope error, attempting GIS fallback:', fbErr);
      }
    }

    // 3. Fallback: Google Identity Services (GIS) client token flow
    const isLoaded = await GoogleDriveService.loadGis();
    const google = (window as any).google;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    if (!isLoaded || !google?.accounts?.oauth2 || !clientId) {
      return {
        success: false,
        error: 'GIS_UNAVAILABLE',
        message: 'Google authorization is unavailable in this browser session. You can download your backup file directly.',
      };
    }

    return new Promise((resolve) => {
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: DRIVE_FILE_SCOPE,
          callback: (response: any) => {
            if (response.error) {
              const err = response.error;
              // Detect institutional college Google Workspace administrative policy restriction
              if (
                err === 'admin_policy_enforced' ||
                err === 'access_blocked' ||
                err === 'org_internal' ||
                err === 'disallowed_useragent' ||
                String(response.error_description || '').includes('admin')
              ) {
                resolve({
                  success: false,
                  error: 'COLLEGE_WORKSPACE_BLOCKED',
                  message:
                    'Your college administrator has restricted Google Drive integrations. LogicQ will continue using secure cloud storage.',
                });
                return;
              }

              if (err === 'popup_closed_by_user' || err === 'access_denied') {
                resolve({
                  success: false,
                  error: 'USER_CANCELLED',
                  message: 'Google Drive authorization was cancelled.',
                });
                return;
              }

              resolve({
                success: false,
                error: 'UNKNOWN',
                message: response.error_description || 'Failed to authenticate with Google Drive.',
              });
              return;
            }

            if (response.access_token) {
              const expiresInSec = Number(response.expires_in) || 3600;
              const expiresAt = Date.now() + expiresInSec * 1000;
              try {
                sessionStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
                sessionStorage.setItem(EXPIRY_STORAGE_KEY, String(expiresAt));
              } catch {
                // Ignore sessionStorage write errors
              }

              resolve({
                success: true,
                accessToken: response.access_token,
                expiresIn: expiresInSec,
              });
            } else {
              resolve({
                success: false,
                error: 'UNKNOWN',
                message: 'No access token returned.',
              });
            }
          },
          error_callback: (err: any) => {
            const errType = err?.type || '';
            if (
              errType === 'popup_blocked' ||
              errType === 'popup_closed'
            ) {
              resolve({
                success: false,
                error: 'USER_CANCELLED',
                message: 'Authorization popup was closed.',
              });
            } else if (
              errType === 'admin_policy_enforced' ||
              String(err?.message || '').includes('admin')
            ) {
              resolve({
                success: false,
                error: 'COLLEGE_WORKSPACE_BLOCKED',
                message:
                  'Your college administrator has restricted Google Drive integrations. LogicQ will continue using secure cloud storage.',
              });
            } else {
              resolve({
                success: false,
                error: 'UNKNOWN',
                message: err?.message || 'Error initializing Google Drive authentication.',
              });
            }
          },
        });

        client.requestAccessToken({ prompt: '' });
      } catch (err: any) {
        resolve({
          success: false,
          error: 'UNKNOWN',
          message: err?.message || 'Unexpected error initiating Drive authorization.',
        });
      }
    });
  }

  /**
   * Retrieves short-lived token from sessionStorage if valid and unexpired
   */
  public static getCachedAccessToken(): string | null {
    try {
      const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
      const expiry = sessionStorage.getItem(EXPIRY_STORAGE_KEY);
      if (!token || !expiry) return null;

      // Allow 60s buffer
      if (Date.now() > Number(expiry) - 60000) {
        GoogleDriveService.disconnectDrive();
        return null;
      }
      return token;
    } catch {
      return null;
    }
  }

  /**
   * Disconnects Google Drive by purging in-browser cached tokens
   */
  public static disconnectDrive(): void {
    try {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(EXPIRY_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  /**
   * Ensures the visible `LogicQ/` root folder exists in the student's Google Drive.
   * If missing, creates the folder and populates `README.txt`.
   */
  public static async ensureLogicQFolder(accessToken: string): Promise<string> {
    const query = encodeURIComponent("name = 'LogicQ' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      if (listRes.status === 401) {
        GoogleDriveService.disconnectDrive();
        throw new Error('TOKEN_EXPIRED');
      }
      const errBody = await listRes.json().catch(() => null);
      console.error('[GoogleDriveService] Drive files list error:', listRes.status, errBody);
      const detailMsg = errBody?.error?.message || `HTTP ${listRes.status}`;
      if (detailMsg.includes('Google Drive API has not been used') || detailMsg.includes('disabled')) {
        throw new Error(`DRIVE_API_DISABLED: ${detailMsg}`);
      }
      if (listRes.status === 403) {
        throw new Error(`DRIVE_FORBIDDEN: ${detailMsg}`);
      }
      throw new Error(`DRIVE_ERROR: ${detailMsg}`);
    }

    const listData = await listRes.json();
    if (listData.files && listData.files.length > 0) {
      return listData.files[0].id;
    }

    // Create LogicQ folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'LogicQ',
        mimeType: 'application/vnd.google-apps.folder',
        description: 'LogicQ competitive programming workspace backups and settings.',
      }),
    });

    if (!createRes.ok) {
      if (createRes.status === 401) {
        GoogleDriveService.disconnectDrive();
        throw new Error('TOKEN_EXPIRED');
      }
      const errBody = await createRes.json().catch(() => null);
      console.error('[GoogleDriveService] Drive folder create error:', createRes.status, errBody);
      const detailMsg = errBody?.error?.message || `HTTP ${createRes.status}`;
      throw new Error(`DRIVE_ERROR: ${detailMsg}`);
    }

    const folderData = await createRes.json();
    const folderId = folderData.id;

    // Create README.txt inside LogicQ folder
    await GoogleDriveService.createReadmeFile(accessToken, folderId);

    return folderId;
  }

  /**
   * Creates README.txt inside the LogicQ folder explaining student ownership and privacy
   */
  private static async createReadmeFile(accessToken: string, folderId: string): Promise<void> {
    try {
      const readmeText = `======================================================================
LogicQ Student Workspace Directory
======================================================================
This folder was created by LogicQ (https://logicq-clanguage.web.app)
to store your personal coding backups, editor settings, and notes.

Privacy Guarantee:
- LogicQ only has access to files inside this folder.
- LogicQ can NEVER read, edit, or delete any other files in your Google Drive.
- You own all files in this directory. You may download, inspect, or delete
  them at any time.

Manage your account and preferences in LogicQ under Profile > Settings.
======================================================================`;

      const metadata = {
        name: 'README.txt',
        mimeType: 'text/plain',
        parents: [folderId],
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([readmeText], { type: 'text/plain' }));

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
    } catch {
      // README creation is best-effort, ignore failure
    }
  }

  /**
   * Ensures the `backups/` subfolder exists inside the `LogicQ/` folder
   */
  public static async ensureBackupsFolder(accessToken: string, parentFolderId: string): Promise<string> {
    const query = encodeURIComponent(`name = 'backups' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (listRes.ok) {
      const listData = await listRes.json();
      if (listData.files && listData.files.length > 0) {
        return listData.files[0].id;
      }
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'backups',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      }),
    });

    if (!createRes.ok) {
      if (createRes.status === 401) {
        GoogleDriveService.disconnectDrive();
        throw new Error('TOKEN_EXPIRED');
      }
      throw new Error('COLLEGE_WORKSPACE_BLOCKED');
    }

    const folderData = await createRes.json();
    return folderData.id;
  }

  /**
   * Exports authoritative student history snapshot into a versioned JSON backup file on Google Drive
   */
  public static async backupHistoryToDrive(
    accessToken: string,
    historyData: any,
    userId: string
  ): Promise<DriveBackupResult> {
    try {
      const rootFolderId = await GoogleDriveService.ensureLogicQFolder(accessToken);
      const backupsFolderId = await GoogleDriveService.ensureBackupsFolder(accessToken, rootFolderId);

      const now = new Date();
      const isoStamp = now.toISOString().replace(/[:.]/g, '-');
      const fileName = `backup_${isoStamp}.json`;

      const envelope: DriveEnvelope = {
        schemaVersion: '1.0.0',
        fileType: 'BACKUP',
        updatedAt: now.getTime(),
        updatedAtIso: now.toISOString(),
        deviceLabel: getDeviceLabel(),
        userId,
        content: historyData,
      };

      const fileContent = JSON.stringify(envelope, null, 2);
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [backupsFolderId],
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([fileContent], { type: 'application/json' }));

      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });

      if (!uploadRes.ok) {
        if (uploadRes.status === 401) {
          GoogleDriveService.disconnectDrive();
          return {
            success: false,
            error: 'TOKEN_EXPIRED',
            message: 'Google Drive authorization expired. Please reconnect.',
          };
        }
        if (uploadRes.status === 403) {
          return {
            success: false,
            error: 'COLLEGE_WORKSPACE_BLOCKED',
            message: 'Your Google Drive storage quota is exceeded or restricted by your institution.',
          };
        }
        const errDetail = uploadRes.statusText || `HTTP ${uploadRes.status}`;
        return {
          success: false,
          error: 'UPLOAD_FAILED',
          message: `Failed to upload backup: ${errDetail}`,
        };
      }

      const uploadData = await uploadRes.json();
      return {
        success: true,
        fileId: uploadData.id,
        fileName,
        message: `Successfully backed up history to Google Drive (${fileName})`,
      };
    } catch (err: any) {
      console.error('[GoogleDriveService] backupHistoryToDrive error:', err);
      if (err.message === 'TOKEN_EXPIRED') {
        return {
          success: false,
          error: 'TOKEN_EXPIRED',
          message: 'Google Drive authorization expired. Please reconnect.',
        };
      }
      const errMsg = String(err?.message || '');
      if (errMsg.includes('DRIVE_API_DISABLED')) {
        return {
          success: false,
          error: 'DRIVE_API_DISABLED',
          enableUrl: 'https://console.cloud.google.com/apis/library/drive.googleapis.com?project=logicq-clanguage',
          message: 'Google Drive API is not enabled in your Google Cloud Console for project logicq-clanguage. Please click the button below to enable it.',
        };
      }
      if (errMsg.includes('COLLEGE_WORKSPACE_BLOCKED') || errMsg.includes('DRIVE_FORBIDDEN')) {
        return {
          success: false,
          error: 'COLLEGE_WORKSPACE_BLOCKED',
          message: 'Google Drive access was restricted for this account. Downloading your backup directly...',
        };
      }
      return {
        success: false,
        error: 'BACKUP_ERROR',
        message: err.message || 'An error occurred during Google Drive backup.',
      };
    }
  }

  /**
   * Downloads a local JSON backup file directly to the student device
   */
  public static downloadLocalBackup(data: any, usernameOrPrn?: string): void {
    const now = new Date();
    const isoStamp = now.toISOString().slice(0, 10);
    const label = usernameOrPrn ? `${usernameOrPrn}_` : '';
    const fileName = `logicq_backup_${label}${isoStamp}.json`;

    const envelope: DriveEnvelope = {
      schemaVersion: '1.0.0',
      fileType: 'BACKUP',
      updatedAt: now.getTime(),
      updatedAtIso: now.toISOString(),
      deviceLabel: getDeviceLabel(),
      userId: usernameOrPrn || 'anonymous',
      content: data,
    };

    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
