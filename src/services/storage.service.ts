/**
 * Storage service — handles file uploads to Firebase Storage.
 * Currently used for community report photo attachments only.
 */

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTask,
} from 'firebase/storage'
import { storage, auth } from '@/firebase/firebase'

export interface UploadProgress {
  bytesTransferred: number
  totalBytes: number
  percent: number
}

export const storageService = {
  /**
   * Upload a report photo to Firebase Storage.
   * Path format: reportPhotos/{uid}/{timestamp}_{filename}
   * Returns a StorageReference path (not a download URL).
   *
   * Photos should contain no people — this is communicated in the UI.
   */
  uploadReportPhoto(
    file: File,
    onProgress?: (progress: UploadProgress) => void,
  ): {
    task: UploadTask
    promise: Promise<string>
  } {
    const uid = auth.currentUser?.uid
    if (!uid) {
      throw new Error('User must be authenticated to upload photos.')
    }

    const ext = file.name.split('.').pop() ?? 'jpg'
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const storagePath = `reportPhotos/${uid}/${filename}`
    const storageRef = ref(storage, storagePath)

    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedBy: uid,
        uploadedAt: new Date().toISOString(),
      },
    })

    const promise = new Promise<string>((resolve, reject) => {
      task.on(
        'state_changed',
        (snapshot) => {
          const progress: UploadProgress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percent: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          }
          onProgress?.(progress)
        },
        (error) => reject(error),
        async () => {
          // Return the storage path (not the URL) for privacy.
          // Admins resolve the URL server-side.
          resolve(storagePath)
        },
      )
    })

    return { task, promise }
  },

  /**
   * Get a download URL for a storage path.
   * Should only be used by admin interfaces.
   */
  async getDownloadUrl(storagePath: string): Promise<string> {
    return getDownloadURL(ref(storage, storagePath))
  },

  /** Delete a file from storage. */
  async deleteFile(storagePath: string): Promise<void> {
    return deleteObject(ref(storage, storagePath))
  },
}
