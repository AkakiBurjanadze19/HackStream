import { useState } from "react";
import WorkspaceLanding from "./WorkspaceLanding";

export default function App() {
  const [workspaces, setWorkspaces] = useState([
    { id: "1", name: "Personal Tasks", type: "personal", color: "#475569" },
    { id: "2", name: "Uni Project", type: "normal", color: "#0F766E" },
    { id: "3", name: "Company Board", type: "company", color: "#4F46E5" },
  ]);

  const [activeWs, setActiveWs] = useState(null);

  // When no workspace is selected -> show landing
  if (!activeWs) {
    return (
      <WorkspaceLanding
        workspaces={workspaces}
        onSelectWorkspace={setActiveWs}
        onCreateWorkspace={(ws) =>
          setWorkspaces((prev) => [{ id: crypto.randomUUID(), ...ws }, ...prev])
        }
        onUpdateWorkspace={(id, patch) =>
          setWorkspaces((prev) =>
            prev.map((w) => (w.id === id ? { ...w, ...patch } : w))
          )
        }
        onDeleteWorkspace={(id) =>
          setWorkspaces((prev) => prev.filter((w) => w.id !== id))
        }
      />
    );
  }

  // Placeholder after selecting a workspace (replace with your Task Board later)
  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.top}>
            <div>
              <div style={styles.titleRow}>
                <span
                  style={{
                    ...styles.stripe,
                    background: activeWs.color || "#4F46E5",
                  }}
                />
                <div style={styles.h1}>{activeWs.name}</div>
              </div>
              <div style={styles.sub}>Type: {String(activeWs.type).toUpperCase()}</div>
            </div>

            <button type="button" onClick={() => setActiveWs(null)} style={styles.backBtn}>
              ← Back to workspaces
            </button>
          </div>

          <div style={styles.body}>
            <div style={styles.noteTitle}>Next step</div>
            <div style={styles.noteText}>
              Replace this screen with your task board (Header + Add Task + TaskModal).
              The selected workspace is available in <b>activeWs</b>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const c = {
  base: "#E5E7EB",
  bg: "#F3F4F6",
  surface: "#FFFFFF",
  surface2: "#F9FAFB",
  border: "#D1D5DB",
  text: "#111827",
  muted: "#6B7280",
  accent: "#4F46E5",
  accentSoft: "rgba(79, 70, 229, 0.12)",
  shadow: "0 24px 70px rgba(17, 24, 39, 0.12)",
  shadowSoft: "0 12px 35px rgba(17, 24, 39, 0.08)",
};

const styles = {
  page: { minHeight: "100vh", background: c.bg, color: c.text, padding: 16 },
  wrap: { maxWidth: 980, margin: "0 auto" },
  card: {
    background: c.surface,
    border: `1px solid ${c.base}`,
    borderRadius: 20,
    boxShadow: c.shadow,
    overflow: "hidden",
  },
  top: {
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    borderBottom: `1px solid ${c.base}`,
    background: `linear-gradient(180deg, ${c.surface} 0%, ${c.surface2} 100%)`,
  },
  titleRow: { display: "flex", alignItems: "center", gap: 10 },
  stripe: { width: 10, height: 24, borderRadius: 999 },
  h1: { fontSize: 16, fontWeight: 950, letterSpacing: 0.2 },
  sub: { marginTop: 6, fontSize: 12.5, color: c.muted },

  backBtn: {
    padding: "10px 14px",
    borderRadius: 14,
    border: `1px solid ${c.base}`,
    background: c.surface,
    cursor: "pointer",
    fontWeight: 950,
    color: c.text,
    boxShadow: c.shadowSoft,
  },

  body: { padding: 16 },
  noteTitle: { fontWeight: 950, fontSize: 13 },
  noteText: { marginTop: 8, fontSize: 13, color: c.muted, lineHeight: 1.5 },
};
