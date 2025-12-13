import { useMemo, useState } from "react";
import Header from "./Header";
import TaskModal from "./TaskModal";

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState([]);

  function handleAddTask(newTask) {
    setTasks((prev) => [{ id: crypto.randomUUID(), ...newTask }, ...prev]);
  }

  // Optional: show latest tasks count in header
  const taskCount = useMemo(() => tasks.length, [tasks]);

  return (
    <div style={styles.page}>
      <Header
        brand="Smart Task Board"
        rightHint={`${taskCount} task${taskCount === 1 ? "" : "s"}`}
        onAddTask={() => setIsOpen(true)}
      />

      <main style={styles.main}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Dashboard</h2>
          <p style={styles.p}>
            Click <b>+ Add Task</b> to create a new task.
          </p>

          {tasks.length > 0 && (
            <div style={styles.list}>
              {tasks.map((t) => (
                <div key={t.id} style={styles.taskRow}>
                  <div>
                    <div style={styles.taskTitle}>{t.title}</div>
                    {t.description ? (
                      <div style={styles.taskDesc}>{t.description}</div>
                    ) : null}
                  </div>

                  <div style={styles.meta}>
                    <span style={styles.badge}>Imp {t.importance}</span>
                    <span style={styles.badge}>Eff {t.effort}</span>
                    <span style={styles.badge}>{t.hoursLeft}h left</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <TaskModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onCreate={(task) => {
          handleAddTask(task);
          setIsOpen(false);
        }}
      />
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 500px at 50% -100px, rgba(99,102,241,0.25), transparent 60%), #0b1020",
    color: "rgba(255,255,255,0.92)",
  },
  main: {
    padding: "24px 16px",
    maxWidth: 980,
    margin: "0 auto",
  },
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  },
  h2: { margin: 0, fontSize: 18, fontWeight: 700 },
  p: { margin: "10px 0 0", opacity: 0.85, lineHeight: 1.5 },

  list: { marginTop: 16, display: "grid", gap: 10 },
  taskRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  taskTitle: { fontWeight: 700, fontSize: 14 },
  taskDesc: { marginTop: 4, fontSize: 13, opacity: 0.8, lineHeight: 1.4 },
  meta: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  badge: {
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    whiteSpace: "nowrap",
  },
};
