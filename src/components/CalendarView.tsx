import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  motion, AnimatePresence 
} from "motion/react";
import { 
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, 
  Plus, CheckSquare, Edit3, Trash2, X, AlertCircle, HelpCircle, 
  Check, Info, Sparkles, User, ListFilter, Layers, ArrowRight,
  MapPin, Bell, Star, AlertTriangle, Play, Settings, Lock, Copy,
  SlidersHorizontal, Filter
} from "lucide-react";
import { Event, Task, Client, User as UserType } from "../types";
import { formatDateInTimeZone, useUserTimeZone } from "../lib/timeUtils";

// Extended Event typing for optional duration support (in minutes)
interface CalendarEvent extends Event {
  duration?: number; // duration in minutes
  status?: "scheduled" | "completed" | "canceled";
  reminder?: "none" | "15m" | "30m" | "1h" | "1d";
  isPrivate?: boolean;
}

// Helper to match events with flexible 15-minute slot range
const isEventInSlot = (evTime: string | undefined, slotTime: string): boolean => {
  if (!evTime) return false;
  const [evH, evM] = evTime.split(":").map(Number);
  if (isNaN(evH) || isNaN(evM)) return false;
  const evMins = evH * 60 + evM;

  const [slotH, slotM] = slotTime.split(":").map(Number);
  if (isNaN(slotH) || isNaN(slotM)) return false;
  const slotMins = slotH * 60 + slotM;

  return evMins >= slotMins && evMins < slotMins + 15;
};

interface CalendarViewProps {
  events: Event[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  clients: Client[];
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning", icon?: string) => void;
  calendarLaunchIntent?: { clientId?: string; dateStr?: string; timeStr?: string; openModal?: boolean } | null;
  clearCalendarLaunchIntent?: () => void;
  currentUser?: UserType;
  userRoster?: UserType[];
}

const QuickActionButton: React.FC<{
  onClick: (e: React.MouseEvent) => void;
  title: string;
  variant: "done" | "cancel" | "copy" | "plus1" | "plus7" | "edit" | "delete";
  showLabel?: boolean;
}> = ({ onClick, title, variant, showLabel = false }) => {
  let baseClasses = "flex items-center justify-center rounded-xl border font-extrabold text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:scale-102 active:scale-95 gap-1.5 ";
  let icon: React.ReactNode = null;
  let text = "";

  switch (variant) {
    case "done":
      baseClasses += "bg-[var(--color-success-subtle)] border-[var(--color-success)]/15 text-[var(--color-success)] hover:bg-[var(--color-success)]/15 hover:border-[var(--color-success)]/40";
      icon = <Check className="w-3.5 h-3.5" />;
      text = "Done";
      break;
    case "cancel":
      baseClasses += "bg-[var(--color-warning-subtle)] border-[var(--color-warning)]/15 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/15 hover:border-[var(--color-warning)]/40";
      icon = <X className="w-3.5 h-3.5" />;
      text = "Cancel";
      break;
    case "copy":
      baseClasses += "bg-[var(--color-calendar-selected-bg)]/10 border-[var(--color-calendar-selected-bg)]/20 text-[var(--color-calendar-strong-text)] hover:bg-[var(--color-calendar-selected-bg)]/20 hover:border-[var(--color-calendar-selected-bg)]/40";
      icon = <Copy className="w-3.5 h-3.5" />;
      text = "Copy";
      break;
    case "plus1":
      baseClasses += "bg-[var(--color-calendar-selected-bg)]/10 border-[var(--color-calendar-selected-bg)]/20 text-[var(--color-calendar-strong-text)] hover:bg-[var(--color-calendar-selected-bg)]/20 hover:border-[var(--color-calendar-selected-bg)]/40";
      text = "+1d";
      break;
    case "plus7":
      baseClasses += "bg-[var(--color-calendar-selected-bg)]/10 border-[var(--color-calendar-selected-bg)]/20 text-[var(--color-calendar-strong-text)] hover:bg-[var(--color-calendar-selected-bg)]/20 hover:border-[var(--color-calendar-selected-bg)]/40";
      text = "+7d";
      break;
    case "edit":
      baseClasses += "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-3)] hover:border-[var(--color-border)]/85";
      icon = <Edit3 className="w-3.5 h-3.5" />;
      text = "Edit";
      break;
    case "delete":
      baseClasses += "bg-[var(--color-error-subtle)] border-[var(--color-error)]/15 text-[var(--color-error)] hover:bg-[var(--color-error)]/15 hover:border-[var(--color-error)]/40";
      icon = <Trash2 className="w-3.5 h-3.5" />;
      text = "Delete";
      break;
  }

  // Adjust padding based on whether we have label or only icon
  const hasLabel = showLabel || !icon;
  const paddingClasses = hasLabel ? "p-1.5 px-2.5" : "p-2";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${paddingClasses}`}
      title={title}
    >
      {icon}
      {hasLabel && <span>{text}</span>}
    </button>
  );
};

interface CanadianHoliday {
  date: string;
  name: string;
  regions: string[];
}

const CANADIAN_HOLIDAYS: CanadianHoliday[] = [
  // 2024
  { date: "2024-01-01", name: "New Year's Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2024-02-19", name: "Family Day", regions: ["ON", "BC", "AB"] },
  { date: "2024-03-29", name: "Good Friday", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2024-05-20", name: "Victoria Day", regions: ["ON", "BC", "AB"] },
  { date: "2024-05-20", name: "National Patriots' Day", regions: ["QC"] },
  { date: "2024-06-24", name: "Fête Nationale", regions: ["QC"] },
  { date: "2024-07-01", name: "Canada Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2024-08-05", name: "Civic Holiday", regions: ["ON"] },
  { date: "2024-08-05", name: "British Columbia Day", regions: ["BC"] },
  { date: "2024-08-05", name: "Heritage Day", regions: ["AB"] },
  { date: "2024-09-02", name: "Labour Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2024-09-30", name: "National Day for Truth and Reconciliation", regions: ["BC", "ON"] },
  { date: "2024-10-14", name: "Thanksgiving", regions: ["ON", "BC", "AB"] },
  { date: "2024-11-11", name: "Remembrance Day", regions: ["BC", "AB"] },
  { date: "2024-12-25", name: "Christmas Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2024-12-26", name: "Boxing Day", regions: ["ON"] },

  // 2025
  { date: "2025-01-01", name: "New Year's Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2025-02-17", name: "Family Day", regions: ["ON", "BC", "AB"] },
  { date: "2025-04-18", name: "Good Friday", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2025-05-19", name: "Victoria Day", regions: ["ON", "BC", "AB"] },
  { date: "2025-05-19", name: "National Patriots' Day", regions: ["QC"] },
  { date: "2025-06-24", name: "Fête Nationale", regions: ["QC"] },
  { date: "2025-07-01", name: "Canada Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2025-08-04", name: "Civic Holiday", regions: ["ON"] },
  { date: "2025-08-04", name: "British Columbia Day", regions: ["BC"] },
  { date: "2025-08-04", name: "Heritage Day", regions: ["AB"] },
  { date: "2025-09-01", name: "Labour Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2025-09-30", name: "National Day for Truth and Reconciliation", regions: ["BC", "ON"] },
  { date: "2025-10-13", name: "Thanksgiving", regions: ["ON", "BC", "AB"] },
  { date: "2025-11-11", name: "Remembrance Day", regions: ["BC", "AB"] },
  { date: "2025-12-25", name: "Christmas Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2025-12-26", name: "Boxing Day", regions: ["ON"] },

  // 2026
  { date: "2026-01-01", name: "New Year's Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2026-02-16", name: "Family Day", regions: ["ON", "BC", "AB"] },
  { date: "2026-04-03", name: "Good Friday", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2026-05-18", name: "Victoria Day", regions: ["ON", "BC", "AB"] },
  { date: "2026-05-18", name: "National Patriots' Day", regions: ["QC"] },
  { date: "2026-06-24", name: "Fête Nationale", regions: ["QC"] },
  { date: "2026-07-01", name: "Canada Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2026-08-03", name: "Civic Holiday", regions: ["ON"] },
  { date: "2026-08-03", name: "British Columbia Day", regions: ["BC"] },
  { date: "2026-08-03", name: "Heritage Day", regions: ["AB"] },
  { date: "2026-09-07", name: "Labour Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2026-09-30", name: "National Day for Truth and Reconciliation", regions: ["BC", "ON"] },
  { date: "2026-10-12", name: "Thanksgiving", regions: ["ON", "BC", "AB"] },
  { date: "2026-11-11", name: "Remembrance Day", regions: ["BC", "AB"] },
  { date: "2026-12-25", name: "Christmas Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2026-12-26", name: "Boxing Day", regions: ["ON"] },

  // 2027
  { date: "2027-01-01", name: "New Year's Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2027-02-15", name: "Family Day", regions: ["ON", "BC", "AB"] },
  { date: "2027-03-26", name: "Good Friday", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2027-05-24", name: "Victoria Day", regions: ["ON", "BC", "AB"] },
  { date: "2027-05-24", name: "National Patriots' Day", regions: ["QC"] },
  { date: "2027-06-24", name: "Fête Nationale", regions: ["QC"] },
  { date: "2027-07-01", name: "Canada Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2027-08-02", name: "Civic Holiday", regions: ["ON"] },
  { date: "2027-08-02", name: "British Columbia Day", regions: ["BC"] },
  { date: "2027-08-02", name: "Heritage Day", regions: ["AB"] },
  { date: "2027-09-06", name: "Labour Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2027-09-30", name: "National Day for Truth and Reconciliation", regions: ["BC", "ON"] },
  { date: "2027-10-11", name: "Thanksgiving", regions: ["ON", "BC", "AB"] },
  { date: "2027-11-11", name: "Remembrance Day", regions: ["BC", "AB"] },
  { date: "2027-12-25", name: "Christmas Day", regions: ["ON", "BC", "AB", "QC"] },
  { date: "2027-12-26", name: "Boxing Day", regions: ["ON"] }
];

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  setEvents,
  tasks,
  setTasks,
  clients,
  showToast,
  calendarLaunchIntent,
  clearCalendarLaunchIntent,
  currentUser,
  userRoster
}) => {
  const userTz = useUserTimeZone();
  // Calendar settings state
  const [defaultView, setDefaultView] = useState<"day" | "week" | "month" | "list">("week");
  const [calendarSettingsOpen, setCalendarSettingsOpen] = useState(false);
  const [workdayStartHour, setWorkdayStartHour] = useState<number>(8);
  const [workdayEndHour, setWorkdayEndHour] = useState<number>(18);
  const [slotInterval, setSlotInterval] = useState<15 | 30>(15);
  const [defaultDuration, setDefaultDuration] = useState<number>(60);
  const [holidayRegion, setHolidayRegion] = useState<string>("ON");

  // User permission and selected calendar owner state
  const canViewOtherCalendars = useMemo(() => {
    const role = (currentUser?.role || "").toLowerCase();
    return role.includes("admin") || role.includes("manager");
  }, [currentUser]);

  const [selectedCalendarOwner, setSelectedCalendarOwner] = useState<string>(() => {
    return canViewOtherCalendars ? "all" : (currentUser?.id || "all");
  });

  // Regular users are locked to their own calendar
  useEffect(() => {
    if (!canViewOtherCalendars && currentUser?.id) {
      setSelectedCalendarOwner(currentUser.id);
    }
  }, [currentUser, canViewOtherCalendars]);

  // Navigation & view mode controls
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterLinkedOnly, setFilterLinkedOnly] = useState<boolean>(false);
  const [filterPrivateOnly, setFilterPrivateOnly] = useState<boolean>(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month" | "list">(defaultView);

  // Drag to create duration on Day timeline view
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartSlot, setDragStartSlot] = useState<string | null>(null); // e.g., "09:00"
  const [dragEndSlot, setDragEndSlot] = useState<string | null>(null); // e.g., "10:30"
  const [dragOccurred, setDragOccurred] = useState<boolean>(false);

  // Scroll handler for timelines
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to working hours start inside Day/Week timelines on render
  useEffect(() => {
    if (viewMode === "day" || viewMode === "week") {
      setTimeout(() => {
        const id = `hour-slot-${String(workdayStartHour).padStart(2, "0")}`;
        const matchingElem = document.getElementById(id);
        if (matchingElem && timelineScrollRef.current) {
          timelineScrollRef.current.scrollTop = matchingElem.offsetTop - 40;
        }
      }, 100);
    }
  }, [viewMode, selectedDateStr, workdayStartHour]);

  // Keep selectedDateStr visually synchronized with currentDate when currentDate changes
  useEffect(() => {
    if (currentDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      const formatted = `${year}-${month}-${day}`;
      if (selectedDateStr !== formatted) {
        setSelectedDateStr(formatted);
      }
    }
  }, [currentDate, selectedDateStr]);

  // Handle launch intent from other CRM records
  useEffect(() => {
    if (calendarLaunchIntent) {
      const { clientId, dateStr, timeStr, openModal } = calendarLaunchIntent;
      
      if (dateStr) {
        setSelectedDateStr(dateStr);
        try {
          const d = new Date(dateStr + "T12:00:00");
          if (!isNaN(d.getTime())) {
            setCurrentDate(d);
          }
        } catch (err) {
          console.error("Failed to parse date from calendarLaunchIntent:", err);
        }
      }

      if (openModal) {
        // Trigger opening of add modal with pre-populated values
        handleOpenAddModal(dateStr, timeStr, clientId);
      }

      // Clear the intent immediately
      clearCalendarLaunchIntent?.();
    }
  }, [calendarLaunchIntent, clearCalendarLaunchIntent]);

  // Task & Event editing wizardry
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [pendingDeleteEventId, setPendingDeleteEventId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);

  // Form states and enhancements
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventDuration, setEventDuration] = useState<number>(60); // Default minutes
  const [eventType, setEventType] = useState<Event["type"]>("meeting");
  const [eventNotes, setEventNotes] = useState("");
  const [eventClientId, setEventClientId] = useState<string>("");

  // CRM Activity states
  const [eventStatus, setEventStatus] = useState<"scheduled" | "completed" | "canceled">("scheduled");
  const [eventReminder, setEventReminder] = useState<"none" | "15m" | "30m" | "1h" | "1d">("none");
  const [eventIsPrivate, setEventIsPrivate] = useState<boolean>(false);
  const [createFollowUp, setCreateFollowUp] = useState<boolean>(false);
  const [followUpDate, setFollowUpDate] = useState<string>("");
  const [followUpTime, setFollowUpTime] = useState<string>("");
  const [followUpTitle, setFollowUpTitle] = useState<string>("");

  // Search states for client lookup inside the modal
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientSearchOpen, setClientSearchOpen] = useState(false);

  // Derived selected client helper
  const selectedLinkedClient = clients.find(c => c.id === eventClientId) || null;

  // Filtered clients list for the search input dropdown, limited to 8
  const filteredClients = useMemo(() => {
    const q = clientSearchQuery.trim().toLowerCase();
    if (!q) {
      // Return first 8 clients if query is empty so they can be selected quickly upon focus
      return clients.slice(0, 8);
    }
    return clients.filter(cl => {
      const first = (cl.first || "").toLowerCase();
      const last = (cl.last || "").toLowerCase();
      const email = (cl.email || "").toLowerCase();
      const cell = (cl.cell || "").toLowerCase();
      const addr = (cl.addr || "").toLowerCase();
      return (
        first.includes(q) ||
        last.includes(q) ||
        email.includes(q) ||
        cell.includes(q) ||
        addr.includes(q) ||
        `${first} ${last}`.includes(q)
      );
    }).slice(0, 8);
  }, [clients, clientSearchQuery]);

  // Helpers to fetch month and year details
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  // List of event types with professional visual parameters
  const eventTypes = [
    { value: "meeting", label: "Meeting / Call", color: "bg-[#DAA428]", border: "border-[#DAA428]/25", text: "text-[#B47D1C] dark:text-[#F9B17A]", lightBg: "bg-[#DAA428]/10", glow: "shadow-[0_0_12px_rgba(218,164,40,0.15)]" },
    { value: "client", label: "Client Deadline", color: "bg-[#F9B17A]", border: "border-[#F9B17A]/25", text: "text-[#9E5D2A] dark:text-[#F9B17A]", lightBg: "bg-[#F9B17A]/10", glow: "shadow-[0_0_12px_rgba(249,177,122,0.15)]" },
    { value: "lender", label: "Lender Review", color: "bg-[#676F9D]", border: "border-[#676F9D]/25", text: "text-[#424769] dark:text-[#9FB4CC]", lightBg: "bg-[#676F9D]/10", glow: "shadow-[0_0_12px_rgba(103,111,157,0.15)]" },
    { value: "personal", label: "Personal Task", color: "bg-[#424769]", border: "border-[#424769]/25", text: "text-[#2D3250] dark:text-[#C8D8E8]", lightBg: "bg-[#424769]/10", glow: "shadow-[0_0_12px_rgba(66,71,105,0.15)]" },
    { value: "holiday", label: "Stat Holiday", color: "bg-[#C2B19D]", border: "border-[#C2B19D]/25", text: "text-[#7A6451] dark:text-[#E2D5C2]", lightBg: "bg-[#C2B19D]/10", glow: "shadow-[0_0_12px_rgba(194,177,157,0.15)]" },
    { value: "birthday", label: "Birthday Greeting", color: "bg-[#F4A384]", border: "border-[#F4A384]/25", text: "text-[#9E4A2A] dark:text-[#F4A384]", lightBg: "bg-[#F4A384]/10", glow: "shadow-[0_0_12px_rgba(244,163,132,0.15)]" }
  ];

  const getTypeColor = (type: string) => {
    return eventTypes.find(t => t.value === type) || {
      color: "bg-gray-500",
      border: "border-gray-500/25",
      text: "text-gray-400",
      lightBg: "bg-gray-500/10",
      glow: ""
    };
  };

  // Build current week dates based on selectedDateStr (Mon-Sun)
  const weekDays = useMemo(() => {
    const selected = new Date(selectedDateStr + "T00:00:00");
    const dayOfWeek = selected.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = selected.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(selected.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dateStr = day.toISOString().split("T")[0];
      days.push({
        dateStr,
        dayNum: day.getDate(),
        dayLabel: day.toLocaleDateString("en-US", { weekday: "short" }), // e.g., "Mon"
        fullLabel: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isToday: dateStr === new Date().toISOString().split("T")[0],
        isCurrentMonth: day.getMonth() === currentMonth
      });
    }
    return days;
  }, [selectedDateStr, currentMonth]);

  // Build monthly grid dates
  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const firstDayIndex = firstDayOfMonth.getDay(); 
    const totalDays = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Prev month padding
    const paddingCount = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Align to start on Monday
    for (let i = paddingCount - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === new Date().toISOString().split("T")[0]
      });
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
        isToday: dateStr === new Date().toISOString().split("T")[0]
      });
    }

    // Next month padding to fill grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        isToday: dateStr === new Date().toISOString().split("T")[0]
      });
    }

    return days;
  }, [currentMonth, currentYear]);

  // Navigate month
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Navigate days/weeks
  const prevTimeFrame = () => {
    if (viewMode === "day") {
      const current = new Date(selectedDateStr + "T00:00:00");
      current.setDate(current.getDate() - 1);
      const nextStr = current.toISOString().split("T")[0];
      setSelectedDateStr(nextStr);
      setCurrentDate(current);
    } else if (viewMode === "week") {
      const current = new Date(selectedDateStr + "T00:00:00");
      current.setDate(current.getDate() - 7);
      const nextStr = current.toISOString().split("T")[0];
      setSelectedDateStr(nextStr);
      setCurrentDate(current);
    } else {
      prevMonth();
    }
  };

  const nextTimeFrame = () => {
    if (viewMode === "day") {
      const current = new Date(selectedDateStr + "T00:00:00");
      current.setDate(current.getDate() + 1);
      const nextStr = current.toISOString().split("T")[0];
      setSelectedDateStr(nextStr);
      setCurrentDate(current);
    } else if (viewMode === "week") {
      const current = new Date(selectedDateStr + "T00:00:00");
      current.setDate(current.getDate() + 7);
      const nextStr = current.toISOString().split("T")[0];
      setSelectedDateStr(nextStr);
      setCurrentDate(current);
    } else {
      nextMonth();
    }
  };

  const goToToday = () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    setSelectedDateStr(todayStr);
    setCurrentDate(today);
  };

  // Select a cell
  const selectDay = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const d = new Date(dateStr + "T00:00:00");
    setCurrentDate(d);
  };

  // Memoized lists based on selections
  const allEvents = useMemo(() => {
    const holidayEvents: CalendarEvent[] = CANADIAN_HOLIDAYS
      .filter(h => h.regions.includes(holidayRegion))
      .map(h => ({
        id: `system-holiday-${holidayRegion}-${h.date}-${h.name.replace(/\s+/g, '-').toLowerCase()}`,
        title: `[Stat Holiday] ${h.name}`,
        date: h.date,
        type: 'holiday',
        createdBy: 'System',
        isPrivate: false,
        status: 'scheduled'
      }));

    return [...events, ...holidayEvents];
  }, [events, holidayRegion]);

  // Dynamic filter lists applying all advanced filters in combination
  const isEventForOwner = (e: Event, ownerId: string): boolean => {
    if (ownerId === "all") return true;
    
    // System events, automated tasks, and holidays are team-wide/visible to all
    if (e.createdBy === "System" || e.createdBy === "Automated Desk" || e.type === "holiday") {
      return true;
    }

    if (!userRoster) {
      // Fallback if roster is not provided
      return e.createdBy === ownerId || e.createdBy === "User";
    }

    const targetUser = userRoster.find(u => u.id === ownerId);
    if (!targetUser) {
      return e.createdBy === ownerId;
    }

    const targetFullName = `${targetUser.first} ${targetUser.last}`.toLowerCase();
    const creatorLower = e.createdBy.toLowerCase();

    if (creatorLower === ownerId.toLowerCase()) return true;
    if (creatorLower === targetFullName) return true;
    
    // If the owner matches the logged-in user, and the event was created with "User"
    if (creatorLower === "user" && currentUser?.id === ownerId) {
      return true;
    }

    return false;
  };

  const filteredEvents = useMemo(() => {
    return allEvents.filter(e => {
      // 0. Selected calendar owner
      if (!isEventForOwner(e, selectedCalendarOwner)) {
        return false;
      }
      // 1. Activity type
      if (filterType !== "all" && e.type !== filterType) {
        return false;
      }
      // 2. Status
      const currentStatus = e.status || "scheduled";
      if (filterStatus !== "all" && currentStatus !== filterStatus) {
        return false;
      }
      // 3. Linked only
      if (filterLinkedOnly && !e.clientId) {
        return false;
      }
      // 4. Private only
      if (filterPrivateOnly && !e.isPrivate) {
        return false;
      }
      return true;
    });
  }, [allEvents, filterType, filterStatus, filterLinkedOnly, filterPrivateOnly, selectedCalendarOwner, currentUser, userRoster]);

  const filteredEventsForMonth = filteredEvents;

  const selectedDayInfo = useMemo(() => {
    const d = new Date(selectedDateStr + "T00:00:00");
    const label = formatDateInTimeZone(d, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }, userTz);
    const dayEvs = filteredEvents.filter(e => e.date === selectedDateStr);
    const dayTs = tasks.filter(t => t.dueDate === selectedDateStr);
    return {
      dateStr: selectedDateStr,
      label,
      events: dayEvs,
      tasks: dayTs
    };
  }, [selectedDateStr, filteredEvents, tasks, userTz]);

  // Overdue and open tasks count
  const openTasks = useMemo(() => {
    return tasks.filter(t => t.status === "open");
  }, [tasks]);

  // Interactive Task checking
  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === "open" ? "done" : "open";
        showToast(nextStatus === "done" ? "Workflow task completed!" : "Task marked outstanding", "success", "✓");
        return { ...t, status: nextStatus, updatedAt: new Date().toISOString() };
      }
      return t;
    }));
  };

  // Schedule an existing Task onto the timeline
  const scheduleTaskOntoTimeline = (task: Task, timeStr: string) => {
    // Generates calendar event out of selected task
    const newEv: Event = {
      id: `ev_task_${Date.now()}`,
      title: `[TASK Task] ${task.title}`,
      date: selectedDateStr,
      time: timeStr,
      type: task.priority === "high" ? "client" : "personal",
      notes: task.notes || "Auto-scheduled from tasks queue.",
      clientId: task.clientId || null,
      createdBy: "Automated Desk"
    };

    setEvents(prev => [...prev, newEv]);
    
    // Set task to complete or linked
    setTasks(prev => prev.map(t => {
      if (t.id === task.id) {
        return { ...t, status: "done", notes: `Scheduled: ${selectedDateStr} @ ${timeStr}. ` + (t.notes || "") };
      }
      return t;
    }));

    showToast(`Task successfully booked on selected date timeline!`, "success", "🗓️");
  };

  // Open modal handlers
  const handleOpenAddModal = (dateStr?: string, timeStr?: string, clientId?: string, customDuration?: number) => {
    setEditingEvent(null);
    setEventTitle("");
    setEventDate(dateStr || selectedDateStr);
    setEventTime(timeStr || "09:00");
    setEventDuration(customDuration !== undefined ? customDuration : defaultDuration);
    setEventType("meeting");
    setEventNotes("");
    
    // CRM state defaults
    setEventStatus("scheduled");
    setEventReminder("none");
    setEventIsPrivate(false);
    setCreateFollowUp(false);
    setFollowUpDate("");
    setFollowUpTime("");
    setFollowUpTitle("");
    
    if (clientId) {
      setEventClientId(clientId);
      const matchedClient = clients.find(c => c.id === clientId);
      if (matchedClient) {
        setClientSearchQuery(`${matchedClient.first} ${matchedClient.last}`);
      } else {
        setClientSearchQuery("");
      }
    } else {
      setEventClientId("");
      setClientSearchQuery("");
    }
    
    setClientSearchOpen(false);
    setIsEventModalOpen(true);
  };

  const handleOpenEditModal = (event: CalendarEvent) => {
    if (event.id.startsWith("system-holiday-")) {
      showToast(`${event.title} is a regional stat holiday and cannot be modified.`, "info", "ℹ");
      return;
    }
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDate(event.date);
    setEventTime(event.time || "09:00");
    setEventDuration(event.duration || 60);
    setEventType(event.type);
    setEventNotes(event.notes || "");
    setEventClientId(event.clientId || "");
    
    // CRM state hydration
    setEventStatus(event.status || "scheduled");
    setEventReminder(event.reminder || "none");
    setEventIsPrivate(!!event.isPrivate);
    setCreateFollowUp(false);
    setFollowUpDate("");
    setFollowUpTime("");
    setFollowUpTitle("");
    
    const matchedClient = clients.find(c => c.id === event.clientId);
    if (matchedClient) {
      setClientSearchQuery(`${matchedClient.first} ${matchedClient.last}`);
    } else {
      setClientSearchQuery("");
    }
    setClientSearchOpen(false);
    setIsEventModalOpen(true);
  };

  // Save changes
  const saveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      showToast("Please enter an event title.", "error", "⚠️");
      return;
    }

    // Determine the owner/creator based on current view/user
    const getActiveOwnerName = (): string => {
      if (selectedCalendarOwner !== "all" && userRoster) {
        const owner = userRoster.find(u => u.id === selectedCalendarOwner);
        if (owner) return `${owner.first} ${owner.last}`;
      }
      return currentUser ? `${currentUser.first} ${currentUser.last}` : "User";
    };
    const finalCreator = getActiveOwnerName();

    // Generate follow-up if checked
    let followUpEv: CalendarEvent | null = null;
    if (createFollowUp && followUpTitle.trim() && followUpDate) {
      followUpEv = {
        id: `ev_follow_${Date.now() + 1}`,
        title: followUpTitle.trim(),
        date: followUpDate,
        time: followUpTime || undefined,
        type: eventType,
        clientId: eventClientId || null,
        notes: `Follow-up to: ${eventTitle.trim()}. `,
        status: "scheduled",
        reminder: "none",
        isPrivate: eventIsPrivate,
        duration: eventDuration,
        createdBy: finalCreator
      };
    }

    if (editingEvent) {
      setEvents(prev => {
        const updated = prev.map(ev => {
          if (ev.id === editingEvent.id) {
            return {
              ...ev,
              title: eventTitle.trim(),
              date: eventDate,
              time: eventTime || undefined,
              type: eventType,
              clientId: eventClientId || null,
              notes: eventNotes.trim(),
              duration: eventDuration, // save extended property
              status: eventStatus,
              reminder: eventReminder,
              isPrivate: eventIsPrivate
            } as CalendarEvent;
          }
          return ev;
        });

        if (followUpEv) {
          updated.push(followUpEv);
        }
        return updated;
      });
      showToast("Timeline entry updated!", "success", "✓");
    } else {
      const newEv: CalendarEvent = {
        id: `ev_${Date.now()}`,
        title: eventTitle.trim(),
        date: eventDate,
        time: eventTime || undefined,
        type: eventType,
        clientId: eventClientId || null,
        notes: eventNotes.trim(),
        duration: eventDuration,
        createdBy: finalCreator,
        status: eventStatus,
        reminder: eventReminder,
        isPrivate: eventIsPrivate
      };
      setEvents(prev => {
        const next = [...prev, newEv];
        if (followUpEv) {
          next.push(followUpEv);
        }
        return next;
      });
      showToast("Appointed scheduled to timeline!", "success", "📅");
    }

    setIsEventModalOpen(false);
  };

  // Delete event
  const handleRemoveEvent = (eventId: string) => {
    setPendingDeleteEventId(eventId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteEvent = () => {
    if (pendingDeleteEventId) {
      setEvents(prev => prev.filter(e => e.id !== pendingDeleteEventId));
      showToast("Event removed from timeline.", "info", "🗑️");
      setDeleteConfirmOpen(false);
      setPendingDeleteEventId(null);
      setIsEventModalOpen(false);
    }
  };

  const cancelDeleteEvent = () => {
    setDeleteConfirmOpen(false);
    setPendingDeleteEventId(null);
  };

  // Helper to quickly update event status
  const handleUpdateEventStatus = (eventId: string, status: "scheduled" | "completed" | "canceled") => {
    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        return {
          ...ev,
          status
        } as CalendarEvent;
      }
      return ev;
    }));
    const icon = status === "completed" ? "✓" : status === "canceled" ? "✕" : "📅";
    showToast(`Activity status updated to ${status}!`, "success", icon);
  };

  // Helper to duplicate event
  const handleDuplicateEvent = (event: CalendarEvent) => {
    const clonedEv: CalendarEvent = {
      ...event,
      id: `ev_dup_${Date.now()}`,
      title: `${event.title} (Copy)`,
      status: "scheduled"
    };
    setEvents(prev => [...prev, clonedEv]);
    showToast("Event duplicated successfully!", "success", "📋");
  };

  // Helper to reschedule event by 1 day or 1 week
  const handleRescheduleEvent = (event: CalendarEvent, direction: "next-day" | "next-week") => {
    let updatedDate = event.date;
    try {
      const d = new Date(event.date + "T12:00:00");
      if (direction === "next-day") {
        d.setDate(d.getDate() + 1);
      } else {
        d.setDate(d.getDate() + 7);
      }
      updatedDate = d.toISOString().split("T")[0];
    } catch (err) {
      console.error("Failed to reschedule date", err);
    }

    setEvents(prev => prev.map(ev => {
      if (ev.id === event.id) {
        return {
          ...ev,
          date: updatedDate
        } as CalendarEvent;
      }
      return ev;
    }));
    showToast(`Event rescheduled to ${updatedDate}!`, "success", "📅");
  };

  // Helper arrays for timeline increments derived from settings
  const hoursOfDay = useMemo(() => {
    const blocks = [];
    for (let h = workdayStartHour; h <= workdayEndHour; h++) {
      const hourStr = String(h).padStart(2, "0");
      const slotsCount = 60 / slotInterval;
      const slots = [];
      for (let s = 0; s < slotsCount; s++) {
        const mins = s * slotInterval;
        const minsStr = String(mins).padStart(2, "0");
        slots.push({
          time: `${hourStr}:${minsStr}`,
          label: `:${minsStr}`
        });
      }
      blocks.push({
        num: h,
        label: `${hourStr}:00`,
        slots
      });
    }
    return blocks;
  }, [workdayStartHour, workdayEndHour, slotInterval]);

  // Derived helper list of flat slot times in chronological order
  const flatSlots = useMemo(() => {
    const list: string[] = [];
    hoursOfDay.forEach(block => {
      block.slots.forEach(slot => {
        list.push(slot.time);
      });
    });
    return list;
  }, [hoursOfDay]);

  // Determine if a slot time falls within the currently dragged range
  const isSlotSelected = useMemo(() => {
    if (!dragStartSlot || !dragEndSlot) return () => false;
    const startIndex = flatSlots.indexOf(dragStartSlot);
    const endIndex = flatSlots.indexOf(dragEndSlot);
    if (startIndex === -1 || endIndex === -1) return () => false;
    const minIdx = Math.min(startIndex, endIndex);
    const maxIdx = Math.max(startIndex, endIndex);
    
    return (time: string) => {
      const idx = flatSlots.indexOf(time);
      return idx >= minIdx && idx <= maxIdx;
    };
  }, [dragStartSlot, dragEndSlot, flatSlots]);

  // Handle global mouse up to release drag selection and trigger booking creation modal with duration prefilled
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseUp = () => {
      setIsDragging(false);

      if (dragOccurred && dragStartSlot && dragEndSlot) {
        const startIndex = flatSlots.indexOf(dragStartSlot);
        const endIndex = flatSlots.indexOf(dragEndSlot);

        if (startIndex !== -1 && endIndex !== -1) {
          const minIdx = Math.min(startIndex, endIndex);
          const maxIdx = Math.max(startIndex, endIndex);

          const startTime = flatSlots[minIdx];
          const numSlots = maxIdx - minIdx + 1;
          const duration = numSlots * slotInterval;

          handleOpenAddModal(selectedDateStr, startTime, undefined, duration);
        }
      }

      setTimeout(() => {
        setDragOccurred(false);
      }, 50);
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, dragOccurred, dragStartSlot, dragEndSlot, flatSlots, selectedDateStr, slotInterval]);

  // Clear drag highlights automatically when the event creation modal closes
  useEffect(() => {
    if (!isEventModalOpen) {
      setDragStartSlot(null);
      setDragEndSlot(null);
    }
  }, [isEventModalOpen]);

  // Generate valid start times for dropdown time picker
  const timePickerOptions = useMemo(() => {
    const options = [];
    for (let h = workdayStartHour; h <= workdayEndHour; h++) {
      const slotsCount = 60 / slotInterval;
      for (let s = 0; s < slotsCount; s++) {
        const mins = s * slotInterval;
        const hourStr = String(h).padStart(2, "0");
        const minStr = String(mins).padStart(2, "0");
        const timeVal = `${hourStr}:${minStr}`;
        
        const ampm = h >= 12 ? "PM" : "AM";
        const displayHour = h % 12 === 0 ? 12 : h % 12;
        const label = `${displayHour}:${minStr} ${ampm}`;
        
        options.push({ value: timeVal, label });
      }
    }
    
    if (eventTime) {
      const cleanedEventTime = eventTime.substring(0, 5);
      const exists = options.some(opt => opt.value === cleanedEventTime);
      if (!exists) {
        let label = cleanedEventTime;
        try {
          const [hStr, mStr] = cleanedEventTime.split(":");
          const hNum = parseInt(hStr, 10);
          if (!isNaN(hNum)) {
            const ampm = hNum >= 12 ? "PM" : "AM";
            const displayHour = hNum % 12 === 0 ? 12 : hNum % 12;
            label = `${displayHour}:${mStr} ${ampm}`;
          }
        } catch (err) {
          console.error("Error formatting custom eventTime label:", err);
        }
        options.push({ value: cleanedEventTime, label });
      }
    }

    // Sort options chronologically
    options.sort((a, b) => a.value.localeCompare(b.value));
    return options;
  }, [workdayStartHour, workdayEndHour, slotInterval, eventTime]);

  // Check if an event falls inside a slot range
  // Let's compute if an event is starting at a given hour / minute slot
  const getEventsForTimeSlot = (dateStr: string, timeSlot: string) => {
    return filteredEvents.filter(ev => ev.date === dateStr && isEventInSlot(ev.time, timeSlot));
  };

  const isFilterActive = filterType !== "all" || filterStatus !== "all" || filterLinkedOnly || filterPrivateOnly;

  return (
    <div className="flex-1 flex flex-col xl:flex-row h-full min-h-0 bg-[var(--color-bg)] select-none text-left" id="broker-calendar-panel">
      
      {/* LEFT COLUMN: Mini Monthly Picker, Categories and Quick Tasks Queue */}
      <div className="w-full xl:w-[300px] 2xl:w-[320px] shrink-0 border-b xl:border-b-0 xl:border-r border-[var(--color-border)] flex flex-col min-h-0 bg-[var(--color-surface-2)]/40 overflow-y-auto p-4 space-y-5">
        
        {/* Compact Month Mini-Picker Widget */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-extrabold text-[var(--color-calendar-strong-text)] tracking-wider uppercase font-sans">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={prevMonth}
                className="p-1 border border-[var(--color-border)] bg-[var(--color-surface-3)] rounded hover:bg-[var(--color-surface-2)] transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-[#2D3250] dark:text-[var(--color-text-muted)] hover:text-[var(--color-text)]" />
              </button>
              <button 
                onClick={nextMonth}
                className="p-1 border border-[var(--color-border)] bg-[var(--color-surface-3)] rounded hover:bg-[var(--color-surface-2)] transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5 text-[#2D3250] dark:text-[var(--color-text-muted)] hover:text-[var(--color-text)]" />
              </button>
            </div>
          </div>

          {/* Days Week labels */}
          <div className="grid grid-cols-7 text-center text-[9px] uppercase font-bold text-[var(--color-text-faint)] tracking-wider mb-1.5">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => <div key={d}>{d}</div>)}
          </div>

          {/* Month grid days */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((md, idx) => {
              const worksOnThisDate = allEvents.some(e => e.date === md.dateStr);
              const isSelected = selectedDateStr === md.dateStr;
              
              return (
                <button
                  key={idx}
                  onClick={() => selectDay(md.dateStr)}
                  className={`h-7 w-7 text-[10px] font-bold rounded-lg flex flex-col items-center justify-center relative transition-all ${
                    isSelected 
                      ? "bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] font-extrabold shadow-md shadow-[var(--color-calendar-selected-bg)]/20"
                      : md.isToday 
                        ? "bg-[var(--color-calendar-selected-bg)]/10 text-[var(--color-calendar-strong-text)] border border-[var(--color-calendar-selected-bg)]/45 font-extrabold"
                        : md.isCurrentMonth
                          ? "text-[var(--color-text)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-calendar-strong-text)]"
                          : "text-[var(--color-text-faint)]/50 hover:text-[var(--color-text-muted)]"
                  }`}
                >
                  <span>{md.dayNum}</span>
                  {/* Event indicator dot */}
                  {worksOnThisDate && !isSelected && (
                    <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--color-calendar-selected-bg)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories Color-Coded Filter List */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-3 border-b border-[var(--color-border)]/30 pb-2">
            <h4 className="text-[10.5px] font-extrabold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[var(--color-accent)]" /> 
              Categories Legend
            </h4>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-extrabold text-[var(--color-text-muted)] uppercase tracking-wider">
                Region:
              </span>
              <select
                value={holidayRegion}
                onChange={(e) => setHolidayRegion(e.target.value)}
                className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-md px-1 py-0.5 text-[10px] font-extrabold text-[var(--color-text)] focus:outline-none transition-all cursor-pointer"
              >
                <option value="ON">ON</option>
                <option value="BC">BC</option>
                <option value="AB">AB</option>
                <option value="QC">QC</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => setFilterType("all")}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-left border text-[11px] font-bold transition-all ${
                filterType === "all" 
                  ? "bg-[var(--color-calendar-selected-bg)]/10 border-[var(--color-calendar-selected-bg)]/25 text-[var(--color-calendar-strong-text)] font-extrabold" 
                  : "bg-transparent border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]/60 hover:text-[var(--color-text)]"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-text-muted)]" />
                All Activities
              </span>
              <span className="font-mono text-[10px] opacity-60">
                ({allEvents.filter(e => {
                  if (!isEventForOwner(e, selectedCalendarOwner)) return false;
                  const currentStatus = e.status || "scheduled";
                  if (filterStatus !== "all" && currentStatus !== filterStatus) return false;
                  if (filterLinkedOnly && !e.clientId) return false;
                  if (filterPrivateOnly && !e.isPrivate) return false;
                  return true;
                }).length})
              </span>
            </button>
 
            {eventTypes.map(et => {
              const matchingTypeEvents = allEvents.filter(e => {
                if (!isEventForOwner(e, selectedCalendarOwner)) return false;
                if (e.type !== et.value) return false;
                const currentStatus = e.status || "scheduled";
                if (filterStatus !== "all" && currentStatus !== filterStatus) return false;
                if (filterLinkedOnly && !e.clientId) return false;
                if (filterPrivateOnly && !e.isPrivate) return false;
                return true;
              });

              let countStr = "";
              if (et.value === "holiday") {
                const userCount = matchingTypeEvents.filter(e => !e.id.startsWith("system-holiday-")).length;
                const systemCount = matchingTypeEvents.filter(e => e.id.startsWith("system-holiday-")).length;
                countStr = `${userCount + systemCount} (${userCount} u, ${systemCount} s)`;
              } else {
                countStr = `${matchingTypeEvents.length}`;
              }
              return (
                <button
                  key={et.value}
                  onClick={() => setFilterType(et.value)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left border text-[11px] font-bold transition-all ${
                    filterType === et.value 
                      ? `${et.lightBg} ${et.border} ${et.text}` 
                      : "bg-transparent border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]/60 hover:text-[var(--color-text)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${et.color} ${et.glow}`} />
                    {et.label}
                  </span>
                  <span className="font-mono text-[10px] opacity-60">({countStr})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tasks Hub Connection Panel */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-3.5 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h4 className="text-[10.5px] font-extrabold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-[var(--color-success)]" /> 
              Tasks to Schedule
            </h4>
            <span className="text-[9px] bg-[var(--color-success-subtle)] text-[var(--color-success)] font-extrabold border border-[var(--color-success)]/15 rounded-md px-1.5 py-0.5 font-mono">
              {openTasks.length} pending
            </span>
          </div>

          <p className="text-[10px] text-[var(--color-text-faint)] mb-3 leading-relaxed shrink-0">
            Click on the play arrow to instantly book any pending file target directly into the selected date timeline!
          </p>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[160px]">
            {openTasks.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center py-6 text-center text-[var(--color-text-faint)] select-none">
                <Check className="w-5 h-5 text-[var(--color-success)] opacity-60 mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-wider">All Tasks Slated</span>
              </div>
            ) : (
              openTasks.map(t => (
                <div 
                  key={t.id}
                  className="p-2.5 bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] rounded-xl flex items-start justify-between gap-1.5 hover:border-[var(--color-border)] transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-[var(--color-text)] line-clamp-2 leading-tight">
                      {t.title}
                    </span>
                    {t.clientName && (
                      <span className="text-[9px] text-[var(--color-calendar-strong-text)] font-semibold block mt-1">
                        File: {t.clientName}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => scheduleTaskOntoTimeline(t, "10:00")}
                    className="p-1 px-1.5 bg-[var(--color-success-subtle)] hover:bg-[var(--color-success)] hover:text-[var(--color-bg)] border border-[var(--color-success)]/15 text-[var(--color-success)] rounded-lg text-[9px] font-black transition-all flex items-center gap-0.5 shrink-0"
                    title="Schedule at 10:00 AM"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    Book
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Chronological Timeline Canvas & Multi-Views */}
      <div className="flex-grow flex flex-col min-w-0 min-h-0 p-5">
        
        {/* Timeline Navigation Custom Header */}
        <div className="flex flex-col gap-4 mb-5 border-b border-[var(--color-border)] pb-4 shrink-0">
          {/* Top Row: Stable Title & Admin/Manager Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[var(--color-calendar-selected-bg)]/10 border border-[var(--color-calendar-selected-bg)]/20 rounded-xl text-[var(--color-calendar-strong-text)]">
                <CalendarIcon className="w-5 h-5 text-[var(--color-accent)] animate-pulse" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-black text-[var(--color-text)] tracking-tight">
                  Team Calendar Workspace
                </h2>
                {/* Stable Active Date/Range subheader meta line */}
                <div className="text-[11px] font-bold text-[var(--color-text-muted)] mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0" />
                  {viewMode === "day" && (
                    <span>Day Frame: <strong className="text-[var(--color-text)] font-extrabold">{selectedDayInfo.label}</strong></span>
                  )}
                  {viewMode === "week" && (
                    <span>Week Frame: <strong className="text-[var(--color-text)] font-extrabold">{weekDays[0]?.fullLabel} — {weekDays[6]?.fullLabel} ({currentYear})</strong></span>
                  )}
                  {viewMode === "month" && (
                    <span>Month Frame: <strong className="text-[var(--color-text)] font-extrabold">{monthNames[currentMonth]} {currentYear} Scope</strong></span>
                  )}
                  {viewMode === "list" && (
                    <span>Ledger Frame: <strong className="text-[var(--color-text)] font-extrabold">{monthNames[currentMonth]} {currentYear} Action Scope</strong></span>
                  )}
                </div>
              </div>
            </div>

            {/* Admin/Manager User Calendar Selector - High Visibility */}
            {canViewOtherCalendars && (
              <div className="flex items-center gap-2.5 bg-[var(--color-surface-2)] border-2 border-[var(--color-calendar-selected-bg)]/20 hover:border-[var(--color-calendar-selected-bg)]/40 px-3.5 py-1.5 rounded-xl shadow-md text-xs font-bold transition-all shrink-0">
                <User className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-[9px] uppercase text-[var(--color-text-muted)] tracking-wider font-extrabold block">Calendar Owner:</span>
                  <select
                    value={selectedCalendarOwner}
                    onChange={(e) => setSelectedCalendarOwner(e.target.value)}
                    className="bg-transparent text-[var(--color-text)] font-black focus:outline-none cursor-pointer pr-4 text-xs mt-0.5"
                  >
                    <option value="all" className="bg-[var(--color-surface)] text-[var(--color-text)] font-bold">
                      🌍 All Users / Shared Views
                    </option>
                    {userRoster?.map(u => {
                      const isMe = u.id === currentUser?.id;
                      return (
                        <option key={u.id} value={u.id} className="bg-[var(--color-surface)] text-[var(--color-text)] font-semibold">
                          👤 {u.first} {u.last} ({isMe ? "You — " : ""}{u.role})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Row: Controls Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 bg-[var(--color-surface)]/40 border border-[var(--color-border)]/60 p-2 rounded-2xl select-none">
            {/* View Multi-Tabs Segmented control */}
            <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] p-1 rounded-xl flex items-center shrink-0">
              <button 
                onClick={() => setViewMode("day")}
                className={`flex-grow md:flex-none px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all ${viewMode === "day" ? "bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] shadow" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
              >
                Day Timeline
              </button>
              <button 
                onClick={() => setViewMode("week")}
                className={`flex-grow md:flex-none px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all ${viewMode === "week" ? "bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] shadow" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
              >
                Week Timeline
              </button>
              <button 
                onClick={() => setViewMode("month")}
                className={`flex-grow md:flex-none px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all ${viewMode === "month" ? "bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] shadow" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
              >
                Month Grid
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={`flex-grow md:flex-none px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all ${viewMode === "list" ? "bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] shadow" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
              >
                List Index
              </button>
            </div>

            {/* Navigation and other actions */}
            <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap">
              {/* Quick action buttons */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                <button 
                  onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
                  className={`p-2 border rounded-xl transition-all flex items-center gap-1.5 cursor-pointer relative ${
                    advancedFiltersOpen || isFilterActive
                      ? "border-[var(--color-calendar-selected-bg)]/40 bg-[var(--color-calendar-selected-bg)]/10 text-[#1C2230] dark:text-[var(--color-calendar-strong-text)] font-extrabold"
                      : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[#2D3250] dark:text-[var(--color-text-muted)] hover:text-[var(--color-calendar-selected-bg)] hover:border-[var(--color-calendar-selected-bg)]/30 hover:bg-[var(--color-surface-3)]"
                  }`}
                  title="Toggle Advanced Filters"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline text-[10px] font-extrabold tracking-wider uppercase px-0.5">Filters</span>
                  {isFilterActive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-bg)] animate-pulse" />
                  )}
                </button>
                
                <button 
                  onClick={() => setCalendarSettingsOpen(true)}
                  className="p-2 border border-[var(--color-border)] bg-[var(--color-surface-2)] rounded-xl hover:bg-[var(--color-surface-3)] text-[#2D3250] dark:text-[var(--color-text-muted)] hover:text-[var(--color-calendar-selected-bg)] hover:border-[var(--color-calendar-selected-bg)]/30 transition-all flex items-center gap-1 cursor-pointer"
                  title="Configure working hours and time slots"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline text-[10px] font-extrabold tracking-wider uppercase px-0.5">Settings</span>
                </button>

                <div className="h-4 w-px bg-[var(--color-border)] mx-1 hidden sm:block" />

                <button 
                  onClick={prevTimeFrame}
                  className="p-2 border border-[var(--color-border)] bg-[var(--color-surface-2)] rounded-xl hover:bg-[var(--color-surface-3)] hover:text-[var(--color-calendar-selected-bg)] hover:border-[var(--color-calendar-selected-bg)]/30 transition-all text-[#2D3250] dark:text-[var(--color-text-muted)] cursor-pointer"
                  title="Previous range"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={goToToday}
                  className="px-3.5 py-2 border border-[var(--color-calendar-selected-bg)]/20 text-[#2D3250] dark:text-[var(--color-calendar-strong-text)] bg-[var(--color-calendar-selected-bg)]/5 font-extrabold rounded-xl text-xs hover:bg-[var(--color-calendar-selected-bg)]/15 transition-all cursor-pointer"
                >
                  Today
                </button>
                <button 
                  onClick={nextTimeFrame}
                  className="p-2 border border-[var(--color-border)] bg-[var(--color-surface-2)] rounded-xl hover:bg-[var(--color-surface-3)] hover:text-[var(--color-calendar-selected-bg)] hover:border-[var(--color-calendar-selected-bg)]/30 transition-all text-[#2D3250] dark:text-[var(--color-text-muted)] cursor-pointer"
                  title="Next range"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Filters Panel */}
        <AnimatePresence>
          {advancedFiltersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-4 shrink-0"
            >
              <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-md flex flex-col md:flex-row md:items-end justify-between gap-4 select-none">
                <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 1. Activity Type Selector */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase text-[var(--color-text-muted)] tracking-wider">
                      Activity Type
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-calendar-selected-bg)]/50 transition-all cursor-pointer"
                    >
                      <option value="all">All Activities</option>
                      {eventTypes.map(et => (
                        <option key={et.value} value={et.value}>{et.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Status Selector */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase text-[var(--color-text-muted)] tracking-wider">
                      Event Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-calendar-selected-bg)]/50 transition-all cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>

                  {/* 3. Linked to Clients Toggle */}
                  <div className="flex flex-col justify-end">
                    <button
                      onClick={() => setFilterLinkedOnly(!filterLinkedOnly)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left border text-xs font-bold transition-all h-[38px] ${
                        filterLinkedOnly
                          ? "bg-[var(--color-calendar-selected-bg)]/10 border-[var(--color-calendar-selected-bg)]/35 text-[var(--color-calendar-strong-text)] font-extrabold"
                          : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        Linked Only
                      </span>
                      <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${filterLinkedOnly ? "bg-[var(--color-calendar-selected-bg)]" : "bg-gray-600"}`}>
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${filterLinkedOnly ? "translate-x-3" : "translate-x-0"}`} />
                      </div>
                    </button>
                  </div>

                  {/* 4. Private Only Toggle */}
                  <div className="flex flex-col justify-end">
                    <button
                      onClick={() => setFilterPrivateOnly(!filterPrivateOnly)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left border text-xs font-bold transition-all h-[38px] ${
                        filterPrivateOnly
                          ? "bg-[var(--color-calendar-selected-bg)]/10 border-[var(--color-calendar-selected-bg)]/35 text-[var(--color-calendar-strong-text)] font-extrabold"
                          : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5" />
                        Private Only
                      </span>
                      <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${filterPrivateOnly ? "bg-[var(--color-calendar-selected-bg)]" : "bg-gray-600"}`}>
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${filterPrivateOnly ? "translate-x-3" : "translate-x-0"}`} />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Reset Actions */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-end gap-2 shrink-0 md:pl-2">
                  {isFilterActive && (
                    <div className="flex items-center gap-1 text-[9px] text-[var(--color-accent)] font-mono font-bold uppercase tracking-wider bg-[var(--color-accent)]/10 px-2 py-0.5 rounded-md animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                      Active Filter
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setFilterType("all");
                      setFilterStatus("all");
                      setFilterLinkedOnly(false);
                      setFilterPrivateOnly(false);
                    }}
                    disabled={!isFilterActive}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border flex items-center gap-1 transition-all ${
                      isFilterActive
                        ? "bg-[var(--color-calendar-selected-bg)]/10 hover:bg-[var(--color-calendar-selected-bg)]/20 border-[var(--color-calendar-selected-bg)]/30 text-[var(--color-calendar-strong-text)] cursor-pointer"
                        : "bg-transparent border-transparent text-[var(--color-text-faint)] cursor-not-allowed"
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TIME STICKER BAR FOR TIMELINE DAY/WEEK RANGE */}
        <div className="flex-1 min-h-0 flex flex-col bg-[var(--color-surface-2)]/30 border border-[var(--color-border)] rounded-2xl overflow-hidden select-none">
          
          {/* VIEW CASE 1: DAY TIMELINE VIEW (Hour-Based CRM Schedule Timeline) */}
          {viewMode === "day" && (
            <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-surface)]/30" id="view-timeline-day">
              {/* Sticky Mini Header showing active date & range */}
              <div className="sticky top-0 z-10 p-4 bg-[var(--color-surface-2)] border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 select-none">
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Schedule for:</span>
                    <span className="text-xs font-extrabold text-[var(--color-accent)] uppercase tracking-wider">{selectedDayInfo.label}</span>
                  </div>
                  <span className="text-[10px] text-[var(--color-text-faint)] mt-0.5">
                    Active range: {String(workdayStartHour).padStart(2, "0")}:00 - {String(workdayEndHour).padStart(2, "0")}:00 ({slotInterval}m slots)
                  </span>
                </div>
                <button
                  onClick={() => handleOpenAddModal(selectedDateStr)}
                  className="px-3 py-1.5 bg-[var(--color-calendar-selected-bg)]/10 border border-[var(--color-calendar-selected-bg)]/25 hover:bg-[var(--color-calendar-selected-bg)]/20 text-[var(--color-calendar-strong-text)] font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Book Appointment
                </button>
              </div>

              {/* All Day or Unscheduled events bar */}
              {selectedDayInfo.events.filter(e => !e.time).length > 0 && (
                <div className="p-3 bg-[var(--color-calendar-selected-bg)]/10 border-b border-[var(--color-border)] flex flex-col gap-1.5 shrink-0 text-left">
                  <span className="text-[10px] text-[var(--color-calendar-strong-text)] font-extrabold uppercase tracking-wider block">
                    Unscheduled / All Day:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedDayInfo.events.filter(e => !e.time).map(ev => {
                      const scheme = getTypeColor(ev.type);
                      const isCompleted = ev.status === "completed";
                      const isCanceled = ev.status === "canceled";
                      return (
                        <div
                          key={ev.id}
                          onClick={() => handleOpenEditModal(ev)}
                          className={`p-2 rounded-lg border text-[11px] font-bold cursor-pointer hover:brightness-110 transition-all flex items-center gap-2 ${scheme.lightBg} ${scheme.border} ${scheme.text} ${scheme.glow} ${
                            isCanceled ? "line-through opacity-50 decoration-[var(--color-error)]" : ""
                          }`}
                        >
                          {ev.isPrivate && <Lock className="w-3 h-3 text-[var(--color-warning)] shrink-0" />}
                          {isCompleted && <Check className="w-3.5 h-3.5 text-[var(--color-success)] shrink-0" />}
                          <span>{ev.title}</span>
                          <span className="text-[9px] uppercase tracking-wider px-1.5 bg-black/15 rounded-md text-[var(--color-text-muted)]">
                            {ev.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hourly Timeline Grid Area */}
              <div 
                className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]/40 bg-[var(--color-bg)]" 
                ref={timelineScrollRef}
              >
                {hoursOfDay.map(block => {
                  const hourStr = String(block.num).padStart(2, "0");
                  return (
                    <div 
                      key={block.num} 
                      id={`hour-slot-${hourStr}`}
                      className="flex border-b border-[var(--color-border)]/20 group/hour min-h-[72px]"
                    >
                      {/* Time column (sticky left) */}
                      <div className="w-20 shrink-0 p-3 flex flex-col justify-start border-r border-[var(--color-border)]/60 bg-[var(--color-surface-2)]/20 select-none font-mono text-left">
                        <span className="text-xs font-bold text-[var(--color-text)]">
                          {hourStr}:00
                        </span>
                        <span className="text-[9px] text-[var(--color-text-faint)] font-bold mt-0.5 uppercase tracking-wide">
                          {block.num >= 12 ? "PM" : "AM"}
                        </span>
                      </div>

                      {/* Sub-slots column */}
                      <div className="flex-grow flex flex-col divide-y divide-[var(--color-border)]/45">
                        {block.slots.map(slot => {
                          // Find events that belong inside this particular slot range
                          const slotEvents = selectedDayInfo.events.filter(ev => {
                            if (!ev.time) return false;
                            const [evHStr, evMStr] = ev.time.split(":");
                            const evH = parseInt(evHStr, 10);
                            const evM = parseInt(evMStr, 10);
                            if (isNaN(evH) || isNaN(evM)) return false;
                            return evH === block.num && evM >= parseInt(slot.time.split(":")[1], 10) && evM < parseInt(slot.time.split(":")[1], 10) + slotInterval;
                          });

                          const isSelected = isSlotSelected(slot.time);

                          return (
                            <div
                              key={slot.time}
                              onMouseDown={(e) => {
                                if (e.button !== 0) return;
                                const target = e.target as HTMLElement;
                                if (target.closest('button') || target.closest('a') || target.closest('input')) return;
                                e.preventDefault();
                                setIsDragging(true);
                                setDragStartSlot(slot.time);
                                setDragEndSlot(slot.time);
                                setDragOccurred(false);
                              }}
                              onMouseEnter={() => {
                                if (isDragging) {
                                  setDragEndSlot(slot.time);
                                  if (slot.time !== dragStartSlot) {
                                    setDragOccurred(true);
                                  }
                                }
                              }}
                              onClick={() => {
                                if (dragOccurred) {
                                  return;
                                }
                                handleOpenAddModal(selectedDateStr, slot.time);
                              }}
                              className={`min-h-[44px] flex items-stretch p-1.5 transition-all select-none relative group/slot text-left border-l-2 ${
                                isSelected
                                  ? "bg-[var(--color-calendar-selected-bg)]/10 border-l-[var(--color-calendar-selected-bg)] ring-1 ring-[var(--color-calendar-selected-bg)]/20"
                                  : "bg-[var(--color-surface-2)]/25 odd:bg-[var(--color-surface)]/20 hover:bg-[var(--color-surface-3)]/50 border-l-[var(--color-border)]/40 cursor-pointer"
                              }`}
                            >
                              {/* Small time label shown on slot hover */}
                              <div className="absolute left-2.5 top-1.5 text-[10px] text-[var(--color-text-muted)] font-mono font-bold select-none opacity-50 group-hover/slot:opacity-100 transition-opacity">
                                {slot.time}
                              </div>

                              <div className="flex-grow flex flex-col gap-1.5 pl-9">
                                {slotEvents.length > 0 ? (
                                  slotEvents.map(ev => {
                                    const scheme = getTypeColor(ev.type);
                                    const matchedClient = clients.find(c => c.id === ev.clientId);
                                    return (
                                      <div
                                        key={ev.id}
                                        onClick={(e) => {
                                          e.stopPropagation(); // Avoid triggering slot's openAddModal
                                          handleOpenEditModal(ev);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onMouseUp={(e) => e.stopPropagation()}
                                        className="p-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-calendar-selected-bg)]/45 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group/card text-left shadow-sm hover:shadow-md cursor-pointer"
                                      >
                                        <div className="flex items-start gap-3 min-w-0">
                                          {/* Time indicator badge */}
                                          <div className="flex flex-col items-center justify-center shrink-0 w-12 p-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl font-mono">
                                            <span className="text-[10px] font-extrabold text-[var(--color-text)]">{ev.time}</span>
                                            <span className="text-[8px] text-[var(--color-text-muted)] mt-0.5 font-bold">
                                              {ev.duration ? `${ev.duration}m` : `${defaultDuration}m`}
                                            </span>
                                          </div>

                                          <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <h4 className={`text-xs font-extrabold transition-colors truncate flex items-center gap-1.5 ${
                                                ev.status === "canceled" 
                                                  ? "line-through text-[var(--color-text-faint)]/70 decoration-[var(--color-error)]" 
                                                  : ev.status === "completed" 
                                                    ? "text-[var(--color-success)] font-extrabold" 
                                                    : "text-[var(--color-text)] group-hover/card:text-[var(--color-accent)]"
                                              }`}>
                                                {ev.isPrivate && <Lock className="w-3 h-3 text-[var(--color-warning)] shrink-0" />}
                                                {ev.status === "completed" && <Check className="w-3.5 h-3.5 text-[var(--color-success)] shrink-0" />}
                                                <span>{ev.title}</span>
                                                {ev.status === "canceled" && <span className="text-[8px] uppercase tracking-wider px-1 bg-[var(--color-error-subtle)] text-[var(--color-error)] rounded font-normal shrink-0">Canceled</span>}
                                                {ev.status === "completed" && <span className="text-[8px] uppercase tracking-wider px-1 bg-[var(--color-success-subtle)] text-[var(--color-success)] rounded font-normal shrink-0">Completed</span>}
                                              </h4>
                                              <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${scheme.lightBg} ${scheme.border} ${scheme.text} ${scheme.glow}`}>
                                                {ev.type}
                                              </span>
                                            </div>
                                            {ev.notes && (
                                              <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-medium leading-relaxed line-clamp-1">
                                                {ev.notes}
                                              </p>
                                            )}
                                            {matchedClient && (
                                              <div className="mt-1 flex items-center gap-1 text-[9px] text-[var(--color-calendar-strong-text)] font-bold">
                                                <User className="w-3 h-3 text-[var(--color-accent)]" />
                                                <span>Client: {matchedClient.first} {matchedClient.last}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Row actions */}
                                        <div className="flex items-center flex-wrap gap-2 sm:self-center shrink-0 justify-end opacity-0 group-hover/card:opacity-100 transition-opacity">
                                          {ev.id.startsWith("system-holiday-") ? (
                                            <span className="text-[9px] font-extrabold text-[var(--color-text-muted)] uppercase bg-[var(--color-surface-2)] border border-[var(--color-border)] px-2.5 py-1.5 rounded-xl select-none">
                                              Stat Holiday ({holidayRegion})
                                            </span>
                                          ) : (
                                            <>
                                              {ev.status !== "completed" && (
                                                <QuickActionButton
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdateEventStatus(ev.id, "completed");
                                                  }}
                                                  variant="done"
                                                  title="Mark Completed"
                                                  showLabel={true}
                                                />
                                              )}
                                              {ev.status !== "canceled" && (
                                                <QuickActionButton
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdateEventStatus(ev.id, "canceled");
                                                  }}
                                                  variant="cancel"
                                                  title="Cancel Event"
                                                  showLabel={true}
                                                />
                                              )}
                                              <QuickActionButton
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDuplicateEvent(ev);
                                                }}
                                                variant="copy"
                                                title="Duplicate Event"
                                                showLabel={true}
                                              />
                                              <QuickActionButton
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleRescheduleEvent(ev, "next-day");
                                                }}
                                                variant="plus1"
                                                title="Reschedule +1 Day"
                                                showLabel={true}
                                              />
                                              <QuickActionButton
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleRescheduleEvent(ev, "next-week");
                                                }}
                                                variant="plus7"
                                                title="Reschedule +1 Week"
                                                showLabel={true}
                                              />
                                              <QuickActionButton
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenEditModal(ev);
                                                }}
                                                variant="edit"
                                                title="Edit Event"
                                                showLabel={true}
                                              />
                                              <QuickActionButton
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleRemoveEvent(ev.id);
                                                }}
                                                variant="delete"
                                                title="Delete Event"
                                                showLabel={true}
                                              />
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  /* Empty slot guidance text shown on hover */
                                  <div className="py-1 text-[10px] text-[var(--color-text-faint)]/20 font-bold select-none flex items-center gap-1 opacity-0 group-hover/slot:opacity-100 group-hover/slot:text-[var(--color-calendar-selected-bg)]/40 transition-all">
                                    <Plus className="w-3 h-3" />
                                    <span>Click to schedule action at {slot.time}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW CASE 2: WEEK TIMELINE GRID (Clean 7-Day Agenda Columns) */}
          {viewMode === "week" && (
            <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-surface-2)]/30" id="view-timeline-week">
              {/* Header summary info */}
              <div className="p-3 bg-[var(--color-surface-2)] border-b border-[var(--color-border)] flex items-center justify-between shrink-0 select-none text-[10.5px]">
                <span className="font-bold text-[var(--color-text-muted)]">Weekly Agenda Schedule</span>
                <span className="text-[var(--color-accent)] font-mono font-bold tracking-wider">Active Month Grid Sync</span>
              </div>

              {/* Columns container */}
              <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 flex gap-4 min-w-0 h-full">
                {weekDays.map(wd => {
                  const dayEvents = filteredEvents.filter(e => e.date === wd.dateStr);
                  const isDaySelected = selectedDateStr === wd.dateStr;

                  return (
                    <div
                      key={wd.dateStr}
                      className={`flex-1 min-w-[170px] xl:min-w-[180px] 2xl:min-w-[200px] bg-[var(--color-surface)] border rounded-2xl flex flex-col min-h-0 transition-all ${
                        isDaySelected 
                          ? "border-[var(--color-calendar-selected-bg)]/40 bg-[var(--color-surface-2)] ring-1 ring-[var(--color-calendar-selected-bg)]/10" 
                          : wd.isToday 
                            ? "border-[var(--color-border)] bg-[var(--color-surface-2)]" 
                            : "border-[var(--color-border)]/50"
                      }`}
                    >
                      {/* Day Header */}
                      <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-surface-2)]/50 rounded-t-2xl">
                        <div 
                          onClick={() => {
                            selectDay(wd.dateStr);
                            setViewMode("day");
                          }}
                          className="cursor-pointer group flex flex-col text-left"
                        >
                          <span className={`text-[9px] uppercase font-bold tracking-widest ${isDaySelected ? "text-[var(--color-calendar-strong-text)]" : "text-[var(--color-text-faint)] group-hover:text-[var(--color-accent)]"}`}>
                            {wd.dayLabel}
                          </span>
                          <span className={`text-sm font-black mt-0.5 ${isDaySelected ? "text-[var(--color-accent)]" : "text-[var(--color-text)]"}`}>
                            {wd.dayNum}
                          </span>
                        </div>

                        <button
                          onClick={() => handleOpenAddModal(wd.dateStr)}
                          className="p-1 bg-[var(--color-surface-3)] hover:bg-[var(--color-calendar-selected-bg)] hover:text-[var(--color-calendar-selected-text)] rounded-lg border border-[var(--color-border)] transition-all text-[var(--color-text)] cursor-pointer"
                          title={`Book for ${wd.fullLabel}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Day Events List */}
                      <div className="flex-grow overflow-y-auto p-2.5 space-y-2 min-h-[220px]">
                        {dayEvents.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center py-10 text-center select-none text-[var(--color-text-faint)]">
                            <CalendarIcon className="w-6 h-6 opacity-40 mb-1" />
                            <span className="text-[8.5px] font-bold uppercase tracking-wider">No Events</span>
                          </div>
                        ) : (
                          dayEvents
                            .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
                            .map(ev => {
                              const scheme = getTypeColor(ev.type);
                              const isCompleted = ev.status === "completed";
                              const isCanceled = ev.status === "canceled";
                              return (
                                  <div
                                    key={ev.id}
                                    onClick={() => handleOpenEditModal(ev)}
                                    className={`p-2.5 rounded-xl border text-[11px] font-bold cursor-pointer select-none relative group hover:brightness-110 active:scale-[0.98] transition-all flex flex-col gap-1 text-left ${scheme.lightBg} ${scheme.border} ${scheme.text} ${scheme.glow} ${
                                      isCanceled ? "line-through opacity-50 decoration-[var(--color-error)]" : ""
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-mono text-[9px] opacity-75">{ev.time || "All Day"}</span>
                                      <span className={`w-1.5 h-1.5 rounded-full ${scheme.color} shrink-0`} />
                                    </div>
                                    <div className={`line-clamp-2 leading-tight mt-0.5 font-semibold group-hover:opacity-90 flex items-center flex-wrap gap-1 ${
                                      isCanceled 
                                        ? "line-through text-[var(--color-text-faint)]/70 decoration-[var(--color-error)]" 
                                        : isCompleted 
                                          ? "text-[var(--color-success)] font-extrabold" 
                                          : "text-[var(--color-text)]"
                                    }`}>
                                      {ev.isPrivate && <Lock className="w-2.5 h-2.5 text-[var(--color-warning)] inline-block shrink-0" />}
                                      {isCompleted && <Check className="w-3.5 h-3.5 text-[var(--color-success)] inline-block shrink-0" />}
                                      <span>{ev.title}</span>
                                    </div>
                                  {ev.notes && (
                                    <p className="text-[9px] opacity-75 truncate font-normal mt-0.5 text-[var(--color-text-muted)]">
                                      {ev.notes}
                                    </p>
                                  )}

                                    {/* Quick hover-revealed activity actions */}
                                    <div className="mt-2 pt-1.5 border-t border-[var(--color-border)]/25 flex flex-wrap items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                      {ev.id.startsWith("system-holiday-") ? (
                                        <span className="text-[8px] font-black uppercase text-[var(--color-text-muted)] bg-[var(--color-surface-2)] border border-[var(--color-border)] px-1.5 py-0.5 rounded select-none">
                                          Stat Holiday ({holidayRegion})
                                        </span>
                                      ) : (
                                        <>
                                          {ev.status !== "completed" && (
                                            <QuickActionButton
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleUpdateEventStatus(ev.id, "completed");
                                              }}
                                              variant="done"
                                              title="Complete"
                                            />
                                          )}
                                          {ev.status !== "canceled" && (
                                            <QuickActionButton
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleUpdateEventStatus(ev.id, "canceled");
                                              }}
                                              variant="cancel"
                                              title="Cancel"
                                            />
                                          )}
                                          <QuickActionButton
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDuplicateEvent(ev);
                                            }}
                                            variant="copy"
                                            title="Duplicate"
                                          />
                                          <QuickActionButton
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRescheduleEvent(ev, "next-day");
                                            }}
                                            variant="plus1"
                                            title="Reschedule +1 Day"
                                          />
                                          <QuickActionButton
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRescheduleEvent(ev, "next-week");
                                            }}
                                            variant="plus7"
                                            title="Reschedule +1 Week"
                                          />
                                          <QuickActionButton
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenEditModal(ev);
                                            }}
                                            variant="edit"
                                            title="Edit"
                                          />
                                          <QuickActionButton
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRemoveEvent(ev.id);
                                            }}
                                            variant="delete"
                                            title="Delete"
                                          />
                                        </>
                                      )}
                                    </div>
                                  </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW CASE 3: STANDARD MONTH PLANNER GRID */}
          {viewMode === "month" && (
            <div className="flex-1 flex flex-col min-h-0" id="view-timeline-month">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 text-center select-none text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider py-2.5 bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              {/* Dates Grid */}
              <div className="flex-grow grid grid-cols-7 gap-1 p-2 bg-[var(--color-surface-2)]/20 overflow-y-auto">
                {monthDays.map((md, idx) => {
                  const dayEvs = filteredEventsForMonth.filter(e => e.date === md.dateStr);
                  const dayTs = tasks.filter(t => t.dueDate === md.dateStr && t.status === "open");
                  const isSelected = selectedDateStr === md.dateStr;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        selectDay(md.dateStr);
                        if (dayEvs.length === 0) {
                          handleOpenAddModal(md.dateStr);
                        } else {
                          setViewMode("day");
                        }
                      }}
                      className={`min-h-[90px] flex flex-col justify-between border rounded-xl p-2 relative transition-all cursor-pointer group ${
                        isSelected 
                          ? "bg-[var(--color-calendar-selected-bg)]/15 border-[var(--color-calendar-selected-bg)] shadow-md shadow-[var(--color-calendar-selected-bg)]/10" 
                          : md.isToday 
                            ? "bg-[var(--color-calendar-selected-bg)]/5 border-[var(--color-calendar-selected-bg)]/30" 
                            : md.isCurrentMonth 
                              ? "bg-[var(--color-surface)] border-[var(--color-border)]/40 hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)]" 
                              : "bg-transparent border-transparent text-[var(--color-text-faint)]/40 hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)]"
                      }`}
                    >
                      <div className="flex items-start justify-between select-none gap-1">
                        <div className="flex items-center gap-1">
                          <span className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded-md ${
                            md.isToday ? "bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] font-extrabold shadow" : "text-[var(--color-text-muted)]"
                          }`}>
                            {md.dayNum}
                          </span>

                          {dayTs.length > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-error)]" title={`${dayTs.length} pending obligations!`} />
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAddModal(md.dateStr);
                          }}
                          className="p-1 rounded bg-[var(--color-surface-3)] border border-[var(--color-border)] hover:bg-[var(--color-calendar-selected-bg)] hover:text-[var(--color-calendar-selected-text)] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title={`Add event for ${md.dateStr}`}
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      {/* Month Days Inner events list */}
                      <div className="space-y-1.5 mt-2 overflow-hidden flex-1 flex flex-col justify-end">
                        {dayEvs.slice(0, 3).map(ev => {
                          const scheme = getTypeColor(ev.type);
                          const isCompleted = ev.status === "completed";
                          const isCanceled = ev.status === "canceled";
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => { e.stopPropagation(); handleOpenEditModal(ev); }}
                              className={`text-[8.5px] font-black rounded px-1.5 py-0.5 border truncate hover:brightness-110 flex items-center gap-1 ${scheme.lightBg} ${scheme.text} ${scheme.border} ${
                                isCanceled 
                                  ? "line-through opacity-50 decoration-[var(--color-error)]" 
                                  : isCompleted 
                                    ? "border-[var(--color-success)]/40 text-[var(--color-success)] font-extrabold" 
                                    : ""
                              }`}
                              title={`${ev.time || ""} ${ev.title}`}
                            >
                              {ev.isPrivate && <Lock className="w-2 h-2 text-[var(--color-warning)] shrink-0 inline-block" />}
                              {ev.time ? <span className="opacity-70 mr-0.5 font-mono text-[8px]">{ev.time}</span> : null}
                              <span>{ev.title}</span>
                            </div>
                          );
                        })}
                        {dayEvs.length > 3 && (
                          <div className="text-[8px] text-[var(--color-accent)] font-semibold text-center select-none pt-0.5">
                            + {dayEvs.length - 3} further items
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW CASE 4: AGENDA INDEX LIST */}
          {viewMode === "list" && (
            <div className="flex-1 bg-[var(--color-surface-2)]/20 p-4 overflow-y-auto" id="view-timeline-list">
              <h4 className="text-xs font-bold uppercase text-[var(--color-text-muted)] mb-4 tracking-widest">Active Scheduled Items Ledger</h4>
              {filteredEventsForMonth.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-[var(--color-surface-2)]/30 rounded-xl border border-dashed border-[var(--color-border)] text-center">
                  <CalendarIcon className="w-10 h-10 text-[var(--color-accent)] opacity-60 mb-3" />
                  <h4 className="text-xs font-black text-[var(--color-text)] uppercase tracking-widest">No Scheduled Items Found</h4>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1 max-w-xs font-sans font-semibold">
                    No events or tasks are scheduled for this month matching the selected filters.
                  </p>
                  <button
                    onClick={() => handleOpenAddModal(new Date().toISOString().split("T")[0])}
                    className="mt-4 px-4 py-1.5 bg-[var(--color-calendar-selected-bg)]/10 border border-[var(--color-calendar-selected-bg)]/30 text-[var(--color-calendar-strong-text)] hover:bg-[var(--color-calendar-selected-bg)]/20 font-black text-[10px] uppercase rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Schedule New Event
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {filteredEventsForMonth
                    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""))
                    .map(ev => {
                      const scheme = getTypeColor(ev.type);
                      const isCompleted = ev.status === "completed";
                      const isCanceled = ev.status === "canceled";
                      return (
                        <div key={ev.id} className="py-3 flex items-center justify-between group hover:bg-[var(--color-surface-2)]/50 px-2.5 rounded-lg transition-colors">
                          <div className="flex items-center gap-3.5">
                            <span className={`w-3 h-3 rounded-full ${scheme.color} ${scheme.glow} shrink-0`} />
                            <div>
                              <span className={`text-xs font-bold flex items-center gap-1.5 ${
                                isCanceled 
                                  ? "line-through text-[var(--color-text-faint)]/70 decoration-[var(--color-error)]" 
                                  : isCompleted 
                                    ? "text-[var(--color-success)] font-extrabold" 
                                    : "text-[var(--color-text)]"
                              }`}>
                                {ev.isPrivate && <Lock className="w-3.5 h-3.5 text-[var(--color-warning)] shrink-0" />}
                                {isCompleted && <Check className="w-3.5 h-3.5 text-[var(--color-success)] shrink-0" />}
                                <span>{ev.title}</span>
                                {isCanceled && <span className="text-[8px] uppercase tracking-wider px-1 bg-[var(--color-error-subtle)] text-[var(--color-error)] rounded font-normal shrink-0">Canceled</span>}
                                {isCompleted && <span className="text-[8px] uppercase tracking-wider px-1 bg-[var(--color-success-subtle)] text-[var(--color-success)] rounded font-normal shrink-0">Completed</span>}
                              </span>
                              <div className="flex items-center gap-2.5 text-[10px] text-[var(--color-text-muted)] mt-1 font-semibold">
                                <span className="font-mono bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded text-[var(--color-text-muted)]">{ev.date}</span>
                                {ev.time && <span className="font-mono bg-[var(--color-calendar-selected-bg)]/5 text-[var(--color-calendar-strong-text)] px-1.5 py-0.5 rounded border border-[var(--color-calendar-selected-bg)]/10">{ev.time}</span>}
                                <span className="capitalize font-bold">{ev.type}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center flex-wrap gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {ev.id.startsWith("system-holiday-") ? (
                              <span className="text-[8px] font-black uppercase text-[var(--color-text-muted)] bg-[var(--color-surface-2)] border border-[var(--color-border)] px-1.5 py-0.5 rounded select-none">
                                Stat Holiday ({holidayRegion})
                              </span>
                            ) : (
                              <>
                                {ev.status !== "completed" && (
                                  <QuickActionButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateEventStatus(ev.id, "completed");
                                    }}
                                    variant="done"
                                    title="Mark Completed"
                                  />
                                )}
                                {ev.status !== "canceled" && (
                                  <QuickActionButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateEventStatus(ev.id, "canceled");
                                    }}
                                    variant="cancel"
                                    title="Cancel Event"
                                  />
                                )}
                                <QuickActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateEvent(ev);
                                  }}
                                  variant="copy"
                                  title="Duplicate Event"
                                />
                                <QuickActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRescheduleEvent(ev, "next-day");
                                  }}
                                  variant="plus1"
                                  title="Reschedule +1 Day"
                                />
                                <QuickActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRescheduleEvent(ev, "next-week");
                                  }}
                                  variant="plus7"
                                  title="Reschedule +1 Week"
                                />
                                <QuickActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(ev);
                                  }}
                                  variant="edit"
                                  title="Edit Event"
                                />
                                <QuickActionButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveEvent(ev.id);
                                  }}
                                  variant="delete"
                                  title="Delete Event"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Selected Day Agenda Side-drawer inside workflow */}
        <div className="mt-4 p-4 bg-[var(--color-surface-2)]/60 border border-[var(--color-border)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--color-calendar-selected-bg)]/10 border border-[var(--color-calendar-selected-bg)]/20 rounded-xl text-[var(--color-calendar-strong-text)]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest block">Selected Focus Date</span>
              <span className="text-xs font-black text-[var(--color-text)]">{selectedDayInfo.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--color-text-faint)] italic">Have a meeting or deadline to slate?</span>
            <button
              onClick={() => handleOpenAddModal(selectedDateStr)}
              className="px-4 py-2 bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] hover:opacity-90 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Schedule on selected
            </button>
          </div>
        </div>

      </div>

      {/* COMPREHENSIVE RE-ENGINEERED APPOINTMENT EDIT / CREATE MODAL */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 bg-[var(--color-sidebar)]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)"
              }}
            >
              {/* Header */}
              <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 flex items-center justify-between shrink-0">
                <h3 className="text-xs uppercase font-extrabold text-[var(--color-calendar-strong-text)] tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 fill-[var(--color-calendar-selected-bg)]/30 text-[var(--color-calendar-selected-bg)]" />
                  {editingEvent ? "Tweak Calendar Record" : "Book New Action Record"}
                </h3>
                <button
                  onClick={() => setIsEventModalOpen(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form container */}
              <form onSubmit={saveEvent} className="flex flex-col overflow-hidden max-h-[85vh] md:max-h-[80vh]">
                
                {/* Scrollable Body */}
                <div className="p-5 overflow-y-auto space-y-5 text-left flex-1 custom-scrollbar">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                    
                    {/* LEFT COLUMN */}
                    <div className="space-y-5">
                      
                      {/* Section 1: Core Action Details */}
                      <div className="bg-[var(--color-surface-2)]/20 border border-[var(--color-border)]/40 rounded-xl p-4.5 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]/30 mb-1">
                          <CalendarIcon className="w-4 h-4 text-[var(--color-calendar-selected-bg)] shrink-0" />
                          <h4 className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-wider">
                            Section 1: Core Action Details
                          </h4>
                        </div>

                        {/* Title */}
                        <div>
                          <label className="text-[10px] text-[var(--color-text-muted)] font-extrabold uppercase tracking-wider block mb-1">
                            Appointment / Milestone Title <span className="text-[var(--color-error)]">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., RBC Refinance Signing, Call Equifax underwriter"
                            value={eventTitle}
                            onChange={(e) => setEventTitle(e.target.value)}
                            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/40 font-bold transition-all"
                          />
                        </div>

                        {/* Date & Start Time */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-[var(--color-text-muted)] font-extrabold uppercase tracking-wider block mb-1">Target Date</label>
                            <input
                              type="date"
                              required
                              value={eventDate}
                              onChange={(e) => setEventDate(e.target.value)}
                              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/40 font-mono transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[var(--color-text-muted)] font-extrabold uppercase tracking-wider block mb-1">Target Start Time</label>
                            <select
                              required
                              value={eventTime}
                              onChange={(e) => setEventTime(e.target.value)}
                              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/40 font-semibold cursor-pointer transition-all"
                            >
                              {timePickerOptions.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Planned Duration */}
                        <div>
                          <label className="text-[10px] text-[var(--color-text-muted)] font-extrabold uppercase tracking-wider block mb-1">Planned Duration</label>
                          <select
                            value={eventDuration}
                            onChange={(e) => setEventDuration(Number(e.target.value))}
                            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/40 transition-all"
                          >
                            <option value={15} className="bg-[var(--color-surface)] text-[var(--color-text)]">15 Minutes Slot</option>
                            <option value={30} className="bg-[var(--color-surface)] text-[var(--color-text)]">30 Minutes</option>
                            <option value={45} className="bg-[var(--color-surface)] text-[var(--color-text)]">45 Minutes Slot</option>
                            <option value={60} className="bg-[var(--color-surface)] text-[var(--color-text)]">1 Hour Framework</option>
                            <option value={90} className="bg-[var(--color-surface)] text-[var(--color-text)]">1.5 Hours</option>
                            <option value={120} className="bg-[var(--color-surface)] text-[var(--color-text)]">2 Hours block</option>
                            <option value={180} className="bg-[var(--color-surface)] text-[var(--color-text)]">3 Hours block</option>
                            <option value={240} className="bg-[var(--color-surface)] text-[var(--color-text)]">4 Hours block</option>
                          </select>
                        </div>
                      </div>

                      {/* Section 4: Notes */}
                      <div className="bg-[var(--color-surface-2)]/20 border border-[var(--color-border)]/40 rounded-xl p-4.5 space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]/30 mb-1">
                          <Edit3 className="w-4 h-4 text-[var(--color-calendar-selected-bg)] shrink-0" />
                          <h4 className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-wider">
                            Section 4: Notes
                          </h4>
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--color-text-muted)] font-extrabold uppercase tracking-wider block mb-1">Internal Instructions & Agenda Notes</label>
                          <textarea
                            rows={4}
                            placeholder="Provide specific guidelines, location details, phone coordinates, or items to finalize..."
                            value={eventNotes}
                            onChange={(e) => setEventNotes(e.target.value)}
                            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-text-faint)]/40 focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/40 transition-all"
                          />
                        </div>
                      </div>

                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-5">

                      {/* Section 2: Classification & Linkage */}
                      <div className="bg-[var(--color-surface-2)]/20 border border-[var(--color-border)]/40 rounded-xl p-4.5 space-y-4 relative z-20">
                        <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]/30 mb-1">
                          <Layers className="w-4 h-4 text-[var(--color-calendar-selected-bg)] shrink-0" />
                          <h4 className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-wider">
                            Section 2: Classification & Linkage
                          </h4>
                        </div>

                        {/* Color-Coded classification selector */}
                        <div>
                          <label className="text-[10px] text-[var(--color-text-muted)] font-extrabold uppercase tracking-wider block mb-2">Classification Group</label>
                          <div className="grid grid-cols-2 gap-2">
                            {eventTypes.map(et => {
                              const isSelected = eventType === et.value;
                              return (
                                <button
                                  key={et.value}
                                  type="button"
                                  onClick={() => setEventType(et.value as Event["type"])}
                                  className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-left border text-[10px] font-bold transition-all cursor-pointer ${
                                    isSelected 
                                      ? `${et.lightBg} ${et.border} ${et.text} ${et.glow} border-white/20 ring-1 ring-white/10` 
                                      : "bg-[var(--color-surface-2)]/40 border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]"
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${et.color} ${et.glow} shrink-0`} />
                                  <span className="truncate">{et.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Linked Deal client file */}
                        <div className="relative">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] text-[var(--color-text-muted)] font-extrabold uppercase tracking-wider block">
                              Linked Client File
                            </label>
                            {eventClientId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEventClientId("");
                                  setClientSearchQuery("");
                                  setClientSearchOpen(false);
                                }}
                                className="text-[10px] text-[var(--color-error)] hover:opacity-80 font-extrabold uppercase tracking-wide transition-colors cursor-pointer"
                              >
                                Clear Link
                              </button>
                            )}
                          </div>
                          
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search clients..."
                              value={clientSearchQuery}
                              onChange={(e) => {
                                setClientSearchQuery(e.target.value);
                                setClientSearchOpen(true);
                              }}
                              onFocus={() => setClientSearchOpen(true)}
                              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/45 font-semibold placeholder-[var(--color-text-faint)]/40 transition-all"
                            />
                            
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[10px] pointer-events-none select-none">
                              {eventClientId ? (
                                <span className="bg-[var(--color-success-subtle)] text-[var(--color-success)] font-extrabold border border-[var(--color-success)]/15 rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-wide">
                                  Linked
                                </span>
                              ) : (
                                <span className="text-[var(--color-text-faint)]/40 text-[10px] font-mono">
                                  Search
                                </span>
                              )}
                            </div>
                          </div>

                          {clientSearchOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setClientSearchOpen(false)}
                              />
                              
                              <div className="absolute left-0 right-0 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden z-20 max-h-60 overflow-y-auto">
                                {filteredClients.length === 0 ? (
                                  <div className="p-4 text-center text-xs text-[var(--color-text-faint)]">
                                    No matching clients found
                                  </div>
                                ) : (
                                  <div className="divide-y divide-[var(--color-border)]/50">
                                    {filteredClients.map(cl => {
                                      const isSelected = eventClientId === cl.id;
                                      return (
                                        <button
                                          key={cl.id}
                                          type="button"
                                          onClick={() => {
                                            setEventClientId(cl.id);
                                            setClientSearchQuery(`${cl.first} ${cl.last}`);
                                            setClientSearchOpen(false);
                                          }}
                                          className={`w-full text-left p-2.5 flex flex-col gap-0.5 transition-colors hover:bg-[var(--color-surface-2)] cursor-pointer ${
                                            isSelected ? "bg-[var(--color-calendar-selected-bg)]/10" : ""
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-[var(--color-text)]">
                                              {cl.first} {cl.last}
                                            </span>
                                            {cl.status && (
                                              <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-[var(--color-surface-3)] border border-[var(--color-border)] text-[var(--color-text-muted)] scale-90">
                                                {cl.status}
                                              </span>
                                            )}
                                          </div>
                                          
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-[var(--color-text-faint)] gap-1">
                                            {cl.email && (
                                              <span className="truncate max-w-[180px]">{cl.email}</span>
                                            )}
                                            {cl.cell && (
                                              <span className="font-mono">{cl.cell}</span>
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Section 3: Activity Controls */}
                      <div className="bg-[var(--color-surface-2)]/20 border border-[var(--color-border)]/40 rounded-xl p-4.5 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]/30 mb-1">
                          <Settings className="w-4 h-4 text-[var(--color-calendar-selected-bg)] shrink-0" />
                          <h4 className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-wider">
                            Section 3: Activity Controls
                          </h4>
                        </div>

                        {/* Activity Status */}
                        <div>
                          <label className="text-[10px] text-[var(--color-text-muted)] font-extrabold uppercase tracking-wider block mb-1.5">
                            Activity Status
                          </label>
                          <div className="grid grid-cols-3 gap-1 bg-[var(--color-surface-2)]/50 p-1 rounded-xl border border-[var(--color-border)]/50">
                            {(["scheduled", "completed", "canceled"] as const).map(status => {
                              const isSelected = eventStatus === status;
                              let activeClass = "";
                              if (isSelected) {
                                if (status === "scheduled") activeClass = "bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] font-extrabold shadow-sm";
                                if (status === "completed") activeClass = "bg-[var(--color-success)] text-white font-extrabold shadow-sm";
                                if (status === "canceled") activeClass = "bg-[var(--color-error)] text-white font-extrabold shadow-sm";
                              } else {
                                activeClass = "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]";
                              }
                              return (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => setEventStatus(status)}
                                  className={`py-1.5 text-[10px] font-bold rounded-lg transition-all capitalize cursor-pointer text-center ${activeClass}`}
                                >
                                  {status}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Reminder alert */}
                        <div>
                          <label className="text-[10px] text-[var(--color-text-muted)] font-extrabold uppercase tracking-wider block mb-1.5">
                            Reminder Alert
                          </label>
                          <div className="relative">
                            <select
                              value={eventReminder}
                              onChange={(e) => setEventReminder(e.target.value as any)}
                              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/45 font-semibold appearance-none cursor-pointer transition-all"
                            >
                              <option value="none" className="bg-[var(--color-surface)] text-[var(--color-text)]">No reminder</option>
                              <option value="15m" className="bg-[var(--color-surface)] text-[var(--color-text)]">15 minutes before</option>
                              <option value="30m" className="bg-[var(--color-surface)] text-[var(--color-text)]">30 minutes before</option>
                              <option value="1h" className="bg-[var(--color-surface)] text-[var(--color-text)]">1 hour before</option>
                              <option value="1d" className="bg-[var(--color-surface)] text-[var(--color-text)]">1 day before</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-faint)]">
                              <Bell className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>

                        {/* Privacy checkbox */}
                        <div className="flex items-center gap-2 pt-1 select-none">
                          <input
                            type="checkbox"
                            id="event-private-checkbox"
                            checked={eventIsPrivate}
                            onChange={(e) => setEventIsPrivate(e.target.checked)}
                            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-calendar-selected-bg)] focus:ring-1 focus:ring-[var(--color-calendar-selected-bg)] cursor-pointer accent-[var(--color-calendar-selected-bg)]"
                          />
                          <label htmlFor="event-private-checkbox" className="text-xs text-[var(--color-text-muted)] font-extrabold hover:text-[var(--color-text)] cursor-pointer flex items-center gap-1.5 transition-all">
                            <Lock className="w-3.5 h-3.5 text-[var(--color-warning)]" />
                            <span>Private activity (internal calendar only)</span>
                          </label>
                        </div>
                      </div>

                      {/* Section 5: Follow-up Workflow */}
                      <div className="bg-[var(--color-surface-2)]/20 border border-[var(--color-border)]/40 rounded-xl p-4.5 space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]/30 mb-1">
                          <Sparkles className="w-4 h-4 text-[var(--color-calendar-selected-bg)] shrink-0" />
                          <h4 className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-wider">
                            Section 5: Follow-up Workflow
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 select-none">
                          <input
                            type="checkbox"
                            id="event-followup-checkbox"
                            checked={createFollowUp}
                            onChange={(e) => {
                              setCreateFollowUp(e.target.checked);
                              if (e.target.checked) {
                                let defaultFollowUpDate = eventDate;
                                if (eventDate) {
                                  try {
                                    const d = new Date(eventDate + "T12:00:00");
                                    d.setDate(d.getDate() + 1);
                                    defaultFollowUpDate = d.toISOString().split("T")[0];
                                  } catch (err) {}
                                }
                                setFollowUpDate(defaultFollowUpDate);
                                setFollowUpTime(eventTime || "09:00");
                                setFollowUpTitle(`Follow-up: ${eventTitle ? eventTitle.trim() : ""}`);
                              }
                            }}
                            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-calendar-selected-bg)] focus:ring-1 focus:ring-[var(--color-calendar-selected-bg)] cursor-pointer accent-[var(--color-calendar-selected-bg)]"
                          />
                          <label htmlFor="event-followup-checkbox" className="text-xs font-black uppercase text-[var(--color-calendar-selected-bg)] tracking-wider hover:text-[var(--color-calendar-selected-bg)]/80 cursor-pointer flex items-center gap-1.5 transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create follow-up action after saving</span>
                          </label>
                        </div>

                        <AnimatePresence>
                          {createFollowUp && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-3 bg-[var(--color-calendar-selected-bg)]/5 border border-[var(--color-calendar-selected-bg)]/20 p-3.5 rounded-xl overflow-hidden text-left"
                            >
                              <div className="text-[10px] text-[var(--color-calendar-strong-text)] font-extrabold uppercase tracking-wide flex items-center gap-1.5 mb-1 bg-[var(--color-calendar-selected-bg)]/10 px-2 py-1 rounded-md border border-[var(--color-calendar-selected-bg)]/10">
                                <Sparkles className="w-3 h-3 fill-[var(--color-calendar-selected-bg)]/20 text-[var(--color-calendar-selected-bg)]" />
                                <span>Designated Follow-Up Step</span>
                              </div>
                              <div>
                                <label className="text-[10px] text-[var(--color-text-muted)] font-extrabold uppercase tracking-wider block mb-1">
                                  Follow-up Title <span className="text-[var(--color-error)]">*</span>
                                </label>
                                <input
                                  type="text"
                                  required={createFollowUp}
                                  placeholder="e.g., Client check-in, Sign follow-up docs"
                                  value={followUpTitle}
                                  onChange={(e) => setFollowUpTitle(e.target.value)}
                                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/40 font-bold transition-all"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] text-[var(--color-text-muted)] font-extrabold uppercase tracking-wider block mb-1">
                                    Follow-up Date <span className="text-[var(--color-error)]">*</span>
                                  </label>
                                  <input
                                    type="date"
                                    required={createFollowUp}
                                    value={followUpDate}
                                    onChange={(e) => setFollowUpDate(e.target.value)}
                                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/40 font-mono transition-all"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] text-[var(--color-text-muted)] font-extrabold uppercase tracking-wider block mb-1">
                                    Follow-up Time
                                  </label>
                                  <input
                                    type="time"
                                    value={followUpTime}
                                    onChange={(e) => setFollowUpTime(e.target.value)}
                                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/40 font-mono transition-all"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>

                  </div>

                </div>

                {/* Operations buttons / Footer (Fixed and clearly separated) */}
                <div className="p-4 bg-[var(--color-surface-2)]/50 border-t border-[var(--color-border)] flex gap-2.5 justify-between shrink-0">
                  {editingEvent ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveEvent(editingEvent.id)}
                      className="px-4 py-2 bg-[var(--color-error-subtle)] text-[var(--color-error)] hover:bg-[var(--color-error)]/20 rounded-xl text-xs font-bold transition-all border border-[var(--color-error)]/20 cursor-pointer"
                    >
                      Delete Event
                    </button>
                  ) : <div />}

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsEventModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-xs font-bold text-[var(--color-text-muted)] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] hover:opacity-90 text-xs font-extrabold transition-all cursor-pointer"
                    >
                      Save appointment
                    </button>
                  </div>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirmOpen && (
          <div className="fixed inset-0 bg-[var(--color-sidebar)]/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden text-left"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)"
              }}
            >
              <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 flex items-center justify-between">
                <h3 className="text-xs uppercase font-extrabold text-[var(--color-error)] tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[var(--color-error)]" />
                  Delete Calendar Record?
                </h3>
                <button
                  type="button"
                  onClick={cancelDeleteEvent}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-semibold">
                  Are you sure you want to permanently delete this calendar record? This action cannot be undone.
                </p>
              </div>

              <div className="p-4 border-t border-[var(--color-border)] flex gap-2.5 justify-end bg-[var(--color-surface-2)]/20">
                <button
                  type="button"
                  onClick={cancelDeleteEvent}
                  className="px-4 py-2 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteEvent}
                  className="px-4 py-2 bg-[var(--color-error)] hover:opacity-95 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-[var(--color-error)]/15"
                >
                  Delete Event
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CALENDAR SETTINGS MODAL */}
      <AnimatePresence>
        {calendarSettingsOpen && (
          <div className="fixed inset-0 bg-[var(--color-sidebar)]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden text-left"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)"
              }}
            >
              {/* Header */}
              <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/40 flex items-center justify-between">
                <h3 className="text-xs uppercase font-extrabold text-[var(--color-calendar-strong-text)] tracking-wider flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-[var(--color-calendar-selected-bg)]" />
                  Calendar Configuration Settings
                </h3>
                <button
                  onClick={() => setCalendarSettingsOpen(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {/* Workday hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block mb-1">
                      Start Hour
                    </label>
                    <select
                      value={workdayStartHour}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (val >= workdayEndHour) {
                          showToast("Start hour must be before end hour", "warning");
                          return;
                        }
                        setWorkdayStartHour(val);
                      }}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/45 font-semibold"
                    >
                      {Array.from({ length: 11 }, (_, i) => i + 5).map(h => (
                        <option key={h} value={h} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                          {String(h).padStart(2, "0")}:00 {h >= 12 ? "PM" : "AM"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block mb-1">
                      End Hour
                    </label>
                    <select
                      value={workdayEndHour}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (val <= workdayStartHour) {
                          showToast("End hour must be after start hour", "warning");
                          return;
                        }
                        setWorkdayEndHour(val);
                      }}
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/45 font-semibold"
                    >
                      {Array.from({ length: 11 }, (_, i) => i + 13).map(h => (
                        <option key={h} value={h} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                          {String(h).padStart(2, "0")}:00 {h >= 12 ? "PM" : "AM"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Slot Interval */}
                <div>
                  <label className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block mb-1">
                    Slot Interval
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[15, 30].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSlotInterval(val as 15 | 30)}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          slotInterval === val 
                            ? "bg-[var(--color-calendar-selected-bg)]/10 border-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-strong-text)] font-extrabold" 
                            : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        {val} Minutes
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default Duration */}
                <div>
                  <label className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block mb-1">
                    Default Duration
                  </label>
                  <select
                    value={defaultDuration}
                    onChange={(e) => setDefaultDuration(parseInt(e.target.value, 10))}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/45 font-semibold"
                  >
                    {[15, 30, 45, 60, 90, 120].map(d => (
                      <option key={d} value={d} className="bg-[var(--color-surface)] text-[var(--color-text)]">
                        {d} Minutes
                      </option>
                    ))}
                  </select>
                </div>

                {/* Default View */}
                <div>
                  <label className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider block mb-1">
                    Default View
                  </label>
                  <select
                    value={defaultView}
                    onChange={(e) => {
                      const v = e.target.value as "day" | "week" | "month" | "list";
                      setDefaultView(v);
                      setViewMode(v); // Respect view change directly
                    }}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-calendar-selected-bg)]/45 font-semibold"
                  >
                    <option value="day" className="bg-[var(--color-surface)] text-[var(--color-text)]">Day Timeline</option>
                    <option value="week" className="bg-[var(--color-surface)] text-[var(--color-text)]">Week Timeline</option>
                    <option value="month" className="bg-[var(--color-surface)] text-[var(--color-text)]">Month Grid</option>
                    <option value="list" className="bg-[var(--color-surface)] text-[var(--color-text)]">Backlog List</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/20 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCalendarSettingsOpen(false)}
                  className="px-4 py-2 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-extrabold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarSettingsOpen(false);
                    showToast("Calendar preferences saved!", "success", "✓");
                  }}
                  className="px-4 py-2 bg-[var(--color-calendar-selected-bg)] text-[var(--color-calendar-selected-text)] hover:opacity-90 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
