import TaskCard from "./TaskCard";
import './App.css';

const task = {
  title: "Implement drag & drop",
  description: "Enable moving tasks across columns with keyboard + mouse support.",
  deadline: "2025-12-20T18:00:00Z",
  hours_left_until_deadline: 42,
  creation_date: "2025-12-12",
  importance: 9,
  effort: 4,
};

export default function App() {
  return (
    <div style={{ 
      width: "100%",
      display: "flex",
      justifyContent: "flex-end"
    }}>
      <div style={{ 
        padding: 20, 
        width: 900,
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 20
      }}>
        <TaskCard task={task} status="ready" />
        <TaskCard task={task} status="blocked" />
        <TaskCard task={task} status="in_progress" />
        <TaskCard task={task} status="overdue" />
        <TaskCard task={task} status="blocked" />
        <TaskCard task={task} status="blocked" />
      </div>
    </div>
  );
}