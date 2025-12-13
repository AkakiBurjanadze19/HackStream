import { useEffect } from "react";

export default function TaskDetailsModal({
  open,
  task,
  effectiveStatus,
  blockedReason,
  onClose,
  onAdvance,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !task) return null;

  const s = normalizeStatus(effectiveStatus ?? task.status);
  const canAdvance = s !== "done" && s !== "restricted";
  const buttonLabel =
    s === "ongoing"
      ? "Finish task"
      : s === "todo"
      ? "Start task"
      : s === "done"
      ? "Done"
      : "Blocked";

  return (
    <div style={styles.overlay} onMouseDown={onClose} role="dialog" aria-modal="true">
      <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.top}>
          <div>
            <div style={styles.title}>Task details</div>
            <div style={styles.sub}>Manage status from here</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.field}>
            <div style={styles.label}>Title</div>
            <div style={styles.value}>{task.title ?? "Untitled"}</div>
          </div>

          <div style={styles.grid}>
            <div style={styles.field}>
              <div style={styles.label}>Priority</div>
              <div style={styles.value}>{String(task.priority ?? "-")}</div>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Status</div>
              <div style={styles.statusRow}>
                <span style={{ ...styles.statusDot, background: statusColor(s) }} />
                <span style={styles.value}>{prettyStatus(s)}</span>
              </div>

              {s === "restricted" && (
                <div style={styles.help}>
                  {blockedReason || "This task is blocked by higher-priority tasks."}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button style={styles.ghost} onClick={onClose}>
            Close
          </button>
          <button
            style={{ ...styles.primary, ...(canAdvance ? null : styles.primaryDisabled) }}
            disabled={!canAdvance}
            onClick={() => onAdvance?.(task)}
            title={s === "restricted" ? "Complete higher-priority tasks first" : undefined}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

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

function statusColor(s) {
  if (s === "done") return "rgba(34,197,94,0.85)";
  if (s === "ongoing") return "rgba(250,204,21,0.90)";
  if (s === "todo") return "rgba(146,64,14,0.80)";
  return "rgba(239,68,68,0.85)";
}

const c = {
  base: "#E5E7EB",
  surface: "#FFFFFF",
  surface2: "#F9FAFB",
  text: "#111827",
  muted: "#6B7280",
  shadow: "0 24px 70px rgba(17, 24, 39, 0.18)",
  shadowSoft: "0 12px 35px rgba(17, 24, 39, 0.10)",
};

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(17, 24, 39, 0.38)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 60,
  },
  modal: {
    width: "min(700px, 100%)",
    background: c.surface,
    color: c.text,
    borderRadius: 20,
    border: `1px solid ${c.base}`,
    boxShadow: c.shadow,
    overflow: "hidden",
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderBottom: `1px solid ${c.base}`,
    background: `linear-gradient(180deg, ${c.surface} 0%, ${c.surface2} 100%)`,
  },
  title: { fontSize: 16, fontWeight: 950, letterSpacing: 0.2 },
  sub: { marginTop: 5, fontSize: 12.5, color: c.muted, lineHeight: 1.4 },
  closeBtn: {
    border: `1px solid ${c.base}`,
    background: c.surface,
    borderRadius: 14,
    padding: "6px 10px",
    cursor: "pointer",
    boxShadow: c.shadowSoft,
  },
  body: { padding: 16, display: "grid", gap: 12 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  field: {
    borderRadius: 16,
    border: `1px solid ${c.base}`,
    background: c.surface2,
    padding: 12,
  },
  label: { fontSize: 12, fontWeight: 950, color: c.muted },
  value: { marginTop: 6, fontSize: 14, fontWeight: 950, color: c.text },
  statusRow: { marginTop: 6, display: "flex", alignItems: "center", gap: 10 },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
  },
  help: { marginTop: 8, fontSize: 12.5, color: c.muted, lineHeight: 1.35 },

  actions: {
    padding: 16,
    paddingTop: 0,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
  ghost: {
    padding: "10px 14px",
    borderRadius: 14,
    border: `1px solid ${c.base}`,
    background: c.surface,
    cursor: "pointer",
    fontWeight: 950,
    color: c.text,
    boxShadow: c.shadowSoft,
  },
  primary: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(79, 70, 229, 0.12)",
    background: "#4F46E5",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 950,
    boxShadow: "0 10px 22px rgba(79, 70, 229, 0.18)",
  },
  primaryDisabled: { opacity: 0.55, cursor: "not-allowed", boxShadow: "none" },
};
