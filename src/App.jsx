import { useState, useEffect } from "react";
import TaskCard from "./Components/TaskCard";
import TaskModal from "./Components/TaskModal";
import WorkspaceLanding from "./WorkspaceLanding";

// localStorage keys
const STORAGE_KEYS = {
  workspaces: "hackstream_workspaces",
  tasks: "hackstream_tasks",
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

export default function App() {
  const [workspaces, setWorkspaces] = useState(() => loadWorkspaces());
  const [activeWs, setActiveWs] = useState(null);
  // tasksByWorkspace is an object where keys are workspace IDs and values are task arrays
  const [tasksByWorkspace, setTasksByWorkspace] = useState(() => loadTasks());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get tasks for the currently active workspace
  const tasks = activeWs ? (tasksByWorkspace[activeWs.id] || []) : [];

  // Save workspaces to localStorage whenever they change
  useEffect(() => {
    saveWorkspaces(workspaces);
  }, [workspaces]);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    saveTasks(tasksByWorkspace);
  }, [tasksByWorkspace]);

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
    
    const newTask = {
      id: Date.now(),
      ...taskData,
      hours_left_until_deadline: taskData.hoursLeft || 0,
      creation_date: (taskData.createdAt || new Date().toISOString()).split('T')[0],
      dependencies: taskData.dependencies || [],
      status: "backlog"
    };
    
    // Add task to the current workspace only
    setTasksByWorkspace((prev) => ({
      ...prev,
      [activeWs.id]: [...(prev[activeWs.id] || []), newTask],
    }));
    
    setIsModalOpen(false);
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
      display: "flex",
      justifyContent: "flex-end",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale"
    }}>
      <div style={{ 
        padding: 20, 
        width: 900,
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 16
      }}>
        {/* Workspace header with back button */}
        <div style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}>
          <button
            type="button"
            onClick={() => setActiveWs(null)}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #E5E7EB",
              background: "#FFFFFF",
              cursor: "pointer",
              fontWeight: 600,
              color: "#111827",
              fontSize: 13,
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
                background: activeWs.color || "#4F46E5",
              }}
            />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              {activeWs.name}
            </h2>
          </div>
        </div>

        {/* Add Task Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            color: "#FFFFFF",
            background: "#4F46E5",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)",
            transition: "all 0.2s ease",
            alignSelf: "flex-start",
            marginBottom: 8,
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#4338CA";
            e.target.style.boxShadow = "0 4px 8px rgba(79, 70, 229, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#4F46E5";
            e.target.style.boxShadow = "0 2px 4px rgba(79, 70, 229, 0.2)";
          }}
        >
          + Add Task
        </button>

        {/* Task Cards */}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} status={task.status} />
        ))}
      </div>

      {/* Task Modal */}
      <TaskModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateTask}
      />
    </div>
  );
}
