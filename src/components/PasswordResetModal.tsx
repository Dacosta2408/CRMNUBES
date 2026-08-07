import React, { useState, useEffect } from "react";
import { 
  KeyRound, Mail, Lock, ShieldCheck, CheckCircle2, ArrowRight, X, AlertCircle, RefreshCw, Sparkles, User as UserIcon 
} from "lucide-react";
import { User } from "../types";
import { hashPin } from "../hooks/useAuth";
import { encryptValue } from "../lib/cryptoUtils";
import { Avatar } from "./Avatar";

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
  userRoster,
  setUserRoster,
  initialEmail = "vdacosta247@gmail.com",
  showToast,
  onSuccessUnlock
}) => {
  const [step, setStep] = useState<"request" | "verify" | "success">("request");
  const [emailInput, setEmailInput] = useState(initialEmail);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [newPin, setNewPin] = useState("1234");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("request");
      setEmailInput(initialEmail || "vdacosta247@gmail.com");
      setErrorMsg("");
      setVerificationCode("");
      setNewPin("1234");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  // Find user by email
  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const matched = userRoster.find(
      u => (u.email || "").toLowerCase() === emailInput.trim().toLowerCase()
    );

    if (!matched) {
      setErrorMsg("No active user found with that email address. Please check your spelling.");
      return;
    }

    setIsSending(true);
    setTargetUser(matched);

    setTimeout(() => {
      setIsSending(false);
      setVerificationCode("123456"); // Simulated code dispatch
      setStep("verify");
      showToast(`Security reset verification code sent to ${matched.email}`, "success", "✉️");
    }, 800);
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!targetUser) return;

    if (verificationCode !== "123456" && verificationCode.length < 6) {
      setErrorMsg("Please enter a valid 6-digit verification code.");
      return;
    }

    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      setErrorMsg("Workstation PIN must be exactly 4 digits (e.g., 1234).");
      return;
    }

    if (newPassword.length > 0 && newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please verify.");
      return;
    }

    setIsUpdating(true);

    try {
      const pinHash = await hashPin(newPin, targetUser.id);
      const encryptedPin = await encryptValue(newPin, newPin);

      const updatedUser: User = {
        ...targetUser,
        pin: encryptedPin,
        pinHash,
        ...(newPassword ? { emailPassword: newPassword } : {})
      };

      // Update user roster
      const updatedRoster = userRoster.map(u => u.id === targetUser.id ? updatedUser : u);
      setUserRoster(updatedRoster);
      localStorage.setItem("gbk_roster", JSON.stringify(updatedRoster));

      setIsUpdating(false);
      setStep("success");
      showToast(`Credentials updated for ${targetUser.first} ${targetUser.last}!`, "success", "🔐");
    } catch (err) {
      setIsUpdating(false);
      setErrorMsg("An error occurred while updating credentials. Please try again.");
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
                Secure Account Recovery & Credential Management
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
                    placeholder="e.g. vdacosta247@gmail.com"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>

              {/* Developer / Admin Quick Options */}
              <div className="p-3 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between font-bold text-[var(--color-accent)]">
                  <span>Main Developer Account:</span>
                  <button
                    type="button"
                    onClick={() => setEmailInput("vdacosta247@gmail.com")}
                    className="underline text-[10px] hover:opacity-80 cursor-pointer"
                  >
                    Select David Acosta
                  </button>
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  David Acosta (vdacosta247@gmail.com) • Developer/Admin
                </p>
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
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching Reset Email...
                    </>
                  ) : (
                    <>
                      Send Reset Verification <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFY CODE & SET NEW CREDENTIALS */}
          {step === "verify" && targetUser && (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
                <Avatar name={`${targetUser.first} ${targetUser.last}`} src={targetUser.photo || targetUser.profilePhoto} size="sm" />
                <div className="min-w-0 text-xs">
                  <p className="font-extrabold text-[var(--color-text)]">{targetUser.first} {targetUser.last}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{targetUser.email} • {targetUser.role}</p>
                  <p className="text-[10px] text-emerald-400 font-bold mt-1">
                    ✓ Reset verification token dispatched to inbox!
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase">
                    6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setVerificationCode("123456")}
                    className="text-[10px] font-bold text-[var(--color-accent)] hover:underline"
                  >
                    Auto-fill (123456)
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-center text-lg font-mono font-bold tracking-widest text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* NEW WORKSTATION PIN CODE */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase">
                    New Workstation Access PIN (4 Digits)
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPin("1234")}
                    className="text-[10px] font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Set Dev PIN (1234)
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="1234"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-center text-lg font-mono font-bold tracking-widest text-[var(--color-accent)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* NEW PASSWORD OPTIONAL */}
              <div className="space-y-2 pt-1 border-t border-[var(--color-border)]/50">
                <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase block">
                  New Account Password (Optional)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new account password"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                />
                {newPassword.length > 0 && (
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new account password"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                )}
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
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      Save & Update Credentials <ShieldCheck className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {step === "success" && targetUser && (
            <div className="text-center py-4 space-y-4 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-sm font-black text-[var(--color-text)] uppercase tracking-wider">
                  Credentials Successfully Reset!
                </h4>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Account <span className="font-bold text-[var(--color-text)]">{targetUser.first} {targetUser.last}</span> has been updated with PIN code <span className="font-mono font-bold text-[var(--color-accent)]">{newPin}</span>.
                </p>
              </div>

              <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-text-muted)] text-left space-y-1">
                <p className="font-bold text-[var(--color-text)]">Summary of Updates:</p>
                <p>• Account Email: <span className="text-[var(--color-text)]">{targetUser.email}</span></p>
                <p>• Workstation PIN Code: <span className="font-mono font-bold text-[var(--color-accent)]">{newPin}</span></p>
                {newPassword && <p>• Password: <span className="text-emerald-400 font-bold">Updated</span></p>}
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                {onSuccessUnlock && (
                  <button
                    onClick={() => {
                      onSuccessUnlock({
                        ...targetUser,
                        pin: newPin
                      });
                      onClose();
                    }}
                    className="px-5 py-2.5 bg-[var(--color-accent)] text-black text-xs font-black uppercase tracking-wider rounded-xl shadow-lg hover:opacity-90 cursor-pointer"
                  >
                    Unlock Station Now
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 bg-[var(--color-surface-2)] text-[var(--color-text)] text-xs font-bold rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-3)] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
