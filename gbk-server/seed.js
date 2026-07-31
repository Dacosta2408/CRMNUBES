const fs = require("fs");
const path = require("path");
require("dotenv").config();

const getRootPath = () => {
  return path.normalize(process.env.GBK_ROOT_PATH || "./gbk-crm-data");
};

function seed() {
  const root = getRootPath();
  console.log(`Starting seed script... Root path is: ${root}`);

  // 1. Create Base directories
  const directories = [
    path.join(root, "Clients"),
    path.join(root, "Lenders"),
    path.join(root, "Templates"),
    path.join(root, "System")
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created base folder: ${dir}`);
    } else {
      console.log(`Base folder already exists: ${dir}`);
    }
  });

  // 2. Create System Roster
  const rosterPath = path.join(root, "System", "roster.json");
  if (!fs.existsSync(rosterPath)) {
    const defaultRoster = [
      {
        id: "owner-david",
        first: "David",
        last: "Acosta",
        email: "VDacosta247@gmail.com",
        role: "Owner / Master Admin",
        status: "active",
        phone: "+1 (416) 555-0199",
        pin: "1234",
        lastLogin: new Date().toISOString(),
        created: "2026-01-01",
        isOwner: true,
        displayName: "David Acosta",
        jobTitle: "Principal Broker"
      }
    ];
    fs.writeFileSync(rosterPath, JSON.stringify(defaultRoster, null, 2), "utf8");
    console.log(`Created default roster: ${rosterPath}`);
  } else {
    console.log(`Roster already exists, skipping.`);
  }

  // 3. Create empty Lenders, Templates, and Audit Logs if not present
  const filesToInitialize = [
    { filePath: path.join(root, "Lenders", "lenders.json"), defaultVal: [] },
    { filePath: path.join(root, "Templates", "templates.json"), defaultVal: [] },
    { filePath: path.join(root, "System", "audit_logs.json"), defaultVal: [] },
    { filePath: path.join(root, "System", "broadcasts.json"), defaultVal: [] }
  ];

  filesToInitialize.forEach(f => {
    if (!fs.existsSync(f.filePath)) {
      fs.mkdirSync(path.dirname(f.filePath), { recursive: true });
      fs.writeFileSync(f.filePath, JSON.stringify(f.defaultVal, null, 2), "utf8");
      console.log(`Initialized empty file: ${f.filePath}`);
    } else {
      console.log(`File already exists, skipping: ${f.filePath}`);
    }
  });

  // 4. Generate 10 mock clients
  const mockClients = [
    {
      id: "client-01",
      first: "Emily",
      last: "Campbell",
      email: "emily.campbell@example.ca",
      cell: "416-555-0143",
      dob: "1988-04-12",
      marital: "Married",
      sin: "123-456-789",
      dep: 2,
      income: 115000,
      coIncome: 85000,
      emptype: "Salary",
      beacon: 780,
      propval: 850000,
      mtgamt: 600000,
      debts: 350,
      tax: 4200,
      condo: 0,
      heat: 120,
      addr: "142 Yonge St, Toronto, ON",
      proptype: "Detached",
      tenure: "Freehold",
      lender: "TD Bank",
      status: "approved",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "client-02",
      first: "Marcus",
      last: "Gauthier",
      email: "marcus.g@example.ca",
      cell: "514-555-0177",
      dob: "1984-11-23",
      marital: "Single",
      sin: "987-654-321",
      dep: 0,
      income: 95000,
      emptype: "Salary",
      beacon: 720,
      propval: 450000,
      mtgamt: 320000,
      debts: 150,
      tax: 3100,
      condo: 350,
      heat: 90,
      addr: "450 Rue Saint-Catherine, Montreal, QC",
      proptype: "Condo Apartment",
      tenure: "Condominium",
      lender: "RBC",
      status: "working",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "client-03",
      first: "Liam",
      last: "O'Connor",
      email: "liam.oconnor@example.ca",
      cell: "604-555-0121",
      dob: "1991-07-04",
      marital: "Married",
      sin: "555-666-777",
      dep: 1,
      income: 140000,
      coIncome: 65000,
      emptype: "Self-Employed",
      beacon: 745,
      propval: 1200000,
      mtgamt: 800000,
      debts: 600,
      tax: 5800,
      condo: 0,
      heat: 150,
      addr: "2890 West Broadway, Vancouver, BC",
      proptype: "Detached",
      tenure: "Freehold",
      lender: "Scotiabank",
      status: "lead",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "client-04",
      first: "Aaliyah",
      last: "Hassan",
      email: "aaliyah.h@example.ca",
      cell: "587-555-0198",
      dob: "1995-02-18",
      marital: "Single",
      sin: "333-444-555",
      dep: 0,
      income: 88000,
      emptype: "Salary",
      beacon: 810,
      propval: 520000,
      mtgamt: 380000,
      debts: 0,
      tax: 3400,
      condo: 0,
      heat: 100,
      addr: "10130 103 St NW, Edmonton, AB",
      proptype: "Townhouse",
      tenure: "Freehold",
      lender: "BMO",
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "client-05",
      first: "Benjamin",
      last: "Smith",
      email: "ben.smith@example.ca",
      cell: "902-555-0134",
      dob: "1979-09-30",
      marital: "Married",
      sin: "222-888-999",
      dep: 3,
      income: 105000,
      coIncome: 40000,
      emptype: "Salary",
      beacon: 690,
      propval: 380000,
      mtgamt: 290000,
      debts: 450,
      tax: 2800,
      condo: 0,
      heat: 110,
      addr: "1680 Barrington St, Halifax, NS",
      proptype: "Detached",
      tenure: "Freehold",
      lender: "CIBC",
      status: "lender",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "client-06",
      first: "Chloe",
      last: "Tremblay",
      email: "chloe.tremblay@example.ca",
      cell: "418-555-0182",
      dob: "1990-05-15",
      marital: "Married",
      sin: "111-222-333",
      dep: 1,
      income: 90000,
      coIncome: 90000,
      emptype: "Salary",
      beacon: 760,
      propval: 600000,
      mtgamt: 450000,
      debts: 200,
      tax: 3600,
      condo: 150,
      heat: 115,
      addr: "750 Grande Allee E, Quebec City, QC",
      proptype: "Semi-Detached",
      tenure: "Freehold",
      lender: "Desjardins",
      status: "conditional",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "client-07",
      first: "Jackson",
      last: "Wong",
      email: "jackson.wong@example.ca",
      cell: "778-555-0111",
      dob: "1986-12-05",
      marital: "Single",
      sin: "444-555-666",
      dep: 0,
      income: 155000,
      emptype: "Self-Employed",
      beacon: 805,
      propval: 950000,
      mtgamt: 650000,
      debts: 100,
      tax: 4800,
      condo: 420,
      heat: 80,
      addr: "888 Beach Ave, Vancouver, BC",
      proptype: "Condo Apartment",
      tenure: "Condominium",
      lender: "TD Bank",
      status: "funded",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "client-08",
      first: "Sophia",
      last: "Ivanov",
      email: "sophia.ivanov@example.ca",
      cell: "204-555-0165",
      dob: "1992-08-22",
      marital: "Married",
      sin: "777-888-999",
      dep: 2,
      income: 78000,
      coIncome: 72000,
      emptype: "Salary",
      beacon: 730,
      propval: 410000,
      mtgamt: 300000,
      debts: 300,
      tax: 2900,
      condo: 0,
      heat: 130,
      addr: "350 Portage Ave, Winnipeg, MB",
      proptype: "Detached",
      tenure: "Freehold",
      lender: "MCAP",
      status: "closed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "client-09",
      first: "Lucas",
      last: "Silva",
      email: "lucas.silva@example.ca",
      cell: "403-555-0155",
      dob: "1983-03-14",
      marital: "Single",
      sin: "123-987-456",
      dep: 1,
      income: 110000,
      emptype: "Salary",
      beacon: 715,
      propval: 580000,
      mtgamt: 400000,
      debts: 500,
      tax: 3800,
      condo: 250,
      heat: 100,
      addr: "1230 8 Ave SW, Calgary, AB",
      proptype: "Townhouse",
      tenure: "Condominium",
      lender: "First National",
      status: "working",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "client-10",
      first: "Zoe",
      last: "MacDonald",
      email: "zoe.macdonald@example.ca",
      cell: "902-555-0100",
      dob: "1987-10-10",
      marital: "Single",
      sin: "888-999-000",
      dep: 0,
      income: 82000,
      emptype: "Salary",
      beacon: 755,
      propval: 320000,
      mtgamt: 240000,
      debts: 250,
      tax: 2400,
      condo: 0,
      heat: 95,
      addr: "56 Queen St, Charlottetown, PE",
      proptype: "Detached",
      tenure: "Freehold",
      lender: "RBC",
      status: "lead",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  mockClients.forEach(client => {
    const letter = client.last[0].toUpperCase();
    const folderName = `${client.last} ${client.first}`;
    const clientDir = path.join(root, "Clients", letter, folderName);

    // Create client directory if it doesn't exist
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
      console.log(`Created client folder: ${clientDir}`);
    }

    const clientJsonPath = path.join(clientDir, "client.json");
    const notesJsonPath = path.join(clientDir, "notes.json");
    const tasksJsonPath = path.join(clientDir, "tasks.json");
    const documentsDir = path.join(clientDir, "documents");

    if (!fs.existsSync(clientJsonPath)) {
      fs.writeFileSync(clientJsonPath, JSON.stringify(client, null, 2), "utf8");
      console.log(`Created: ${clientJsonPath}`);
    } else {
      console.log(`File already exists: ${clientJsonPath}`);
    }

    if (!fs.existsSync(notesJsonPath)) {
      fs.writeFileSync(notesJsonPath, JSON.stringify([], null, 2), "utf8");
      console.log(`Created: ${notesJsonPath}`);
    }

    if (!fs.existsSync(tasksJsonPath)) {
      fs.writeFileSync(tasksJsonPath, JSON.stringify([], null, 2), "utf8");
      console.log(`Created: ${tasksJsonPath}`);
    }

    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
      console.log(`Created documents directory: ${documentsDir}`);
    }
  });

  console.log("Seeding complete!");
}

seed();
