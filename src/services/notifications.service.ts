/**
 * Notifications service — Web Notifications API and Firebase Cloud Messaging.
 *
 * Architecture:
 * - In-app alerts use the Web Notifications API and Web Audio API.
 * - Push notifications use FCM (tokens stored in users/{uid}/fcmTokens).
 * - FCM is designed to be compatible with the future Flutter app.
 */

import { getToken, onMessage, type Messaging } from 'firebase/messaging'
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { messaging, db } from '@/firebase/firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

export interface NotificationPermissionResult {
  granted: boolean
  token: string | null
}

export const notificationsService = {
  /**
   * Request notification permission and, if granted,
   * obtain an FCM token and store it in the user's Firestore document.
   */
  async requestPermissionAndRegister(uid: string): Promise<NotificationPermissionResult> {
    if (!('Notification' in window)) {
      return { granted: false, token: null }
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { granted: false, token: null }
    }

    let token: string | null = null

    if (messaging && VAPID_KEY) {
      try {
        token = await getToken(messaging as Messaging, { vapidKey: VAPID_KEY })
        // Store token in Firestore — same schema as Flutter app
        await updateDoc(doc(db, 'users', uid), {
          fcmTokens: arrayUnion({
            token,
            platform: 'web',
            updatedAt: serverTimestamp(),
          }),
          notificationsEnabled: true,
        })
      } catch (error) {
        console.warn('[Awarely] FCM token registration failed:', error)
      }
    }

    return { granted: true, token }
  },

  /**
   * Listen for foreground FCM messages.
   * Returns an unsubscribe function.
   */
  onForegroundMessage(callback: (payload: unknown) => void): () => void {
    if (!messaging) return () => {}
    return onMessage(messaging as Messaging, callback)
  },

  /**
   * Show a browser notification (requires permission).
   * Used for area awareness alerts when the app is in the foreground.
   */
  showAreaAlert(areaName: string, message: string): void {
    if (Notification.permission !== 'granted') return
    new Notification(`Awarely — ${areaName}`, {
      body: message,
      icon: '/logo.svg',
      badge: '/logo.svg',
      tag: 'area-awareness',
    })
  },

  /**
   * Play a subtle audio alert using the Web Audio API.
   * No audio files needed — purely synthesised.
   */
  playAwarenessTone(): void {
    try {
      const ctx = new AudioContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(440, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.5)

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.8)

      oscillator.onended = () => ctx.close()
    } catch {
      // Audio context not available (e.g. before user interaction)
    }
  },

  /** Check current notification permission status without requesting. */
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) return 'denied'
    return Notification.permission
  },
}
