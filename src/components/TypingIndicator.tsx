import React from "react";
import { TypingUser } from "../lib/typingService";

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  currentUserId?: string;
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  currentUserId,
  className = ""
}) => {
  // Filter out current user from typing users list so user never sees themselves typing
  const filteredUsers = typingUsers.filter(u => u.userId !== currentUserId);

  if (filteredUsers.length === 0) return null;

  // Format label:
  // "Alex is typing"
  // "Alex and Jordan are typing"
  // "Several people are typing"
  let labelText = "";
  if (filteredUsers.length === 1) {
    labelText = `${filteredUsers[0].displayName || "Someone"} is typing`;
  } else if (filteredUsers.length === 2) {
    labelText = `${filteredUsers[0].displayName || "Someone"} and ${filteredUsers[1].displayName || "Someone"} are typing`;
  } else {
    labelText = "Several people are typing";
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={labelText}
      className={`flex items-center gap-2.5 my-1 text-xs select-none motion-reduce:animate-none ${className}`}
    >
      {/* Incoming Message Bubble Style for Typing Indicator */}
      <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl rounded-bl-xs bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 shadow-sm text-[var(--color-text-muted)] w-fit">
        {/* Animated Three Dots */}
        <div className="flex items-center gap-1 h-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]/80 animate-typing-dot-1 motion-reduce:animate-none" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]/80 animate-typing-dot-2 motion-reduce:animate-none" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]/80 animate-typing-dot-3 motion-reduce:animate-none" />
        </div>
        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] italic ml-1">
          {labelText}...
        </span>
      </div>
    </div>
  );
};
