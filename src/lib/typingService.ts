import { TypingUser } from "../types";

// In-memory registry for typing users per channel
const activeTypingMap: Map<string, Map<string, TypingUser>> = new Map();
const typingTimeouts: Map<string, any> = new Map();

export const TYPING_TIMEOUT_MS = 4000;

export function startTyping(
  channelId: string,
  currentUser: { id: string; first?: string; last?: string; displayName?: string }
) {
  if (!channelId || !currentUser || !currentUser.id) return;
  const displayName = currentUser.displayName || `${currentUser.first || ''} ${currentUser.last || ''}`.trim() || currentUser.id;

  if (!activeTypingMap.has(channelId)) {
    activeTypingMap.set(channelId, new Map());
  }
  const channelMap = activeTypingMap.get(channelId)!;
  const now = new Date().toISOString();

  channelMap.set(currentUser.id, {
    userId: currentUser.id,
    channelId,
    displayName,
    startedAt: now
  });

  const timerKey = `${channelId}_${currentUser.id}`;
  if (typingTimeouts.has(timerKey)) {
    clearTimeout(typingTimeouts.get(timerKey));
  }

  // Safety fallback timeout to clear typing indicator after inactivity
  const timeout = setTimeout(() => {
    stopTyping(channelId, currentUser.id);
  }, TYPING_TIMEOUT_MS);
  typingTimeouts.set(timerKey, timeout);

  // Broadcast typing started event
  window.dispatchEvent(
    new CustomEvent("user.typingStarted", {
      detail: { channelId, userId: currentUser.id, displayName }
    })
  );
}

export function stopTyping(channelId: string, userId: string) {
  if (!channelId || !userId) return;
  const channelMap = activeTypingMap.get(channelId);
  if (channelMap && channelMap.has(userId)) {
    const user = channelMap.get(userId);
    channelMap.delete(userId);
    if (channelMap.size === 0) {
      activeTypingMap.delete(channelId);
    }
    const timerKey = `${channelId}_${userId}`;
    if (typingTimeouts.has(timerKey)) {
      clearTimeout(typingTimeouts.get(timerKey));
      typingTimeouts.delete(timerKey);
    }

    // Broadcast typing stopped event
    window.dispatchEvent(
      new CustomEvent("user.typingStopped", {
        detail: { channelId, userId, displayName: user?.displayName }
      })
    );
  }
}

export function getTypingUsers(channelId: string, excludeUserId?: string): TypingUser[] {
  const channelMap = activeTypingMap.get(channelId);
  if (!channelMap) return [];
  const list = Array.from(channelMap.values());
  if (excludeUserId) {
    return list.filter(u => u.userId !== excludeUserId);
  }
  return list;
}

export function subscribeToTyping(
  channelId: string,
  onChange: (users: TypingUser[]) => void,
  excludeUserId?: string
): () => void {
  const handler = (e: Event) => {
    const customEv = e as CustomEvent;
    if (customEv.detail && customEv.detail.channelId === channelId) {
      onChange(getTypingUsers(channelId, excludeUserId));
    }
  };

  window.addEventListener("user.typingStarted", handler);
  window.addEventListener("user.typingStopped", handler);

  // Notify immediately with current active typing users
  onChange(getTypingUsers(channelId, excludeUserId));

  return () => {
    window.removeEventListener("user.typingStarted", handler);
    window.removeEventListener("user.typingStopped", handler);
  };
}
