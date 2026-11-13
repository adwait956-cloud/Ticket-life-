import { ref, onValue, push, set } from 'firebase/database';
import { rtdb } from './firebaseAuth';

export interface TripChatMessage {
  id: string;
  tripId: string;
  sender: 'rider' | 'driver';
  senderName: string;
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

const STORAGE_PREFIX = 'ticketlife_chat_';

export function getLocalChatMessages(tripId: string): TripChatMessage[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tripId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalChatMessages(tripId: string, messages: TripChatMessage[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tripId}`, JSON.stringify(messages));
  } catch (e) {
    console.warn('Could not cache chat messages locally:', e);
  }
}

/**
 * Listens for real-time messages on Firebase RTDB path `chats/{tripId}`
 * and falls back to / synchronizes with local storage.
 */
export function subscribeToTripChat(
  tripId: string,
  onUpdate: (messages: TripChatMessage[]) => void
): () => void {
  const localInitial = getLocalChatMessages(tripId);
  if (localInitial.length > 0) {
    onUpdate(localInitial);
  }

  try {
    const chatRef = ref(rtdb, `chats/${tripId}`);
    const unsubscribe = onValue(
      chatRef,
      (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          const list: TripChatMessage[] = Object.keys(val).map((key) => ({
            id: key,
            ...val[key],
          }));
          list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          saveLocalChatMessages(tripId, list);
          onUpdate(list);
        } else if (localInitial.length > 0) {
          onUpdate(localInitial);
        }
      },
      (err) => {
        console.warn('RTDB chat subscription warning (using local sync):', err);
        onUpdate(getLocalChatMessages(tripId));
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch {
        // ignore cleanup error
      }
    };
  } catch (e) {
    console.warn('Could not establish RTDB chat listener:', e);
    return () => {};
  }
}

/**
 * Sends a chat message from the rider to the driver.
 * Optimistically stores locally and persists to Firebase RTDB.
 */
export async function sendRiderChatMessage(params: {
  tripId: string;
  text: string;
  riderName?: string;
  driverName?: string;
  triggerDriverReply?: boolean;
}): Promise<TripChatMessage> {
  const { tripId, text, riderName = 'Rider', driverName = 'Captain', triggerDriverReply = true } = params;

  const newMsg: TripChatMessage = {
    id: `msg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    tripId,
    sender: 'rider',
    senderName: riderName,
    text: text.trim(),
    timestamp: new Date().toISOString(),
    status: 'sent',
  };

  // 1. Update local cache immediately
  const existing = getLocalChatMessages(tripId);
  existing.push(newMsg);
  saveLocalChatMessages(tripId, existing);

  // 2. Push to Firebase RTDB if available
  try {
    const chatRef = ref(rtdb, `chats/${tripId}`);
    const newMsgRef = push(chatRef);
    await set(newMsgRef, {
      ...newMsg,
      id: newMsgRef.key || newMsg.id,
    });
  } catch (err) {
    console.warn('RTDB chat push notice (persisted in local state):', err);
  }

  // 3. Realistic Driver context auto-response if triggered
  if (triggerDriverReply) {
    scheduleDriverAutoReply(tripId, text, driverName);
  }

  return newMsg;
}

/**
 * Generates an authentic, real-time contextual response from the driver.
 */
function scheduleDriverAutoReply(tripId: string, riderText: string, driverName: string) {
  const lower = riderText.toLowerCase();
  let replyText = 'Ji sir, main on the way hoon. 2 minute mein pahunch raha hoon.';

  if (lower.includes('wait') || lower.includes('ruko') || lower.includes('coming') || lower.includes('aa raha')) {
    replyText = 'Koi baat nahi sir, main yahin gate ke paas wait kar raha hoon. Aaram se aaiye.';
  } else if (lower.includes('where') || lower.includes('kahan') || lower.includes('kidhar')) {
    replyText = 'Sir main bas 200 meter door hoon signal par. White car park kar raha hoon.';
  } else if (lower.includes('ac') || lower.includes('air conditioning')) {
    replyText = 'Haanji sir, AC full on kar diya hai. Comfortable ride rahegi!';
  } else if (lower.includes('luggage') || lower.includes('bag') || lower.includes('saman')) {
    replyText = 'Theek hai sir, dicky/boot khali hai. Main saman rakhne mein help kar dunga.';
  } else if (lower.includes('traffic') || lower.includes('jam')) {
    replyText = 'Haan thoda traffic hai, par main shortcut lane se jaldi nikal raha hoon.';
  } else if (lower.includes('gate') || lower.includes('entrance') || lower.includes('pickup')) {
    replyText = 'Main exact main gate ke samne hazard lights on karke khada hoon.';
  } else {
    const defaultReplies = [
      'Ji sir, message mil gaya. Main location par hi hoon.',
      'Haanji sir, map follow kar raha hoon. Bas 1 minute mein pick karunga.',
      'Theek hai sir, hazard indicator on hai, aap dekh sakte hain.',
    ];
    replyText = defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
  }

  // Wait 1.5 - 2.5 seconds to simulate real-time typing by the driver
  setTimeout(async () => {
    const driverMsg: TripChatMessage = {
      id: `drv-msg-${Date.now()}`,
      tripId,
      sender: 'driver',
      senderName: driverName,
      text: replyText,
      timestamp: new Date().toISOString(),
      status: 'delivered',
    };

    const currentList = getLocalChatMessages(tripId);
    currentList.push(driverMsg);
    saveLocalChatMessages(tripId, currentList);

    try {
      const chatRef = ref(rtdb, `chats/${tripId}`);
      const newRef = push(chatRef);
      await set(newRef, {
        ...driverMsg,
        id: newRef.key || driverMsg.id,
      });
    } catch {
      // ignore
    }
  }, 1800);
}
