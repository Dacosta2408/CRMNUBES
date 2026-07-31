import { useState, useEffect } from "react";
import { Task, User } from "../types";
import { safeJsonParse } from "../lib/json";
import { fetchTasksApi, createTaskApi, updateTaskApi } from "../lib/api";

export interface UseTasksDeps {
  currentUser: User;
  showToast: (msg: string, type?: "success" | "error", icon?: string) => void;
}

export function useTasks({ currentUser, showToast }: UseTasksDeps) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("gbk_tasks");
    const arr = safeJsonParse<Task[]>(saved, []);
    if (!arr.length) {
      // Seed initial tasks
      return [
        {
          id: "t_1",
          title: "Follow up with David Martinez regarding teacher salary paystubs",
          status: "open",
          priority: "high",
          dueDate: new Date().toISOString().split("T")[0],
          clientId: "c_smith",
          clientName: "David Martinez",
          assignedTo: "David Acosta",
          notes: "Lender condition outstanding on loan.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "System"
        },
        {
          id: "t_2",
          title: "Run GDS/TDS stress analysis on Marcus Jackson stated income",
          status: "open",
          priority: "medium",
          dueDate: new Date().toISOString().split("T")[0],
          clientId: "c_jackson",
          clientName: "Marcus Jackson",
          assignedTo: "David Acosta",
          notes: "Alt-A applicant scenario.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: "System"
        }
      ];
    }
    return arr;
  });

  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [taskModalOpen, setTaskModalOpen] = useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Sync tasks from API on mount
  useEffect(() => {
    async function loadTasksFromApi() {
      const apiTasks = await fetchTasksApi();
      if (apiTasks && apiTasks.length > 0) {
        // Map backend task format to frontend Task interface
        const formatted: Task[] = apiTasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          status: (t.status === "completed" || t.status === "done") ? "done" : "open",
          priority: t.priority || "medium",
          dueDate: t.due_at ? t.due_at.split("T")[0] : new Date().toISOString().split("T")[0],
          clientId: t.related_client_id || "",
          clientName: "",
          assignedTo: t.assigned_to || "David Acosta",
          notes: t.description || t.notes || "",
          createdAt: t.created_at || new Date().toISOString(),
          updatedAt: t.updated_at || new Date().toISOString(),
          createdBy: "System"
        }));
        setTasks(formatted);
      }
    }
    loadTasksFromApi();
  }, []);

  // Persist tasks to localStorage via useEffect
  useEffect(() => {
    localStorage.setItem("gbk_tasks", JSON.stringify(tasks));
  }, [tasks]);

  return {
    tasks,
    setTasks,
    taskFilter,
    setTaskFilter,
    taskModalOpen,
    setTaskModalOpen,
    editingTaskId,
    setEditingTaskId
  };
}
