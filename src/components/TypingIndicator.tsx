import React from "react";
import { TypingUser } from "../types";

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  currentUserId?: string;
  variant?: "incoming" | "outgoing";
  avatarUrl?: string | null;
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  currentUserId,
  variant = "incoming",
  avatarUrl,
  className = ""
}) => {
  // Filter out current user so user doesn't see themselves as typing
  const activeUsers = typingUsers.filter(u => u.userId !== currentUserId);
  if (activeUsers.length === 0) return null;

  let userNameLabel = "";
  if (activeUsers.length === 1) {
    const firstName = activeUsers[0].displayName.split(" ")[0] || activeUsers[0].displayName;
    userNameLabel = `${firstName} is typing`;
  } else if (activeUsers.length === 2) {
    const firstName1 = activeUsers[0].displayName.split(" ")[0] || activeUsers[0].displayName;
    const firstName2 = activeUsers[1].displayName.split(" ")[0] || activeUsers[1].displayName;
    userNameLabel = `${firstName1} and ${firstName2} are typing`;
  } else {
    userNameLabel = "Several people are typing";
  }

  const isOutgoing = variant === "outgoing";

  return (
    <div className={`flex items-end gap-2 my-2 animate-fade-in ${isOutgoing ? "justify-end" : "justify-start"} ${className}`}>
      {!isOutgoing && (
        <div className="w-7 h-7 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Typing avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-[10px] font-black text-[var(--color-text-muted)]">•••</span>
          )}
        </div>
      )}

      <div
        role="status"
        aria-live="polite"
        aria-label={userNameLabel}
        className={`px-3 py-2 rounded-2xl text-xs flex items-center gap-2 shadow-sm border max-w-[85%] sm:max-w-[70%] select-none ${
          isOutgoing
            ? "bg-blue-600 text-white border-blue-500/30 rounded-br-sm"
            : "bg-[var(--color-surface-2)] text-[var(--color-text)] border-[var(--color-border)]/80 rounded-bl-sm"
        }`}
      >
        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] dark:text-slate-300 mr-0.5">
          {userNameLabel}
        </span>
        <div className="flex items-center gap-1 py-0.5" aria-hidden="true">
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 animate-[typingDot_1.4s_infinite_0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 animate-[typingDot_1.4s_infinite_200ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 animate-[typingDot_1.4s_infinite_400ms]" />
        </div>
      </div>
    </div>
  );
};
