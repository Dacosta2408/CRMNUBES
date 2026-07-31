import React from "react";
import { Calculator, Copy, Award, ShieldAlert, TrendingUp, Clock, Coins, Percent } from "lucide-react";
import { Client } from "../types";

interface CalculatorsProps {
  clients: Client[];
  calcClientId: string;
  setCalcClientId: (id: string) => void;
  stIncome: string;
  setStIncome: (val: string) => void;
  stCoIncome: string;
  setStCoIncome: (val: string) => void;
  stDebts: string;
  setStDebts: (val: string) => void;
  stCondo: string;
  setStCondo: (val: string) => void;
  stTax: string;
  setStTax: (val: string) => void;
  stHeat: string;
  setStHeat: (val: string) => void;
  stRate: string;
  setStRate: (val: string) => void;
  stAmortization: string;
  setStAmortization: (val: string) => void;
  pcAmount: string;
  setPcAmount: (val: string) => void;
  pcRate: string;
  setPcRate: (val: string) => void;
  pcAm: string;
  setPcAm: (val: string) => void;
  pcFreq: string;
  setPcFreq: (val: string) => void;
  gcIncome: string;
  setGcIncome: (val: string) => void;
  gcPmt: string;
  setGcPmt: (val: string) => void;
  gcTax: string;
  setGcTax: (val: string) => void;
  gcHeat: string;
  setGcHeat: (val: string) => void;
  gcCondo: string;
  setGcCondo: (val: string) => void;
  gcDebts: string;
  setGcDebts: (val: string) => void;
  hrRate: string;
  setHrRate: (val: string) => void;
  hrHrs: string;
  setHrHrs: (val: string) => void;
  seY1: string;
  setSeY1: (val: string) => void;
  seY2: string;
  setSeY2: (val: string) => void;
  onLoadClientToCalc: (id: string) => void;
  onClearCalcClient: () => void;
  cPmt: (P: number, rPct: number, yrs: number) => number;
  pToAmt: (pmt: number, rPct: number, yrs: number) => number;
  fd: (n: number) => string;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  selectedClient: Client | null;
  onSaveCalcToClient: (snapshot: Partial<Exclude<Client["calcSnapshot"], undefined>>) => void;
  onNavigateToClient: (id: string) => void;
}

export const Calculators: React.FC<CalculatorsProps> = ({
  clients,
  calcClientId,
  setCalcClientId,
  stIncome,
  setStIncome,
  stCoIncome,
  setStCoIncome,
  stDebts,
  setStDebts,
  stCondo,
  setStCondo,
  stTax,
  setStTax,
  stHeat,
  setStHeat,
  stRate,
  setStRate,
  stAmortization,
  setStAmortization,
  pcAmount,
  setPcAmount,
  pcRate,
  setPcRate,
  pcAm,
  setPcAm,
  pcFreq,
  setPcFreq,
  gcIncome,
  setGcIncome,
  gcPmt,
  setGcPmt,
  gcTax,
  setGcTax,
  gcHeat,
  setGcHeat,
  gcCondo,
  setGcCondo,
  gcDebts,
  setGcDebts,
  hrRate,
  setHrRate,
  hrHrs,
  setHrHrs,
  seY1,
  setSeY1,
  seY2,
  setSeY2,
  onLoadClientToCalc,
  onClearCalcClient,
  cPmt,
  pToAmt,
  fd,
  showToast,
  selectedClient,
  onSaveCalcToClient,
  onNavigateToClient
}) => {
  const pn = (s: string | number | undefined | null) => parseFloat(String(s || "").replace(/[$,\s]/g, "")) || 0;

  // Local state for CMHC Mortgage Insurance Premium Calculator
  const [cmhcPrice, setCmhcPrice] = React.useState<string>("500000");
  const [cmhcDown, setCmhcDown] = React.useState<string>("50000");

  // Load client parameters into CMHC state
  React.useEffect(() => {
    if (calcClientId) {
      const c = clients.find(x => x.id === calcClientId);
      if (c) {
        const val = pn(c.propval);
        const mtg = pn(c.mtgamt);
        if (val > 0) {
          setCmhcPrice(String(val));
          const calculatedDown = Math.max(0, val - mtg);
          setCmhcDown(String(calculatedDown));
        } else if (mtg > 0) {
          // Fallback if propval is missing but mortgage amount is set
          setCmhcPrice(String(Math.round(mtg * 1.15)));
          setCmhcDown(String(Math.round(mtg * 0.15)));
        }
      }
    }
  }, [calcClientId, clients]);

  // Real-time Calculators evaluation
  // 1. Stress test
  const calculateStressTest = () => {
    const inc = pn(stIncome) + pn(stCoIncome);
    const debts = pn(stDebts);
    const condo = pn(stCondo);
    const tax = pn(stTax) || 4800;
    const heat = pn(stHeat) || 150;
    const rate = parseFloat(stRate) || 4.79;
    const am = parseInt(stAmortization) || 25;

    const stressRate = Math.max(rate + 2, 5.25);
    if (inc <= 0) return null;

    const mi = inc / 12;
    // GDS: 39% of gross income limit
    const maxGdsPmt = (mi * 0.39) - (tax / 12) - condo - heat;
    // TDS: 44% of gross income limit
    const maxTdsPmt = (mi * 0.44) - (tax / 12) - condo - heat - debts;

    const maxQualifiedPmt = Math.min(maxGdsPmt, maxTdsPmt);
    const maxQualifiedMortgage = maxQualifiedPmt > 0 ? pToAmt(maxQualifiedPmt, stressRate, am) : 0;
    const isQualifying = maxQualifiedMortgage > 0;

    let maxPurchasePrice = 0;
    if (maxQualifiedMortgage > 0) {
      if (maxQualifiedMortgage <= 500000) {
        maxPurchasePrice = maxQualifiedMortgage / 0.95;
      } else if (maxQualifiedMortgage < 1000000) {
        maxPurchasePrice = (maxQualifiedMortgage - 25000) / 0.90;
      } else {
        maxPurchasePrice = maxQualifiedMortgage / 0.80;
      }
    }

    return {
      stressRate,
      maxQualifiedMortgage,
      isQualifying,
      estPaymentAtContract: cPmt(maxQualifiedMortgage, rate, am),
      inc,
      maxPurchasePrice
    };
  };

  const stressRes = calculateStressTest();

  // 2. Payment Calculator
  const calculatePayment = () => {
    const amt = pn(pcAmount);
    const rate = parseFloat(pcRate) || 4.79;
    const am = parseInt(pcAm) || 25;

    if (amt <= 0 || rate <= 0) return null;

    const mo = cPmt(amt, rate, am);
    const bw = (mo * 12) / 26;
    const wk = (mo * 12) / 52;
    const abw = mo / 2; // Accelerated biweekly is half monthly

    return {
      monthly: mo,
      biweekly: bw,
      weekly: wk,
      accelBiweekly: abw,
      totalInterest: (mo * am * 12) - amt
    };
  };

  const payRes = calculatePayment();

  // 3. GDS / TDS Analysis
  const calculateGdsTds = () => {
    const inc = pn(gcIncome);
    const pmt = pn(gcPmt);
    const tax = pn(gcTax);
    const heat = pn(gcHeat) || 150;
    const condo = pn(gcCondo);
    const debts = pn(gcDebts);

    if (inc <= 0 || pmt <= 0) return null;

    const mi = inc / 12;
    const gds = ((pmt + tax + heat + condo) / mi) * 100;
    const tds = ((pmt + tax + heat + condo + debts) / mi) * 100;

    const gcColor = gds <= 32 ? "bg-[var(--color-success)]" : gds <= 39 ? "bg-[var(--color-warning)]" : "bg-[var(--color-error)]";
    const tcColor = tds <= 40 ? "bg-[var(--color-success)]" : tds <= 44 ? "bg-[var(--color-warning)]" : "bg-[var(--color-error)]";
    
    return {
      gds,
      tds,
      gdsPct: Math.min((gds / 50) * 100, 100),
      tdsPct: Math.min((tds / 55) * 100, 100),
      mi,
      passed: gds <= 39 && tds <= 44,
      gcColor,
      tcColor
    };
  };

  const ratioRes = calculateGdsTds();

  // 4. SE & Hourly
  const hrResult = pn(hrRate) * pn(hrHrs) * 52;
  const seAvg = (pn(seY1) + pn(seY2)) / 2;

  // 5. CMHC Mortgage Insurance Premium evaluation
  const calculateCmhcPremium = () => {
    const price = pn(cmhcPrice);
    const down = pn(cmhcDown);
    
    if (price <= 0) {
      return {
        ltvRatio: 0,
        downPct: 0,
        premiumPct: 0,
        baseMortgage: 0,
        premiumAmount: 0,
        totalMortgage: 0,
        warning: null
      };
    }
    
    const baseMortgage = Math.max(0, price - down);
    const downPct = price > 0 ? (down / price) * 100 : 0;
    const ltvRatio = 100 - downPct;
    
    let premiumPct = 0;
    let warning: string | null = null;
    
    if (downPct < 5) {
      warning = "Warning: Standard CMHC guidelines require a minimum 5% down payment.";
    }
    
    if (price >= 1000000) {
      warning = "Note: CMHC mortgage insurance is generally not available for properties of $1,000,000 or more.";
    }
    
    // Determine tier
    if (ltvRatio <= 80) {
      premiumPct = 0.00;
    } else if (ltvRatio > 80 && ltvRatio <= 85) {
      premiumPct = 2.80;
    } else if (ltvRatio > 85 && ltvRatio <= 90) {
      premiumPct = 3.10;
    } else if (ltvRatio > 90 && ltvRatio <= 95) {
      premiumPct = 4.00;
    } else {
      // LTV > 95%
      premiumPct = 4.00;
    }
    
    const premiumAmount = baseMortgage * (premiumPct / 100);
    const totalMortgage = baseMortgage + premiumAmount;
    
    return {
      ltvRatio,
      downPct,
      premiumPct,
      baseMortgage,
      premiumAmount,
      totalMortgage,
      warning
    };
  };

  const cmhcRes = calculateCmhcPremium();

  const handleSave = () => {
    if (!calcClientId) return;
    const snapshot = {
      stressTest: stressRes ? {
        stressRate: stressRes.stressRate,
        maxQualifiedMortgage: stressRes.maxQualifiedMortgage,
        maxPurchasePrice: stressRes.maxPurchasePrice || 0,
        estPaymentAtContract: stressRes.estPaymentAtContract,
        income: stressRes.inc
      } : undefined,
      paymentCalc: payRes ? {
        loanAmount: pn(pcAmount),
        rate: parseFloat(pcRate) || 0,
        amortization: parseInt(pcAm) || 25,
        frequency: pcFreq,
        monthly: payRes.monthly,
        biweekly: payRes.biweekly,
        accelBiweekly: payRes.accelBiweekly,
        totalInterest: payRes.totalInterest
      } : undefined,
      gdsTds: ratioRes ? {
        gds: ratioRes.gds,
        tds: ratioRes.tds,
        passed: ratioRes.passed,
        income: pn(gcIncome),
        payment: pn(gcPmt)
      } : undefined,
      cmhc: cmhcRes ? {
        purchasePrice: pn(cmhcPrice),
        downPayment: pn(cmhcDown),
        downPct: cmhcRes.downPct,
        ltvRatio: cmhcRes.ltvRatio,
        premiumPct: cmhcRes.premiumPct,
        premiumAmount: cmhcRes.premiumAmount,
        totalMortgage: cmhcRes.totalMortgage,
        warning: cmhcRes.warning
      } : undefined,
      hourlyAnnual: hrResult,
      seAverage: seAvg
    };
    onSaveCalcToClient(snapshot);
  };

  const handleCopyRatios = () => {
    if (!ratioRes) return;
    const text = `GDS: ${ratioRes.gds.toFixed(1)}% | TDS: ${ratioRes.tds.toFixed(1)}% | Income: ${fd(pn(gcIncome))}/yr | Housing Pmt: ${fd(pn(gcPmt))}/mo`;
    navigator.clipboard.writeText(text).then(() => {
      showToast("GDS/TDS summary copied to clipboard!", "success", "📋");
    });
  };

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">
      {/* Client Quick Link Bar */}
      {!calcClientId ? (
        <div className="panel-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 transition-all duration-150">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
            <span>📂</span> Analyze existing client file:
          </label>
          <select 
            value={calcClientId}
            onChange={(e) => {
              setCalcClientId(e.target.value);
              if (e.target.value) onLoadClientToCalc(e.target.value);
            }}
            className="flex-1 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)]/30 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-150 cursor-pointer"
          >
            <option value="" className="bg-[var(--color-bg)] text-[var(--color-text)]">— Manual Calculator Mode —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id} className="bg-[var(--color-bg)] text-[var(--color-text)]">{c.first} {c.last} {c.type ? `(${c.type})` : ""}</option>
            ))}
          </select>
          <button 
            disabled
            className="px-4 py-1.5 bg-[var(--color-surface-2)]/50 text-[var(--color-text-faint)] text-xs font-bold rounded-lg border border-[var(--color-border)] opacity-50 cursor-not-allowed"
          >
            Save to Client File
          </button>
        </div>
      ) : (
        <div className="panel-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 transition-all duration-150">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 bg-green-500/15 text-green-400 border border-green-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
              CLIENT MODE
            </span>
            <span className="text-xs font-extrabold text-[var(--color-text)]">
              {selectedClient ? `${selectedClient.first} ${selectedClient.last}` : "Loading Client..."}
            </span>
            {selectedClient && (
              <button
                onClick={() => onNavigateToClient(selectedClient.id)}
                title="Open client profile"
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-3)] rounded border border-[var(--color-border)] transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
              >
                <span>🔗 Profile</span>
              </button>
            )}
            {selectedClient?.calcSnapshot?.savedAt && (
              <span className="text-[10px] text-[var(--color-text-muted)] font-medium italic bg-[var(--color-surface-2)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                Last saved: {new Date(selectedClient.calcSnapshot.savedAt).toLocaleDateString()} {new Date(selectedClient.calcSnapshot.savedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto justify-end">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)]">Switch:</span>
              <select 
                value={calcClientId}
                onChange={(e) => {
                  setCalcClientId(e.target.value);
                  if (e.target.value) onLoadClientToCalc(e.target.value);
                }}
                className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)]/30 border border-[var(--color-border)] rounded-lg px-2.5 py-1 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-150 cursor-pointer min-w-[120px]"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id} className="bg-[var(--color-bg)] text-[var(--color-text)]">{c.first} {c.last}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleSave}
              className="px-3.5 py-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1"
            >
              <span>💾</span> Save to Client File
            </button>

            <button 
              onClick={() => {
                onClearCalcClient();
                setCmhcPrice("500000");
                setCmhcDown("50000");
              }}
              className="px-2.5 py-1 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs font-bold rounded-lg transition-all border border-[var(--color-border)] cursor-pointer"
            >
              Exit Client Mode
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Stress Test */}
        <div className="panel-card overflow-hidden transition-all duration-300">
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/30 mr-1 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[var(--color-primary)]" />
              <span>OSFI stress qualifying test</span>
            </h3>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono font-bold bg-[var(--color-surface-3)] px-2 py-0.5 rounded border border-[var(--color-border)]">Stress Rate: +2% contract or 5.25%</span>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Applicant Income/yr</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-[var(--color-text-faint)] font-bold">$</span>
                  <input 
                    type="text" 
                    value={stIncome}
                    onChange={(e) => setStIncome(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="100,000"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-6 pr-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Co-Applicant Income/yr</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-[var(--color-text-faint)] font-bold">$</span>
                  <input 
                    type="text" 
                    value={stCoIncome}
                    onChange={(e) => setStCoIncome(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="0"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-6 pr-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Monthly Debts</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-[var(--color-text-faint)] font-bold">$</span>
                  <input 
                    type="text" 
                    value={stDebts}
                    onChange={(e) => setStDebts(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="0"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-5.5 pr-2.5 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Condo Fees / mo</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-[var(--color-text-faint)] font-bold">$</span>
                  <input 
                    type="text" 
                    value={stCondo}
                    onChange={(e) => setStCondo(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="0"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-5.5 pr-2.5 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Prop Taxes/yr</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-[var(--color-text-faint)] font-bold">$</span>
                  <input 
                    type="text" 
                    value={stTax}
                    onChange={(e) => setStTax(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="4,800"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-5.5 pr-2.5 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Heat cost/mo (default $150)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-[var(--color-text-faint)] font-bold">$</span>
                  <input 
                    type="text" 
                    value={stHeat}
                    onChange={(e) => setStHeat(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="150"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-5.5 pr-2.5 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Contract %</label>
                <div className="relative">
                  <span className="absolute right-3 top-2 text-xs text-[var(--color-text-faint)] font-bold">%</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={stRate}
                    onChange={(e) => setStRate(e.target.value)}
                    placeholder="4.79"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-3 pr-6 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Amortization</label>
                <select 
                  value={stAmortization}
                  onChange={(e) => setStAmortization(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)]/30 border border-[var(--color-border)] rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-bold transition-all duration-150 cursor-pointer"
                >
                  <option value="25" className="bg-[var(--color-bg)]">25 years</option>
                  <option value="30" className="bg-[var(--color-bg)]">30 years</option>
                  <option value="15" className="bg-[var(--color-bg)]">15 yr</option>
                </select>
              </div>
            </div>

            {/* Results card */}
            {stressRes ? (
              <div className="p-4 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] mt-2 shadow-sm transition-all duration-200">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded border ${stressRes.isQualifying ? "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20" : "bg-[var(--color-error)]/10 text-[var(--color-error)] border-[var(--color-error)]/20"}`}>
                  {stressRes.isQualifying ? "✓ Qualifies (Stress Test Clear)" : "✗ Over-leveraged Limits"}
                </span>
                <div className="text-3xl font-extrabold font-sans mt-2.5 text-[var(--color-accent)] tracking-tight">{fd(stressRes.maxQualifiedMortgage)}</div>
                <div className="text-[10px] uppercase text-[var(--color-text-muted)] tracking-wider mt-0.5 font-bold">Maximum estimated qualifying mortgage</div>
                
                <div className="border-t border-[var(--color-border)] pt-3 mt-3.5 flex flex-col gap-1.5 text-xs text-[var(--color-text-muted)] font-semibold">
                  <div className="flex justify-between"><span>Qualifying Stress Rate</span><span className="font-bold text-[var(--color-text)]">{stressRes.stressRate.toFixed(2)}%</span></div>
                  <div className="flex justify-between"><span>Combined Gross income</span><span className="font-bold text-[var(--color-text)]">{fd(stressRes.inc)}/yr</span></div>
                  <div className="flex justify-between"><span>Est. Contract Payment</span><span className="font-extrabold text-[var(--color-success)]">{fd(stressRes.estPaymentAtContract)}/month</span></div>
                  <div className="flex justify-between border-t border-[var(--color-border)]/60 pt-2 mt-1">
                    <span className="text-[var(--color-accent)] font-bold">Est. Max Purchase Price</span>
                    <span className="font-extrabold text-[var(--color-text)] text-sm">{fd(stressRes.maxPurchasePrice)}</span>
                  </div>
                  <div className="text-[10px] text-[var(--color-text-faint)] leading-snug font-medium mt-0.5">
                    * Assumes minimum down payment (5% on first $500k, 10% on remainder up to $999k, 20% if $1M+).
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)]/25 flex flex-col items-center text-center justify-center min-h-[140px]">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface-3)]/60 flex items-center justify-center border border-[var(--color-border)]/40 text-[var(--color-text-faint)] mb-2.5">
                  <ShieldAlert className="w-4 h-4 text-[var(--color-accent)] opacity-85" />
                </div>
                <h5 className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider">Awaiting Input Data</h5>
                <p className="text-[9px] text-[var(--color-text-faint)] leading-relaxed mt-1 max-w-[190px] font-medium">
                  Enter borrower gross annual income above to run automated underwriting stress rate calculations.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* GDS / TDS Progress Bars */}
        <div className="panel-card overflow-hidden transition-all duration-300">
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/30 mr-1 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
              <span>GDS / TDS Live Ratios</span>
            </h3>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono font-bold bg-[var(--color-surface-3)] px-2 py-0.5 rounded border border-[var(--color-border)]">GDS &lt; 39% | TDS &lt; 44%</span>
          </div>

          <div className="p-5 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Gross Annual Income</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-[var(--color-text-faint)] font-bold">$</span>
                  <input 
                    type="text" 
                    value={gcIncome}
                    onChange={(e) => setGcIncome(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="120,000"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-6 pr-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Monthly housing Pmt</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-[var(--color-text-faint)] font-bold">$</span>
                  <input 
                    type="text" 
                    value={gcPmt}
                    onChange={(e) => setGcPmt(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="2,000"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-6 pr-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[8px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Prop Tax/mo</label>
                <input 
                  type="text" 
                  value={gcTax}
                  onChange={(e) => setGcTax(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="$400"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-[8px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Heating/mo</label>
                <input 
                  type="text" 
                  value={gcHeat}
                  onChange={(e) => setGcHeat(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="$150"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-[8px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Condo/mo</label>
                <input 
                  type="text" 
                  value={gcCondo}
                  onChange={(e) => setGcCondo(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="$0"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-[8px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Debts/mo</label>
                <input 
                  type="text" 
                  value={gcDebts}
                  onChange={(e) => setGcDebts(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="$500"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                />
              </div>
            </div>

            {ratioRes ? (
              <div className="mt-2 flex flex-col gap-3">
                {/* GDS bar */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[var(--color-text-muted)]">Gross Debt Service (GDS)</span>
                    <span className={`font-mono font-bold ${ratioRes.gds > 39 ? "text-[var(--color-error)]" : "text-[var(--color-success)]"}`}>{ratioRes.gds.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-[var(--color-surface-2)] rounded-full overflow-hidden relative border border-[var(--color-border)]">
                    <div className={`h-full ${ratioRes.gcColor} rounded-full transition-all duration-300`} style={{ width: `${ratioRes.gdsPct}%` }}></div>
                    <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-text-faint)]/50 z-10" style={{ left: "78%" }} title="39% A-Lender Limit"></div>
                  </div>
                </div>

                {/* TDS bar */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[var(--color-text-muted)]">Total Debt Service (TDS)</span>
                    <span className={`font-mono font-bold ${ratioRes.tds > 44 ? "text-[var(--color-error)]" : "text-[var(--color-success)]"}`}>{ratioRes.tds.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-[var(--color-surface-2)] rounded-full overflow-hidden relative border border-[var(--color-border)]">
                    <div className={`h-full ${ratioRes.tcColor} rounded-full transition-all duration-300`} style={{ width: `${ratioRes.tdsPct}%` }}></div>
                    <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-text-faint)]/50 z-10" style={{ left: "80%" }} title="44% A-Lender Limit"></div>
                  </div>
                </div>

                {/* Status summary */}
                <div className="p-3.5 bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border)] text-xs flex items-center justify-between text-[var(--color-text-muted)] font-semibold shadow-sm">
                  <span>Qualifies for prime A-Lender files?</span>
                  <span className={`font-extrabold px-2.5 py-1 rounded text-[10px] uppercase tracking-wide border ${ratioRes.passed ? "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20" : "bg-[var(--color-error)]/10 text-[var(--color-error)] border-[var(--color-error)]/20"}`}>
                    {ratioRes.passed ? "✓ YES (Pass)" : "✗ NO (Alt-A Only)"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={handleCopyRatios}
                    className="flex-1 shrink-0 py-2 border border-[var(--color-border)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy calculated ratios
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)]/25 flex flex-col items-center text-center justify-center min-h-[140px]">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface-3)]/60 flex items-center justify-center border border-[var(--color-border)]/40 text-[var(--color-text-faint)] mb-2.5">
                  <Percent className="w-4 h-4 text-[var(--color-accent)] opacity-85" />
                </div>
                <h5 className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider">Awaiting Input Data</h5>
                <p className="text-[9px] text-[var(--color-text-faint)] leading-relaxed mt-1 max-w-[190px] font-medium">
                  Enter borrower gross income and mortgage debt figures to evaluate GDS and TDS ratios.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mortgage Payments frequency breakdown */}
        <div className="panel-card overflow-hidden transition-all duration-300">
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/30 mr-1 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Amortized Payment breakdown</span>
            </h3>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono font-bold bg-[var(--color-surface-3)] px-2 py-0.5 rounded border border-[var(--color-border)]">Standard schedule</span>
          </div>

          <div className="p-5 flex flex-col gap-3">
            <div>
              <label className="block text-[10px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Requested Loan amount</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-[var(--color-text-faint)] font-bold">$</span>
                <input 
                  type="text" 
                  value={pcAmount}
                  onChange={(e) => setPcAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="500,000"
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-6 pr-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-150"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[8px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Rate %</label>
                <div className="relative">
                  <span className="absolute right-2.5 top-2 text-[10px] text-[var(--color-text-faint)] font-bold">%</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={pcRate}
                    onChange={(e) => setPcRate(e.target.value)}
                    placeholder="4.79"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-2.5 pr-5 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-150"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[8px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Amortization</label>
                <select 
                  value={pcAm}
                  onChange={(e) => setPcAm(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)]/30 border border-[var(--color-border)] rounded-lg px-2 py-2 text-xs text-[var(--color-text)] font-bold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-150 cursor-pointer"
                >
                  <option value="25" className="bg-[var(--color-bg)]">25 yr</option>
                  <option value="30" className="bg-[var(--color-bg)]">30 yr</option>
                  <option value="20" className="bg-[var(--color-bg)]">20 yr</option>
                  <option value="15" className="bg-[var(--color-bg)]">15 yr</option>
                </select>
              </div>
              <div>
                <label className="block text-[8px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Frequency</label>
                <select 
                  value={pcFreq}
                  onChange={(e) => setPcFreq(e.target.value)}
                  className="w-full bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)]/30 border border-[var(--color-border)] rounded-lg px-2 py-2 text-xs text-[var(--color-text)] font-bold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-150 cursor-pointer"
                >
                  <option value="monthly" className="bg-[var(--color-bg)]">Monthly</option>
                  <option value="biweekly" className="bg-[var(--color-bg)]">Bi-Weekly</option>
                  <option value="accelBiweekly" className="bg-[var(--color-bg)]">Accel Bi-Wk</option>
                </select>
              </div>
            </div>

            {payRes ? (
              <div className="p-4 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] shadow-sm">
                <div className="text-2xl font-extrabold text-[var(--color-accent)] tracking-tight">{fd(payRes[pcFreq as "monthly" | "biweekly" | "weekly" | "accelBiweekly"])}</div>
                <div className="text-[9px] uppercase text-[var(--color-text-muted)] tracking-wider mt-0.5 font-bold">Calculated {pcFreq} Mortgage Payment</div>
                
                <div className="border-t border-[var(--color-border)] pt-3 mt-3 flex flex-col gap-1.5 text-xs text-[var(--color-text-muted)] font-semibold">
                  <div className="flex justify-between"><span>Standard Monthly Payment</span><span className="font-bold text-[var(--color-text)]">{fd(payRes.monthly)}</span></div>
                  <div className="flex justify-between"><span>Rapid Accelerated Bi-Weekly</span><span className="font-bold text-[var(--color-text)]">{fd(payRes.accelBiweekly)}</span></div>
                  <div className="flex justify-between"><span>Paid Interest Over Amortization</span><span className="font-extrabold text-[var(--color-warning)]">{fd(payRes.totalInterest)}</span></div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)]/25 flex flex-col items-center text-center justify-center min-h-[140px]">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface-3)]/60 flex items-center justify-center border border-[var(--color-border)]/40 text-[var(--color-text-faint)] mb-2.5">
                  <Calculator className="w-4 h-4 text-[var(--color-accent)] opacity-85" />
                </div>
                <h5 className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-wider">Awaiting Input Data</h5>
                <p className="text-[9px] text-[var(--color-text-faint)] leading-relaxed mt-1 max-w-[190px] font-medium">
                  Enter desired mortgage loan amount, contract rate, and term to build payment schedules.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Self employed SE & Hourly income calculators */}
        <div className="panel-card overflow-hidden transition-all duration-300">
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/30 mr-1 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
              <Coins className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Secondary Income Annualizer</span>
            </h3>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono font-bold bg-[var(--color-surface-3)] px-2 py-0.5 rounded border border-[var(--color-border)]">Wage & SE utilities</span>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <div className="border-b border-[var(--color-border)] pb-4">
              <h4 className="text-[10px] font-extrabold text-[var(--color-accent)] uppercase tracking-wider mb-2 flex items-center gap-1">
                <span>⏱</span> Hourly To Annual Salary
              </h4>
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div>
                  <label className="block text-[8px] text-[var(--color-text-faint)] uppercase font-bold mb-1">Hourly rate $</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-[10px] text-[var(--color-text-faint)] font-bold">$</span>
                    <input 
                      type="number" 
                      value={hrRate} 
                      onChange={(e) => setHrRate(e.target.value)} 
                      placeholder="35"
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2.5 pl-5.5 py-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-150" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[8px] text-[var(--color-text-faint)] uppercase font-bold mb-1">Hours / week</label>
                  <input 
                    type="number" 
                    value={hrHrs} 
                    onChange={(e) => setHrHrs(e.target.value)} 
                    placeholder="40"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-150" 
                  />
                </div>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] font-semibold bg-[var(--color-surface-2)] p-2.5 rounded-lg border border-[var(--color-border)] flex items-center justify-between shadow-sm">
                <span>Extrapolated Salary:</span>
                <strong className="text-[var(--color-success)] font-mono font-extrabold text-sm">{fd(hrResult)}/yr</strong>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-extrabold text-[var(--color-accent)] uppercase tracking-wider mb-2 flex items-center gap-1">
                <span>💼</span> Self Employed 2yr Net Average
              </h4>
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                <div>
                  <label className="block text-[8px] text-[var(--color-text-faint)] uppercase font-bold mb-1">Year 1 Net Income</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-[10px] text-[var(--color-text-faint)] font-bold">$</span>
                    <input 
                      type="number" 
                      value={seY1} 
                      onChange={(e) => setSeY1(e.target.value)} 
                      placeholder="80000"
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2.5 pl-5.5 py-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-150" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[8px] text-[var(--color-text-faint)] uppercase font-bold mb-1">Year 2 Net Income</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-[10px] text-[var(--color-text-faint)] font-bold">$</span>
                    <input 
                      type="number" 
                      value={seY2} 
                      onChange={(e) => setSeY2(e.target.value)} 
                      placeholder="95000"
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-2.5 pl-5.5 py-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all duration-150" 
                    />
                  </div>
                </div>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] font-semibold bg-[var(--color-surface-2)] p-2.5 rounded-lg border border-[var(--color-border)] flex items-center justify-between shadow-sm">
                <span>Underwriting Qualifying Average:</span>
                <strong className="text-[var(--color-accent)] font-mono font-extrabold text-sm">{fd(seAvg)}/yr</strong>
              </div>
            </div>
          </div>
        </div>

        {/* CMHC Mortgage Insurance Premium Calculator */}
        <div className="panel-card overflow-hidden transition-all duration-300">
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/30 mr-1 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
              <Percent className="w-4 h-4 text-[var(--color-primary)]" />
              <span>CMHC Insurance Premium</span>
            </h3>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono font-bold bg-[var(--color-surface-3)] px-2 py-0.5 rounded border border-[var(--color-border)]">CMHC Tiers</span>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-[var(--color-text-faint)] font-bold">$</span>
                  <input 
                    type="text" 
                    value={cmhcPrice}
                    onChange={(e) => setCmhcPrice(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="500,000"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-6 pr-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[var(--color-text-faint)] uppercase tracking-wider font-semibold mb-1">Down Payment</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-[var(--color-text-faint)] font-bold">$</span>
                  <input 
                    type="text" 
                    value={cmhcDown}
                    onChange={(e) => setCmhcDown(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="50,000"
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg pl-6 pr-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 font-semibold transition-all duration-150"
                  />
                </div>
              </div>
            </div>

            {/* Results display */}
            <div className="p-4 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)] shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-2">
                <div>
                  <div className="text-2xl font-extrabold text-[var(--color-accent)] tracking-tight">{fd(cmhcRes.premiumAmount)}</div>
                  <div className="text-[9px] uppercase text-[var(--color-text-muted)] tracking-wider mt-0.5 font-bold">Insurance Premium Added</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-[var(--color-text)]">{cmhcRes.premiumPct.toFixed(2)}%</div>
                  <div className="text-[9px] uppercase text-[var(--color-text-muted)] tracking-wider mt-0.5 font-bold">Premium Rate</div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] font-semibold">
                <span>LTV Ratio</span>
                <span className="font-bold text-[var(--color-text)]">{cmhcRes.ltvRatio.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] font-semibold">
                <span>Down Payment %</span>
                <span className="font-bold text-[var(--color-text)]">{cmhcRes.downPct.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] font-semibold">
                <span>Base Mortgage (Loan) Amount</span>
                <span className="font-bold text-[var(--color-text)]">{fd(cmhcRes.baseMortgage)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] font-semibold border-t border-[var(--color-border)] pt-2 mt-2">
                <span className="text-[var(--color-text)] font-bold">Total Mortgage with CMHC</span>
                <span className="font-extrabold text-[var(--color-success)] text-sm font-mono">{fd(cmhcRes.totalMortgage)}</span>
              </div>
            </div>

            {cmhcRes.warning && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[10px] text-amber-300 font-medium flex gap-2 items-start leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{cmhcRes.warning}</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
