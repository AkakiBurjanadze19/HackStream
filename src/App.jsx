import { useState } from "react";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import './App.css';

const initialTasks = [
  {
    id: 1,
    title: "Implement drag & drop",
    description: "Enable moving tasks across columns with keyboard + mouse support.",
    deadline: "2025-12-20T18:00:00Z",
    hours_left_until_deadline: 42,
    creation_date: "2025-12-12",
    importance: 9,
    effort: 4,
    dependencies: ["Design UI mockups", "Set up API endpoints"],
    status: "ready"
  },
  {
    id: 2,
    title: "Deploy to production",
    description: "Deploy the application to the production environment.",
    deadline: "2025-12-25T18:00:00Z",
    hours_left_until_deadline: 120,
    creation_date: "2025-12-15",
    importance: 10,
    effort: 5,
    dependencies: ["Implement drag & drop", "Write unit tests", "Code review"],
    status: "blocked"
  },
  {
    id: 3,
    title: "Implement drag & drop",
    description: "Enable moving tasks across columns with keyboard + mouse support.",
    deadline: "2025-12-20T18:00:00Z",
    hours_left_until_deadline: 42,
    creation_date: "2025-12-12",
    importance: 9,
    effort: 4,
    dependencies: ["Design UI mockups", "Set up API endpoints"],
    status: "in_progress"
  },
  {
    id: 4,
    title: "Implement drag & drop",
    description: "Enable moving tasks across columns with keyboard + mouse support.",
    deadline: "2025-12-20T18:00:00Z",
    hours_left_until_deadline: 42,
    creation_date: "2025-12-12",
    importance: 9,
    effort: 4,
    dependencies: ["Design UI mockups", "Set up API endpoints"],
    status: "overdue"
  },
  {
    id: 5,
    title: "Implement drag & drop",
    description: "Enable moving tasks across columns with keyboard + mouse support.",
    deadline: "2025-12-20T18:00:00Z",
    hours_left_until_deadline: 42,
    creation_date: "2025-12-12",
    importance: 9,
    effort: 4,
    dependencies: ["Design UI mockups", "Set up API endpoints"],
    status: "blocked"
  },
  {
    id: 6,
    title: "Implement drag & drop",
    description: "Enable moving tasks across columns with keyboard + mouse support.",
    deadline: "2025-12-20T18:00:00Z",
    hours_left_until_deadline: 42,
    creation_date: "2025-12-12",
    importance: 9,
    effort: 4,
    dependencies: ["Design UI mockups", "Set up API endpoints"],
    status: "blocked"
  },
];

export default function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateTask = (taskData) => {
    const newTask = {
      id: Date.now(),
      ...taskData,
      hours_left_until_deadline: taskData.hoursLeft || 0,
      creation_date: taskData.createdAt || new Date().toISOString().split('T')[0],
      dependencies: taskData.dependencies || [],
      status: "backlog"
    };
    setTasks([...tasks, newTask]);
    setIsModalOpen(false);
  };

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