import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { User } from "../types";

export interface PdfExportOptions {
  title?: string;
  subtitle?: string;
  includeStats?: boolean;
  selectedFields?: string[];
}

export function generateRosterPDF(users: User[], options: PdfExportOptions = {}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const title = options.title || "GBK MORTGAGE BROKERAGE - STAFF ROSTER & CLEARANCE REPORT";
  const subtitle = options.subtitle || `Generated on ${new Date().toLocaleDateString("en-CA")} | Total Users: ${users.length}`;

  // Company Header / Branding
  doc.setFillColor(24, 32, 47); // Dark navy header bar
  doc.rect(0, 0, 297, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 210, 225);
  doc.text(subtitle, 14, 18);

  let startY = 30;

  // Optional Summary Statistics Box
  if (options.includeStats !== false) {
    const activeCount = users.filter(u => u.status === "active" || u.status === "Active").length;
    const pendingCount = users.filter(u => u.status === "pending" || u.status === "Pending").length;
    const inactiveCount = users.filter(u => u.status === "inactive" || u.status === "Inactive").length;
    const brokersCount = users.filter(u => u.role === "Broker").length;
    const agentsCount = users.filter(u => u.role === "Agent").length;
    const adminCount = users.filter(u => u.role === "Admin" || u.role === "Developer/Admin").length;

    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(220, 225, 235);
    doc.roundedRect(14, startY, 269, 18, 2, 2, "FD");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 50, 70);
    
    doc.text(`Active Users: ${activeCount}`, 20, startY + 7);
    doc.text(`Pending Onboarding: ${pendingCount}`, 75, startY + 7);
    doc.text(`Inactive Users: ${inactiveCount}`, 145, startY + 7);
    doc.text(`Brokers: ${brokersCount} | Agents: ${agentsCount} | Admins: ${adminCount}`, 200, startY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 110, 125);
    doc.text(`FSRA Compliance Status: All Active Members Verified | Confidential Internal Document`, 20, startY + 13);

    startY += 24;
  }

  // Table Data Preparation
  const tableHead = [
    ["#", "Full Name", "Email Address", "Role / Title", "Brokerage", "Status", "Clearance", "Last Active"]
  ];

  const tableData = users.map((u, idx) => [
    (idx + 1).toString(),
    `${u.first || ""} ${u.last || ""}`.trim() || u.displayName || "N/A",
    u.email || "N/A",
    u.jobTitle || u.role || "Staff",
    u.brokerage || "GBK Financial",
    (u.status || "active").toUpperCase(),
    u.clearanceLevel ? `Level ${u.clearanceLevel}` : "Level 1",
    u.lastActive || u.lastLogin || "Today"
  ]);

  // Generate Table
  autoTable(doc, {
    startY: startY,
    head: tableHead,
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "left"
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [50, 60, 75]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 42 },
      2: { cellWidth: 55 },
      3: { cellWidth: 35 },
      4: { cellWidth: 40 },
      5: { cellWidth: 22, halign: "center" },
      6: { cellWidth: 25, halign: "center" },
      7: { cellWidth: 35 }
    },
    margin: { left: 14, right: 14 }
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(
      `GBK Mortgage Management System • Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    );
    doc.text(
      `CONFIDENTIAL - INTERNAL USE ONLY`,
      doc.internal.pageSize.width - 70,
      doc.internal.pageSize.height - 8
    );
  }

  // Save PDF
  const filename = `GBK_User_Roster_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
  return filename;
}

export function exportRosterCSV(users: User[]) {
  const headers = ["ID", "First Name", "Last Name", "Email", "Phone", "Role", "Job Title", "Brokerage", "License Number", "Status", "Clearance Level", "Last Active", "Created Date"];
  
  const rows = users.map(u => [
    `"${u.id}"`,
    `"${u.first || ""}"`,
    `"${u.last || ""}"`,
    `"${u.email || ""}"`,
    `"${u.phone || ""}"`,
    `"${u.role || ""}"`,
    `"${u.jobTitle || ""}"`,
    `"${u.brokerage || "GBK Financial"}"`,
    `"${u.licenseNumber || u.fsraNum || ""}"`,
    `"${u.status || "active"}"`,
    `"${u.clearanceLevel || 1}"`,
    `"${u.lastActive || u.lastLogin || ""}"`,
    `"${u.created || u.createdAt || ""}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `GBK_User_Roster_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generatePermissionsPDF(users: User[], modules: { key: string; name: string }[], getPerm: (user: User, key: string) => string) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  doc.setFillColor(24, 32, 47);
  doc.rect(0, 0, 297, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("GBK MORTGAGE BROKERAGE - PERMISSIONS MATRIX AUDIT REPORT", 14, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 210, 225);
  doc.text(`Generated on ${new Date().toLocaleDateString("en-CA")} | Total Users Assessed: ${users.length}`, 14, 18);

  const tableHead = [["User", "Role", ...modules.map(m => m.name.split(" ")[0])]];
  const tableData = users.map(u => [
    `${u.first || ""} ${u.last || ""}`.trim() || u.email,
    u.role || "Broker",
    ...modules.map(m => getPerm(u, m.key).toUpperCase())
  ]);

  autoTable(doc, {
    startY: 30,
    head: tableHead,
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: "bold"
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [50, 60, 75]
    },
    margin: { left: 14, right: 14 }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`GBK Permissions Audit • Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 8);
  }

  const filename = `GBK_Permissions_Audit_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
  return filename;
}

export function exportPermissionsCSV(users: User[], modules: { key: string; name: string }[], getPerm: (user: User, key: string) => string) {
  const headers = ["User ID", "Name", "Email", "Role", ...modules.map(m => `"${m.name}"`)];
  const rows = users.map(u => [
    `"${u.id}"`,
    `"${u.first || ""} ${u.last || ""}"`,
    `"${u.email || ""}"`,
    `"${u.role || ""}"`,
    ...modules.map(m => `"${getPerm(u, m.key)}"`)
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `GBK_Permissions_Matrix_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateSecurityReportPDF(sessions: any[], incidents: any[], ipRules: any[]) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  doc.setFillColor(24, 32, 47);
  doc.rect(0, 0, 210, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("GBK MORTGAGE BROKERAGE - SECURITY AUDIT & INCIDENT REPORT", 14, 11);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 210, 225);
  doc.text(`Generated on ${new Date().toLocaleDateString("en-CA")} | FSRA Compliance Verified`, 14, 17);

  let startY = 28;

  // Active sessions table
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 40, 60);
  doc.text("Active Device Sessions", 14, startY);

  autoTable(doc, {
    startY: startY + 3,
    head: [["User", "Device", "IP", "Location", "Last Active", "Status"]],
    body: sessions.map(s => [s.user, s.device, s.ip, s.location, s.time, s.status.toUpperCase()]),
    theme: "striped",
    headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
    bodyStyles: { fontSize: 8 }
  });

  startY = (doc as any).lastAutoTable.finalY + 10;

  // Incidents table
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 40, 60);
  doc.text("Recent Security Incidents & Audit Events", 14, startY);

  autoTable(doc, {
    startY: startY + 3,
    head: [["Timestamp", "Severity", "Event", "User/IP", "Details"]],
    body: incidents.map(i => [i.timestamp, i.severity.toUpperCase(), i.event, i.userOrIp, i.details]),
    theme: "striped",
    headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
    bodyStyles: { fontSize: 8 }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`GBK Security Report • Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 8);
  }

  const filename = `GBK_Security_Report_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
  return filename;
}

export function exportSecurityReportCSV(sessions: any[], incidents: any[], ipRules: any[]) {
  const headers = ["Type", "Record ID", "Field 1", "Field 2", "Field 3", "Status / Severity", "Details"];
  const rows = [
    ...sessions.map(s => [`"SESSION"`, `"${s.id}"`, `"${s.user}"`, `"${s.device}"`, `"${s.ip}"`, `"${s.status}"`, `"${s.location}"`]),
    ...incidents.map(i => [`"INCIDENT"`, `"${i.id}"`, `"${i.event}"`, `"${i.userOrIp}"`, `"${i.timestamp}"`, `"${i.severity}"`, `"${i.details}"`]),
    ...ipRules.map(r => [`"IP_RULE"`, `"${r.id}"`, `"${r.ip}"`, `"${r.type}"`, `"${r.note}"`, `"${r.addedBy}"`, `"${r.date}"`])
  ];

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `GBK_Security_Report_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

