import React, { useState } from "react";
import { 
  Tag, Plus, Trash2, X, Check, Shield, User, Sparkles
} from "lucide-react";
import { User as UserType } from "../../types";

interface UserTagsManagerModalProps {
  userRoster: UserType[];
  selectedUserIds: string[];
  availableTags: string[];
  onUpdateAvailableTags: (tags: string[]) => void;
  onApplyTagsToUsers: (tag: string, action: "add" | "remove") => void;
  onClose: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export const UserTagsManagerModal: React.FC<UserTagsManagerModalProps> = ({
  userRoster,
  selectedUserIds,
  availableTags,
  onUpdateAvailableTags,
  onApplyTagsToUsers,
  onClose,
  showToast
}) => {
  const [newTagInput, setNewTagInput] = useState("");

  const handleCreateNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTagInput.trim();
    if (!tag) return;

    if (availableTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
      showToast("Tag already exists.", "warning");
      return;
    }

    onUpdateAvailableTags([...availableTags, tag]);
    setNewTagInput("");
    showToast(`Created custom tag: "${tag}"`, "success");
  };

  const handleDeleteTag = (tagToDelete: string) => {
    onUpdateAvailableTags(availableTags.filter(t => t !== tagToDelete));
    showToast(`Deleted tag "${tagToDelete}".`, "info");
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-xl border border-[var(--color-accent)]/20">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
                Staff Tags &amp; Labels Manager
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Create custom organizational tags and assign them in bulk.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface-2)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create Tag Form */}
        <form onSubmit={handleCreateNewTag} className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-[var(--color-text-faint)] tracking-wider block">
            Create Custom Tag
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Commercial Specialist, High Performer..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Tag
            </button>
          </div>
        </form>

        {/* Existing Tags List & Bulk Assignment */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--color-text-faint)] tracking-wider">
            <span>Available System Tags</span>
            {selectedUserIds.length > 0 && (
              <span className="text-[var(--color-accent)]">{selectedUserIds.length} Users Selected for Bulk Assign</span>
            )}
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {availableTags.map((tag) => (
              <div
                key={tag}
                className="flex items-center justify-between p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)]"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  <span className="text-xs font-bold text-[var(--color-text)]">{tag}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {selectedUserIds.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => onApplyTagsToUsers(tag, "add")}
                        className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold hover:bg-emerald-500/25 cursor-pointer"
                      >
                        + Apply to ({selectedUserIds.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => onApplyTagsToUsers(tag, "remove")}
                        className="px-2.5 py-1 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold hover:bg-red-500/25 cursor-pointer"
                      >
                        - Remove
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag)}
                    className="p-1.5 text-[var(--color-text-faint)] hover:text-red-400 rounded-lg hover:bg-red-500/10 cursor-pointer ml-1"
                    title="Delete tag"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[var(--color-accent)] text-[var(--color-text-inverse)] font-bold text-xs rounded-xl hover:bg-[var(--color-accent-hover)] cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
