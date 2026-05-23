/**
 * storage.ts — Firebase Storage helpers for user profile photos.
 *
 * Storage path: `users/{uid}/profile-pic`
 * Matches the Storage Security Rule in firebase/storage.rules.
 */

import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '@/services/firebase/config';

const profilePicPath = (uid: string) => `users/${uid}/profile-pic`;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload a profile photo from a local URI (e.g. from image picker).
 * Converts the URI to a Blob and uploads it, then returns the public download URL.
 *
 * @param uid  Firebase Auth UID — used as folder name (matches storage rule)
 * @param uri  Local file URI returned by the image picker
 * @returns    Public download URL of the uploaded photo
 */
export async function uploadProfilePhoto(uid: string, uri: string): Promise<string> {
  // Fetch the local file as a blob
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch local image at URI: ${uri}`);
  }
  const blob = await response.blob();

  const photoRef = storageRef(storage, profilePicPath(uid));
  await uploadBytes(photoRef, blob, {
    contentType: 'image/jpeg',
    customMetadata: { uid, uploadedAt: String(Date.now()) },
  });

  return getDownloadURL(photoRef);
}

/**
 * Delete a user's profile photo from Storage.
 * Silently ignores `object-not-found` errors so callers do not need
 * to guard against missing photos.
 */
export async function deleteProfilePhoto(uid: string): Promise<void> {
  const photoRef = storageRef(storage, profilePicPath(uid));
  try {
    await deleteObject(photoRef);
  } catch (error: any) {
    // Firebase Storage error code for "object not found"
    if (error?.code !== 'storage/object-not-found') {
      throw error;
    }
  }
}
