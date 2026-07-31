import React, { useState, useEffect } from "react";
import { 
  Bell, AlertCircle, AlertTriangle, CheckCircle, Send, Trash2, 
  Megaphone, ShieldAlert, Sparkles, Clock, Globe
} from "lucide-react";
import { User } from "../../types";
import { safeJsonParse } from "../../lib/json";

interface SystemAlertsProps {
  userRoster: User[];
  currentUser: User;
  showToast: (msg: string, type?: "success" | "error") => void;
  logActivity: (action: string, details: string) => void;
}

interface BroadcastMessage {
  id: string;
  sender: string;
  senderRole: string;
  message: string;
  type: "critical" | "warning" | "info";
  timestamp: string;
  active: boolean;
}

export const SystemAlerts: React.FC<SystemAlertsProps> = ({
  userRoster,
  currentUser,
  showToast,
  logActivity
}) => {
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [msgType, setMsgType] = useState<"critical" | "warning" | "info">("info");

  // Load broadcasts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("gbk_admin_broadcasts");
    if (saved) {
      setBroadcasts(safeJsonParse(saved, []));
    } else {
      // Seed default broadcast
      const defaults: BroadcastMessage[] = [
        {
          id: "broad_1",
          sender: "David Acosta",
          senderRole: "Developer/Admin",
          message: "⚠️ Attention Brokers: Please verify that all FSRA Ontario Licence registrations are fully uploaded to your profile vaults before tomorrow's audit cutoff.",
          type: "critical",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          active: true
        },
        {
          id: "broad_2",
          sender: "Tim Brown",
          senderRole: "Admin",
          message: "Rate Sheet Update: TD Canada Trust has updated their 5-Year Fixed benchmark rates. Check Lender Sheets for compliance margins.",
          type: "info",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          active: true
        }
      ];
      setBroadcasts(defaults);
      localStorage.setItem("gbk_admin_broadcasts", JSON.stringify(defaults));
    }
  }, []);

  // Submit broadcast message
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) {
      showToast("Broadcast message cannot be empty.", "error");
      return;
    }

    const newBroadcast: BroadcastMessage = {
      id: `broad_${Date.now()}`,
      sender: `${currentUser.first} ${currentUser.last}`,
      senderRole: currentUser.role,
      message: newMsg.trim(),
      type: msgType,
      timestamp: new Date().toISOString(),
      active: true
    };

    const updated = [newBroadcast, ...broadcasts];
    setBroadcasts(updated);
    localStorage.setItem("gbk_admin_broadcasts", JSON.stringify(updated));
    logActivity("Broadcast Notification Dispatched", `Sent ${msgType} system broadcast: "${newBroadcast.message.substring(0, 50)}..."`);
    showToast("Global system broadcast published successfully.", "success");
    setNewMsg("");
  };

  // Toggle active status
  const handleToggleActive = (id: string) => {
    const updated = broadcasts.map(b => b.id === id ? { ...b, active: !b.active } : b);
    setBroadcasts(updated);
    localStorage.setItem("gbk_admin_broadcasts", JSON.stringify(updated));
    showToast("Broadcast visibility updated.", "success");
  };

  // Delete broadcast
  const handleDeleteBroadcast = (id: string) => {
    const updated = broadcasts.filter(b => b.id !== id);
    setBroadcasts(updated);
    localStorage.setItem("gbk_admin_broadcasts", JSON.stringify(updated));
    showToast("Broadcast deleted from logs.", "success");
  };

  return (
    <div className="space-y-6" id="system-alerts-broadcaster">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Broadcaster Composition Form */}
        <div className="lg:col-span-1 bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg flex flex-col justify-between h-[360px]">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)]/50 pb-3">
            <Megaphone className="w-4.5 h-4.5 text-[var(--color-accent)]" />
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Dispatch Global Notice</h4>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-4 mt-3 flex-1 flex flex-col justify-between">
            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Notice Classification</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMsgType("info")}
                  className={`py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all cursor-pointer ${
                    msgType === "info" 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                      : "bg-[var(--color-surface-2)] border-[var(--color-border)]/50 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                  }`}
                >
                  🟢 Info Banner
                </button>
                <button
                  type="button"
                  onClick={() => setMsgType("warning")}
                  className={`py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all cursor-pointer ${
                    msgType === "warning" 
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                      : "bg-[var(--color-surface-2)] border-[var(--color-border)]/50 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                  }`}
                >
                  🟡 Warning Notice
                </button>
                <button
                  type="button"
                  onClick={() => setMsgType("critical")}
                  className={`py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all cursor-pointer ${
                    msgType === "critical" 
                      ? "bg-red-500/10 text-red-400 border-red-500/30" 
                      : "bg-[var(--color-surface-2)] border-[var(--color-border)]/50 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                  }`}
                >
                  🔴 Critical Alert
                </button>
              </div>
            </div>

            <div className="flex-1 mt-3">
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">Compose Broadcast Message</label>
              <textarea
                required
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Write an operational notice to stream to all active brokerage login workspaces..."
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 rounded-lg p-3 text-xs text-[var(--color-text)] outline-none resize-none h-24 focus:border-[var(--color-accent)]/30 transition-all placeholder-[var(--color-text-faint)]/60"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-inverse)] text-xs font-black uppercase py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all mt-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 stroke-[2.5]" /> Dispatch Brokerage Notice
            </button>
          </form>
        </div>

        {/* Live Active Banners Directory */}
        <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)]/70 p-5 rounded-xl shadow-lg flex flex-col h-[360px]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4.5 h-4.5 text-[var(--color-info)]" />
              <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Active Broadcast Banner Streams</h4>
            </div>
            <span className="text-[10px] text-[var(--color-text-faint)] font-mono font-bold">
              {broadcasts.filter(b => b.active).length} Active Channels
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 select-none">
            {broadcasts.map((b) => (
              <div 
                key={b.id} 
                className={`p-3.5 rounded-xl border flex gap-3.5 items-start transition-all ${
                  b.active 
                    ? b.type === "critical" 
                      ? "bg-red-500/5 border-red-500/20 text-red-200"
                      : b.type === "warning"
                      ? "bg-amber-500/5 border-amber-500/20 text-amber-200"
                      : "bg-emerald-500/5 border-emerald-500/20 text-emerald-200"
                    : "bg-[var(--color-surface-2)]/40 border-[var(--color-border)]/50 text-[var(--color-text-faint)]"
                }`}
              >
                {b.type === "critical" ? (
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                ) : b.type === "warning" ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}

                <div className="flex-1 min-w-0 text-left text-xs">
                  <p className="leading-relaxed font-medium">{b.message}</p>
                  
                  <div className="flex items-center gap-3.5 mt-2.5 text-[9px] font-semibold text-[var(--color-text-faint)] uppercase">
                    <span>Sender: {b.sender} ({b.senderRole})</span>
                    <span>•</span>
                    <span className="font-mono">
                      {new Date(b.timestamp).toLocaleDateString()} {new Date(b.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-center shrink-0">
                  <button
                    onClick={() => handleToggleActive(b.id)}
                    className={`text-[9px] font-bold uppercase border px-2 py-1 rounded transition-all cursor-pointer ${
                      b.active 
                        ? "bg-[var(--color-surface-2)] border-[var(--color-border)]/50 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)]"
                        : "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/15 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20"
                    }`}
                  >
                    {b.active ? "Mute" : "Stream"}
                  </button>

                  <button
                    onClick={() => handleDeleteBroadcast(b.id)}
                    className="p-1 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-[var(--color-text-faint)]/40 hover:text-red-400 rounded transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {broadcasts.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-[var(--color-text-faint)]">
                <Megaphone className="w-10 h-10 mb-2 stroke-1" />
                <p className="text-xs italic">No system broadcasts deployed yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
