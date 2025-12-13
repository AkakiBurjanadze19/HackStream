import { useMemo, useState } from "react";
import TaskPriorityGraphD3 from "./TaskPriorityGraphD3";
import TaskModal from "./TaskModal";
import TaskDetailsModal from "./TaskDetailsModal";

export default function App() {
  const [tasks, setTasks] = useState([
    { id: "t1", title: "Fix login", priority: 5, status: "done" },
    { id: "t2", title: "Docs", priority: 3, status: "ongoing" },
    { id: "t3", title: "UI polish", priority: 3, status: "ongoing" },
    // Deploy depends on Docs + UI polish, so it becomes restricted until both are done
    { id: "t4", title: "Deploy", priority: 1, status: "todo", dependsOn: ["t2", "t3"] },
  ]);

  const [open, setOpen] = useState(false);

  // details modal state
  const [activeTask, setActiveTask] = useState(null);
  const [activeEffectiveStatus, setActiveEffectiveStatus] = useState(null);
  const [activeBlockedReason, setActiveBlockedReason] = useState(null);

  const sortedForList = useMemo(() => {
    return [...tasks].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }, [tasks]);

  function addTask(payload) {
    setTasks((prev) => [
      { id: crypto.randomUUID(), ...payload, dependsOn: payload.dependsOn || [] },
      ...prev,
    ]);
  }

  function advanceStatus(task) {
    // rule:
    // - if not ongoing -> start (ongoing)
    // - if ongoing -> finish (done)
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== task.id) return t;
        const s = normalizeStatus(t.status);
        if (s === "ongoing") return { ...t, status: "done" };
        if (s === "done") return t;
        return { ...t, status: "ongoing" };
      })
    );
  }

  function closeDetails() {
    setActiveTask(null);
    setActiveEffectiveStatus(null);
    setActiveBlockedReason(null);
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.brand}>Smart Task Board</div>
        <button style={styles.primary} onClick={() => setOpen(true)}>
          + Add task
        </button>
      </div>

      <div style={styles.grid}>
        <div style={styles.panel}>
          <TaskPriorityGraphD3
            tasks={tasks}
            onNodeClick={(task, effectiveStatus, blockedReason) => {
              setActiveTask(task);
              setActiveEffectiveStatus(effectiveStatus);
              setActiveBlockedReason(blockedReason);
            }}
          />
        </div>

        <div style={styles.panel}>
          <div style={styles.panelTitle}>Tasks (highest → lowest)</div>

          <div style={styles.list}>
            {sortedForList.map((t) => (
              <div key={t.id} style={styles.row}>
                <div style={{ minWidth: 0 }}>
                  <div style={styles.rowTitle}>{t.title}</div>
                  <div style={styles.rowMeta}>
                    Priority: {t.priority} • Status: {prettyStatus(normalizeStatus(t.status))}
                  </div>
                </div>

                <button
                  style={styles.ghost}
                  onClick={() => {
                    setActiveTask(t);
                    setActiveEffectiveStatus(normalizeStatus(t.status));
                    setActiveBlockedReason(null);
                  }}
                >
                  Details
                </button>
              </div>
            ))}

            {sortedForList.length === 0 && (
              <div style={styles.empty}>No tasks yet. Add one to see the graph.</div>
            )}
          </div>
        </div>
      </div>

      <TaskModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={(payload) => {
          addTask(payload);
          setOpen(false);
        }}
      />

      <TaskDetailsModal
        open={!!activeTask}
        task={activeTask}
        effectiveStatus={activeEffectiveStatus}
        blockedReason={activeBlockedReason}
        onClose={closeDetails}
        onAdvance={(task) => {
          advanceStatus(task);
          closeDetails(); // ✅ close modal after Start/Finish
        }}
      />
    </div>
  );
}

function normalizeStatus(s) {
  const v = String(s ?? "").toLowerCase().trim();
  if (v === "done") return "done";
  if (v === "ongoing" || v === "on going" || v === "in progress") return "ongoing";
  return "todo";
}
function prettyStatus(s) {
  if (s === "todo") return "Yet to be done";
  if (s === "ongoing") return "On going";
  if (s === "done") return "Done";
  return "Restricted";
}

const c = {
  base: "#E5E7EB",
  surface: "#FFFFFF",
  surface2: "#F9FAFB",
  text: "#111827",
  muted: "#6B7280",
  accent: "#4F46E5",
  accentSoft: "rgba(79, 70, 229, 0.12)",
  shadowSoft: "0 12px 35px rgba(17, 24, 39, 0.08)",
};

const styles = {
  page: { minHeight: "100vh", padding: 16, color: c.text },
  header: {
    maxWidth: 1100,
    margin: "0 auto 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  brand: { fontWeight: 950, letterSpacing: 0.2, fontSize: 16 },
  primary: {
    padding: "10px 14px",
    borderRadius: 14,
    border: `1px solid ${c.accentSoft}`,
    background: c.accent,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 950,
    boxShadow: "0 10px 22px rgba(79,70,229,0.16)",
  },

  grid: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr",
    gap: 12,
  },
  panel: {
    background: c.surface,
    border: `1px solid ${c.base}`,
    borderRadius: 20,
    boxShadow: c.shadowSoft,
    padding: 14,
    minHeight: 380,
  },

  panelTitle: { fontSize: 14, fontWeight: 950, marginBottom: 10 },
  list: { display: "grid", gap: 10 },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    border: `1px solid ${c.base}`,
    background: c.surface2,
  },
  rowTitle: {
    fontWeight: 950,
    fontSize: 13,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rowMeta: { marginTop: 4, fontSize: 12.5, color: c.muted },

  ghost: {
    padding: "8px 12px",
    borderRadius: 14,
    border: `1px solid ${c.base}`,
    background: "#fff",
    cursor: "pointer",
    fontWeight: 950,
    color: c.text,
  },
  empty: { padding: 12, color: c.muted, fontSize: 13 },
};
