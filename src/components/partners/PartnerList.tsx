import React from "react";
import { 
  Star, Phone, Mail, Globe, MapPin, User, ArrowRight, Award, Trash2, Edit3 
} from "lucide-react";
import { ExtendedPartner } from "./constants";
import { Client } from "../../types";

interface PartnerListProps {
  partners: ExtendedPartner[];
  clients?: Client[];
  selectedPartnerId: string | null;
  onSelectPartner: (id: string) => void;
  onTogglePreferred: (id: string, e: React.MouseEvent) => void;
  onDeletePartner: (id: string, e: React.MouseEvent) => void;
  onEditPartner: (partner: ExtendedPartner, e: React.MouseEvent) => void;
  onQuickEmail: (email: string) => void;
}

export const PartnerList: React.FC<PartnerListProps> = ({
  partners,
  clients = [],
  selectedPartnerId,
  onSelectPartner,
  onTogglePreferred,
  onDeletePartner,
  onEditPartner,
  onQuickEmail
}) => {
  if (partners.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-12 text-center" id="empty-partner-results">
        <MapPin className="h-10 w-10 text-[var(--color-text-faint)]/30 mx-auto mb-3 stroke-1" />
        <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">No Partners Located</h3>
        <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
          No external professional partners match the current search filters or region constraints. Refine or expand parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-lg" id="partner-results-directory">
      
      {/* Desktop Tabular Directory View */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-[var(--color-surface-2)]/80 border-b border-[var(--color-border)]/70 select-none text-[10px] uppercase font-black tracking-widest text-[var(--color-text-muted)]">
              <th className="py-3 px-4 w-10 text-center">Pref</th>
              <th className="py-3 px-4">Partner Name</th>
              <th className="py-3 px-4">Company</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Phone / Contact</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Health</th>
              <th className="py-3 px-4 text-center">Referrals</th>
              <th className="py-3 px-4">Relationship Owner</th>
              <th className="py-3 px-4 text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]/50">
            {partners.map((partner) => {
              const isSelected = selectedPartnerId === partner.id;

              // Calculate referral count
              const partnerFullName = `${partner.first} ${partner.last}`.trim().toLowerCase();
              const partnerIdLower = partner.id.trim().toLowerCase();
              const referralCount = clients.filter((c) => {
                if (!c.referredBy) return false;
                const ref = c.referredBy.trim().toLowerCase();
                return ref === partnerIdLower || ref === partnerFullName;
              }).length;
              
              // Map status badge colors
              let statusColorClass = "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";
              if (partner.status === "Preferred") {
                statusColorClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
              } else if (partner.status === "Active") {
                statusColorClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
              } else if (partner.status === "Occasional") {
                statusColorClass = "bg-sky-500/10 text-sky-400 border border-sky-500/20";
              } else if (partner.status === "Inactive") {
                statusColorClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
              }

              // Map health score pill colors
              const healthScore = partner.healthScore ?? 0;
              let healthColorClass = "bg-rose-500/15 text-rose-400 border border-rose-500/30";
              if (healthScore >= 90) {
                healthColorClass = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
              } else if (healthScore >= 70) {
                healthColorClass = "bg-amber-500/15 text-amber-400 border border-amber-500/30";
              }

              // Check if nextTouchDate is in the past (overdue)
              const isOverdue = (() => {
                if (!partner.nextTouchDate) return false;
                const parts = partner.nextTouchDate.split("T")[0].split("-");
                let touchDay: Date;
                if (parts.length === 3) {
                  touchDay = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                } else {
                  const d = new Date(partner.nextTouchDate);
                  if (isNaN(d.getTime())) return false;
                  touchDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                }
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return touchDay < today;
              })();

              return (
                <tr
                  key={partner.id}
                  onClick={() => onSelectPartner(partner.id)}
                  className={`group cursor-pointer transition-all hover:bg-[var(--color-surface-2)]/40 ${
                    isSelected ? "bg-[var(--color-surface-3)] border-l-2 border-[var(--color-accent)]" : ""
                  }`}
                >
                  {/* Preferred Status Star Toggle */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => onTogglePreferred(partner.id, e)}
                      className={`transition-colors duration-200 focus:outline-none ${
                        partner.isPreferred || partner.status === "Preferred"
                          ? "text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
                          : "text-[var(--color-text-faint)]/40 hover:text-[var(--color-accent)]/50"
                      }`}
                      title={partner.isPreferred ? "Preferred Partner" : "Mark as Preferred"}
                    >
                      <Star className={`w-4.5 h-4.5 ${partner.isPreferred || partner.status === "Preferred" ? "fill-current" : ""}`} />
                    </button>
                  </td>

                  {/* Partner Name with initial avatar */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[10px] font-black text-[var(--color-accent)] flex items-center justify-center uppercase shrink-0">
                        {partner.first[0]}{partner.last[0]}
                      </div>
                      <div className="font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{partner.first} {partner.last}</span>
                          {isOverdue && (
                            <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-extrabold px-1.5 py-0.2 rounded inline-flex items-center gap-0.5 whitespace-nowrap" title={`Next touch date (${partner.nextTouchDate}) is overdue`}>
                              ⚠ Overdue
                            </span>
                          )}
                        </div>
                        {partner.role && (
                          <span className="block text-[9px] text-[var(--color-text-faint)] font-medium">
                            {partner.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Company */}
                  <td className="py-3 px-4 text-[var(--color-text-muted)] font-medium max-w-[150px] truncate">
                    {partner.company || <span className="text-[var(--color-text-faint)]/30 italic">Independent</span>}
                  </td>

                  {/* Category Badge */}
                  <td className="py-3 px-4">
                    <span className="bg-[var(--color-surface-2)] text-[#6fa3b8] text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-[#6fa3b8]/15">
                      {partner.type}
                    </span>
                  </td>

                  {/* Location (City / Service Area) */}
                  <td className="py-3 px-4 text-[var(--color-text-muted)]">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[var(--color-text-faint)]/30" />
                      <span>{partner.city || "Ontario"}</span>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="py-3 px-4 text-[var(--color-text-muted)] font-mono">
                    {partner.phone || <span className="text-[var(--color-text-faint)]/30 italic">--</span>}
                  </td>

                  {/* Email */}
                  <td className="py-3 px-4">
                    {partner.email ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onQuickEmail(partner.email!); }}
                        className="text-[#6fa3b8] hover:text-[var(--color-accent)] hover:underline font-medium block truncate max-w-[140px]"
                        title="Send outreach email"
                      >
                        {partner.email}
                      </button>
                    ) : (
                      <span className="text-[var(--color-text-faint)]/30 italic">No Email</span>
                    )}
                  </td>

                  {/* Status Tag */}
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${statusColorClass}`}>
                      {partner.status || "Active"}
                    </span>
                  </td>

                  {/* Health */}
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block ${healthColorClass}`}>
                      {healthScore}%
                    </span>
                  </td>

                  {/* Referrals */}
                  <td className="py-3 px-4 text-center">
                    {referralCount > 0 ? (
                      <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block">
                        {referralCount}
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-faint)]/40 font-mono text-[10px]">
                        0
                      </span>
                    )}
                  </td>

                  {/* Relationship Owner */}
                  <td className="py-3 px-4 text-emerald-400 font-semibold flex items-center gap-1.5 pt-4">
                    <User className="w-3.5 h-3.5 text-[var(--color-text-faint)]/30" />
                    <span>{partner.assignedOwner || "Unassigned"}</span>
                  </td>

                  {/* Action buttons inside the row */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => onEditPartner(partner, e)}
                        className="p-1 hover:bg-[var(--color-surface-2)] border border-transparent hover:border-[var(--color-border)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all"
                        title="Edit Partner Profile"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => onDeletePartner(partner.id, e)}
                        className="p-1 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded text-[var(--color-text-faint)]/30 hover:text-red-400 transition-all"
                        title="Delete Relationship Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="p-1 text-[var(--color-text-faint)]/40">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
