import { useState } from "react";
import { Client } from "../types";
import { pn, cPmt } from "../lib/formatters";

export interface UseCalculatorsProps {
  clients: Client[];
  onUpdateClient: (client: Client) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function useCalculators({ clients, onUpdateClient, showToast }: UseCalculatorsProps) {
  // Calculator linked client state
  const [calcClientId, setCalcClientId] = useState<string>("");
  const [stIncome, setStIncome] = useState<string>("");
  const [stCoIncome, setStCoIncome] = useState<string>("");
  const [stDebts, setStDebts] = useState<string>("");
  const [stCondo, setStCondo] = useState<string>("");
  const [stTax, setStTax] = useState<string>("4800");
  const [stHeat, setStHeat] = useState<string>("150");
  const [stRate, setStRate] = useState<string>("4.79");
  const [stAmortization, setStAmortization] = useState<string>("25");

  // Payment Calculator state
  const [pcAmount, setPcAmount] = useState<string>("500000");
  const [pcRate, setPcRate] = useState<string>("4.79");
  const [pcAm, setPcAm] = useState<string>("25");
  const [pcFreq, setPcFreq] = useState<string>("monthly");

  // GDS / TDS state
  const [gcIncome, setGcIncome] = useState<string>("120000");
  const [gcPmt, setGcPmt] = useState<string>("2000");
  const [gcTax, setGcTax] = useState<string>("400");
  const [gcHeat, setGcHeat] = useState<string>("150");
  const [gcCondo, setGcCondo] = useState<string>("0");
  const [gcDebts, setGcDebts] = useState<string>("500");

  // Hourly / SE state
  const [hrRate, setHrRate] = useState<string>("25.00");
  const [hrHrs, setHrHrs] = useState<string>("40");
  const [seY1, setSeY1] = useState<string>("80000");
  const [seY2, setSeY2] = useState<string>("95000");

  // Load client parameters into the GDS stress tools
  function handleLoadClientToCalc(id: string) {
    const c = clients.find(x => x.id === id);
    if (!c) return;

    // 1. Normalize purchase and mortgage values using purchasePrice ?? propval and mortgageAmount ?? mtgamt
    const propVal = pn(c.purchasePrice ?? c.propval);
    let mtgVal = pn(c.mortgageAmount ?? c.mtgamt);

    if (mtgVal <= 0 && propVal > 0) {
      mtgVal = Math.round(propVal * 0.8);
    }

    // 2. Load appData?.contractRate into stRate (and pcRate as default) if present
    const contractRate = c.appData?.contractRate || "4.79";
    setStRate(contractRate);
    setPcRate(contractRate);

    // Basic load
    setStIncome(String(c.income || ""));
    setStCoIncome(String(c.coIncome || ""));
    setStDebts(String(c.debts || ""));
    setStCondo(String(c.condo || ""));
    setStTax(c.tax ? String(pn(c.tax)) : "4800");
    setStHeat(c.heat ? String(c.heat) : "150");

    setGcIncome(String(pn(c.income) + pn(c.coIncome)));
    if (mtgVal > 0) {
      setGcPmt(String(Math.round(cPmt(mtgVal, parseFloat(contractRate) || 4.79, 25))));
      setPcAmount(String(mtgVal));
    }

    setGcTax(c.tax ? String(Math.round(pn(c.tax) / 12)) : "400");
    setGcHeat(c.heat ? String(c.heat) : "150");
    setGcCondo(c.condo ? String(c.condo) : "0");
    setGcDebts(c.debts ? String(c.debts) : "500");

    // 3. Prefills calculator values from client.calcSnapshot when useful and safe
    if (c.calcSnapshot) {
      const snap = c.calcSnapshot;
      if (snap.stressTest) {
        if (snap.stressTest.stressRate) {
          const contractFromStress = Math.max(1.0, snap.stressTest.stressRate - 2);
          setStRate(String(contractFromStress.toFixed(2)));
        }
      }
      if (snap.paymentCalc) {
        setPcAmount(String(snap.paymentCalc.loanAmount));
        setPcRate(String(snap.paymentCalc.rate));
        setPcAm(String(snap.paymentCalc.amortization));
        setPcFreq(snap.paymentCalc.frequency || "monthly");
        // If no appData contractRate, sync stRate with paymentCalc.rate too
        if (!c.appData?.contractRate && snap.paymentCalc.rate) {
          setStRate(String(snap.paymentCalc.rate));
        }
      }
      if (snap.gdsTds) {
        setGcIncome(String(snap.gdsTds.income));
        setGcPmt(String(snap.gdsTds.payment));
      }
      
      // 4. If a saved calc snapshot exists and showToast is available, show toast
      if (showToast) {
        const savedDateStr = new Date(snap.savedAt).toLocaleDateString();
        showToast(`Previous calc snapshot available — loaded from ${savedDateStr}`, "info");
      }
    }
  }

  function handleSaveCalcToClient(snapshot: Partial<Exclude<Client["calcSnapshot"], undefined>>) {
    if (!calcClientId) return;
    const client = clients.find(c => c.id === calcClientId);
    if (!client) return;

    const updatedClient: Client = {
      ...client,
      calcSnapshot: {
        ...client.calcSnapshot,
        ...snapshot,
        savedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };

    onUpdateClient(updatedClient);
    if (showToast) {
      showToast('Calculator snapshot saved to client file.', 'success');
    }
  }

  function handleClearCalcClient() {
    setCalcClientId("");
    setStIncome("");
    setStCoIncome("");
    setStDebts("");
    setStCondo("");
    setStTax("4800");
    setStHeat("150");
    setGcIncome("120000");
    setGcPmt("2000");
    setGcTax("400");
    setGcHeat("150");
    setGcCondo("0");
    setGcDebts("500");
    setPcAmount("500000");
  }

  return {
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
    handleLoadClientToCalc,
    handleClearCalcClient,
    handleSaveCalcToClient
  };
}
