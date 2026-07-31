import { Client } from "../types";

export interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  required: boolean;
  status: 'Not Started' | 'Waiting on Client' | 'In Progress' | 'Submitted' | 'Completed' | 'Blocked' | 'Waived' | 'Needs Review';
  notes: string;
  assignedOwner: string;
  dueDate: string; // YYYY-MM-DD
  linkedStage: 'open' | 'working' | 'lender' | 'conditional' | 'approved' | 'funded' | 'closed';
  linkedDocId?: string;
  completionTimestamp?: string;
  updatedAt?: string;
}

export type ChecklistCategory =
  | "Client Intake"
  | "Identification"
  | "Income Verification"
  | "Employment Verification"
  | "Credit and Liabilities"
  | "Property and Mortgage Details"
  | "Down Payment and Banking"
  | "Compliance and Disclosures"
  | "Submission Preparation"
  | "Lender Conditions"
  | "Funding Readiness"
  | "Post-Funding Follow-Up";

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  "Client Intake",
  "Identification",
  "Income Verification",
  "Employment Verification",
  "Credit and Liabilities",
  "Property and Mortgage Details",
  "Down Payment and Banking",
  "Compliance and Disclosures",
  "Submission Preparation",
  "Lender Conditions",
  "Funding Readiness",
  "Post-Funding Follow-Up"
];

// Helper to generate a default list of checklist items based on client characteristics
export function generateChecklistForClient(client: Client): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const type = (client.type || "purchase").toLowerCase();
  const emp = (client.emptype || "salaried").toLowerCase();
  const hasCo = !!client.co;

  const defaultOwner = client.agent || "Unassigned";

  // 1. Client Intake
  items.push({
    id: "init_intake",
    name: "Complete client intake consultation & secure consent",
    category: "Client Intake",
    required: true,
    status: "Completed",
    notes: "Completed at file setup.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "open",
    completionTimestamp: client.createdAt
  });

  // 2. Identification
  items.push({
    id: "id_primary",
    name: `Verify primary borrower photo ID (${client.first} ${client.last})`,
    category: "Identification",
    required: true,
    status: "Not Started",
    notes: "Requires clear copy of Driver's License or Passport.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "open",
    linkedDocId: "photo_id"
  });

  if (hasCo) {
    items.push({
      id: "id_co",
      name: `Verify co-applicant photo ID (${client.co})`,
      category: "Identification",
      required: true,
      status: "Not Started",
      notes: "Verify secondary ID for compliance.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "open",
      linkedDocId: "co_photo_id"
    });
  }

  // 3. Credit and Liabilities
  items.push({
    id: "credit_report",
    name: "Pull credit bureau and analyze liabilities",
    category: "Credit and Liabilities",
    required: true,
    status: "Completed",
    notes: "Credit report successfully pulled. Equifax bureau attached.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "open",
    completionTimestamp: client.createdAt
  });

  // 4. Income & Employment Verification
  if (emp === "salaried" || emp === "hourly" || emp === "commission") {
    items.push({
      id: "emp_letter_salaried",
      name: "Review signed job reference letter",
      category: "Employment Verification",
      required: true,
      status: "Not Started",
      notes: "Must be on company letterhead, confirming salary/hours.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working",
      linkedDocId: "employment_letter"
    });
    items.push({
      id: "paystubs_salaried",
      name: "Obtain and match last 3 consecutive paystubs",
      category: "Income Verification",
      required: true,
      status: "Not Started",
      notes: "Check YTD earnings and tax deductions.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working",
      linkedDocId: "paystubs"
    });
  } else if (emp === "contract") {
    items.push({
      id: "emp_contract",
      name: "Obtain copy of current employment/consulting contract",
      category: "Employment Verification",
      required: true,
      status: "Not Started",
      notes: "Verify end date, renewal clauses, and historical tenure.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working",
      linkedDocId: "employment_letter"
    });
    items.push({
      id: "noa_contract",
      name: "Obtain Notice of Assessment (NOA) for past 2 years",
      category: "Income Verification",
      required: true,
      status: "Not Started",
      notes: "Confirm line 15000 matches contract income trend.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working",
      linkedDocId: "noa"
    });
  } else if (emp === "self-employed") {
    items.push({
      id: "business_registration",
      name: "Obtain Articles of Incorporation or Business License",
      category: "Employment Verification",
      required: true,
      status: "Not Started",
      notes: "Verify active corporation or sole proprietorship registration.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working",
      linkedDocId: "business_license"
    });
    items.push({
      id: "tax_returns_bfs",
      name: "Retrieve full T1 General tax returns & NOAs (2 Years)",
      category: "Income Verification",
      required: true,
      status: "Not Started",
      notes: "For BFS (Business for Self) program. Calculate average net income.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working",
      linkedDocId: "noa"
    });
    items.push({
      id: "cra_portal_check",
      name: "Review CRA portal for outstanding personal or corporate tax arrears",
      category: "Income Verification",
      required: true,
      status: "Not Started",
      notes: "Lenders do not permit active tax liabilities on closing.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working"
    });
  } else if (emp === "retired") {
    items.push({
      id: "pension_docs",
      name: "Request official CPP/OAS and pension statement documents",
      category: "Income Verification",
      required: true,
      status: "Not Started",
      notes: "Verify stable retirement incomes.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working"
    });
    items.push({
      id: "noa_retired",
      name: "Retrieve last 2 years Notice of Assessments (NOA)",
      category: "Income Verification",
      required: false,
      status: "Not Started",
      notes: "Verify total registered income streams.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working",
      linkedDocId: "noa"
    });
  }

  // Co-applicant income verification if co-applicant is salaried (default)
  if (hasCo) {
    items.push({
      id: "co_income_stubs",
      name: `Retrieve paystubs for co-applicant (${client.co})`,
      category: "Income Verification",
      required: true,
      status: "Not Started",
      notes: "Required to confirm co-applicant debt servicing capability.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working",
      linkedDocId: "co_paystubs"
    });
  }

  // 5. Down Payment and Banking
  if (type === "purchase" || type === "pre-approval") {
    items.push({
      id: "down_payment_90days",
      name: "Review unedited 90-day bank statements verifying down payment source",
      category: "Down Payment and Banking",
      required: true,
      status: "Not Started",
      notes: "Explain all deposits above $2,000 for AML compliance.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working",
      linkedDocId: "bank_statements"
    });
    items.push({
      id: "gift_letter",
      name: "Collect signed family gift letter & bank wire confirmation",
      category: "Down Payment and Banking",
      required: false,
      status: "Not Started",
      notes: "Only required if down payment contains family gifted funds.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working"
    });
  }

  // 6. Property and Mortgage Details
  if (type === "purchase") {
    items.push({
      id: "aps_contract",
      name: "Analyze fully executed Agreement of Purchase and Sale",
      category: "Property and Mortgage Details",
      required: true,
      status: "Not Started",
      notes: "Verify purchase price, deposit receipts, and critical closing dates.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working",
      linkedDocId: "aps"
    });
    items.push({
      id: "mls_spec_sheet",
      name: "Retrieve official MLS feature listing page",
      category: "Property and Mortgage Details",
      required: false,
      status: "Not Started",
      notes: "Used to determine exact property heating type and annual municipal taxes.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working",
      linkedDocId: "mls_listing"
    });
  } else if (type === "refinance" || type === "heloc" || type === "second mortgage") {
    items.push({
      id: "payout_statement",
      name: "Obtain current mortgage payout statement",
      category: "Property and Mortgage Details",
      required: true,
      status: "Not Started",
      notes: "Verify current loan number, interest rate, and outstanding charge balance.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working",
      linkedDocId: "mortgage_statement"
    });
    items.push({
      id: "property_tax_bill",
      name: "Review latest municipal property tax assessment bill",
      category: "Property and Mortgage Details",
      required: true,
      status: "Not Started",
      notes: "Ensure municipal accounts are completely current and property taxes are paid.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working",
      linkedDocId: "property_tax"
    });
  } else if (type === "renewal") {
    items.push({
      id: "renewal_notice",
      name: "Request bank renewal notice and offer document",
      category: "Property and Mortgage Details",
      required: true,
      status: "Not Started",
      notes: "Compare bank offered rate against brokerage monoline alternative rates.",
      assignedOwner: defaultOwner,
      dueDate: "",
      linkedStage: "working",
      linkedDocId: "mortgage_statement"
    });
  }

  // 7. Compliance and Disclosures
  items.push({
    id: "disclosure_form_10",
    name: "Execute Form 10 / Mortgage Brokerage Disclosure Statement",
    category: "Compliance and Disclosures",
    required: true,
    status: "Not Started",
    notes: "Mandatory regulatory disclosure form signed by applicant.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "working"
  });
  items.push({
    id: "engagement_agreement",
    name: "Obtain signed brokerage service agreement and cost outline",
    category: "Compliance and Disclosures",
    required: true,
    status: "Not Started",
    notes: "Defines client relationship terms and standard disclosures.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "working"
  });

  // 8. Submission Preparation
  items.push({
    id: "gds_tds_stress_test",
    name: "Perform OSFI benchmark stress test and audit GDS/TDS ratios",
    category: "Submission Preparation",
    required: true,
    status: "Not Started",
    notes: "Must test using contract rate + 2.00% or 5.25%, whichever is greater.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "working"
  });
  items.push({
    id: "submit_lender_portal",
    name: "Submit file package via Filogix / Velocity lender interface",
    category: "Submission Preparation",
    required: true,
    status: "Not Started",
    notes: "Submit application to selected primary lender partner.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "lender"
  });

  // 9. Lender Conditions
  items.push({
    id: "commitment_letter_review",
    name: "Obtain and audit lender conditional commitment letter",
    category: "Lender Conditions",
    required: true,
    status: "Not Started",
    notes: "Ensure all specified terms and schedules are standard.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "conditional"
  });
  items.push({
    id: "commitment_signing",
    name: "Review and sign commitment letter with borrower",
    category: "Lender Conditions",
    required: true,
    status: "Not Started",
    notes: "Explain premium schedules, options, and early exit penalties.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "conditional"
  });
  items.push({
    id: "clear_lender_conditions",
    name: "Submit documents to satisfy and clear all lender conditions",
    category: "Lender Conditions",
    required: true,
    status: "Not Started",
    notes: "Upload job reference, bank transactions, and appraisal to lender.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "conditional"
  });

  // 10. Funding Readiness
  items.push({
    id: "solicitor_instructions",
    name: "Deliver final mortgage commitment & instructions package to solicitor",
    category: "Funding Readiness",
    required: true,
    status: "Not Started",
    notes: "Forward closing package to client's real estate lawyer.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "approved"
  });
  items.push({
    id: "void_cheque_banking",
    name: "Collect PAD void cheque or pre-authorized debit authorization form",
    category: "Down Payment and Banking",
    required: true,
    status: "Not Started",
    notes: "Ensure correct banking transit details are logged with lender.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "approved",
    linkedDocId: "void_cheque"
  });
  items.push({
    id: "property_insurance_verification",
    name: "Verify active Home Fire Insurance policy binder is in place",
    category: "Funding Readiness",
    required: true,
    status: "Not Started",
    notes: "Lenders require active binder showing them as first loss payee.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "approved"
  });

  // 11. Post-Funding Follow-Up
  items.push({
    id: "solicitor_funding_confirm",
    name: "Confirm solicitors successfully closed title transfer and funding",
    category: "Post-Funding Follow-Up",
    required: true,
    status: "Not Started",
    notes: "Ensure mortgage is fully funded.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "funded"
  });
  items.push({
    id: "brokerage_compliance_payout",
    name: "Submit file for internal audit and log brokerage commission payout",
    category: "Post-Funding Follow-Up",
    required: true,
    status: "Not Started",
    notes: "Log commission split and close CRM file status.",
    assignedOwner: defaultOwner,
    dueDate: "",
    linkedStage: "closed"
  });

  return items;
}

// Stage priorities configuration helper
export const STAGES_ORDER = [
  "open",
  "working",
  "lender",
  "conditional",
  "approved",
  "funded",
  "closed"
] as const;

export type FileStage = typeof STAGES_ORDER[number];

export interface FileReadinessSummary {
  clientId: string;
  checklistScore: number;
  readinessState: "Ready" | "Almost Ready" | "Waiting on Client" | "Waiting on Internal Review" | "Blocked";
  blockerReason: string;
  missingRequiredCount: number;
  waitingOnClientCount: number;
  waitingOnInternalReviewCount: number;
  isReadyForNextStage: boolean;
  activeBlockers: string[];
}

export function evaluateChecklistReadiness(
  client: Client,
  checklist: ChecklistItem[],
  docVault: Record<string, any>
): FileReadinessSummary {
  const currentStage: FileStage = (client.status || "open") as FileStage;
  const clientDocs = docVault[client.id] || {};

  // Resolve checklist statuses based on Document Vault dynamically where applicable
  const updatedChecklist = checklist.map(item => {
    if (item.linkedDocId) {
      const doc = clientDocs[item.linkedDocId] || {};
      const docStatus = doc.status || "required";

      // Sync doc status with checklist item status
      let newStatus = item.status;
      if (docStatus === "approved" || docStatus === "waived" || docStatus === "na") {
        newStatus = "Completed";
      } else if (docStatus === "under_review" || docStatus === "received") {
        newStatus = "Needs Review";
      } else if (docStatus === "requested") {
        newStatus = "Waiting on Client";
      } else if (docStatus === "required" && item.status === "Completed") {
        newStatus = "Not Started";
      }
      return { ...item, status: newStatus };
    }
    return item;
  });

  const totalRequired = updatedChecklist.filter(i => i.required);
  const totalCompleted = updatedChecklist.filter(i => i.status === "Completed" || i.status === "Waived");
  const requiredCompleted = totalRequired.filter(i => i.status === "Completed" || i.status === "Waived");

  const score = totalRequired.length > 0
    ? Math.round((requiredCompleted.length / totalRequired.length) * 100)
    : 100;

  // Blocker check: Are there any required items for the current stage or earlier that are NOT completed/waived?
  const currentStageIndex = STAGES_ORDER.indexOf(currentStage);
  const activeBlockers: string[] = [];

  updatedChecklist.forEach(item => {
    if (item.required) {
      const itemStageIndex = STAGES_ORDER.indexOf(item.linkedStage);
      // If the item belongs to the current stage or earlier, and is not completed/waived
      if (itemStageIndex <= currentStageIndex && item.status !== "Completed" && item.status !== "Waived") {
        activeBlockers.push(`${item.name} (${item.category})`);
      }
    }
    // Also, if any item is explicitly marked as "Blocked", it acts as an immediate blocker
    if (item.status === "Blocked") {
      activeBlockers.push(`Blocked: ${item.name}`);
    }
  });

  // Calculate counts
  const missingRequiredCount = totalRequired.filter(i => i.status === "Not Started" || i.status === "Blocked").length;
  const waitingOnClientCount = updatedChecklist.filter(i => i.status === "Waiting on Client").length;
  const waitingOnInternalReviewCount = updatedChecklist.filter(i => i.status === "Needs Review" || i.status === "Submitted").length;

  // Determine readiness state
  let readinessState: FileReadinessSummary["readinessState"] = "Ready";
  let blockerReason = "";

  if (activeBlockers.length > 0) {
    readinessState = "Blocked";
    blockerReason = activeBlockers[0];
  } else if (waitingOnClientCount > 0) {
    readinessState = "Waiting on Client";
    blockerReason = "Awaiting documents or responses from borrower";
  } else if (waitingOnInternalReviewCount > 0) {
    readinessState = "Waiting on Internal Review";
    blockerReason = "Awaiting compliance team or manager files review";
  } else if (score < 100) {
    readinessState = "Almost Ready";
    blockerReason = "Some non-blocking future stage checklist items are outstanding";
  } else {
    readinessState = "Ready";
    blockerReason = "All required tasks for stage completed successfully";
  }

  // Is ready for next stage?
  // Ready to progress if there are no blockers for the current stage
  const isReadyForNextStage = activeBlockers.length === 0;

  return {
    clientId: client.id,
    checklistScore: score,
    readinessState,
    blockerReason,
    missingRequiredCount,
    waitingOnClientCount,
    waitingOnInternalReviewCount,
    isReadyForNextStage,
    activeBlockers
  };
}
