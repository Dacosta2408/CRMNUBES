import React, { useState, useEffect } from "react";
import { 
  User as UserIcon, MapPin, Briefcase, Building, Percent, ShieldAlert, 
  Sparkles, Save, Landmark, RefreshCw, Info, AlertCircle, Phone, Mail, Calendar, CreditCard
} from "lucide-react";
import { Client, User as CRMUser } from "../types";

interface ApplicationDetailsFormProps {
  client: Client;
  currentUser: CRMUser;
  onUpdateClient: (updated: Client) => void;
  agentNames: string[];
  lenders: Array<{ name: string }>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
}

export const ApplicationDetailsForm: React.FC<ApplicationDetailsFormProps> = ({
  client,
  currentUser,
  onUpdateClient,
  agentNames,
  lenders,
  showToast
}) => {
  const isAdmin = currentUser.role === "Developer/Admin" || currentUser.role === "Admin" || currentUser.isOwner === true;

  // --- SUB-TABS STATE ---
  type SubTabType = "personal" | "address" | "employment" | "property" | "mortgage";
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>("personal");

  // --- LOCAL FORM FIELDS STATE ---
  const [fields, setFields] = useState<Record<string, string>>({});

  // Sync with client prop updates
  useEffect(() => {
    const rawFields: Record<string, string> = {
      app_first: client.first || "",
      app_last: client.last || "",
      app_email: client.email || "",
      app_cell: client.cell || "",
      app_marital: client.marital || client.appData?.app_marital || "Single",
      app_sin: client.sin || client.appData?.app_sin || "",
      beacon: String(client.beacon || client.appData?.beacon || "700"),
      app_dependents: String(client.dep || client.appData?.app_dependents || "0"),
      app_home: client.appData?.app_home || "",
      app_work: client.appData?.app_work || "",
      app_contact: client.appData?.app_contact || "Email",

      // Co-Applicant Personal
      co_first: client.appData?.co_first || (client.co ? client.co.split(" ")[0] : ""),
      co_last: client.appData?.co_last || (client.co ? client.co.split(" ").slice(1).join(" ") : ""),
      co_email: client.coEmail || client.appData?.co_email || "",
      co_cell: client.appData?.co_cell || "",
      co_marital: client.appData?.co_marital || "Single",
      co_sin: client.appData?.co_sin || "",
      co_beacon: client.appData?.co_beacon || "700",
      co_home: client.appData?.co_home || "",
      co_work: client.appData?.co_work || "",
      co_contact: client.appData?.co_contact || "Email",

      // Address (Primary)
      app_housing: client.appData?.app_housing || "Own",
      app_addr: client.addr || client.appData?.app_addr || "",
      app_unit: client.appData?.app_unit || "",
      app_city: client.appData?.app_city || "",
      app_prov: client.appData?.app_prov || "ON",
      app_post: client.appData?.app_post || "",
      app_res_yrs: client.appData?.app_res_yrs || "5",

      // Previous Address (Primary)
      app_prev_addr: client.appData?.app_prev_addr || "",
      app_prev_unit: client.appData?.app_prev_unit || "",
      app_prev_city: client.appData?.app_prev_city || "",
      app_prev_prov: client.appData?.app_prev_prov || "ON",
      app_prev_post: client.appData?.app_prev_post || "",

      // Co-Applicant Address
      co_address_same: client.appData?.co_address_same || "1",
      co_housing: client.appData?.co_housing || "Own",
      co_addr: client.appData?.co_addr || "",
      co_unit: client.appData?.co_unit || "",
      co_city: client.appData?.co_city || "",
      co_prov: client.appData?.co_prov || "ON",
      co_post: client.appData?.co_post || "",

      // Employment (Primary)
      app_inc_employed: client.appData?.app_inc_employed || "1",
      app_inc_self: client.appData?.app_inc_self || "0",
      app_emp1_name: client.appData?.app_emp1_name || "",
      app_emp1_title: client.appData?.app_emp1_title || "",
      app_emp1_yrs: client.appData?.app_emp1_yrs || "",
      app_emp1_mos: client.appData?.app_emp1_mos || "",
      app_emp1_tel: client.appData?.app_emp1_tel || "",
      app_emp1_city: client.appData?.app_emp1_city || "",
      app_emp1_income: String(client.income || client.appData?.app_emp1_income || ""),
      app_emp1_status: client.emptype || client.appData?.app_emp1_status || "Full Time Salaried",

      // Self-Employment (Primary)
      app_self_name: client.appData?.app_self_name || "",
      app_self_yrs: client.appData?.app_self_yrs || "",
      app_self_income: client.appData?.app_self_income || "",

      // Other Income (Primary)
      app_other0_specify: client.appData?.app_other0_specify || "",
      app_other0_amount: client.appData?.app_other0_amount || "",
      app_other0_freq: client.appData?.app_other0_freq || "Monthly",

      // Employment (Co-Applicant)
      co_inc_employed: client.appData?.co_inc_employed || "0",
      co_inc_self: client.appData?.co_inc_self || "0",
      co_emp1_name: client.appData?.co_emp1_name || "",
      co_emp1_title: client.appData?.co_emp1_title || "",
      co_emp1_yrs: client.appData?.co_emp1_yrs || "",
      co_emp1_mos: client.appData?.co_emp1_mos || "",
      co_emp1_income: String(client.coIncome || client.appData?.co_emp1_income || ""),
      co_emp1_status: client.appData?.co_emp1_status || "Full Time Salaried",

      // Self-Employment (Co-Applicant)
      co_self_name: client.appData?.co_self_name || "",
      co_self_income: client.appData?.co_self_income || "",

      // Other Income (Co-Applicant)
      co_other0_specify: client.appData?.co_other0_specify || "",
      co_other0_amount: client.appData?.co_other0_amount || "",
      co_other0_freq: client.appData?.co_other0_freq || "Monthly",

      // Property
      prop_type: client.proptype || client.appData?.prop_type || "Detached",
      prop_style: client.appData?.prop_style || "Two Storey",
      prop_tenure: client.appData?.prop_tenure || "Freehold",
      prop_age: client.appData?.prop_age || "10",
      prop_area: client.appData?.prop_area || "2000",
      prop_lot: client.appData?.prop_lot || "50x120",
      prop_garage_type: client.appData?.prop_garage_type || "Double Attached",
      prop_heat: String(client.heat || client.appData?.prop_heat || "150"),
      prop_tax: String(client.tax || client.appData?.prop_tax || "3600"),
      prop_condo_fees: String(client.condo || client.appData?.prop_condo_fees || "0"),
      prop_value: String(client.propval || client.appData?.prop_value || ""),

      // Mortgage
      mtg1_balance: String(client.mtgamt || client.appData?.mtg1_balance || ""),
      interestRate: client.appData?.interestRate || client.rate || "4.79%",
      amortization: client.appData?.amortization || "25",
      tenure: client.appData?.tenure || "owner-occupied",
      maturityDate: client.appData?.maturityDate || "",
      referredBy: client.appData?.referredBy || client.referredBy || "",
      lender: client.lender || "",
      agent: client.agent || ""
    };

    // Extract Primary DOB
    if (client.dob && client.dob.includes("-")) {
      const parts = client.dob.split("-");
      if (parts.length === 3) {
        rawFields.app_dob_y = parts[0];
        rawFields.app_dob_m = parts[1];
        rawFields.app_dob_d = parts[2];
      }
    } else {
      rawFields.app_dob_m = client.appData?.app_dob_m || "";
      rawFields.app_dob_d = client.appData?.app_dob_d || "";
      rawFields.app_dob_y = client.appData?.app_dob_y || "";
    }

    // Extract Co DOB
    rawFields.co_dob_m = client.appData?.co_dob_m || "";
    rawFields.co_dob_d = client.appData?.co_dob_d || "";
    rawFields.co_dob_y = client.appData?.co_dob_y || "";

    setFields(rawFields);
  }, [client]);

  const handleFieldChange = (key: string, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const handleToggleField = (key: string) => {
    setFields(prev => ({ ...prev, [key]: prev[key] === "1" ? "0" : "1" }));
  };

  // --- DYNAMIC PARAMETER PARSING ---
  const pn = (s: any) => {
    if (!s) return 0;
    return parseFloat(String(s).replace(/[$,\s]/g, "")) || 0;
  };

  const fd = (n: number) => {
    return "$" + Math.round(n).toLocaleString("en-CA");
  };

  // Underwriting values
  const propVal = pn(fields.prop_value);
  const mtgAmt = pn(fields.mtg1_balance);
  const ltv = propVal > 0 ? (mtgAmt / propVal) * 100 : 0;

  // GDS calculations
  const primaryEmployIncome = fields.app_inc_employed === "1" ? pn(fields.app_emp1_income) : 0;
  const primarySelfIncome = fields.app_inc_self === "1" ? pn(fields.app_self_income) : 0;
  const primaryOtherIncome = fields.app_other0_amount ? pn(fields.app_other0_amount) * 12 : 0; // assumption: monthly
  const primaryIncome = primaryEmployIncome + primarySelfIncome + primaryOtherIncome;

  const coEmployIncome = fields.co_inc_employed === "1" ? pn(fields.co_emp1_income) : 0;
  const coSelfIncome = fields.co_inc_self === "1" ? pn(fields.co_self_income) : 0;
  const coOtherIncome = fields.co_other0_amount ? pn(fields.co_other0_amount) * 12 : 0;
  const coIncome = coEmployIncome + coSelfIncome + coOtherIncome;

  const totalIncome = primaryIncome + coIncome;
  const monthlyTax = (pn(fields.prop_tax) || 0) / 12;
  const monthlyCondo = pn(fields.prop_condo_fees) || 0;
  const monthlyHeat = pn(fields.prop_heat) || 150;

  const rateValue = pn(fields.interestRate) || 4.79;
  const amortYears = pn(fields.amortization) || 25;
  const r = (rateValue / 100) / 12;
  const n = amortYears * 12;
  const monthlyMtg = mtgAmt && r ? (mtgAmt * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : 0;
  const gds = totalIncome > 0 ? (((monthlyMtg + monthlyTax + monthlyCondo + monthlyHeat) / (totalIncome / 12)) * 100) : 0;

  // --- SAVE OPERATION ---
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const app_first = fields.app_first?.trim();
    const app_last = fields.app_last?.trim();
    const app_email = fields.app_email?.trim();

    if (!app_first || !app_last) {
      showToast("First and Last name are required.", "error");
      setActiveSubTab("personal");
      return;
    }

    if (!app_email || !app_email.includes("@")) {
      showToast("A valid email address is required.", "error");
      setActiveSubTab("personal");
      return;
    }

    // DOB reconstruction Primary
    let dobString = "";
    if (fields.app_dob_y && fields.app_dob_m && fields.app_dob_d) {
      dobString = `${fields.app_dob_y}-${fields.app_dob_m.padStart(2, '0')}-${fields.app_dob_d.padStart(2, '0')}`;
    }

    // Assemble updated client object
    const updatedClient: Client = {
      ...client,
      first: app_first,
      last: app_last,
      email: app_email,
      cell: fields.app_cell || "",
      dob: dobString || undefined,
      marital: fields.app_marital || "",
      sin: fields.app_sin || "",
      dep: pn(fields.app_dependents),
      co: fields.co_first && fields.co_last ? `${fields.co_first} ${fields.co_last}` : undefined,
      coEmail: fields.co_email || "",
      income: primaryIncome || undefined,
      coIncome: coIncome || undefined,
      emptype: fields.app_inc_self === "1" ? "self-employed" : fields.app_emp1_status || "Full Time Salaried",
      beacon: pn(fields.beacon) || 700,
      propval: propVal || undefined,
      mtgamt: mtgAmt || undefined,
      tax: pn(fields.prop_tax) || undefined,
      condo: pn(fields.prop_condo_fees) || undefined,
      heat: pn(fields.prop_heat) || undefined,
      addr: fields.app_addr || "",
      proptype: fields.prop_type || "",
      tenure: fields.tenure || "owner-occupied",
      lender: fields.lender || "",
      agent: fields.agent || "",
      updatedAt: new Date().toISOString(),
      appData: {
        ...(client.appData || {}),
        ...fields
      }
    };

    onUpdateClient(updatedClient);
    showToast("Application file sections updated successfully!", "success", "✓");
  };

  const isResunder3 = pn(fields.app_res_yrs) < 3;

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-5 text-xs h-full" id="application-details-form-root">
      
      {/* 📊 UNDERWRITING HUD CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-[var(--color-surface-2)]/40 border border-[var(--color-border)] rounded-xl">
        <div className="space-y-0.5">
          <div className="text-[10px] text-[var(--color-text-muted)] uppercase font-black">Loan To Value (LTV)</div>
          <div className={`text-xl font-bold ${ltv > 80 ? "text-red-400 font-extrabold" : "text-[var(--color-accent)]"}`}>
            {ltv > 0 ? `${ltv.toFixed(1)}%` : "0.0%"}
          </div>
          <div className="text-[9px] text-[var(--color-text-muted)] opacity-80 font-mono">
            Value: {fd(propVal)} | Loan: {fd(mtgAmt)}
          </div>
        </div>

        <div className="space-y-0.5 border-l border-[var(--color-border)] pl-4">
          <div className="text-[10px] text-[var(--color-text-muted)] uppercase font-black">Estimated Monthly Pmt</div>
          <div className="text-xl font-bold text-[var(--color-text)]">
            {monthlyMtg > 0 ? fd(monthlyMtg) : "$0"}
          </div>
          <div className="text-[9px] text-[var(--color-text-muted)] opacity-80 font-mono">
            At {rateValue}% • {amortYears}yr Amortization
          </div>
        </div>

        <div className="space-y-0.5 border-l border-[var(--color-border)] pl-4">
          <div className="text-[10px] text-[var(--color-text-muted)] uppercase font-black">Estimated GDS Ratio</div>
          <div className={`text-xl font-bold ${gds > 39 ? "text-red-400 font-extrabold" : gds > 0 ? "text-green-500 font-semibold" : "text-[var(--color-text-faint)]"}`}>
            {gds > 0 ? `${gds.toFixed(1)}%` : "0.0%"}
          </div>
          <div className="text-[9px] text-[var(--color-text-muted)] opacity-80 font-mono">
            Total Combined Income: {fd(totalIncome)}/yr
          </div>
        </div>
      </div>

      {/* 🧭 SECTION TABS */}
      <div className="flex border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1 rounded-lg select-none shrink-0">
        {(["personal", "address", "employment", "property", "mortgage"] as SubTabType[]).map((tab) => {
          const labelMap: Record<SubTabType, string> = {
            personal: "👤 Personal",
            address: "📍 Address",
            employment: "💼 Employment",
            property: "🏠 Property",
            mortgage: "💳 Mortgage"
          };
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveSubTab(tab)}
              className={`flex-1 py-2 text-[10px] uppercase tracking-wider font-extrabold text-center rounded-md transition-all cursor-pointer ${
                activeSubTab === tab 
                  ? "bg-[var(--color-accent)] text-[var(--color-bg)] shadow-md" 
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {labelMap[tab]}
            </button>
          );
        })}
      </div>

      {/* 🛠️ TAB WORKSPACE */}
      <div className="flex-grow overflow-y-auto min-h-[350px] bg-[var(--color-surface)]/20 border border-[var(--color-border)] p-5 rounded-xl space-y-6">
        <fieldset disabled={!isAdmin} className="contents">
        
        {/* 1. PERSONAL ROSTER */}
        {activeSubTab === "personal" && (
          <div className="space-y-5" id="section-personal">
            {/* Primary Applicant */}
            <div className="bg-[var(--color-surface-2)]/30 border border-[var(--color-border)] p-4 rounded-xl space-y-4">
              <h4 className="text-[10px] text-[var(--color-accent)] uppercase font-black tracking-wider flex items-center gap-1.5 border-b border-[var(--color-border)] pb-2">
                <UserIcon className="w-3.5 h-3.5" /> Primary Applicant Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">First Name *</label>
                  <input type="text" value={fields.app_first || ""} onChange={(e) => handleFieldChange("app_first", e.target.value)} placeholder="First" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Last Name *</label>
                  <input type="text" value={fields.app_last || ""} onChange={(e) => handleFieldChange("app_last", e.target.value)} placeholder="Last" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Email *</label>
                  <input type="email" value={fields.app_email || ""} onChange={(e) => handleFieldChange("app_email", e.target.value)} placeholder="name@email.com" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Cell Phone</label>
                  <input type="text" value={fields.app_cell || ""} onChange={(e) => handleFieldChange("app_cell", e.target.value)} placeholder="(705) 555-1212" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Home Phone</label>
                  <input type="text" value={fields.app_home || ""} onChange={(e) => handleFieldChange("app_home", e.target.value)} placeholder="Home Number" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Work Phone</label>
                  <input type="text" value={fields.app_work || ""} onChange={(e) => handleFieldChange("app_work", e.target.value)} placeholder="Work Ext." className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Date of Birth</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={fields.app_dob_m || ""} onChange={(e) => handleFieldChange("app_dob_m", e.target.value)} placeholder="MM" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center focus:outline-none font-mono" />
                    <input type="text" value={fields.app_dob_d || ""} onChange={(e) => handleFieldChange("app_dob_d", e.target.value)} placeholder="DD" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center focus:outline-none font-mono" />
                    <input type="text" value={fields.app_dob_y || ""} onChange={(e) => handleFieldChange("app_dob_y", e.target.value)} placeholder="YYYY" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center focus:outline-none font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Marital Status</label>
                  <select value={fields.app_marital || ""} onChange={(e) => handleFieldChange("app_marital", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none">
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Common-Law">Common-Law</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Separated">Separated</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Preferred Contact</label>
                  <select value={fields.app_contact || "Email"} onChange={(e) => handleFieldChange("app_contact", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none">
                    <option value="Email">✉️ Email Contact</option>
                    <option value="Cell Phone">📱 Cell Call</option>
                    <option value="SMS Text">💬 SMS Text</option>
                    <option value="Work Phone">🏢 Work Extension</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Social Insurance (SIN)</label>
                  <input type="text" value={fields.app_sin || ""} onChange={(e) => handleFieldChange("app_sin", e.target.value)} placeholder="000-000-000" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono text-center" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Credit Score (Beacon)</label>
                  <input type="number" value={fields.beacon || ""} onChange={(e) => handleFieldChange("beacon", e.target.value)} placeholder="700" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono text-center" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Dependents Count</label>
                  <input type="number" value={fields.app_dependents || "0"} onChange={(e) => handleFieldChange("app_dependents", e.target.value)} placeholder="0" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none text-center" />
                </div>
              </div>
            </div>

            {/* Co-Applicant Details */}
            <div className="bg-[var(--color-surface-2)]/30 border border-[var(--color-border)] p-4 rounded-xl space-y-4">
              <h4 className="text-[10px] text-[var(--color-accent)] uppercase font-black tracking-wider flex items-center gap-1.5 border-b border-[var(--color-border)] pb-2">
                <UserIcon className="w-3.5 h-3.5" /> Co-Applicant Information (Secondary)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co First Name</label>
                  <input type="text" value={fields.co_first || ""} onChange={(e) => handleFieldChange("co_first", e.target.value)} placeholder="First" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Last Name</label>
                  <input type="text" value={fields.co_last || ""} onChange={(e) => handleFieldChange("co_last", e.target.value)} placeholder="Last" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Email</label>
                  <input type="email" value={fields.co_email || ""} onChange={(e) => handleFieldChange("co_email", e.target.value)} placeholder="co.applicant@email.com" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Cell Phone</label>
                  <input type="text" value={fields.co_cell || ""} onChange={(e) => handleFieldChange("co_cell", e.target.value)} placeholder="Co Cell" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Home Phone</label>
                  <input type="text" value={fields.co_home || ""} onChange={(e) => handleFieldChange("co_home", e.target.value)} placeholder="Co Home" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Work Phone</label>
                  <input type="text" value={fields.co_work || ""} onChange={(e) => handleFieldChange("co_work", e.target.value)} placeholder="Co Work" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Date of Birth</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={fields.co_dob_m || ""} onChange={(e) => handleFieldChange("co_dob_m", e.target.value)} placeholder="MM" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center focus:outline-none font-mono" />
                    <input type="text" value={fields.co_dob_d || ""} onChange={(e) => handleFieldChange("co_dob_d", e.target.value)} placeholder="DD" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center focus:outline-none font-mono" />
                    <input type="text" value={fields.co_dob_y || ""} onChange={(e) => handleFieldChange("co_dob_y", e.target.value)} placeholder="YYYY" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center focus:outline-none font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Marital Status</label>
                  <select value={fields.co_marital || "Single"} onChange={(e) => handleFieldChange("co_marital", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none">
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Common-Law">Common-Law</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Separated">Separated</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Preferred Contact</label>
                  <select value={fields.co_contact || "Email"} onChange={(e) => handleFieldChange("co_contact", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none">
                    <option value="Email">✉️ Email Contact</option>
                    <option value="Cell Phone">📱 Cell Call</option>
                    <option value="SMS Text">💬 SMS Text</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Social Insurance (SIN)</label>
                  <input type="text" value={fields.co_sin || ""} onChange={(e) => handleFieldChange("co_sin", e.target.value)} placeholder="000-000-000" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono text-center" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Credit Beacon</label>
                  <input type="number" value={fields.co_beacon || ""} onChange={(e) => handleFieldChange("co_beacon", e.target.value)} placeholder="700" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono text-center" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. CURRENT ADDRESS */}
        {activeSubTab === "address" && (
          <div className="space-y-5" id="section-address">
            
            {/* Primary Address */}
            <div className="bg-[var(--color-surface-2)]/30 border border-[var(--color-border)] p-4 rounded-xl space-y-4">
              <h4 className="text-[10px] text-[var(--color-accent)] uppercase font-black tracking-wider flex items-center gap-1.5 border-b border-[var(--color-border)] pb-2">
                <MapPin className="w-3.5 h-3.5" /> Primary Applicant Current Address
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Street Address</label>
                  <input type="text" value={fields.app_addr || ""} onChange={(e) => handleFieldChange("app_addr", e.target.value)} placeholder="123 Oak St" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Unit / Apt</label>
                  <input type="text" value={fields.app_unit || ""} onChange={(e) => handleFieldChange("app_unit", e.target.value)} placeholder="Unit #" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">City</label>
                  <input type="text" value={fields.app_city || ""} onChange={(e) => handleFieldChange("app_city", e.target.value)} placeholder="City" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Province</label>
                  <input type="text" value={fields.app_prov || ""} onChange={(e) => handleFieldChange("app_prov", e.target.value)} placeholder="ON" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none text-center font-bold" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Postal Code</label>
                  <input type="text" value={fields.app_post || ""} onChange={(e) => handleFieldChange("app_post", e.target.value)} placeholder="L4M 1X1" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono text-center uppercase" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Housing Tenure</label>
                  <select value={fields.app_housing || "Own"} onChange={(e) => handleFieldChange("app_housing", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-bold">
                    <option value="Own">Owns Home</option>
                    <option value="Rent">Rents</option>
                    <option value="Relatives">Living with Family</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Years at Current Residence</label>
                  <input type="number" value={fields.app_res_yrs || ""} onChange={(e) => handleFieldChange("app_res_yrs", e.target.value)} placeholder="Years" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono text-center font-bold" />
                </div>
              </div>
            </div>

            {/* Conditionally Display Previous Address if Residency < 3 Years */}
            {isResunder3 && (
              <div className="bg-[var(--color-surface-2)]/30 border border-amber-500/20 p-4 rounded-xl space-y-4 animate-fade-in">
                <h4 className="text-[10px] text-amber-400 uppercase font-black tracking-wider flex items-center gap-1.5 border-b border-[var(--color-border)] pb-2">
                  <AlertCircle className="w-3.5 h-3.5" /> Previous Address (Required - Under 3 yrs residency)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Previous Street Address</label>
                    <input type="text" value={fields.app_prev_addr || ""} onChange={(e) => handleFieldChange("app_prev_addr", e.target.value)} placeholder="Previous Street" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Unit</label>
                    <input type="text" value={fields.app_prev_unit || ""} onChange={(e) => handleFieldChange("app_prev_unit", e.target.value)} placeholder="Apt #" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">City</label>
                    <input type="text" value={fields.app_prev_city || ""} onChange={(e) => handleFieldChange("app_prev_city", e.target.value)} placeholder="City" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Province</label>
                    <input type="text" value={fields.app_prev_prov || ""} onChange={(e) => handleFieldChange("app_prev_prov", e.target.value)} placeholder="ON" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none text-center" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Postal Code</label>
                    <input type="text" value={fields.app_prev_post || ""} onChange={(e) => handleFieldChange("app_prev_post", e.target.value)} placeholder="Postal" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none text-center font-mono" />
                  </div>
                </div>
              </div>
            )}

            {/* Co-Applicant Address */}
            <div className="bg-[var(--color-surface-2)]/30 border border-[var(--color-border)] p-4 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                <h4 className="text-[10px] text-[var(--color-accent)] uppercase font-black tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Co-Applicant Address Information
                </h4>
                
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={fields.co_address_same === "1"} 
                    onChange={() => setFields(p => ({ ...p, co_address_same: p.co_address_same === "1" ? "0" : "1" }))}
                    className="rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-[8px] uppercase font-black text-[var(--color-text-muted)]">Same as Primary Applicant</span>
                </label>
              </div>

              {fields.co_address_same !== "1" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Street Address</label>
                    <input type="text" value={fields.co_addr || ""} onChange={(e) => handleFieldChange("co_addr", e.target.value)} placeholder="Co Street" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Unit</label>
                    <input type="text" value={fields.co_unit || ""} onChange={(e) => handleFieldChange("co_unit", e.target.value)} placeholder="Unit" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co City</label>
                    <input type="text" value={fields.co_city || ""} onChange={(e) => handleFieldChange("co_city", e.target.value)} placeholder="City" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Province</label>
                    <input type="text" value={fields.co_prov || ""} onChange={(e) => handleFieldChange("co_prov", e.target.value)} placeholder="ON" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none text-center" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Postal Code</label>
                    <input type="text" value={fields.co_post || ""} onChange={(e) => handleFieldChange("co_post", e.target.value)} placeholder="Postal" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none text-center font-mono uppercase" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Housing Tenure</label>
                    <select value={fields.co_housing || "Own"} onChange={(e) => handleFieldChange("co_housing", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-bold">
                      <option value="Own">Owns Home</option>
                      <option value="Rent">Rents</option>
                      <option value="Relatives">Living with Family</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Years at Residence</label>
                    <input type="number" value={fields.co_res_yrs || ""} onChange={(e) => handleFieldChange("co_res_yrs", e.target.value)} placeholder="Years" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono text-center font-bold" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Months at Residence</label>
                    <input type="number" value={fields.co_res_mos || ""} onChange={(e) => handleFieldChange("co_res_mos", e.target.value)} placeholder="Months" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono text-center" />
                  </div>
                </div>
              )}

              {fields.co_address_same !== "1" && fields.co_res_yrs && parseInt(fields.co_res_yrs, 10) < 3 && (
                <div className="bg-[var(--color-surface-2)]/30 border border-amber-500/20 p-4 rounded-xl space-y-4 animate-fade-in mt-3">
                  <h4 className="text-[10px] text-amber-400 uppercase font-black tracking-wider flex items-center gap-1.5 border-b border-[var(--color-border)] pb-2">
                    <AlertCircle className="w-3.5 h-3.5" /> Co-Applicant Previous Address (Required - Under 3 yrs residency)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Previous Street Address</label>
                      <input type="text" value={fields.co_prev_addr || ""} onChange={(e) => handleFieldChange("co_prev_addr", e.target.value)} placeholder="Previous Street" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Unit</label>
                      <input type="text" value={fields.co_prev_unit || ""} onChange={(e) => handleFieldChange("co_prev_unit", e.target.value)} placeholder="Apt #" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">City</label>
                      <input type="text" value={fields.co_prev_city || ""} onChange={(e) => handleFieldChange("co_prev_city", e.target.value)} placeholder="City" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Province</label>
                      <input type="text" value={fields.co_prev_prov || ""} onChange={(e) => handleFieldChange("co_prev_prov", e.target.value)} placeholder="ON" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none text-center" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Postal Code</label>
                      <input type="text" value={fields.co_prev_post || ""} onChange={(e) => handleFieldChange("co_prev_post", e.target.value)} placeholder="Postal" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none text-center font-mono" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. EMPLOYMENT & INCOME */}
        {activeSubTab === "employment" && (
          <div className="space-y-5" id="section-employment">
            
            {/* Primary Employment */}
            <div className="bg-[var(--color-surface-2)]/30 border border-[var(--color-border)] p-4 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
                <h4 className="text-[10px] text-[var(--color-accent)] uppercase font-black tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Primary Applicant Source of Income
                </h4>
                
                <div className="flex gap-1.5 select-none">
                  <button 
                    type="button" 
                    onClick={() => setFields(p => ({ ...p, app_inc_employed: "1", app_inc_self: "0" }))}
                    className={`px-3 py-1 text-[9px] uppercase font-black rounded border transition-all ${
                      fields.app_inc_employed === "1" ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] border-[var(--color-accent)]" : "bg-[var(--color-surface-3)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                    }`}
                  >
                    Salaried Employee
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFields(p => ({ ...p, app_inc_employed: "0", app_inc_self: "1" }))}
                    className={`px-3 py-1 text-[9px] uppercase font-black rounded border transition-all ${
                      fields.app_inc_self === "1" ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] border-[var(--color-accent)]" : "bg-[var(--color-surface-3)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                    }`}
                  >
                    BFS / Self-Employed
                  </button>
                </div>
              </div>

              {/* Salaried Layout */}
              {fields.app_inc_employed === "1" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Company / Employer Name</label>
                      <input type="text" value={fields.app_emp1_name || ""} onChange={(e) => handleFieldChange("app_emp1_name", e.target.value)} placeholder="Employer Name" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Job Title</label>
                      <input type="text" value={fields.app_emp1_title || ""} onChange={(e) => handleFieldChange("app_emp1_title", e.target.value)} placeholder="Title" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Industry Status</label>
                      <select value={fields.app_emp1_status || "Full Time Salaried"} onChange={(e) => handleFieldChange("app_emp1_status", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-bold">
                        <option value="Full Time Salaried">Full Time Salaried</option>
                        <option value="Part-Time Employee">Part-Time Employee</option>
                        <option value="Contract worker">Contract worker</option>
                        <option value="Seasonal worker">Seasonal worker</option>
                        <option value="Retired / Pensioner">Retired / Pensioner</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Annual Base Income ($)</label>
                      <input type="number" value={fields.app_emp1_income || ""} onChange={(e) => handleFieldChange("app_emp1_income", e.target.value)} placeholder="Annual Income" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono font-bold" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Time on Job (Years)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={fields.app_emp1_yrs || ""} onChange={(e) => handleFieldChange("app_emp1_yrs", e.target.value)} placeholder="Yrs" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center font-mono" />
                        <input type="number" value={fields.app_emp1_mos || ""} onChange={(e) => handleFieldChange("app_emp1_mos", e.target.value)} placeholder="Mos" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center font-mono" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Employer Phone</label>
                      <input type="text" value={fields.app_emp1_tel || ""} onChange={(e) => handleFieldChange("app_emp1_tel", e.target.value)} placeholder="Employer Tel" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono" />
                    </div>
                  </div>

                  {/* Secondary Job (Optional) */}
                  <div className="bg-[var(--color-surface-3)]/40 border border-[var(--color-border)] p-4 rounded-xl space-y-3">
                    <span className="text-[9px] text-teal-500 uppercase font-extrabold tracking-wider block">Secondary Employer Details (If applicable)</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Employer Name</label>
                        <input type="text" value={fields.app_emp2_name || ""} onChange={(e) => handleFieldChange("app_emp2_name", e.target.value)} placeholder="Second Job Ltd." className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Job Title</label>
                        <input type="text" value={fields.app_emp2_title || ""} onChange={(e) => handleFieldChange("app_emp2_title", e.target.value)} placeholder="Associate" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Gross Annual Income ($)</label>
                        <input type="number" value={fields.app_emp2_income || ""} onChange={(e) => handleFieldChange("app_emp2_income", e.target.value)} placeholder="25000" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono font-bold" />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Time on Job (Years / Months)</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" value={fields.app_emp2_yrs || ""} onChange={(e) => handleFieldChange("app_emp2_yrs", e.target.value)} placeholder="Yrs" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center font-mono" />
                          <input type="number" value={fields.app_emp2_mos || ""} onChange={(e) => handleFieldChange("app_emp2_mos", e.target.value)} placeholder="Mos" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center font-mono" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Status</label>
                        <select value={fields.app_emp2_status || ""} onChange={(e) => handleFieldChange("app_emp2_status", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-bold">
                          <option value="">Select</option>
                          <option value="Part Time">Part Time</option>
                          <option value="Full Time">Full Time</option>
                          <option value="Contract">Contract</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Previous Job (Required if under 3 years) */}
                  {fields.app_emp1_yrs && parseInt(fields.app_emp1_yrs, 10) < 3 && (
                    <div className="bg-[var(--color-surface-3)]/40 border border-amber-500/20 p-4 rounded-xl space-y-3">
                      <span className="text-[9px] text-amber-500 uppercase font-extrabold tracking-wider block">Previous Employer Details (Required - Under 3 yrs on job)</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Employer Name</label>
                          <input type="text" value={fields.app_prev_emp_name || ""} onChange={(e) => handleFieldChange("app_prev_emp_name", e.target.value)} placeholder="Old Company Corp" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Job Title</label>
                          <input type="text" value={fields.app_prev_emp_title || ""} onChange={(e) => handleFieldChange("app_prev_emp_title", e.target.value)} placeholder="Specialist" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Gross Annual Income ($)</label>
                          <input type="number" value={fields.app_prev_emp_income || ""} onChange={(e) => handleFieldChange("app_prev_emp_income", e.target.value)} placeholder="75000" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono font-bold" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Time on Job (Years / Months)</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" value={fields.app_prev_emp_yrs || ""} onChange={(e) => handleFieldChange("app_prev_emp_yrs", e.target.value)} placeholder="Yrs" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center font-mono" />
                            <input type="number" value={fields.app_prev_emp_mos || ""} onChange={(e) => handleFieldChange("app_prev_emp_mos", e.target.value)} placeholder="Mos" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center font-mono" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Self-Employed Layout */}
              {fields.app_inc_self === "1" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Business Corp / Trade Name</label>
                    <input type="text" value={fields.app_self_name || ""} onChange={(e) => handleFieldChange("app_self_name", e.target.value)} placeholder="Business Name" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Years Active / Operating</label>
                    <input type="number" value={fields.app_self_yrs || ""} onChange={(e) => handleFieldChange("app_self_yrs", e.target.value)} placeholder="Years Operating" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono text-center" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Net Business Income (CRA Line 15000 Avg) ($)</label>
                    <input type="number" value={fields.app_self_income || ""} onChange={(e) => handleFieldChange("app_self_income", e.target.value)} placeholder="Net annual income" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono font-bold" />
                  </div>
                </div>
              )}

              {/* Other Income */}
              <div className="border-t border-[var(--color-border)] pt-3.5">
                <span className="text-[8px] uppercase tracking-widest text-[var(--color-text-faint)] font-black block mb-2">Supplemental / Other Source Income</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Income Specifier</label>
                    <input type="text" value={fields.app_other0_specify || ""} onChange={(e) => handleFieldChange("app_other0_specify", e.target.value)} placeholder="e.g. Pension, Rental, Spousal" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Other Income Amount ($)</label>
                    <input type="number" value={fields.app_other0_amount || ""} onChange={(e) => handleFieldChange("app_other0_amount", e.target.value)} placeholder="Amount" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Frequency</label>
                    <select value={fields.app_other0_freq || "Monthly"} onChange={(e) => handleFieldChange("app_other0_freq", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-bold">
                      <option value="Monthly">Monthly</option>
                      <option value="Annually">Annually</option>
                      <option value="Bi-Weekly">Bi-Weekly</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Co-Applicant Employment */}
            <div className="bg-[var(--color-surface-2)]/30 border border-[var(--color-border)] p-4 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
                <h4 className="text-[10px] text-[var(--color-accent)] uppercase font-black tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Co-Applicant Source of Income
                </h4>
                
                <div className="flex gap-1.5 select-none">
                  <button 
                    type="button" 
                    onClick={() => setFields(p => ({ ...p, co_inc_employed: "1", co_inc_self: "0" }))}
                    className={`px-3 py-1 text-[9px] uppercase font-black rounded border transition-all ${
                      fields.co_inc_employed === "1" ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] border-[var(--color-accent)]" : "bg-[var(--color-surface-3)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                    }`}
                  >
                    Salaried Employee
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFields(p => ({ ...p, co_inc_employed: "0", co_inc_self: "1" }))}
                    className={`px-3 py-1 text-[9px] uppercase font-black rounded border transition-all ${
                      fields.co_inc_self === "1" ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] border-[var(--color-accent)]" : "bg-[var(--color-surface-3)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                    }`}
                  >
                    BFS / Self-Employed
                  </button>
                </div>
              </div>

              {/* Salaried Layout */}
              {fields.co_inc_employed === "1" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Company Name</label>
                      <input type="text" value={fields.co_emp1_name || ""} onChange={(e) => handleFieldChange("co_emp1_name", e.target.value)} placeholder="Co Employer" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Job Title</label>
                      <input type="text" value={fields.co_emp1_title || ""} onChange={(e) => handleFieldChange("co_emp1_title", e.target.value)} placeholder="Co Job Title" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Employment Status</label>
                      <select value={fields.co_emp1_status || "Full Time Salaried"} onChange={(e) => handleFieldChange("co_emp1_status", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-bold">
                        <option value="Full Time Salaried">Full Time Salaried</option>
                        <option value="Part-Time Employee">Part-Time Employee</option>
                        <option value="Contract worker">Contract worker</option>
                        <option value="Seasonal worker">Seasonal worker</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Annual Income ($)</label>
                      <input type="number" value={fields.co_emp1_income || ""} onChange={(e) => handleFieldChange("co_emp1_income", e.target.value)} placeholder="Co Salary" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono font-bold" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Time on Job (Years)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={fields.co_emp1_yrs || ""} onChange={(e) => handleFieldChange("co_emp1_yrs", e.target.value)} placeholder="Yrs" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center font-mono" />
                        <input type="number" value={fields.co_emp1_mos || ""} onChange={(e) => handleFieldChange("co_emp1_mos", e.target.value)} placeholder="Mos" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center font-mono" />
                      </div>
                    </div>
                  </div>

                  {/* Secondary Job (Optional) */}
                  <div className="bg-[var(--color-surface-3)]/40 border border-[var(--color-border)] p-4 rounded-xl space-y-3">
                    <span className="text-[9px] text-teal-500 uppercase font-extrabold tracking-wider block">Secondary Employer Details (If applicable)</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Employer Name</label>
                        <input type="text" value={fields.co_emp2_name || ""} onChange={(e) => handleFieldChange("co_emp2_name", e.target.value)} placeholder="Second Job Ltd." className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Job Title</label>
                        <input type="text" value={fields.co_emp2_title || ""} onChange={(e) => handleFieldChange("co_emp2_title", e.target.value)} placeholder="Associate" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Gross Annual Income ($)</label>
                        <input type="number" value={fields.co_emp2_income || ""} onChange={(e) => handleFieldChange("co_emp2_income", e.target.value)} placeholder="25000" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono font-bold" />
                      </div>
                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Time on Job (Years / Months)</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" value={fields.co_emp2_yrs || ""} onChange={(e) => handleFieldChange("co_emp2_yrs", e.target.value)} placeholder="Yrs" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center font-mono" />
                          <input type="number" value={fields.co_emp2_mos || ""} onChange={(e) => handleFieldChange("co_emp2_mos", e.target.value)} placeholder="Mos" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center font-mono" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Status</label>
                        <select value={fields.co_emp2_status || ""} onChange={(e) => handleFieldChange("co_emp2_status", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-bold">
                          <option value="">Select</option>
                          <option value="Part Time">Part Time</option>
                          <option value="Full Time">Full Time</option>
                          <option value="Contract">Contract</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Previous Job (Required if under 3 years) */}
                  {fields.co_emp1_yrs && parseInt(fields.co_emp1_yrs, 10) < 3 && (
                    <div className="bg-[var(--color-surface-3)]/40 border border-amber-500/20 p-4 rounded-xl space-y-3">
                      <span className="text-[9px] text-amber-500 uppercase font-extrabold tracking-wider block">Previous Employer Details (Required - Under 3 yrs on job)</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Employer Name</label>
                          <input type="text" value={fields.co_prev_emp_name || ""} onChange={(e) => handleFieldChange("co_prev_emp_name", e.target.value)} placeholder="Old School Corp" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Job Title</label>
                          <input type="text" value={fields.co_prev_emp_title || ""} onChange={(e) => handleFieldChange("co_prev_emp_title", e.target.value)} placeholder="Specialist" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Gross Annual Income ($)</label>
                          <input type="number" value={fields.co_prev_emp_income || ""} onChange={(e) => handleFieldChange("co_prev_emp_income", e.target.value)} placeholder="75000" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono font-bold" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Time on Job (Years / Months)</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" value={fields.co_prev_emp_yrs || ""} onChange={(e) => handleFieldChange("co_prev_emp_yrs", e.target.value)} placeholder="Yrs" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center font-mono" />
                            <input type="number" value={fields.co_prev_emp_mos || ""} onChange={(e) => handleFieldChange("co_prev_emp_mos", e.target.value)} placeholder="Mos" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text)] text-center font-mono" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Self-Employed Layout */}
              {fields.co_inc_self === "1" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Business Corp / Trade Name</label>
                    <input type="text" value={fields.co_self_name || ""} onChange={(e) => handleFieldChange("co_self_name", e.target.value)} placeholder="Co Business" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Co Business Annual Net Income ($)</label>
                    <input type="number" value={fields.co_self_income || ""} onChange={(e) => handleFieldChange("co_self_income", e.target.value)} placeholder="Net annual income" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono font-bold" />
                  </div>
                </div>
              )}

              {/* Co Other Income */}
              <div className="border-t border-[var(--color-border)] pt-3.5">
                <span className="text-[8px] uppercase tracking-widest text-[var(--color-text-faint)] font-black block mb-2">Supplemental / Other Income (Co-Applicant)</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Co Income Specifier</label>
                    <input type="text" value={fields.co_other0_specify || ""} onChange={(e) => handleFieldChange("co_other0_specify", e.target.value)} placeholder="Pension, child care, etc" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Co Other Income Amount ($)</label>
                    <input type="number" value={fields.co_other0_amount || ""} onChange={(e) => handleFieldChange("co_other0_amount", e.target.value)} placeholder="Amount" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-1">Frequency</label>
                    <select value={fields.co_other0_freq || "Monthly"} onChange={(e) => handleFieldChange("co_other0_freq", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-bold">
                      <option value="Monthly">Monthly</option>
                      <option value="Annually">Annually</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. PROPERTY DETAILS */}
        {activeSubTab === "property" && (
          <div className="space-y-4" id="section-property">
            <div className="bg-[var(--color-surface-2)]/30 border border-[var(--color-border)] p-4 rounded-xl space-y-4">
              <h4 className="text-[10px] text-[var(--color-accent)] uppercase font-black tracking-wider flex items-center gap-1.5 border-b border-[var(--color-border)] pb-2">
                <Building className="w-3.5 h-3.5" /> Subject Property Structural Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Subject Property Value ($) *</label>
                  <input type="number" value={fields.prop_value || ""} onChange={(e) => handleFieldChange("prop_value", e.target.value)} placeholder="e.g. 685000" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono font-bold" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Property Type</label>
                  <select value={fields.prop_type || "Detached"} onChange={(e) => handleFieldChange("prop_type", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-bold">
                    <option value="Detached">Detached House</option>
                    <option value="Semi-Detached">Semi-Detached</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Condo Apartment">Condo Apartment</option>
                    <option value="Duplex / Triplex">Duplex / Triplex</option>
                    <option value="Fourplex">Fourplex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Property Style</label>
                  <input type="text" value={fields.prop_style || "Two Storey"} onChange={(e) => handleFieldChange("prop_style", e.target.value)} placeholder="e.g. Two Storey" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Tenure</label>
                  <select value={fields.prop_tenure || "Freehold"} onChange={(e) => handleFieldChange("prop_tenure", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-bold">
                    <option value="Freehold">Freehold</option>
                    <option value="Condominium">Condominium</option>
                    <option value="Co-operative">Co-operative</option>
                    <option value="Leasehold">Leasehold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Annual Property Taxes ($)</label>
                  <input type="number" value={fields.prop_tax || ""} onChange={(e) => handleFieldChange("prop_tax", e.target.value)} placeholder="e.g. 4200" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono font-bold" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Monthly Condo Fees ($)</label>
                  <input type="number" value={fields.prop_condo_fees || ""} onChange={(e) => handleFieldChange("prop_condo_fees", e.target.value)} placeholder="e.g. 350" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Heating Utility Cost ($)</label>
                  <input type="number" value={fields.prop_heat || "150"} onChange={(e) => handleFieldChange("prop_heat", e.target.value)} placeholder="e.g. 150" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Property Age (Years)</label>
                  <input type="text" value={fields.prop_age || "10"} onChange={(e) => handleFieldChange("prop_age", e.target.value)} placeholder="e.g. 10" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none text-center" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Square Footage Area</label>
                  <input type="number" value={fields.prop_area || "2000"} onChange={(e) => handleFieldChange("prop_area", e.target.value)} placeholder="e.g. 2000" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono text-center" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Lot Size Parameters</label>
                  <input type="text" value={fields.prop_lot || "50x120"} onChange={(e) => handleFieldChange("prop_lot", e.target.value)} placeholder="e.g. 50x120" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none text-center" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Garage / Parking Type</label>
                  <input type="text" value={fields.prop_garage_type || "Double Attached"} onChange={(e) => handleFieldChange("prop_garage_type", e.target.value)} placeholder="Garage structure" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. MORTGAGE PARAMETERS */}
        {activeSubTab === "mortgage" && (
          <div className="space-y-4" id="section-mortgage">
            <div className="bg-[var(--color-surface-2)]/30 border border-[var(--color-border)] p-4 rounded-xl space-y-4">
              <h4 className="text-[10px] text-[var(--color-accent)] uppercase font-black tracking-wider flex items-center gap-1.5 border-b border-[var(--color-border)] pb-2">
                <Landmark className="w-3.5 h-3.5" /> Mortgage Application Loan parameters
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Mortgage Principal Requested ($) *</label>
                  <input type="number" value={fields.mtg1_balance || ""} onChange={(e) => handleFieldChange("mtg1_balance", e.target.value)} placeholder="e.g. 548000" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono font-bold" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Interest Rate (% APR)</label>
                  <input type="text" value={fields.interestRate || "4.79%"} onChange={(e) => handleFieldChange("interestRate", e.target.value)} placeholder="APR Rate" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-mono font-bold text-center" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Amortization Tenure</label>
                  <select value={fields.amortization || "25"} onChange={(e) => handleFieldChange("amortization", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-bold">
                    <option value="15">15 Years</option>
                    <option value="20">20 Years</option>
                    <option value="25">25 Years</option>
                    <option value="30">30 Years</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Occupancy Usage</label>
                  <select value={fields.tenure || "owner-occupied"} onChange={(e) => handleFieldChange("tenure", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-bold">
                    <option value="owner-occupied">Owner Occupied Primary</option>
                    <option value="rental">Rental / Investment</option>
                    <option value="second-home">Secondary / Vacation Home</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Lender Partner Submissions</label>
                  <select value={fields.lender || ""} onChange={(e) => handleFieldChange("lender", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-bold text-[var(--color-accent)]">
                    <option value="">No Active Submission</option>
                    {lenders.map(l => (
                      <option key={l.name} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Assigned Broker Agent</label>
                  <select value={fields.agent || ""} onChange={(e) => handleFieldChange("agent", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-bold">
                    <option value="">Unassigned</option>
                    {agentNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Commitment Maturity Date</label>
                  <input type="date" value={fields.maturityDate || ""} onChange={(e) => handleFieldChange("maturityDate", e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none text-center font-mono" />
                </div>
                <div>
                  <label className="block text-[9px] text-[var(--color-text-muted)] uppercase font-black tracking-wider mb-1">Referred By Lead Partner</label>
                  <input type="text" value={fields.referredBy || ""} onChange={(e) => handleFieldChange("referredBy", e.target.value)} placeholder="Referral partner" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs text-[var(--color-text)] focus:outline-none font-semibold" />
                </div>
              </div>
            </div>
          </div>
        )}

        </fieldset>
      </div>

      {/* 💾 ACTION BUTTON */}
      {isAdmin ? (
        <button
          type="submit"
          className="w-full bg-[var(--color-accent)] text-[var(--color-bg)] font-black uppercase tracking-widest text-[10px] py-3.5 rounded-lg hover:bg-[var(--color-accent)]/85 hover:shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow"
        >
          <Save className="w-3.5 h-3.5" /> Save Complete Mortgage Application File
        </button>
      ) : (
        <div className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] font-black uppercase tracking-widest text-[10px] py-3.5 rounded-lg text-center flex items-center justify-center gap-1.5 shrink-0 select-none">
          🔒 READ-ONLY MODE (Admins / Operations Only)
        </div>
      )}

    </form>
  );
};
