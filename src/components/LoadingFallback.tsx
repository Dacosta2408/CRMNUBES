import React from "react";
import { Sparkles, Loader2 } from "lucide-react";

export const LoadingFallback: React.FC = () => {
  return (
    <div className="w-full h-96 flex flex-col items-center justify-center p-8 bg-[var(--color-surface)]/40 border border-[var(--color-border)]/50 rounded-2xl shadow-sm backdrop-blur-sm animate-pulse">
      <div className="relative flex items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/10">
          <Sparkles className="w-7 h-7 animate-bounce" />
        </div>
        <div className="absolute -bottom-1 -right-1 p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full">
          <Loader2 className="w-4 h-4 text-[var(--color-accent)] animate-spin" />
        </div>
      </div>
      
      <div className="mt-4 text-center space-y-1">
        <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
          Loading Module...
        </h4>
        <p className="text-[11px] text-[var(--color-text-muted)] font-medium">
          Optimizing component bundle &amp; resources
        </p>
      </div>

      <div className="mt-6 w-48 h-1.5 bg-[var(--color-surface-2)] rounded-full overflow-hidden border border-[var(--color-border)]/40">
        <div className="w-1/2 h-full bg-gradient-to-r from-[var(--color-accent)] to-sky-400 rounded-full animate-[shimmer_1.5s_infinite]" />
      </div>
    </div>
  );
};
