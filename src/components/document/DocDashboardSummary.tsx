import React from "react";
import { 
  AlertCircle, Clock, Layers, History, CheckCircle2, AlertTriangle, HelpCircle, ShieldAlert 
} from "lucide-react";

interface DocMetrics {
  missing: number;
  requested: number;
  received: number;
  underReview: number;
  approved: number;
  expired: number;
  issues: number;
  waived: number;
  totalRequired: number;
}

interface DocDashboardSummaryProps {
  metrics: DocMetrics;
  isEmbedded?: boolean;
}

export const DocDashboardSummary: React.FC<DocDashboardSummaryProps> = ({ metrics, isEmbedded = false }) => {
  // Calculate file readiness percentage
  const totalRelevant = metrics.totalRequired - metrics.waived;
  const readinessPercentage = totalRelevant > 0 
    ? Math.round((metrics.approved / totalRelevant) * 100) 
    : 0;

  return (
    <div className={`grid gap-3 shrink-0 ${
      isEmbedded 
        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" 
        : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8"
    }`}>
      
      {/* 1. Readiness Score Gauge */}
      <div className="bg-gradient-to-br from-[#1b1b22] to-[#131317] border border-[#b5a642]/20 col-span-2 p-3.5 rounded-xl flex items-center justify-between shadow-md relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#b5a642]/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-[#b5a642]/10 transition-colors" />
        <div className="z-10 flex-grow">
          <div className="text-[10px] text-[#b5a642] uppercase tracking-widest font-black">Folder Readiness Score</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-white font-mono tracking-tight">{readinessPercentage}%</span>
            <span className="text-[10px] text-white/40 font-bold">Approved / Clear</span>
          </div>
          {/* Custom micro progress bar */}
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-2.5 overflow-hidden border border-white/5">
            <div 
              className="bg-gradient-to-r from-[#9a8c38] to-[#b5a642] h-full rounded-full transition-all duration-1000" 
              style={{ width: `${readinessPercentage}%` }} 
            />
          </div>
        </div>
        <div className="z-10 ml-3 bg-[#b5a642]/10 p-2.5 rounded-lg border border-[#b5a642]/15">
          <CheckCircle2 className="h-5 w-5 text-[#b5a642]" />
        </div>
      </div>

      {/* 2. Outstanding Documents */}
      <div className="bg-[#131317] border border-white/5 p-3 rounded-xl flex items-center justify-between hover:bg-white/[0.01] transition-colors shadow-sm">
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Missing Docs</div>
          <div className="text-2xl font-extrabold text-zinc-400 mt-1 font-mono">{metrics.missing}</div>
          <div className="text-[8px] text-white/20 uppercase font-black mt-1">Awaiting Upload</div>
        </div>
        <div className="bg-white/5 p-2 rounded-lg">
          <AlertCircle className="h-4.5 w-4.5 text-zinc-400" />
        </div>
      </div>

      {/* 3. Dispatched Requests */}
      <div className="bg-[#131317] border border-white/5 p-3 rounded-xl flex items-center justify-between hover:bg-white/[0.01] transition-colors shadow-sm">
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Requested</div>
          <div className="text-2xl font-extrabold text-[#6fa3b8] mt-1 font-mono">{metrics.requested}</div>
          <div className="text-[8px] text-[#6fa3b8]/40 uppercase font-black mt-1">Outbound SMS/Mail</div>
        </div>
        <div className="bg-[#6fa3b8]/10 p-2 rounded-lg border border-[#6fa3b8]/10">
          <Clock className="h-4.5 w-4.5 text-[#6fa3b8]" />
        </div>
      </div>

      {/* 4. Awaiting Review */}
      <div className="bg-[#131317] border border-white/5 p-3 rounded-xl flex items-center justify-between hover:bg-white/[0.01] transition-colors shadow-sm">
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Under Review</div>
          <div className="text-2xl font-extrabold text-orange-400 mt-1 font-mono">{metrics.underReview}</div>
          <div className="text-[8px] text-orange-400/40 uppercase font-black mt-1">Requires Audit</div>
        </div>
        <div className="bg-orange-500/10 p-2 rounded-lg border border-orange-500/10">
          <History className="h-4.5 w-4.5 text-orange-400" />
        </div>
      </div>

      {/* 5. Approved & Clear */}
      <div className="bg-[#131317] border border-white/5 p-3 rounded-xl flex items-center justify-between hover:bg-white/[0.01] transition-colors shadow-sm">
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Approved</div>
          <div className="text-2xl font-extrabold text-green-400 mt-1 font-mono">{metrics.approved}</div>
          <div className="text-[8px] text-green-400/40 uppercase font-black mt-1">UW Conditions Clear</div>
        </div>
        <div className="bg-green-500/10 p-2 rounded-lg border border-green-500/10">
          <CheckCircle2 className="h-4.5 w-4.5 text-green-400" />
        </div>
      </div>

      {/* 6. Expired / Stale Warnings */}
      <div className="bg-[#131317] border border-white/5 p-3 rounded-xl flex items-center justify-between hover:bg-white/[0.01] transition-colors shadow-sm">
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Expired/Stale</div>
          <div className="text-2xl font-extrabold text-red-400 mt-1 font-mono">{metrics.expired}</div>
          <div className="text-[8px] text-red-400/40 uppercase font-black mt-1">Needs Refresh</div>
        </div>
        <div className={`bg-red-500/10 p-2 rounded-lg border border-red-500/10 ${metrics.expired > 0 ? 'animate-pulse' : ''}`}>
          <AlertTriangle className="h-4.5 w-4.5 text-red-400" />
        </div>
      </div>

      {/* 7. Rejections & Flags */}
      <div className="bg-[#131317] border border-white/5 p-3 rounded-xl flex items-center justify-between hover:bg-white/[0.01] transition-colors shadow-sm">
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Issues Raised</div>
          <div className="text-2xl font-extrabold text-yellow-400 mt-1 font-mono">{metrics.issues}</div>
          <div className="text-[8px] text-yellow-400/40 uppercase font-black mt-1">Blurry / Rejected</div>
        </div>
        <div className="bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/10">
          <ShieldAlert className="h-4.5 w-4.5 text-yellow-400" />
        </div>
      </div>

    </div>
  );
};
