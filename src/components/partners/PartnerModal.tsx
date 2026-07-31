import React, { useState, useEffect } from "react";
import { X, Sparkles, Check, UserPlus, ShieldAlert, Award } from "lucide-react";
import { 
  PARTNER_CATEGORIES, 
  PARTNER_STATUSES, 
  ONTARIO_REGIONS, 
  ExtendedPartner 
} from "./constants";
import { User as RosterUser } from "../../types";

interface PartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePartner: (partner: Partial<ExtendedPartner>) => void;
  editingPartner: ExtendedPartner | null;
  userRoster: RosterUser[];
  currentUser: RosterUser;
}

export const PartnerModal: React.FC<PartnerModalProps> = ({
  isOpen,
  onClose,
  onSavePartner,
  editingPartner,
  userRoster,
  currentUser
}) => {
  // Local state for all the input fields
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [company, setCompany] = useState("");
  const [type, setType] = useState<string>("Lawyers");
  const [typeInput, setTypeInput] = useState("");
  const [showTypeSuggestions, setShowTypeSuggestions] = useState(false);
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Barrie");
  const [assignedOwner, setAssignedOwner] = useState("");
  const [status, setStatus] = useState<string>("Active");
  const [isPreferred, setIsPreferred] = useState(false);
  const [notes, setNotes] = useState("");
  const [healthScore, setHealthScore] = useState<number>(85);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Sync state if we are in Edit mode
  useEffect(() => {
    if (editingPartner) {
      setFirst(editingPartner.first || "");
      setLast(editingPartner.last || "");
      setCompany(editingPartner.company || "");
      setType(editingPartner.type || "Lawyers");
      setTypeInput(editingPartner.type || "Lawyers");
      setRole(editingPartner.role || "");
      setPhone(editingPartner.phone || "");
      setEmail(editingPartner.email || "");
      setWebsite(editingPartner.website || "");
      setAddress(editingPartner.address || "");
      setCity(editingPartner.city || "Barrie");
      setAssignedOwner(editingPartner.assignedOwner || `${currentUser.first} ${currentUser.last}`);
      setStatus(editingPartner.status || "Active");
      setIsPreferred(editingPartner.isPreferred || editingPartner.status === "Preferred");
      setNotes(editingPartner.notes || "");
      setHealthScore(editingPartner.healthScore ?? 85);
      setTags(editingPartner.referralTags || []);
    } else {
      // Add mode defaults
      setFirst("");
      setLast("");
      setCompany("");
      setType("Lawyers");
      setTypeInput("Lawyers");
      setRole("");
      setPhone("");
      setEmail("");
      setWebsite("");
      setAddress("");
      setCity("Barrie");
      setAssignedOwner(`${currentUser.first} ${currentUser.last}`);
      setStatus("Active");
      setIsPreferred(false);
      setNotes("");
      setHealthScore(85);
      setTags([]);
    }
    setSpecialtyInput("");
  }, [editingPartner, isOpen, currentUser]);

  // Filtered categories for combobox
  const filteredCategories = PARTNER_CATEGORIES.filter(cat => 
    cat.toLowerCase().includes(typeInput.toLowerCase().trim())
  );
  const isExactCategoryMatch = PARTNER_CATEGORIES.some(cat => 
    cat.toLowerCase() === typeInput.trim().toLowerCase()
  );
  const showCustomCategoryOption = typeInput.trim() !== "" && !isExactCategoryMatch;

  if (!isOpen) return null;

  // Add tag helper
  const handleAddTag = () => {
    if (!specialtyInput.trim()) return;
    if (tags.includes(specialtyInput.trim())) return;
    setTags([...tags, specialtyInput.trim()]);
    setSpecialtyInput("");
  };

  // Remove tag helper
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Handle Save
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!first.trim() || !last.trim()) return;

    // Sanitize website domain
    const sanitizedWebsite = website.trim().replace(/^(https?:\/\/)?(www\.)?/i, "");

    onSavePartner({
      id: editingPartner?.id, // undefined means add new
      first: first.trim(),
      last: last.trim(),
      company: company.trim() || undefined,
      type,
      role: role.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: sanitizedWebsite || undefined,
      address: address.trim() || undefined,
      city,
      assignedOwner,
      status: status as any,
      isPreferred,
      notes: notes.trim() || undefined,
      healthScore,
      referralTags: tags
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none animate-fadeIn" id="partner-composition-dialog">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        
        {/* Header banner */}
        <div className="h-14 border-b border-[var(--color-border)]/70 px-6 flex items-center justify-between bg-[var(--color-surface-2)] shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[var(--color-accent)]" />
            <div>
              <h2 className="text-sm font-black text-[var(--color-text)] uppercase tracking-wider">
                {editingPartner ? "Modify Relationship Profile" : "Onboard Strategic Partner"}
              </h2>
              <p className="text-[10px] text-[var(--color-text-muted)] font-semibold leading-none mt-0.5">
                {editingPartner ? `Adjusting details for ${editingPartner.first} ${editingPartner.last}` : "Register external professionals into GBK Roster"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Section: Names & Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                required
                type="text"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                placeholder="Sarah"
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                required
                type="text"
                value={last}
                onChange={(e) => setLast(e.target.value)}
                placeholder="Johnson"
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                Profession Category
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={typeInput}
                  onChange={(e) => {
                    setTypeInput(e.target.value);
                    setType(e.target.value);
                  }}
                  onFocus={() => setShowTypeSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTypeSuggestions(false), 150)}
                  placeholder="Select or type category..."
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-bold"
                />
                {showTypeSuggestions && (filteredCategories.length > 0 || showCustomCategoryOption) && (
                  <div className="absolute z-50 w-full mt-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filteredCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setTypeInput(cat);
                          setType(cat);
                          setShowTypeSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                      >
                        {cat}
                      </button>
                    ))}
                    {showCustomCategoryOption && (
                      <button
                        type="button"
                        onClick={() => {
                          setType(typeInput.trim());
                          setTypeInput(typeInput.trim());
                          setShowTypeSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-bold text-[var(--color-accent)] hover:bg-[var(--color-surface-3)] cursor-pointer border-t border-[var(--color-border)]/50"
                      >
                        + Add &quot;{typeInput}&quot; as new category
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-[var(--color-text-faint)] mt-1">Select from list or type a custom category</p>
            </div>
          </div>

          {/* Section: Professional details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Royal LePage Barrie"
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                Job Title / Corporate Role
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Lead Real Estate Agent"
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                Service Region (Ontario)
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-bold"
              >
                {ONTARIO_REGIONS.map(region => (
                  <option key={region} value={region} className="bg-[var(--color-surface)]">{region}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Contacts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(705) 555-0810"
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-mono font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                Secure Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah.johnson@royallepage.ca"
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                Web Portal / Website
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="royallepagebarrie.ca"
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-semibold"
              />
            </div>
          </div>

          {/* Section: Office Address & Internal Assigned Rep */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                Full Office Street Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="112 Bayfield St, Barrie, ON L4M 3B1"
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                Assigned Relationship Owner
              </label>
              <select
                value={assignedOwner}
                onChange={(e) => setAssignedOwner(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-2 text-xs text-[var(--color-accent)] focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-bold"
              >
                {userRoster.map(user => (
                  <option key={user.id} value={`${user.first} ${user.last}`} className="bg-[var(--color-surface)]">{user.first} {user.last}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Status & Health meters */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[var(--color-surface-2)]/40 p-4 rounded-xl border border-[var(--color-border)]/30">
            
            {/* Status dropdown */}
            <div className="md:col-span-4">
              <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                Relations Tag Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/30 transition-all font-bold"
              >
                {PARTNER_STATUSES.map(stat => (
                  <option key={stat} value={stat} className="bg-[var(--color-surface)]">{stat}</option>
                ))}
              </select>
            </div>

            {/* Health Meter */}
            <div className="md:col-span-4">
              <div className="flex justify-between text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1">
                <span>Health Index</span>
                <span className="text-[var(--color-accent)]">{healthScore}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={healthScore}
                onChange={(e) => setHealthScore(Number(e.target.value))}
                className="w-full accent-[var(--color-accent)] bg-[var(--color-surface-2)] rounded-lg h-2 cursor-pointer border border-[var(--color-border)]/70"
              />
            </div>

            {/* Preferred star toggle */}
            <div className="md:col-span-4 flex items-center justify-end h-full pt-4.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPreferred}
                  onChange={(e) => setIsPreferred(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  isPreferred 
                    ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-black" 
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)]"
                }`}>
                  {isPreferred && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider">
                  ⭐ Preferred Broker Partner
                </span>
              </label>
            </div>
          </div>

          {/* Section: Specialty Tags */}
          <div className="bg-[var(--color-surface-2)]/40 p-4 rounded-xl border border-[var(--color-border)]/30 space-y-3">
            <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider">
              Append Professional Focus / Specialties
            </label>
            
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-[var(--color-surface-2)] text-[var(--color-text-muted)] text-[10px] font-bold px-2.5 py-1 rounded border border-[var(--color-border)]/70 flex items-center gap-1.5"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-[var(--color-text-faint)]/40 hover:text-red-400 font-bold"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {tags.length === 0 && (
                <span className="text-xs text-[var(--color-text-faint)] italic">No focus tags appended yet. Add one below:</span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. First-Time Buyers, Stated Income, Wills & Estates, SEPTIC Inspections..."
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/20 font-semibold placeholder-[var(--color-text-faint)]/40"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text)] text-xs font-bold px-4 rounded-lg border border-[var(--color-border)]/70 transition-all"
              >
                Append
              </button>
            </div>
          </div>

          {/* Section: Profile assessment */}
          <div>
            <label className="block text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider mb-1.5">
              Initial Assessment & Notes
            </label>
            <textarea
              placeholder="Record any general notes, reputation audits, or initial collaboration parameters..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)]/70 rounded-lg p-3 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]/20 h-24 resize-none font-medium placeholder-[var(--color-text-faint)]/40"
            />
          </div>

        </form>

        {/* Footer controls */}
        <div className="h-16 border-t border-[var(--color-border)]/70 bg-[var(--color-surface-2)] px-6 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs font-black uppercase tracking-wider rounded-lg border border-[var(--color-border)]/70 hover:bg-[var(--color-surface-2)] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            {editingPartner ? "Update Partner" : "Register Partner"}
          </button>
        </div>

      </div>
    </div>
  );
};
