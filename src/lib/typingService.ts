export interface TypingUser {
  userId: string;
  channelId: string;
  displayName: string;
  startedAt: string;
}

type TypingListener = (users: TypingUser[]) => void;

// In-memory store for active typing state
const activeTypingMap: Map<string, TypingUser[]> = new Map();
const listenersMap: Map<string, Set<TypingListener>> = new Map();
const typingTimeoutsMap: Map<string, NodeJS.Timeout> = new Map(); // key: `${channelId}:${userId}`

const TIMEOUT_MS = 4000; // 4 seconds auto-expiry fallback

function notifyChannelListeners(channelId: string) {
  const channelUsers = activeTypingMap.get(channelId) || [];
  const listeners = listenersMap.get(channelId);
  if (listeners) {
    listeners.forEach(cb => cb([...channelUsers]));
  }
}

/**
  * Signal that a user has started typing in a specific channel.
  * Extends/resets the 4-second timeout for this user.
  */
export function startTyping(channelId: string, user: { id: string; name: string }) {
  if (!channelId || !user || !user.id) return;

  const key = `${channelId}:${user.id}`;

  // Clear existing timeout if present
  if (typingTimeoutsMap.has(key)) {
    clearTimeout(typingTimeoutsMap.get(key));
  }

  const currentList = activeTypingMap.get(channelId) || [];
  const existingIndex = currentList.findIndex(u => u.userId === user.id);

  const updatedUser: TypingUser = {
    userId: user.id,
    channelId,
    displayName: user.name,
    startedAt: new Date().toISOString()
  };

  let nextList: TypingUser[];
  if (existingIndex >= 0) {
    nextList = [...currentList];
    nextList[existingIndex] = updatedUser;
  } else {
    nextList = [...currentList, updatedUser];
  }

  activeTypingMap.set(channelId, nextList);

  // Set automatic safety fallback timeout to clear user after 4 seconds
  const timeoutId = setTimeout(() => {
    stopTyping(channelId, user.id);
  }, TIMEOUT_MS);

  typingTimeoutsMap.set(key, timeoutId);
  notifyChannelListeners(channelId);
}

/**
  * Signal that a user has stopped typing in a channel.
  */
export function stopTyping(channelId: string, userId: string) {
  if (!channelId || !userId) return;

  const key = `${channelId}:${userId}`;
  if (typingTimeoutsMap.has(key)) {
    clearTimeout(typingTimeoutsMap.get(key));
    typingTimeoutsMap.delete(key);
  }

  const currentList = activeTypingMap.get(channelId) || [];
  const nextList = currentList.filter(u => u.userId !== userId);

  if (nextList.length === 0) {
    activeTypingMap.delete(channelId);
  } else {
    activeTypingMap.set(channelId, nextList);
  }

  notifyChannelListeners(channelId);
}

/**
  * Get list of currently typing users in a channel.
  */
export function getTypingUsers(channelId: string): TypingUser[] {
  return activeTypingMap.get(channelId) || [];
}

/**
  * Subscribe to typing changes for a channel. Returns an unsubscribe function.
  */
export function subscribeToTyping(channelId: string, callback: TypingListener): () => void {
  if (!listenersMap.has(channelId)) {
    listenersMap.set(channelId, new Set());
  }

  listenersMap.get(channelId)!.add(callback);

  // Send initial state immediately
  callback(getTypingUsers(channelId));

  return () => {
    const listeners = listenersMap.get(channelId);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        listenersMap.delete(channelId);
      }
    }
  };
}
