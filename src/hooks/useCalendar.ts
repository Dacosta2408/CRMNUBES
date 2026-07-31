import { useState, useEffect } from "react";
import { Event } from "../types";
import { DEFAULT_CLIENTS } from "../data";
import { safeJsonParse } from "../lib/json";

function fiso(d: Date) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function useCalendar() {
  const [events, setEvents] = useState<Event[]>(() => {
    const saved = localStorage.getItem("gbk_events");
    const initialEvents: Event[] = [];
    const yearStr = new Date().getFullYear();
    const monthStr = String(new Date().getMonth() + 1).padStart(2, "0");

    DEFAULT_CLIENTS.forEach(c => {
      if (c.dob) {
        const d = new Date(c.dob);
        initialEvents.push({
          id: `bd_${c.id}`,
          title: `🎂 ${c.first} ${c.last}'s Birthday`,
          date: `${yearStr}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
          type: "birthday",
          clientId: c.id,
          createdBy: "System"
        });
      }
    });

    // Add high-quality mortgage CRM events
    initialEvents.push(
      {
        id: "ev_1",
        title: "TD BDM Appraisal Review - David Martinez",
        date: `${yearStr}-${monthStr}-22`,
        time: "10:00",
        type: "lender",
        clientId: "c_smith",
        notes: "Discuss appraisal valuation on Simcoe property with Sarah Jenkins.",
        createdBy: "System"
      },
      {
        id: "ev_2",
        title: "Martinez Commitment Sign-off Call",
        date: `${yearStr}-${monthStr}-22`,
        time: "14:00",
        type: "client",
        clientId: "c_smith",
        notes: "Review commitment conditions and collect outstanding paystubs.",
        createdBy: "System"
      },
      {
        id: "ev_3",
        title: "RBC Rate Lock Strategy Review",
        date: `${yearStr}-${monthStr}-23`,
        time: "11:30",
        type: "meeting",
        clientId: "c_chen",
        notes: "Analyze GDS/TDS ratios and explore 5-year fixed lock options.",
        createdBy: "System"
      },
      {
        id: "ev_4",
        title: "Stated Income BFS Underwriting Audit",
        date: `${yearStr}-${monthStr}-23`,
        time: "16:00",
        type: "lender",
        clientId: "c_chen",
        notes: "Internal files audit with Wayne on self-employed documentation guidelines.",
        createdBy: "System"
      },
      {
        id: "ev_5",
        title: "Sarah Thompson NOA Verification call",
        date: `${yearStr}-${monthStr}-24`,
        time: "09:30",
        type: "client",
        clientId: "c_thompson",
        notes: "Verification of Notice of Assessments for Sarah Thompson pre-approval.",
        createdBy: "System"
      },
      {
        id: "ev_6",
        title: "First National Escalation Sync",
        date: `${yearStr}-${monthStr}-24`,
        time: "13:00",
        type: "lender",
        notes: "BDM escalation call regarding underwriting pre-approval exception.",
        createdBy: "System"
      },
      {
        id: "ev_7",
        title: "GBK Team Weekly Pipeline Review",
        date: `${yearStr}-${monthStr}-24`,
        time: "15:30",
        type: "meeting",
        notes: "Brokerage-wide active deals review with Tim Brown and Jamey Brown.",
        createdBy: "System"
      },
      {
        id: "ev_8",
        title: "Equity Bank Alt-A BFS Submission",
        date: `${yearStr}-${monthStr}-25`,
        time: "11:00",
        type: "lender",
        notes: "Submit and pitch stated income file to Equitable Bank.",
        createdBy: "System"
      },
      {
        id: "ev_9",
        title: "Henderson Firm Approval Milestone",
        date: `${yearStr}-${monthStr}-26`,
        time: "10:00",
        type: "client",
        notes: "Closing and firm sign-off celebration with the buyers.",
        createdBy: "System"
      }
    );

    if (saved) {
      const parsed = safeJsonParse(saved, []);
      if (Array.isArray(parsed) && !parsed.some((e: any) => e?.id && String(e.id).startsWith("ev_"))) {
        localStorage.setItem("gbk_events", JSON.stringify(initialEvents));
        return initialEvents;
      }
      return parsed;
    }

    localStorage.setItem("gbk_events", JSON.stringify(initialEvents));
    return initialEvents;
  });

  const [calDate, setCalDate] = useState<Date>(new Date());
  const [calSelectedDate, setCalSelectedDate] = useState<string | null>(fiso(new Date()));
  const [calEventModalOpen, setCalEventModalOpen] = useState<boolean>(false);

  // Persist events to localStorage via useEffect
  useEffect(() => {
    localStorage.setItem("gbk_events", JSON.stringify(events));
  }, [events]);

  return {
    events,
    setEvents,
    calDate,
    setCalDate,
    calSelectedDate,
    setCalSelectedDate,
    calEventModalOpen,
    setCalEventModalOpen
  };
}
