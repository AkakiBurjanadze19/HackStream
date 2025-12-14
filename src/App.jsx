import { useState, useEffect, useMemo } from "react";
import TaskCard from "./Components/TaskCard";
import TaskModal from "./Components/TaskModal";
import WorkspaceLanding from "./WorkspaceLanding";
import TaskPriorityGraphD3 from "./TaskPriorityGraphD3";
import TaskDetailsModal from "./TaskDetailsModal";
import PrioritySimulation from "./PrioritySimulation";
import TaskChatbot from "./TaskChatbot";

// localStorage keys
const STORAGE_KEYS = {
  workspaces: "hackstream_workspaces",
  tasks: "hackstream_tasks",
  chatbot: "hackstream_chatbot",
};

// Helper functions for localStorage
const loadWorkspaces = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.workspaces);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading workspaces from localStorage:", error);
  }
  // Default workspaces if nothing is stored
  return [
    { id: "1", name: "Personal Tasks", type: "personal", color: "#475569" },
    { id: "2", name: "Uni Project", type: "normal", color: "#0F766E" },
    { id: "3", name: "Company Board", type: "company", color: "#4F46E5" },
  ];
};

const saveWorkspaces = (workspaces) => {
  try {
    localStorage.setItem(STORAGE_KEYS.workspaces, JSON.stringify(workspaces));
  } catch (error) {
    console.error("Error saving workspaces to localStorage:", error);
  }
};

const loadTasks = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.tasks);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading tasks from localStorage:", error);
  }
  // Return empty object if nothing is stored
  return {};
};

const saveTasks = (tasksByWorkspace) => {
  try {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasksByWorkspace));
  } catch (error) {
    console.error("Error saving tasks to localStorage:", error);
  }
};

function normalizeStatus(s) {
  const v = String(s ?? "").toLowerCase().trim();
  if (v === "done") return "done";
  if (v === "ongoing" || v === "on going" || v === "in progress") return "ongoing";
  if (v === "restricted" || v === "blocked") return "restricted";
  return "todo";
}

function prettyStatus(s) {
  if (s === "todo") return "Yet to be done";
  if (s === "ongoing") return "On going";
  if (s === "done") return "Done";
  return "Restricted";
}

// Filter toolbar styles
const filterStyles = {
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  search: {
    flex: "1 1 200px",
    minWidth: 150,
    height: 38,
    borderRadius: 12,
    border: "1px solid #334155",
    background: "#334155",
    padding: "0 12px",
    outline: "none",
    fontSize: 13,
    color: "#F1F5F9",
    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.10)",
    transition: "all 0.2s ease",
  },
  select: {
    height: 38,
    borderRadius: 12,
    border: "1px solid #334155",
    background: "#334155",
    padding: "0 12px",
    outline: "none",
    fontSize: 13,
    color: "#F1F5F9",
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.10)",
    transition: "all 0.2s ease",
  },
  input: {
    height: 38,
    minWidth: 120,
    borderRadius: 12,
    border: "1px solid #334155",
    background: "#334155",
    padding: "0 12px",
    outline: "none",
    fontSize: 13,
    color: "#F1F5F9",
    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.10)",
    transition: "all 0.2s ease",
  },
  noValue: {
    height: 38,
    display: "flex",
    alignItems: "center",
    padding: "0 12px",
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  count: {
    marginLeft: "auto",
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    color: "#94A3B8",
    background: "#334155",
    borderRadius: 10,
    border: "1px solid #475569",
  },
};

export default function App() {
  const [workspaces, setWorkspaces] = useState(() => loadWorkspaces());
  const [activeWs, setActiveWs] = useState(null);
  // tasksByWorkspace is an object where keys are workspace IDs and values are task arrays
  const [tasksByWorkspace, setTasksByWorkspace] = useState(() => loadTasks());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  // Graph visualization state
  const [activeTask, setActiveTask] = useState(null);
  const [activeEffectiveStatus, setActiveEffectiveStatus] = useState(null);
  const [activeBlockedReason, setActiveBlockedReason] = useState(null);
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  
  // Simulation state (shared between graph and simulation panel)
  const [simulationCompletedTaskIds, setSimulationCompletedTaskIds] = useState(new Set());
  const [simulationIsPlaying, setSimulationIsPlaying] = useState(false);
  const [simulationExecutionOrder, setSimulationExecutionOrder] = useState([]);

  // Filter state
  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState("");
  const [filterOp, setFilterOp] = useState("on");
  const [filterValue, setFilterValue] = useState("");

  // Calculate hours until deadline from deadline date
  function calculateHoursUntilDeadline(deadline) {
    if (!deadline) return null;
    try {
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) return null;
      const ms = deadlineDate.getTime() - Date.now();
      const hrs = Math.ceil(ms / (1000 * 60 * 60));
      return Number.isFinite(hrs) ? Math.max(0, hrs) : null;
    } catch {
      return null;
    }
  }

  // Calculate computed priority based on formula: priority = (importance × urgency) / effort
  // where urgency = 1 / hours_until_deadline
  function calculateComputedPriority(task) {
    const importance = Number(task.importance ?? 3);
    const effort = Number(task.effort ?? 1);
    
    // Recalculate hours until deadline if we have a deadline date
    let hoursUntilDeadline = task.hours_left_until_deadline;
    if (task.deadline && (hoursUntilDeadline === null || hoursUntilDeadline === undefined)) {
      hoursUntilDeadline = calculateHoursUntilDeadline(task.deadline);
    }
    hoursUntilDeadline = Number(hoursUntilDeadline ?? 0);
    
    // Handle edge cases for urgency calculation
    let urgency;
    if (!Number.isFinite(hoursUntilDeadline) || hoursUntilDeadline <= 0) {
      // If no deadline or overdue, use a very small urgency to avoid division by zero
      urgency = 0.001;
    } else {
      urgency = 1 / hoursUntilDeadline;
    }
    
    // Avoid division by zero for effort
    const safeEffort = effort > 0 ? effort : 1;
    
    const computedPriority = (importance * urgency) / safeEffort;
    return Number.isFinite(computedPriority) ? computedPriority : 0;
  }

  // Normalize tasks to ensure they have required fields for graph
  const normalizeTasks = useMemo(() => {
    if (!activeWs) return [];
    const workspaceTasks = tasksByWorkspace[activeWs.id] || [];
    const taskMap = new Map(workspaceTasks.map((t) => [String(t.id), t]));
    
    return workspaceTasks.map((t) => {
      // Convert dependency names to IDs if dependsOn doesn't exist
      let dependsOn = t.dependsOn;
      if (!dependsOn && Array.isArray(t.dependencies) && t.dependencies.length > 0) {
        dependsOn = t.dependencies
          .map((dep) => {
            // Try to find by name first
            const found = workspaceTasks.find((other) => 
              other.id !== t.id &&
              String(other.title || "").toLowerCase().trim() === String(dep).toLowerCase().trim()
            );
            if (found) return String(found.id);
            // If not found by name, try as ID
            if (taskMap.has(String(dep))) return String(dep);
            return null;
          })
          .filter(Boolean);
      }
      
      // Recalculate hours_left_until_deadline if we have a deadline
      let hoursLeft = t.hours_left_until_deadline;
      if (t.deadline) {
        const recalculated = calculateHoursUntilDeadline(t.deadline);
        if (recalculated !== null) {
          hoursLeft = recalculated;
        }
      }
      
      // Calculate computed priority using the formula
      const computedPriority = calculateComputedPriority({
        ...t,
        hours_left_until_deadline: hoursLeft,
      });
      
      return {
        ...t,
        // Update hours_left_until_deadline with recalculated value
        hours_left_until_deadline: hoursLeft,
        // Use computed priority for graph visualization
        priority: computedPriority,
        computedPriority,
        // Ensure dependsOn exists
        dependsOn: dependsOn ?? [],
      };
    });
  }, [activeWs, tasksByWorkspace]);

  // Helper function to calculate effective status and blocked reason for a task
  function calculateEffectiveStatus(task, allTasks) {
    const byId = new Map(allTasks.map((t) => [String(t.id), t]));
    const isDone = (t) => normalizeStatus(t?.status) === "done";
    
    const raw = normalizeStatus(task.status);
    const deps = Array.isArray(task.dependsOn) 
      ? task.dependsOn.map(String)
      : Array.isArray(task.dependencies)
      ? task.dependencies.map(String)
      : [];
    
    const unmet = deps.filter((id) => {
      const depTask = byId.get(id);
      return depTask && !isDone(depTask);
    });
    
    const blockedByDeps = unmet.length > 0;
    let effectiveStatus = raw;
    if (raw !== "done" && blockedByDeps) {
      effectiveStatus = "restricted";
    }
    
    const blockedReason = blockedByDeps
      ? `Blocked by: ${unmet
          .map((id) => byId.get(id)?.title || id)
          .slice(0, 4)
          .join(", ")}${unmet.length > 4 ? "…" : ""}`
      : null;
    
    return { effectiveStatus, blockedReason };
  }

  // Get tasks for the currently active workspace (normalized)
  const tasks = normalizeTasks;

  // Helper function for filtering
  const norm = (x) => String(x ?? "").toLowerCase().trim();

  function urgencyFromHours(h) {
    const n = Number(h);
    if (!Number.isFinite(n)) return "unknown";
    if (n <= 0) return "overdue";
    if (n <= 6) return "due_soon";
    if (n <= 24) return "due_today";
    return "plenty";
  }

  function matchesFilter(task) {
    // 1) Search (ONLY title)
    if (search.trim()) {
      const q = norm(search);
      const inTitle = norm(task.title).includes(q);
      if (!inTitle) return false;
    }

    // 2) If filter needs a value and it's empty => don't filter
    if (!norm(filterValue)) return true;

    const key = filterKey;

    // --- urgency (from hours_left_until_deadline) ---
    if (key === "urgency") {
      const u = urgencyFromHours(task.hours_left_until_deadline);
      return u === filterValue;
    }

    // --- status ---
    if (key === "status") {
      const taskStatus = normalizeStatus(task.status);
      return taskStatus === filterValue || task.status === filterValue;
    }

    // --- priority ---
    if (key === "priority") {
      const n = Number(task.priority ?? task.importance);
      const x = Number(filterValue);
      if (!Number.isFinite(n) || !Number.isFinite(x)) return false;
      // Only >= operator (most common use case: show high priority tasks)
      return n >= x;
    }

    // --- deadline ---
    if (key === "deadline") {
      if (!task.deadline) return false;
      const dv = new Date(task.deadline).getTime();
      const xv = filterValue ? new Date(filterValue).getTime() : NaN;
      if (!Number.isFinite(dv) || !Number.isFinite(xv)) return false;

      if (filterOp === "on") {
        const d1 = new Date(dv);
        const d2 = new Date(xv);
        return (
          d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() === d2.getDate()
        );
      }
      if (filterOp === "after") return dv > xv;
      return true;
    }

    return true;
  }

  // Filtered tasks
  const filteredTasks = useMemo(() => tasks.filter(matchesFilter), [tasks, search, filterKey, filterOp, filterValue]);

  // Sort function: by computed priority (highest first), prioritizing unblocked tasks
  const sortByPriority = (taskList) => {
    return [...taskList].sort((a, b) => {
      // Check if tasks are blocked (restricted)
      const aStatus = calculateEffectiveStatus(a, tasks);
      const bStatus = calculateEffectiveStatus(b, tasks);
      const aBlocked = aStatus.effectiveStatus === "restricted";
      const bBlocked = bStatus.effectiveStatus === "restricted";
      
      // Unblocked tasks come first
      if (aBlocked !== bBlocked) {
        return aBlocked ? 1 : -1;
      }
      
      // Then sort by computed priority (highest first)
      const aPriority = a.computedPriority ?? a.priority ?? 0;
      const bPriority = b.computedPriority ?? b.priority ?? 0;
      return bPriority - aPriority;
    });
  };

  // Sorted tasks for graph visualization (using filtered tasks)
  const sortedForList = useMemo(() => sortByPriority(filteredTasks), [filteredTasks, tasks]);

  // Sorted tasks for task cards section
  const sortedTaskCards = useMemo(() => sortByPriority(filteredTasks), [filteredTasks, tasks]);

  // Save workspaces to localStorage whenever they change
  useEffect(() => {
    saveWorkspaces(workspaces);
  }, [workspaces]);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    saveTasks(tasksByWorkspace);
  }, [tasksByWorkspace]);

  // Handle Escape key to close fullscreen graph
  useEffect(() => {
    if (!isGraphFullscreen) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setIsGraphFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isGraphFullscreen]);

  // Initialize empty tasks array for new workspace when it's selected
  useEffect(() => {
    if (activeWs) {
      setTasksByWorkspace((prev) => {
        // Only initialize if it doesn't exist
        if (!prev[activeWs.id]) {
          return {
            ...prev,
            [activeWs.id]: [],
          };
        }
        return prev;
      });
    }
  }, [activeWs]);

  const handleCreateTask = (taskData) => {
    if (!activeWs) return;
    
    // Convert dependency names to task IDs by finding matching tasks
    const workspaceTasks = tasksByWorkspace[activeWs.id] || [];
    const dependencyIds = (taskData.dependencies || []).map((depName) => {
      // Try to find task by title/name
      const found = workspaceTasks.find((t) => 
        String(t.title || "").toLowerCase().trim() === String(depName).toLowerCase().trim()
      );
      return found ? String(found.id) : null;
    }).filter(Boolean);
    
    const newTask = {
      id: Date.now(),
      ...taskData,
      priority: taskData.importance ?? taskData.priority ?? 3, // Map importance to priority for graph
      hours_left_until_deadline: taskData.hoursLeft || 0,
      creation_date: (taskData.createdAt || new Date().toISOString()).split('T')[0],
      dependencies: taskData.dependencies || [],
      dependsOn: dependencyIds, // For graph visualization
      status: "backlog"
    };
    
    // Add task to the current workspace only
    setTasksByWorkspace((prev) => ({
      ...prev,
      [activeWs.id]: [...(prev[activeWs.id] || []), newTask],
    }));
    
    setIsModalOpen(false);
  };

  function advanceStatus(task) {
    // rule:
    // - if not ongoing -> start (ongoing)
    // - if ongoing -> finish (done)
    // - BUT: cannot start or finish if dependencies are not met
    if (!activeWs) return;
    
    setTasksByWorkspace((prev) => {
      const workspaceTasks = prev[activeWs.id] || [];
      
      // Create a map for quick dependency lookup
      const byId = new Map(workspaceTasks.map((t) => [String(t.id), t]));
      
      // Check if task has unmet dependencies
      const deps = Array.isArray(task.dependsOn) 
        ? task.dependsOn.map(String)
        : Array.isArray(task.dependencies)
        ? task.dependencies.map(String)
        : [];
      
      const unmetDeps = deps.filter((id) => {
        const depTask = byId.get(id);
        return depTask && normalizeStatus(depTask.status) !== "done";
      });
      
      // If there are unmet dependencies, don't allow advancement
      if (unmetDeps.length > 0) {
        return prev; // Return unchanged state
      }
      
      return {
        ...prev,
        [activeWs.id]: workspaceTasks.map((t) => {
          if (t.id !== task.id) return t;
          const s = normalizeStatus(t.status);
          if (s === "ongoing") return { ...t, status: "done" };
          if (s === "done") return t;
          return { ...t, status: "ongoing" };
        }),
      };
    });
  }

  function closeDetails() {
    setActiveTask(null);
    setActiveEffectiveStatus(null);
    setActiveBlockedReason(null);
  }

  const handleUpdateTask = (task) => {
    setTaskToEdit(task);
    setIsEditModalOpen(true);
    closeDetails(); // Close the details modal when opening edit modal
  };

  const handleDeleteTask = (task) => {
    if (!activeWs) return;
    setTasksByWorkspace((prev) => {
      const workspaceTasks = prev[activeWs.id] || [];
      return {
        ...prev,
        [activeWs.id]: workspaceTasks.filter((t) => t.id !== task.id),
      };
    });
  };

  const handleUpdateTaskSubmit = (taskId, taskData) => {
    if (!activeWs) return;
    
    setTasksByWorkspace((prev) => {
      const workspaceTasks = prev[activeWs.id] || [];
      
      // Convert dependency names to task IDs
      const dependencyIds = (taskData.dependencies || []).map((depName) => {
        const found = workspaceTasks.find((t) => 
          t.id !== taskId && // Exclude self
          String(t.title || "").toLowerCase().trim() === String(depName).toLowerCase().trim()
        );
        return found ? String(found.id) : null;
      }).filter(Boolean);
      
      return {
        ...prev,
        [activeWs.id]: workspaceTasks.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              ...taskData,
              hours_left_until_deadline: taskData.hoursLeft || 0,
              priority: taskData.importance ?? t.priority ?? 3, // Map importance to priority for graph
              dependsOn: dependencyIds, // Update dependsOn for graph
            };
          }
          return t;
        }),
      };
    });
    
    setIsEditModalOpen(false);
    setTaskToEdit(null);
  };

  // When no workspace is selected -> show landing
  if (!activeWs) {
    return (
      <WorkspaceLanding
        workspaces={workspaces}
        onSelectWorkspace={setActiveWs}
        onCreateWorkspace={(ws) => {
          const newWorkspace = { id: crypto.randomUUID(), ...ws };
          setWorkspaces((prev) => [newWorkspace, ...prev]);
          // Initialize empty tasks array for the new workspace
          setTasksByWorkspace((prev) => ({
            ...prev,
            [newWorkspace.id]: [],
          }));
        }}
        onUpdateWorkspace={(id, patch) =>
          setWorkspaces((prev) =>
            prev.map((w) => (w.id === id ? { ...w, ...patch } : w))
          )
        }
        onDeleteWorkspace={(id) => {
          setWorkspaces((prev) => prev.filter((w) => w.id !== id));
          // Also delete tasks for this workspace
          setTasksByWorkspace((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
        }}
      />
    );
  }

  // Task board view when a workspace is selected
  return (
    <div style={{ 
      width: "100%",
      minHeight: "100vh",
      padding: 20,
      background: "#0F172A",
      color: "#F1F5F9",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale"
    }}>
      {/* Workspace header with back button */}
      <div style={{
        maxWidth: 1100,
        margin: "0 auto 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}>
        <button
          type="button"
          onClick={() => setActiveWs(null)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #334155",
            background: "#1E293B",
            cursor: "pointer",
            fontWeight: 600,
            color: "#F1F5F9",
            fontSize: 13,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#334155";
            e.target.style.borderColor = "#475569";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#1E293B";
            e.target.style.borderColor = "#334155";
          }}
        >
          ← Back to workspaces
        </button>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span
            style={{
              width: 10,
              height: 24,
              borderRadius: 999,
              background: activeWs.color || "#6366F1",
              boxShadow: `0 0 12px ${activeWs.color || "#6366F1"}40`,
            }}
          />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#F1F5F9" }}>
            {activeWs.name}
          </h2>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <button
            type="button"
            onClick={() => setIsChatbotOpen(true)}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              color: "#F1F5F9",
              background: "#334155",
              border: "1px solid #475569",
              borderRadius: 10,
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#475569";
              e.target.style.borderColor = "#6366F1";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#334155";
              e.target.style.borderColor = "#475569";
            }}
          >
            <span>💬</span>
            <span>Ask Assistant</span>
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: "#FFFFFF",
              background: "#6366F1",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#818CF8";
              e.target.style.boxShadow = "0 6px 16px rgba(99, 102, 241, 0.45)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#6366F1";
              e.target.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.35)";
            }}
          >
            + Add Task
          </button>
        </div>
      </div>

      {/* Graph and Task List Grid */}
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr",
        gap: 12,
      }}>
        {/* Graph Visualization Panel */}
        <div style={{
          background: "#1E293B",
          border: "1px solid #334155",
          borderRadius: 20,
          boxShadow: "0 12px 35px rgba(0, 0, 0, 0.30)",
          padding: 14,
          minHeight: 380,
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 8,
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={() => setIsGraphFullscreen(true)}
              style={{
                padding: "6px 10px",
                borderRadius: 10,
                border: "1px solid #475569",
                background: "#334155",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 11,
                color: "#F1F5F9",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#475569";
                e.target.style.borderColor = "#6366F1";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#334155";
                e.target.style.borderColor = "#475569";
              }}
              title="Fullscreen graph view"
            >
              <span>⛶</span>
              <span>Fullscreen</span>
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <TaskPriorityGraphD3
              tasks={tasks}
              simulationCompletedTaskIds={simulationCompletedTaskIds}
              simulationIsPlaying={simulationIsPlaying}
              simulationExecutionOrder={simulationExecutionOrder}
              onNodeClick={(task, effectiveStatus, blockedReason) => {
                setActiveTask(task);
                setActiveEffectiveStatus(effectiveStatus);
                setActiveBlockedReason(blockedReason);
              }}
            />
          </div>
        </div>

        {/* Task List Panel */}
        <div style={{
          background: "#1E293B",
          border: "1px solid #334155",
          borderRadius: 20,
          boxShadow: "0 12px 35px rgba(0, 0, 0, 0.30)",
          padding: 14,
          minHeight: 380,
        }}>
          <div style={{ fontSize: 14, fontWeight: 950, marginBottom: 10, color: "#F1F5F9" }}>
            Tasks (highest → lowest)
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {sortedForList.map((t) => (
              <div key={t.id} style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                padding: 12,
                borderRadius: 16,
                border: "1px solid #334155",
                background: "#334155",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#475569";
                e.currentTarget.style.borderColor = "#64748B";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#334155";
                e.currentTarget.style.borderColor = "#334155";
              }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontWeight: 950,
                    fontSize: 13,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: "#F1F5F9",
                  }}>
                    {t.title}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12.5, color: "#94A3B8" }}>
                    Status: {prettyStatus(normalizeStatus(t.status))}
                  </div>
                </div>
                <button
                  style={{
                    padding: "8px 12px",
                    borderRadius: 14,
                    border: "1px solid #475569",
                    background: "#475569",
                    cursor: "pointer",
                    fontWeight: 950,
                    color: "#F1F5F9",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#6366F1";
                    e.target.style.borderColor = "#6366F1";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#475569";
                    e.target.style.borderColor = "#475569";
                  }}
                  onClick={() => {
                    const { effectiveStatus, blockedReason } = calculateEffectiveStatus(t, tasks);
                    setActiveTask(t);
                    setActiveEffectiveStatus(effectiveStatus);
                    setActiveBlockedReason(blockedReason);
                  }}
                >
                  Details
                </button>
              </div>
            ))}
            {sortedForList.length === 0 && (
              <div style={{ padding: 12, color: "#94A3B8", fontSize: 13 }}>
                No tasks yet. Add one to see the graph.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        maxWidth: 1100,
        width: "100%",
        margin: "20px auto 0",
        background: "#1E293B",
        border: "1px solid #334155",
        borderRadius: 20,
        boxShadow: "0 12px 35px rgba(0, 0, 0, 0.30)",
        padding: 16,
        boxSizing: "border-box",
      }}>
        <div style={filterStyles.toolbar}>
          <input
            style={filterStyles.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title…"
            onFocus={(e) => {
              e.target.style.borderColor = "#6366F1";
              e.target.style.background = "#475569";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#334155";
              e.target.style.background = "#334155";
            }}
          />

          <select
            style={filterStyles.select}
            value={filterKey}
            onChange={(e) => {
              const k = e.target.value;
              setFilterKey(k);
              setFilterValue("");
              // Set default operator for deadline
              if (k === "deadline") setFilterOp("on");
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#6366F1";
              e.target.style.background = "#475569";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#334155";
              e.target.style.background = "#334155";
            }}
          >
            <option value="">All tasks</option>
            <option value="status">Status</option>
            <option value="priority">Priority (≥)</option>
            <option value="urgency">Urgency</option>
            <option value="deadline">Deadline</option>
          </select>

          {/* Show operator only for deadline */}
          {filterKey === "deadline" && (
            <select
              style={filterStyles.select}
              value={filterOp}
              onChange={(e) => setFilterOp(e.target.value)}
              onFocus={(e) => {
                e.target.style.borderColor = "#6366F1";
                e.target.style.background = "#475569";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#334155";
                e.target.style.background = "#334155";
              }}
            >
              <option value="on">on</option>
              <option value="after">after</option>
            </select>
          )}

          {/* Value input changes by attribute */}
          {filterKey === "" ? null : filterKey === "status" ? (
            <select
              style={filterStyles.select}
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              onFocus={(e) => {
                e.target.style.borderColor = "#6366F1";
                e.target.style.background = "#475569";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#334155";
                e.target.style.background = "#334155";
              }}
            >
              <option value="">Choose…</option>
              <option value="todo">todo</option>
              <option value="ongoing">ongoing</option>
              <option value="done">done</option>
              <option value="blocked">blocked</option>
              <option value="restricted">restricted</option>
            </select>
          ) : filterKey === "urgency" ? (
            <select
              style={filterStyles.select}
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              onFocus={(e) => {
                e.target.style.borderColor = "#6366F1";
                e.target.style.background = "#475569";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#334155";
                e.target.style.background = "#334155";
              }}
            >
              <option value="">Choose…</option>
              <option value="overdue">overdue</option>
              <option value="due_soon">due soon</option>
              <option value="due_today">due today</option>
              <option value="plenty">plenty</option>
              <option value="unknown">unknown</option>
            </select>
          ) : filterKey === "deadline" ? (
            <input
              style={filterStyles.input}
              type="date"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              onFocus={(e) => {
                e.target.style.borderColor = "#6366F1";
                e.target.style.background = "#475569";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#334155";
                e.target.style.background = "#334155";
              }}
            />
          ) : filterKey === "priority" ? (
            <input
              style={filterStyles.input}
              type="number"
              min="0"
              max="5"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder="0-5"
              onFocus={(e) => {
                e.target.style.borderColor = "#6366F1";
                e.target.style.background = "#475569";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#334155";
                e.target.style.background = "#334155";
              }}
            />
          ) : null}

          <span style={filterStyles.count}>{filteredTasks.length} shown</span>
        </div>
      </div>

      {/* Task Cards Section */}
      <div style={{
        maxWidth: 1100,
        width: "100%",
        margin: "20px auto 0",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxSizing: "border-box",
      }}>
        {sortedTaskCards.map((task) => (
          <TaskCard 
            key={task.id} 
            task={task} 
            status={task.status} 
            allTasks={tasks}
          />
        ))}
        {sortedTaskCards.length === 0 && (
          <div style={{
            padding: 40,
            textAlign: "center",
            color: "#94A3B8",
            fontSize: 14,
            background: "#1E293B",
            border: "1px solid #334155",
            borderRadius: 20,
          }}>
            No tasks match the current filters.
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateTask}
      />

      {/* Edit Task Modal */}
      <TaskModal
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setTaskToEdit(null);
        }}
        onUpdate={handleUpdateTaskSubmit}
        initialTask={taskToEdit}
      />

      {/* Task Details Modal */}
      <TaskDetailsModal
        open={!!activeTask}
        task={activeTask}
        effectiveStatus={activeEffectiveStatus}
        blockedReason={activeBlockedReason}
        onClose={closeDetails}
        onAdvance={(task) => {
          advanceStatus(task);
          closeDetails();
        }}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />

      {/* Task Chatbot Modal */}
      <TaskChatbot
        open={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        tasks={tasks}
        workspaceId={activeWs?.id}
        calculateComputedPriority={calculateComputedPriority}
        calculateEffectiveStatus={calculateEffectiveStatus}
      />

      {/* Fullscreen Graph Modal */}
      {isGraphFullscreen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#0F172A",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            padding: 20,
            boxSizing: "border-box",
            height: "100vh",
            width: "100vw",
            overflow: "hidden",
          }}
        >
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexShrink: 0,
            height: "auto",
          }}>
            <h2 style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "#F1F5F9",
            }}>
              Task Priority Graph
            </h2>
            <button
              type="button"
              onClick={() => setIsGraphFullscreen(false)}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "1px solid #475569",
                background: "#334155",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
                color: "#F1F5F9",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#475569";
                e.target.style.borderColor = "#6366F1";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#334155";
                e.target.style.borderColor = "#475569";
              }}
            >
              <span>✕</span>
              <span>Close</span>
            </button>
          </div>
          <div style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            overflow: "hidden",
          }}>
            <div style={{
              background: "#1E293B",
              border: "1px solid #334155",
              borderRadius: 20,
              boxShadow: "0 12px 35px rgba(0, 0, 0, 0.30)",
              padding: 20,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}>
              <TaskPriorityGraphD3
                tasks={tasks}
                fullscreen={true}
                simulationCompletedTaskIds={simulationCompletedTaskIds}
                simulationIsPlaying={simulationIsPlaying}
                simulationExecutionOrder={simulationExecutionOrder}
                onNodeClick={(task, effectiveStatus, blockedReason) => {
                  setActiveTask(task);
                  setActiveEffectiveStatus(effectiveStatus);
                  setActiveBlockedReason(blockedReason);
                  setIsGraphFullscreen(false);
                }}
              />
            </div>
            <div style={{
              background: "#1E293B",
              border: "1px solid #334155",
              borderRadius: 20,
              boxShadow: "0 12px 35px rgba(0, 0, 0, 0.30)",
              padding: 20,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}>
              <PrioritySimulation
                tasks={tasks}
                calculateComputedPriority={calculateComputedPriority}
                calculateEffectiveStatus={calculateEffectiveStatus}
                onSimulationStateChange={(completedIds, isPlaying, executionOrder) => {
                  setSimulationCompletedTaskIds(completedIds);
                  setSimulationIsPlaying(isPlaying);
                  setSimulationExecutionOrder(executionOrder);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

