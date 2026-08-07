import React, { useState, useEffect } from "react";
import { 
  KeyRound, Mail, ShieldCheck, CheckCircle2, ArrowRight, X, AlertCircle, RefreshCw, Lock
} from "lucide-react";
import { User } from "../types";

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRoster: User[];
  setUserRoster: React.Dispatch<React.SetStateAction<User[]>>;
  initialEmail?: string;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  onSuccessUnlock?: (user: User) => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  initialEmail = "vdacosta247@gmail.com",
  showToast,
  onSuccessUnlock
}) => {
  const [step, setStep] = useState<"request" | "verify" | "success">("request");
  const [emailInput, setEmailInput] = useState(initialEmail);
  const [isSending, setIsSending] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatedUser, setUpdatedUser] = useState<User | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep("request");
      setEmailInput(initialEmail || "vdacosta247@gmail.com");
      setErrorMsg("");
      setInfoMsg("");
      setResetToken("");
      setNewPin("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  // Step 1: Request Reset Token via backend API
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    if (!emailInput.trim()) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setIsSending(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim() })
      });

      const data = await res.json();
      setIsSending(false);

      // Secure handling: always show generic message regardless of whether email exists
      setInfoMsg(data.message || "If an account with that email exists, a password reset email has been sent.");
      
      if (data.simulationToken) {
        setResetToken(data.simulationToken);
      }

      setStep("verify");
      showToast("Password reset request processed.", "info", "✉️");
    } catch {
      setIsSending(false);
      setErrorMsg("Failed to reach authentication server. Please try again.");
    }
  };

  // Step 2: Validate token and update credentials via backend API
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!resetToken.trim()) {
      setErrorMsg("Please enter your password reset token.");
      return;
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        setErrorMsg("Password must be at least 8 characters long.");
        return;
      }
      if (!/[A-Z]/.test(newPassword)) {
        setErrorMsg("Password must contain at least one uppercase letter.");
        return;
      }
      if (!/[0-9]/.test(newPassword)) {
        setErrorMsg("Password must contain at least one number.");
        return;
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
        setErrorMsg("Password must contain at least one special character (!@#$%^&* etc.).");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("Passwords do not match. Please re-enter.");
        return;
      }
    }

    if (newPin) {
      if (!/^\d{4,6}$/.test(newPin)) {
        setErrorMsg("Security PIN must be 4 to 6 numeric digits.");
        return;
      }
    }

    if (!newPassword && !newPin) {
      setErrorMsg("Please provide a new password or new security PIN.");
      return;
    }

    setIsUpdating(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken.trim(),
          newPassword: newPassword || undefined,
          newPin: newPin || undefined
        })
      });

      const data = await res.json();
      setIsUpdating(false);

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Failed to reset credentials.");
        return;
      }

      setStep("success");
      showToast("Security credentials successfully updated!", "success", "🔐");
    } catch {
      setIsUpdating(false);
      setErrorMsg("An error occurred while saving credentials. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative text-left">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-2)]/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 text-[var(--color-accent)]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[var(--color-text)] uppercase tracking-wider">
                Workstation Password Reset
              </h3>
              <p className="text-[10px] text-[var(--color-text-faint)] font-bold">
                Backend-Authoritative Credential Recovery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: REQUEST RESET EMAIL */}
          {step === "request" && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--color-text-faint)] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter registered email address"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending || !emailInput.trim()}
                  className="px-5 py-2.5 bg-[var(--color-accent)] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:opacity-90 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Requesting Reset...
                    </>
                  ) : (
                    <>
                      Send Reset Request <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFY TOKEN & SET NEW CREDENTIALS */}
          {step === "verify" && (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              {infoMsg && (
                <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-xs text-sky-300 font-medium">
                  {infoMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">
                  Reset Verification Token
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste security token"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* NEW SECURITY PIN */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">
                  New Security PIN (4–6 Digits)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-center text-lg font-mono font-bold tracking-widest text-[var(--color-accent)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* NEW PASSWORD */}
              <div className="space-y-2 pt-1 border-t border-[var(--color-border)]/50">
                <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase block">
                  New Password (Min 8 chars, 1 uppercase, 1 number, 1 special char)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2.5 bg-[var(--color-accent)] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:opacity-90 flex items-center gap-2 cursor-pointer"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      Update Credentials <ShieldCheck className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {step === "success" && (
            <div className="text-center py-4 space-y-4 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-sm font-black text-[var(--color-text)] uppercase tracking-wider">
                  Credentials Updated Successfully!
                </h4>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Your new security PIN and password have been saved on the server.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-[var(--color-accent)] text-black text-xs font-black uppercase tracking-wider rounded-xl shadow-lg hover:opacity-90 cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
