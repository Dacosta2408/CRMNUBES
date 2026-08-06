import React, { useState, useEffect } from "react";
import { 
  Download, RefreshCw, AlertTriangle, ArrowUpCircle, X, CheckCircle2, 
  Sparkles, FileText, Monitor, ShieldCheck, ChevronRight
} from "lucide-react";
import { 
  UpdateCheckResult, 
  UpdateManifest, 
  CURRENT_APP_VERSION, 
  checkForUpdates,
  getUpdateSettings,
  saveUpdateSettings
} from "../lib/updateChecker";
import { electronUpdater, UpdateStatus, ElectronProgressInfo } from "../lib/electronUpdater";

export const UpdateNotification: React.FC = () => {
  const [checkResult, setCheckResult] = useState<UpdateCheckResult | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isReadyToInstall, setIsReadyToInstall] = useState<boolean>(false);

  useEffect(() => {
    // Initial silent check on component mount
    checkForUpdates().then((res) => {
      setCheckResult(res);
      if (res.hasUpdate) {
        setIsOpen(true);
        const settings = getUpdateSettings();
        if (settings.autoDownload) {
          handleStartDownload(res.manifest);
        }
      }
    });

    // Subscribe to electron updater status
    const unsubStatus = electronUpdater.subscribeStatus((st) => {
      setStatus(st);
      if (st === "downloaded") {
        setIsDownloading(false);
        setIsReadyToInstall(true);
      }
    });

    const unsubProgress = electronUpdater.subscribeProgress((pInfo: ElectronProgressInfo) => {
      if (pInfo.percent > 0) {
        setProgress(pInfo.percent);
      }
    });

    return () => {
      unsubStatus();
      unsubProgress();
    };
  }, []);

  const handleStartDownload = async (manifestOverride?: UpdateManifest | null) => {
    const manifest = manifestOverride || checkResult?.manifest || null;
    setIsDownloading(true);
    setProgress(0);

    await electronUpdater.startDownload(manifest, (pct) => {
      setProgress(pct);
    });
  };

  const handleInstallAndRestart = () => {
    electronUpdater.installAndRelaunch();
  };

  const handleRemindLater = () => {
    setIsOpen(false);
  };

  if (!isOpen || !checkResult?.hasUpdate || !checkResult.manifest) {
    return null;
  }

  const manifest = checkResult.manifest;
  const isMandatory = checkResult.isMandatory;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[var(--color-text)]">
        
        {/* Header gradient banner */}
        <div className="p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white relative">
          {!isMandatory && (
            <button
              onClick={handleRemindLater}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white/80 transition cursor-pointer"
              title="Remind me later"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200">New Software Release</span>
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-extrabold text-[10px] rounded-full uppercase">
                  v{manifest.latestVersion}
                </span>
              </div>
              <h2 className="text-xl font-bold mt-0.5">A New Update is Available for GBK CRM</h2>
            </div>
          </div>
        </div>

        {/* Version Compare Bar */}
        <div className="px-6 py-3 bg-[var(--color-surface-2)]/80 border-b border-[var(--color-border)] flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <Monitor className="w-4 h-4 text-blue-400" /> Current: <span className="font-mono font-bold text-[var(--color-text)]">v{CURRENT_APP_VERSION}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <ArrowUpCircle className="w-4 h-4 text-emerald-400" /> New: <span className="font-mono font-bold text-emerald-400">v{manifest.latestVersion}</span>
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)]">
            Released: {manifest.releaseDate} ({manifest.fileSizeMB} MB)
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
          {isMandatory && (
            <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-amber-200 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>This update contains critical OSFI stress test algorithm and security updates. Update required to continue.</span>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] mb-1">
              Release Summary
            </h3>
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              {manifest.releaseNotes}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> What&apos;s New in v{manifest.latestVersion}
            </h3>
            <ul className="space-y-1.5">
              {manifest.changelog.map((item, idx) => (
                <li key={idx} className="text-xs flex items-start gap-2 text-[var(--color-text)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Download Progress Bar */}
          {(isDownloading || isReadyToInstall) && (
            <div className="p-4 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2">
                  {isReadyToInstall ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                  )}
                  {isReadyToInstall ? "Download Complete! Ready to Install." : "Downloading Windows .exe Package..."}
                </span>
                <span className="font-mono text-blue-400">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-200 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 bg-[var(--color-surface-2)]/50 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Digital Certificate Verified</span>
          </div>

          <div className="flex items-center gap-2">
            {!isMandatory && !isReadyToInstall && (
              <button
                type="button"
                onClick={handleRemindLater}
                className="px-4 py-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Later
              </button>
            )}

            {isReadyToInstall ? (
              <button
                type="button"
                onClick={handleInstallAndRestart}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-950/20 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Install &amp; Restart Now
              </button>
            ) : isDownloading ? (
              <button
                type="button"
                disabled
                className="px-5 py-2 bg-blue-600/50 text-white/80 font-bold rounded-xl text-xs flex items-center gap-2 cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4 animate-spin" /> Downloading ({progress}%)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStartDownload()}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-blue-950/20 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Update Now (.exe)
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
