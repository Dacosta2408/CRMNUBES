import React, { useState } from "react";
import { 
  Star, Phone, Mail, Globe, MapPin, User, Users, Calendar, Plus, MessageCircle, 
  Activity, Award, FileText, CheckCircle, Clock, Trash2, Edit3, Heart, Send, Sparkles
} from "lucide-react";
import { ExtendedPartner } from "./constants";
import { Client, PartnerTimelineEntry, User as RosterUser } from "../../types";

interface PartnerDetailProps {
  partner: ExtendedPartner;
  clients?: Client[];
  userRoster: RosterUser[];
  currentUser: RosterUser;
  onUpdatePartnerField: (id: string, updates: Partial<ExtendedPartner>) => void;
  onDeletePartner: (id: string) => void;
  onEditPartner: (partner: ExtendedPartner) => void;
  onAddTimelineEntry: (id: string, entry: PartnerTimelineEntry) => void;
  onAddRelatedTask: (title: string, dueDate: string, priority: 'high' | 'medium' | 'low') => void;
  onOpenComposeEmail?: (to: string, subject: string, body: string) => void;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export const PartnerDetail: React.FC<PartnerDetailProps> = ({
  partner,
  clients = [],
  userRoster,
  currentUser,
  onUpdatePartnerField,
  onDeletePartner,
  onEditPartner,
  onAddTimelineEntry,
  onAddRelatedTask,
  onOpenComposeEmail,
  showToast
}) => {
  // Filter referred clients
  const partnerFullName = `${partner.first} ${partner.last}`.trim().toLowerCase();
  const partnerIdLower = partner.id.trim().toLowerCase();
  const referredClients = (clients || []).filter((client) => {
    if (!client.referredBy) return false;
    const ref = client.referredBy.trim().toLowerCase();
    return ref === partnerIdLower || ref === partnerFullName;
  });
  // Timeline interaction log states
  const [logType, setLogType] = useState<PartnerTimelineEntry["type"]>("call");
  const [logNotes, setLogNotes] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);

  // Task scheduling states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState(new Date(Date.now() + 3 * 24 * 3600000).toISOString().split("T")[0]);
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>("medium");

  // Email template option states
  const [emailTemplateType, setEmailTemplateType] = useState("rate_update");

  // Custom Tag input state
  const [customTag, setCustomTag] = useState("");

  // Inline delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Submit Timeline Logging
  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logNotes.trim()) {
      showToast("Please enter log descriptions.", "error");
      return;
    }

    const newEntry: PartnerTimelineEntry = {
      id: `tlog_${Date.now()}`,
      date: logDate,
      type: logType,
      text: logNotes.trim(),
      author: `${currentUser.first} ${currentUser.last}`
    };

    onAddTimelineEntry(partner.id, newEntry);
    setLogNotes("");
    showToast("Relationship interaction history updated.", "success");
  };

  // Submit Related Task
  const handleScheduleTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      showToast("Please specify a task title.", "error");
      return;
    }

    onAddRelatedTask(
      `[Partner: ${partner.first} ${partner.last}] - ${taskTitle.trim()}`,
      taskDueDate,
      taskPriority
    );

    // Also auto-append this task creation into the partner's timeline
    const taskLog: PartnerTimelineEntry = {
      id: `tlog_task_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      type: "note",
      text: `Scheduled follow-up task: "${taskTitle.trim()}" (Due: ${taskDueDate})`,
      author: `${currentUser.first} ${currentUser.last}`
    };
    onAddTimelineEntry(partner.id, taskLog);

    // Update partner's next touch date
    onUpdatePartnerField(partner.id, { nextTouchDate: taskDueDate });

    setTaskTitle("");
    showToast("Follow-up task synchronized inside system scheduler.", "success");
  };

  // Trigger outbound email with dynamic templates
  const handleSendEmailShortcut = () => {
    if (!partner.email) {
      showToast("Partner does not have a registered email address.", "error");
      return;
    }

    let subject = "";
    let body = "";

    if (emailTemplateType === "rate_update") {
      subject = "Ontario Mortgage Market Briefing & Rate Updates";
      body = `Hi ${partner.first},\n\nI wanted to share a quick update on current lending rates and underwriting shifts that might help your clients this week.\n\n- Fixed 5-Year rates are hovering around 4.69% for insurable files.\n- Variable rates remain at Prime - 0.90% with strong alternative-lending channels.\n\nLet me know if you have any pre-approvals or client scenarios you'd like me to run before they make an offer!\n\nBest regards,\n${currentUser.first} ${currentUser.last}\nGBK Financial`;
    } else if (emailTemplateType === "thank_you") {
      subject = "Sincere thanks for your mortgage referral!";
      body = `Hi ${partner.first},\n\nI wanted to personally thank you for introducing your clients to our team. It means a great deal that you trust us with their financing.\n\nWe are already organizing their document portal and preparing alternative scenario structures to secure the absolute best GDS/TDS safety margins.\n\nI will keep you updated as conditions clear.\n\nWarmly,\n${currentUser.first} ${currentUser.last}\nGBK Financial`;
    } else {
      subject = "Coffee check-in / GBK Brokerage updates";
      body = `Hi ${partner.first},\n\nDo you have 20 minutes for coffee next Tuesday or Thursday? \n\nI'd love to catch up on your current client inventory, hear about local real estate activity, and explore how we can support your business with our customized fast-track approvals.\n\nLet me know what works best for you!\n\nCheers,\n${currentUser.first} ${currentUser.last}\nGBK Financial`;
    }

    if (onOpenComposeEmail) {
      onOpenComposeEmail(partner.email, subject, body);
    } else {
      // Fallback standard mailto
      window.open(`mailto:${partner.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    }
  };

  // Custom Tag Submission
  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTag.trim()) return;
    const tags = partner.referralTags || [];
    if (tags.includes(customTag.trim())) {
      showToast("Tag already exists.", "info");
      return;
    }
    const updated = [...tags, customTag.trim()];
    onUpdatePartnerField(partner.id, { referralTags: updated });
    setCustomTag("");
    showToast("Specialty tag appended.", "success");
  };

  // Copy details helper
  const handleCopyClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${type} copied to clipboard!`, "success");
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="partner-detail-workspace">
      
      {/* Col 1: Core demographic details & profile card */}
      <div className="xl:col-span-1 space-y-5">
        
        {/* Profile Card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl p-5 flex flex-col items-center text-center relative overflow-hidden">
          {/* Subtle accent color top */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--color-accent)]" />
          
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[var(--color-accent)]/20 to-[#6fa3b8]/20 border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)] font-black text-2xl mt-4 relative">
            {partner.first[0]}{partner.last[0]}
            {partner.isPreferred && (
              <span className="absolute -top-1.5 -right-1.5 bg-[var(--color-accent)] text-black p-0.5 rounded-full" title="Preferred Partner">
                <Star className="w-3.5 h-3.5 fill-current" />
              </span>
            )}
          </div>

          <h3 className="text-base font-black text-[var(--color-text)] uppercase tracking-wider mt-4">
            {partner.first} {partner.last}
          </h3>
          
          <span className="bg-[var(--color-surface-2)] text-[#6fa3b8] text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-[#6fa3b8]/15 mt-1.5">
            {partner.type}
          </span>

          <p className="text-xs text-[var(--color-text-muted)] font-semibold mt-2.5">
            {partner.role || "Professional Associate"}
          </p>

          <p className="text-xs text-[var(--color-text-muted)] font-bold hover:text-[var(--color-accent)] transition-all cursor-pointer mt-1">
            {partner.company || "Independent Office"}
          </p>

          <div className="w-full grid grid-cols-2 gap-2 mt-6 border-t border-b border-[var(--color-border)]/30 py-4 text-xs">
            <div className="border-r border-[var(--color-border)]/50">
              <span className="block text-[9px] text-[var(--color-text-faint)] uppercase font-bold">Touch Status</span>
              <span className="text-emerald-400 font-bold block mt-1 uppercase text-[10px]">
                {partner.status || "Active"}
              </span>
            </div>
            <div>
              <span className="block text-[9px] text-[var(--color-text-faint)] uppercase font-bold">Health Index</span>
              <span className="text-[var(--color-accent)] font-mono font-bold block mt-1">
                {partner.healthScore || 85}%
              </span>
            </div>
          </div>

          {/* Core metadata columns */}
          <div className="w-full space-y-3 pt-4 text-left text-xs text-[var(--color-text-muted)]">
            <div className="flex justify-between items-center">
              <span className="text-[var(--color-text-faint)] font-medium">Direct Line</span>
              {partner.phone ? (
                <button
                  onClick={() => handleCopyClipboard(partner.phone!, "Phone")}
                  className="font-mono font-bold text-[var(--color-text)]/90 hover:text-[var(--color-accent)] transition-colors"
                >
                  {partner.phone}
                </button>
              ) : (
                <span className="text-[var(--color-text-faint)]/30 italic">Unassigned</span>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[var(--color-text-faint)] font-medium">Secure Email</span>
              {partner.email ? (
                <button
                  onClick={() => handleCopyClipboard(partner.email!, "Email")}
                  className="font-bold text-[#6fa3b8] hover:underline truncate max-w-[150px]"
                >
                  {partner.email}
                </button>
              ) : (
                <span className="text-[var(--color-text-faint)]/30 italic">Unassigned</span>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[var(--color-text-faint)] font-medium">Digital Portal</span>
              {partner.website ? (
                <a
                  href={`https://${partner.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1.5"
                >
                  {partner.website}
                </a>
              ) : (
                <span className="text-[var(--color-text-faint)]/30 italic">Unassigned</span>
              )}
            </div>

            <div className="flex justify-between items-start">
              <span className="text-[var(--color-text-faint)] font-medium">Main Office</span>
              <span className="font-semibold text-right max-w-[150px] leading-snug">
                {partner.address || "Barrie, ON"}
              </span>
            </div>

            <div className="flex justify-between items-center border-t border-[var(--color-border)]/30 pt-3">
              <span className="text-[var(--color-text-faint)] font-medium">Relationship Owner</span>
              <span className="text-emerald-400 font-semibold">{partner.assignedOwner || "David Acosta"}</span>
            </div>

            <div className="flex justify-between items-center border-t border-[var(--color-border)]/30 pt-3">
              <span className="text-[var(--color-text-faint)] font-medium">Last Contacted</span>
              <span className="font-semibold text-[var(--color-text)]">
                {partner.lastTouchDate
                  ? (() => {
                      const d = new Date(partner.lastTouchDate);
                      return !isNaN(d.getTime())
                        ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : partner.lastTouchDate;
                    })()
                  : "Not recorded"}
              </span>
            </div>
          </div>

          {/* Preferred toggle flag */}
          <div className="w-full mt-5">
            <button
              onClick={() => onUpdatePartnerField(partner.id, { isPreferred: !partner.isPreferred })}
              className={`w-full py-2 rounded-lg text-[10px] font-black uppercase border transition-all flex items-center justify-center gap-1.5 ${
                partner.isPreferred
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-[var(--color-surface-2)] border-[var(--color-border)]/70 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${partner.isPreferred ? "fill-current" : ""}`} />
              {partner.isPreferred ? "Preferred Partner Enabled" : "Promote to Preferred Partner"}
            </button>
          </div>
        </div>

        {/* Action Button Grid */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl p-4 flex gap-2">
          <button
            onClick={() => onEditPartner(partner)}
            className="flex-1 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)]/70 text-xs font-black uppercase py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" /> Modify Profile
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  onDeletePartner(partner.id);
                }}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase px-3 py-2.5 rounded-lg flex items-center justify-center transition-all cursor-pointer"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] border border-[var(--color-border)]/70 text-xs font-bold uppercase px-3 py-2.5 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 text-xs font-black uppercase px-4 rounded-lg flex items-center justify-center transition-all cursor-pointer"
              title="Delete partner"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>

      {/* Col 2: Notes, specialty tags & schedules */}
      <div className="xl:col-span-1 space-y-5">
        
        {/* Descriptive notes & specialties block */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)]/50 pb-2.5">
            <FileText className="w-4.5 h-4.5 text-[var(--color-accent)]" />
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Internal Intelligence</h4>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-[var(--color-text-faint)] tracking-wider mb-1.5">
              Relationship Assessment & Notes
            </label>
            <textarea
              value={partner.notes || ""}
              onChange={(e) => onUpdatePartnerField(partner.id, { notes: e.target.value })}
              placeholder="Record strategic directions, key contacts, or deal-structuring preferences for this partner..."
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-xl p-3 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/20 h-28 resize-none font-medium placeholder-[var(--color-text-faint)]/40"
            />
          </div>

          {/* Specialty Tags */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider">
              Specialties & Competencies
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(partner.referralTags || []).map((tag) => (
                <span
                  key={tag}
                  className="bg-[var(--color-surface-2)] text-[var(--color-text-muted)] text-[9px] font-semibold px-2 py-0.5 rounded border border-[var(--color-border)]/50 flex items-center gap-1.5"
                >
                  {tag}
                  <button
                    onClick={() => {
                      const updated = (partner.referralTags || []).filter((t) => t !== tag);
                      onUpdatePartnerField(partner.id, { referralTags: updated });
                    }}
                    className="text-[var(--color-text-faint)]/40 hover:text-red-400 font-bold"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {(partner.referralTags || []).length === 0 && (
                <span className="text-[10px] text-[var(--color-text-faint)] italic">No custom specialties appended yet.</span>
              )}
            </div>

            {/* Append Tag */}
            <form onSubmit={handleAddCustomTag} className="flex gap-2 mt-2 pt-1.5">
              <input
                type="text"
                placeholder="Add specialty tag..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-1 text-[11px] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/20 font-medium placeholder-[var(--color-text-faint)]/40"
              />
              <button
                type="submit"
                className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] text-[11px] font-bold px-3 rounded-lg border border-[var(--color-border)]/70 transition-all"
              >
                Add
              </button>
            </form>
          </div>
        </div>

        {/* Task Scheduler Panel */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)]/50 pb-2.5">
            <Clock className="w-4.5 h-4.5 text-[#6fa3b8]" />
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Schedule Outreach Action</h4>
          </div>

          <form onSubmit={handleScheduleTask} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                Outreach Action Title
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Call to pitch private lending rates sheets..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/20 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-1 text-xs text-[var(--color-text)] focus:outline-none font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                  Urgency
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2 py-1.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold"
                >
                  <option value="high" className="bg-[var(--color-surface)]">🔥 Urgent</option>
                  <option value="medium" className="bg-[var(--color-surface)]">⚡ Standard</option>
                  <option value="low" className="bg-[var(--color-surface)]">💤 Low Priority</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#6fa3b8] hover:bg-[#598ca1] text-black text-xs font-black uppercase py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Schedule System Task
            </button>
          </form>
        </div>

        {/* Quick Email Template Shortcuts */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl p-5 space-y-3.5">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)]/50 pb-2.5">
            <Mail className="w-4.5 h-4.5 text-[var(--color-accent)]" />
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Outreach Templates</h4>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                Select Correspondence template
              </label>
              <select
                value={emailTemplateType}
                onChange={(e) => setEmailTemplateType(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/20 font-bold"
              >
                <option value="rate_update" className="bg-[var(--color-surface)]">📊 Current Lending Rate Sheet</option>
                <option value="thank_you" className="bg-[var(--color-surface)]">🙏 Mortgage Referral Appreciation</option>
                <option value="coffee" className="bg-[var(--color-surface)]">☕ Connect over Barrie Coffee</option>
              </select>
            </div>

            <button
              onClick={handleSendEmailShortcut}
              className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black text-xs font-black uppercase py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5 stroke-[2.5]" /> Launch Outreach Email
            </button>
          </div>
        </div>

      </div>

      {/* Col 3: Chronological timeline of interactions */}
      <div className="xl:col-span-1 space-y-5">
        
        {/* Log interaction note */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)]/50 pb-2.5">
            <Activity className="w-4.5 h-4.5 text-emerald-400" />
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Log Interaction Note</h4>
          </div>

          <form onSubmit={handleAddLog} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                  Medium
                </label>
                <select
                  value={logType}
                  onChange={(e) => setLogType(e.target.value as any)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2 py-1.5 text-xs text-[var(--color-text)] focus:outline-none font-bold"
                >
                  <option value="call" className="bg-[var(--color-surface)]">📞 Phone Call</option>
                  <option value="coffee" className="bg-[var(--color-surface)]">☕ Coffee/Meal</option>
                  <option value="rate_update" className="bg-[var(--color-surface)]">📊 Rates Sent</option>
                  <option value="referral_received" className="bg-[var(--color-surface)]">🌟 Referral In</option>
                  <option value="thank_you" className="bg-[var(--color-surface)]">🙏 Thanks Sent</option>
                  <option value="co_marketing" className="bg-[var(--color-surface)]">📢 Co-Marketing</option>
                  <option value="note" className="bg-[var(--color-surface)]">📝 Internal Note</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                  Interaction Date
                </label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                Outcomes / Conversation Points
              </label>
              <textarea
                required
                placeholder="Write specific items discussed, client names, or follow-up insights..."
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-emerald-500/20 h-20 resize-none font-medium placeholder-[var(--color-text-faint)]/40"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 text-black text-xs font-black uppercase py-2 rounded-lg flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" /> Log Historical Entry
            </button>
          </form>
        </div>

        {/* Chronological timeline rendering */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-2.5">
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Chronicle History</h4>
            <span className="text-[10px] text-[var(--color-text-faint)] font-semibold uppercase">
              {(partner.timeline || []).length} Milestones
            </span>
          </div>

          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            {(partner.timeline || []).map((entry, index) => {
              // Icon selector
              let iconElement = <MessageCircle className="w-3.5 h-3.5 text-[var(--color-text-faint)]" />;
              if (entry.type === "call") iconElement = <Phone className="w-3.5 h-3.5 text-[#6fa3b8]" />;
              else if (entry.type === "coffee") iconElement = <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
              else if (entry.type === "rate_update") iconElement = <FileText className="w-3.5 h-3.5 text-[var(--color-accent)]" />;
              else if (entry.type === "referral_received") iconElement = <Award className="w-3.5 h-3.5 text-emerald-400" />;
              else if (entry.type === "thank_you") iconElement = <Heart className="w-3.5 h-3.5 text-rose-400 fill-current" />;

              return (
                <div key={entry.id || index} className="flex gap-3 text-xs items-start">
                  <div className="w-6 h-6 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/50 flex items-center justify-center shrink-0 mt-0.5">
                    {iconElement}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-[var(--color-text)]/80 font-semibold leading-relaxed">
                      {entry.text}
                    </p>
                    <div className="flex items-center gap-2 text-[9px] text-[var(--color-text-faint)] font-bold uppercase">
                      <span>{entry.author}</span>
                      <span>•</span>
                      <span className="font-mono">{entry.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {(partner.timeline || []).length === 0 && (
              <div className="text-center py-8 text-[var(--color-text-faint)]">
                <Clock className="w-8 h-8 mx-auto mb-1 stroke-1" />
                <p className="text-xs italic">No timeline entries cataloged.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Referred Clients Section */}
      <div className="xl:col-span-3 bg-[var(--color-surface)] border border-[var(--color-border)]/70 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-[var(--color-accent)]" />
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Referred Clients</h4>
          </div>
          <span className="text-[10px] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]/50 font-bold px-2.5 py-0.5 rounded-full">
            {referredClients.length} {referredClients.length === 1 ? 'Client' : 'Clients'}
          </span>
        </div>

        {referredClients.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {referredClients.map((client) => {
              let statusClass = "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)]/50";
              if (client.status === 'funded' || client.status === 'approved') {
                statusClass = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
              } else if (client.status === 'working' || client.status === 'conditional' || client.status === 'lender') {
                statusClass = "bg-amber-500/15 text-amber-400 border-amber-500/30";
              } else if (client.status === 'lead' || client.status === 'open') {
                statusClass = "bg-sky-500/15 text-sky-400 border-sky-500/30";
              }

              return (
                <div key={client.id} className="bg-[var(--color-surface-2)] border border-[var(--color-border)]/60 rounded-lg p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--color-text)] truncate">
                      {client.first} {client.last}
                    </p>
                    {client.email && (
                      <p className="text-[10px] text-[var(--color-text-faint)] truncate font-mono mt-0.5">
                        {client.email}
                      </p>
                    )}
                  </div>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border shrink-0 ${statusClass}`}>
                    {client.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs italic text-[var(--color-text-faint)] py-2">
            No clients currently linked to this partner as referrals.
          </p>
        )}
      </div>

    </div>
  );
};
