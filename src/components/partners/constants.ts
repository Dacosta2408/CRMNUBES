import { Partner } from "../../types";

export const PARTNER_CATEGORIES = [
  "Lawyers",
  "Realtors",
  "Appraisers",
  "Home Inspectors",
  "Insurance Brokers",
  "Financial Advisors",
  "Accountants",
  "Contractors / Renovation",
  "Mortgage Agents / Brokers",
  "Private Lenders",
  "B Lenders",
  "Credit / Debt Specialists"
] as const;

export type PartnerCategory = typeof PARTNER_CATEGORIES[number];

export const PARTNER_STATUSES = [
  "Active",
  "Preferred",
  "Occasional",
  "Inactive"
] as const;

export type PartnerStatus = typeof PARTNER_STATUSES[number];

export const ONTARIO_REGIONS = [
  "Barrie",
  "Toronto",
  "Innisfil",
  "Orillia",
  "Bradford",
  "Newmarket",
  "Collingwood",
  "Midland"
] as const;

// Interface extending Partner for our UI requirements
export interface ExtendedPartner extends Partner {
  city?: string;
  isPreferred?: boolean;
}

export const SEED_PARTNERS: ExtendedPartner[] = [
  {
    id: "part_lawyer_1",
    first: "Mark",
    last: "Fletcher",
    company: "Fletcher & Associate Law Office",
    type: "Lawyers",
    phone: "(705) 555-1092",
    email: "mark@fletcherlawyers.ca",
    website: "fletcherlawyers.ca",
    address: "89 Collier St, Barrie, ON L4M 1H2",
    city: "Barrie",
    role: "Senior Real Estate Partner",
    preferredComm: "email",
    source: "Direct Referral",
    assignedOwner: "David Acosta",
    status: "Preferred",
    isPreferred: true,
    personalityNotes: "Extremely detail-oriented, prefers early email communications, sends regular status updates on closings.",
    notes: "Top tier real estate lawyer in Simcoe County. Known for smooth closing turnarounds even with complex title issues. Highly trusted.",
    referralTags: ["Residential", "Commercial", "Refinance"],
    healthScore: 98,
    addedAt: "2025-01-10T09:00:00.000Z",
    addedBy: "David Acosta",
    timeline: [
      {
        id: "t_law_1",
        date: "2026-06-15",
        type: "coffee",
        text: "Quarterly coffee check-in. Discussed GDS/TDS calculations on alternative deals. Mark committed to fast-tracking Simcoe purchases.",
        author: "David Acosta"
      },
      {
        id: "t_law_2",
        date: "2026-05-20",
        type: "thank_you",
        text: "Sent thank you note for closing the Jackson residential bridge loan perfectly on time.",
        author: "David Acosta"
      }
    ]
  },
  {
    id: "part_realtor_1",
    first: "Sarah",
    last: "Johnson",
    company: "Royal LePage First Contact",
    type: "Realtors",
    phone: "(705) 555-0810",
    email: "sarah.j@royallepage.ca",
    website: "royallepagebarrie.ca",
    address: "112 Bayfield St, Barrie, ON L4M 3B1",
    city: "Barrie",
    role: "Lead Listing Agent",
    preferredComm: "sms",
    source: "Alumni Network",
    assignedOwner: "David Acosta",
    status: "Active",
    isPreferred: true,
    personalityNotes: "Fast paced, prefers direct texting, very active on Instagram, always attends local open houses.",
    notes: "Top-producing realtor in Barrie and Innisfil. Focuses on first-time buyers and upsizers. Generates 4-5 high quality referrals annually.",
    referralTags: ["First-time Buyers", "Innisfil Deals", "Upsizers"],
    healthScore: 92,
    addedAt: "2025-02-14T10:30:00.000Z",
    addedBy: "David Acosta",
    timeline: [
      {
        id: "t_real_1",
        date: "2026-06-22",
        type: "referral_received",
        text: "Referred a young couple looking for a $550k pre-approval in Barrie.",
        author: "David Acosta"
      }
    ]
  },
  {
    id: "part_appraiser_1",
    first: "Derrick",
    last: "Vance",
    company: "Apex Valuation Services",
    type: "Appraisers",
    phone: "(416) 555-8822",
    email: "d.vance@apexvaluations.ca",
    website: "apexvaluations.ca",
    address: "200 Adelaide St W, Toronto, ON M5H 1W7",
    city: "Toronto",
    role: "Chief Appraiser & Director",
    preferredComm: "phone",
    source: "Lender Panel",
    assignedOwner: "Tim Brown",
    status: "Preferred",
    isPreferred: true,
    personalityNotes: "Professional, strictly analytical. Requires all MLS printouts and building sketches up front.",
    notes: "Approved appraiser on major lender lists (TD, Scotiabank, MCAP, First National). Extremely quick turnarounds in the GTA and Simcoe.",
    referralTags: ["Insurable Valuations", "Estate Appraisals", "Stated Income Support"],
    healthScore: 95,
    addedAt: "2025-03-01T08:15:00.000Z",
    addedBy: "Tim Brown",
    timeline: [
      {
        id: "t_app_1",
        date: "2026-06-10",
        type: "call",
        text: "Spoke about current market corrections in Collingwood and appraisal variance thresholds.",
        author: "Tim Brown"
      }
    ]
  },
  {
    id: "part_inspector_1",
    first: "James",
    last: "Sterling",
    company: "Sterling Home Inspections",
    type: "Home Inspectors",
    phone: "(705) 555-7733",
    email: "james@sterlinginspections.ca",
    website: "sterlinginspections.ca",
    address: "42 Maple Ave, Orillia, ON L3V 4Z8",
    city: "Orillia",
    role: "Owner / Inspector",
    preferredComm: "phone",
    source: "Client Recommendation",
    assignedOwner: "David Acosta",
    status: "Occasional",
    isPreferred: false,
    personalityNotes: "Very friendly and down-to-earth, educates clients during walks, provides comprehensive digital PDF reports.",
    notes: "Provides thorough home inspections. Highly liked by buyers for his reassuring and educational demeanor. Good to suggest for Orillia/Barrie.",
    referralTags: ["Century Homes", "Septic Inspection", "Thermal Imaging"],
    healthScore: 85,
    addedAt: "2025-04-12T14:00:00.000Z",
    addedBy: "David Acosta",
    timeline: [
      {
        id: "t_ins_1",
        date: "2026-05-15",
        type: "note",
        text: "James successfully completed an inspection for a home in Orillia, flag raised on structural foundation but solved via professional contractors.",
        author: "David Acosta"
      }
    ]
  },
  {
    id: "part_ins_broker_1",
    first: "Elena",
    last: "Rostova",
    company: "Simcoe Shield Insurance Group",
    type: "Insurance Brokers",
    phone: "(705) 555-2244",
    email: "elena@simcoeshield.ca",
    website: "simcoeshield.ca",
    address: "15 Dunlap St, Barrie, ON L4M 1A2",
    city: "Barrie",
    role: "Principal Commercial & Auto Broker",
    preferredComm: "email",
    source: "Barrie BNI Chapter",
    assignedOwner: "Tim Brown",
    status: "Active",
    isPreferred: false,
    personalityNotes: "Highly responsive, bilingual, very community-focused, runs a large local charity fund.",
    notes: "Great resource for securing quick binder letters of insurance before mortgage closing. Specializes in landlord portfolios and high-value estates.",
    referralTags: ["Home Insurance Binders", "Landlord Portfolios", "Commercial Real Estate"],
    healthScore: 88,
    addedAt: "2025-05-02T11:45:00.000Z",
    addedBy: "Tim Brown",
    timeline: [
      {
        id: "t_insb_1",
        date: "2026-06-08",
        type: "co_marketing",
        text: "Discussed shared marketing flyer for first-time home buyers in Innisfil and Barrie.",
        author: "Tim Brown"
      }
    ]
  },
  {
    id: "part_fin_adv_1",
    first: "Michael",
    last: "Chen",
    company: "Chen Wealth Planning (IG)",
    type: "Financial Advisors",
    phone: "(416) 555-9011",
    email: "m.chen@igwealth.ca",
    website: "chenwealth.ca",
    address: "5000 Yonge St, North York, ON M2N 7E9",
    city: "Toronto",
    role: "Senior Portfolio Manager",
    preferredComm: "meeting",
    source: "Corporate Referral",
    assignedOwner: "David Acosta",
    status: "Active",
    isPreferred: true,
    personalityNotes: "Conservative investment style, highly analytical, focuses on tax-sheltered mortgage paydowns.",
    notes: "Advises high net-worth clients. Refers clients who need custom collateral mortgage structures or equity-takeouts to buy investment properties.",
    referralTags: ["Equity Takeout", "Investment Portfolios", "Corporate Wealth"],
    healthScore: 90,
    addedAt: "2025-01-20T15:20:00.000Z",
    addedBy: "David Acosta",
    timeline: [
      {
        id: "t_fa_1",
        date: "2026-04-18",
        type: "coffee",
        text: "Lunch meeting in Richmond Hill. Michael discussed tax strategies regarding self-employed corporate holding clients.",
        author: "David Acosta"
      }
    ]
  },
  {
    id: "part_accountant_1",
    first: "Robert",
    last: "Gale",
    company: "Gale & Associates CPA",
    type: "Accountants",
    phone: "(705) 555-9900",
    email: "robert@galeandassoc.ca",
    website: "galeandassoc.ca",
    address: "24 Donald St, Barrie, ON L4N 3P8",
    city: "Barrie",
    role: "Managing CPA",
    preferredComm: "email",
    source: "Direct Organic",
    assignedOwner: "David Acosta",
    status: "Preferred",
    isPreferred: true,
    personalityNotes: "Prefers formal communications, highly accurate, requires clear letterheads and business license proof.",
    notes: "Invaluable partner for Stated Income and Self-Employed (BFS) files. Writes perfect, compliance-ready accountant letters for alternative B-Lenders.",
    referralTags: ["BFS Stated Income", "Corporate Tax Filings", "Holding Company Setups"],
    healthScore: 96,
    addedAt: "2025-02-28T09:30:00.000Z",
    addedBy: "David Acosta",
    timeline: [
      {
        id: "t_acc_1",
        date: "2026-06-12",
        type: "call",
        text: "Confirmed details of an corporate structure for a client applying with Home Trust on stated income.",
        author: "David Acosta"
      }
    ]
  },
  {
    id: "part_contractor_1",
    first: "Bill",
    last: "McIntyre",
    company: "Barrie Edge Renovations & Builds",
    type: "Contractors / Renovation",
    phone: "(705) 555-6112",
    email: "bill@barrieedgerenos.ca",
    website: "barrieedgerenos.ca",
    address: "410 Welham Rd, Barrie, ON L4N 8Y4",
    city: "Barrie",
    role: "General Contractor / Founder",
    preferredComm: "phone",
    source: "Realtor Network",
    assignedOwner: "Tim Brown",
    status: "Occasional",
    isPreferred: false,
    personalityNotes: "Practical, honest, sends rough estimates via SMS, always on site.",
    notes: "Extremely useful for 'Purchase Plus Improvements' (PPI) files. Writes detailed, itemized quotes that satisfy strict insurer (CMHC/Sagen) standards.",
    referralTags: ["Purchase Plus Improvements", "Legal Basement Suites", "Structural Upgrades"],
    healthScore: 82,
    addedAt: "2025-06-05T13:10:00.000Z",
    addedBy: "Tim Brown",
    timeline: [
      {
        id: "t_con_1",
        date: "2026-06-01",
        type: "note",
        text: "Helped client secure a $40k renovations quote for their PPI mortgage with Scotiabank.",
        author: "Tim Brown"
      }
    ]
  },
  {
    id: "part_private_lender_1",
    first: "Arthur",
    last: "Pendelton",
    company: "Simcoe Capital Private Wealth",
    type: "Private Lenders",
    phone: "(416) 555-4499",
    email: "apendelton@simcoecapital.ca",
    website: "simcoecapital.ca",
    address: "333 Bay St, Toronto, ON M5H 2R2",
    city: "Toronto",
    role: "Managing Director",
    preferredComm: "phone",
    source: "Industry Contact",
    assignedOwner: "David Acosta",
    status: "Preferred",
    isPreferred: true,
    notes: "High-net-worth individual & syndicate manager. Backs quick second mortgages, bridge files, and interest-only firsts up to 75% LTV in urban centers.",
    referralTags: ["Second Mortgages", "Bridge Loans", "Emergency Financing"],
    healthScore: 94,
    addedAt: "2025-01-15T08:00:00.000Z",
    addedBy: "David Acosta",
    timeline: [
      {
        id: "t_pl_1",
        date: "2026-06-20",
        type: "rate_update",
        text: "Arthur updated his private guidelines: now charging 9.99% for 1st mortgages with 1.5% lender fees. Max 75% LTV in GTA and Barrie.",
        author: "David Acosta"
      }
    ]
  },
  {
    id: "part_b_lender_1",
    first: "Gemma",
    last: "Rowland",
    company: "Community Trust / Alternative Capital",
    type: "B Lenders",
    phone: "(416) 555-5200",
    email: "growland@communitytrust.ca",
    website: "communitytrust.ca",
    address: "2275 Upper Middle Rd E, Oakville, ON L6H 0C3",
    city: "Toronto",
    role: "Senior Business Development Manager",
    preferredComm: "email",
    source: "Lender Direct",
    assignedOwner: "Tim Brown",
    status: "Active",
    isPreferred: true,
    notes: "Our primary B-Lender BDM. Extremely helpful in structuring bruised credit and self-employed files. Responds on weekends during crunch times.",
    referralTags: ["Bruised Credit", "Alt-A Lending", "Self-Employed (BFS)"],
    healthScore: 95,
    addedAt: "2025-02-10T11:00:00.000Z",
    addedBy: "Tim Brown",
    timeline: [
      {
        id: "t_bl_1",
        date: "2026-06-19",
        type: "call",
        text: "Gemma walked through a GDS/TDS manual override on a commercial-residential mix file in Orillia.",
        author: "Tim Brown"
      }
    ]
  },
  {
    id: "part_credit_spec_1",
    first: "Nolan",
    last: "Vanderbilt",
    company: "Credit Builder Canada",
    type: "Credit / Debt Specialists",
    phone: "(888) 555-3099",
    email: "nolan@creditbuildercanada.ca",
    website: "creditbuildercanada.ca",
    address: "100 King St W, Toronto, ON M5X 1A9",
    city: "Toronto",
    role: "Senior Debt Restructuring Consultant",
    preferredComm: "email",
    source: "Direct Organic",
    assignedOwner: "David Acosta",
    status: "Occasional",
    isPreferred: false,
    notes: "Specialist in consumer proposal discharge, credit bureau repair, and debt consolidation counseling. Helps clients qualify for A-Lending in 12-18 months.",
    referralTags: ["Consumer Proposal Repair", "Beacon Score Upgrades", "Debt Settlement"],
    healthScore: 86,
    addedAt: "2025-04-20T10:00:00.000Z",
    addedBy: "David Acosta",
    timeline: [
      {
        id: "t_cs_1",
        date: "2026-05-25",
        type: "note",
        text: "Nolan successfully discharged a consumer proposal for client Marcus Jackson, beacon score boosted from 520 to 640.",
        author: "David Acosta"
      }
    ]
  },
  {
    id: "part_broker_1",
    first: "Timothy",
    last: "Ross",
    company: "Barrie Mortgage Associates (GBK Franchise)",
    type: "Mortgage Agents / Brokers",
    phone: "(705) 555-4033",
    email: "tross@gbkfinancial.ca",
    website: "gbkfinancial.ca",
    address: "112 Bayfield St, Barrie, ON L4M 3B1",
    city: "Barrie",
    role: "Senior Mortgage Broker / Underwriter",
    preferredComm: "meeting",
    source: "Internal Team",
    assignedOwner: "David Acosta",
    status: "Inactive",
    isPreferred: false,
    notes: "Transferred out of state, currently inactive but retained in directory for legacy files mapping.",
    referralTags: ["A-Lending", "Alternative BFS", "Private Financing Portfolio"],
    healthScore: 50,
    addedAt: "2025-01-05T09:00:00.000Z",
    addedBy: "David Acosta",
    timeline: [
      {
        id: "t_mb_1",
        date: "2026-01-10",
        type: "note",
        text: "Timothy moved to Calgary; marked profile as inactive.",
        author: "David Acosta"
      }
    ]
  }
];
