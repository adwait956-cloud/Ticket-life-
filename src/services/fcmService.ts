import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { app, auth, rtdb } from './firebaseAuth';
import { ref, push, set } from 'firebase/database';

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

try {
  messagingInstance = getMessaging(app);
} catch (e) {
  console.warn('Firebase Messaging (FCM) is not supported in this environment or failed to initialize:', e);
}

/**
   * Requests browser notification permission and retrieves the FCM registration token.
   */
export async function requestFCMToken(): Promise<string | null> {
  if (!messagingInstance) {
    console.warn('FCM messagingInstance is null.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted:', permission);
      return null;
    }

    // Retrieve FCM token (using a standard VAPID key placeholder for web push)
    const currentToken = await getToken(messagingInstance, {
      vapidKey: 'BEl42iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSwf8jKldJ8V7q2W5xZ9Xy3G9z6hKxLq8',
    }).catch(() => null);

    if (currentToken && auth.currentUser) {
      // Save FCM token to RTDB under user profile
      const tokenRef = ref(rtdb, `users/${auth.currentUser.uid}/fcmToken`);
      await set(tokenRef, currentToken).catch(() => {});
    }

    return currentToken;
  } catch (err) {
    console.warn('Error retrieving FCM token:', err);
    return null;
  }
}

/**
   * Listens for foreground FCM push messages.
   */
export function onForegroundMessage(callback: (payload: MessagePayload) => void): (() => void) | null {
  if (!messagingInstance) return null;

  try {
    return onMessage(messagingInstance, (payload) => {
      console.log('FCM Foreground Message received:', payload);
      callback(payload);

      // Show native browser notification if permitted
      if (Notification.permission === 'granted' && payload.notification) {
        const { title, body } = payload.notification;
        new Notification(title || 'Ticket Life Notification', {
          body: body || 'You have a new update.',
          icon: '/favicon.ico',
        });
      }
    });
  } catch (err) {
    console.warn('Failed to attach FCM foreground message listener:', err);
    return null;
  }
}

/**
   * Dispatches a real-time push notification for booking status updates (e.g. Confirmed, Driver Assigned, Ride Started, Completed).
   */
export async function sendBookingStatusPushNotification(
  userId: string,
  bookingId: string,
  status: string,
  title: string,
  body: string
): Promise<void> {
  try {
    const notifRef = ref(rtdb, `notifications/${userId || 'guest'}`);
    const newNotifRef = push(notifRef);
    await set(newNotifRef, {
      id: `notif-${Date.now()}`,
      type: 'booking_status',
      bookingId,
      status,
      title,
      body,
      timestamp: new Date().toISOString(),
      read: false,
    });

    // If browser supports native Notification and permission is granted, show immediate alert
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    }
  } catch (err) {
    console.warn('Could not dispatch booking status push notification:', err);
  }
}

/**
   * Dispatches a real-time push notification when a price alert target is triggered.
   */
export async function sendPriceAlertPushNotification(
  userId: string,
  alertId: string,
  routeName: string,
  currentPrice: number,
  targetPrice: number
): Promise<void> {
  const title = `🚨 Price Drop Alert: ${routeName}`;
  const body = `Great news! The fare dropped to ₹${currentPrice} (Target: ₹${targetPrice}). Book now to lock in savings!`;

  try {
    const notifRef = ref(rtdb, `notifications/${userId || 'guest'}`);
    const newNotifRef = push(notifRef);
    await set(newNotifRef, {
      id: `alert-${Date.now()}`,
      type: 'price_alert',
      alertId,
      routeName,
      currentPrice,
      targetPrice,
      title,
      body,
      timestamp: new Date().toISOString(),
      read: false,
    });

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    }
  } catch (err) {
    console.warn('Could not dispatch price alert push notification:', err);
  }
}
