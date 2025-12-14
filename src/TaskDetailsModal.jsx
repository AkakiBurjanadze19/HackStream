import { useEffect, useState } from "react";

export default function TaskDetailsModal({
  open,
  task,
  effectiveStatus,
  blockedReason,
  onClose,
  onAdvance,
  onUpdate,
  onDelete,
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setShowDeleteConfirm(false);
    }
  }, [open]);

  useEffect(() => {
    if (!showDeleteConfirm) return;
    const onKey = (e) => e.key === "Escape" && setShowDeleteConfirm(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDeleteConfirm]);

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

        <div style={styles.actions}>
          <button style={styles.ghost} onClick={onClose}>
            Close
          </button>
          <button
            style={styles.danger}
            onClick={() => {
              setShowDeleteConfirm(true);
            }}
          >
            Delete
          </button>
          <button
            style={styles.secondary}
            onClick={() => {
              onUpdate?.(task);
            }}
          >
            Update
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={confirmStyles.overlay} onMouseDown={(e) => e.stopPropagation()}>
          <div style={confirmStyles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={confirmStyles.header}>
              <div style={confirmStyles.title}>Confirm Deletion</div>
              <button
                style={confirmStyles.closeBtn}
                onClick={() => setShowDeleteConfirm(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div style={confirmStyles.body}>
              <div style={confirmStyles.message}>
                Are you sure you want to delete <strong>"{task.title ?? "Untitled"}"</strong>?
              </div>
              <div style={confirmStyles.warning}>
                This action cannot be undone.
              </div>
            </div>
            <div style={confirmStyles.actions}>
              <button
                style={confirmStyles.cancelBtn}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                style={confirmStyles.confirmBtn}
                onClick={() => {
                  onDelete?.(task);
                  setShowDeleteConfirm(false);
                  onClose?.();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
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
  base: "#334155",
  surface: "#1E293B",
  surface2: "#334155",
  text: "#F1F5F9",
  muted: "#94A3B8",
  shadow: "0 24px 70px rgba(0, 0, 0, 0.50)",
  shadowSoft: "0 12px 35px rgba(0, 0, 0, 0.35)",
};

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.65)",
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
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)",
  },
  help: { marginTop: 8, fontSize: 12.5, color: c.muted, lineHeight: 1.35 },

  actions: {
    padding: 16,
    paddingTop: 0,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
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
    border: "1px solid rgba(99, 102, 241, 0.30)",
    background: "#6366F1",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 950,
    boxShadow: "0 10px 22px rgba(99, 102, 241, 0.35)",
    transition: "all 0.2s ease",
  },
  primaryDisabled: { opacity: 0.55, cursor: "not-allowed", boxShadow: "none" },
  secondary: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(99, 102, 241, 0.30)",
    background: "rgba(99, 102, 241, 0.15)",
    color: "#818CF8",
    cursor: "pointer",
    fontWeight: 950,
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.20)",
    transition: "all 0.2s ease",
  },
  danger: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(239, 68, 68, 0.30)",
    background: "#EF4444",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 950,
    boxShadow: "0 10px 22px rgba(239, 68, 68, 0.35)",
    transition: "all 0.2s ease",
  },
};

const confirmStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 70,
  },
  modal: {
    width: "min(480px, 100%)",
    background: c.surface,
    color: c.text,
    borderRadius: 20,
    border: `1px solid ${c.base}`,
    boxShadow: c.shadow,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottom: `1px solid ${c.base}`,
    background: `linear-gradient(180deg, ${c.surface} 0%, ${c.surface2} 100%)`,
  },
  title: {
    fontSize: 16,
    fontWeight: 950,
    letterSpacing: 0.2,
    color: "#EF4444",
  },
  closeBtn: {
    border: `1px solid ${c.base}`,
    background: c.surface,
    borderRadius: 14,
    padding: "6px 10px",
    cursor: "pointer",
    boxShadow: c.shadowSoft,
    color: c.text,
    fontSize: 16,
    lineHeight: 1,
  },
  body: {
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  message: {
    fontSize: 14,
    lineHeight: 1.5,
    color: c.text,
  },
  warning: {
    fontSize: 12.5,
    color: "#F87171",
    fontWeight: 600,
    padding: "10px 12px",
    background: "rgba(239, 68, 68, 0.10)",
    border: "1px solid rgba(239, 68, 68, 0.20)",
    borderRadius: 10,
  },
  actions: {
    padding: 16,
    paddingTop: 0,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelBtn: {
    padding: "10px 14px",
    borderRadius: 14,
    border: `1px solid ${c.base}`,
    background: c.surface,
    cursor: "pointer",
    fontWeight: 950,
    color: c.text,
    boxShadow: c.shadowSoft,
    transition: "all 0.2s ease",
  },
  confirmBtn: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(239, 68, 68, 0.30)",
    background: "#EF4444",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 950,
    boxShadow: "0 10px 22px rgba(239, 68, 68, 0.35)",
    transition: "all 0.2s ease",
  },
};
