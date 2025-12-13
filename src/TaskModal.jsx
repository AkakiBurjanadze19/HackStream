import { useEffect, useMemo, useState } from "react";

const STATUS = [
  { value: "todo", label: "Yet to do" },
  { value: "ongoing", label: "On going" },
  { value: "done", label: "Done" },
];

export default function TaskModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState(3);
  const [status, setStatus] = useState("todo");

  const canSubmit = useMemo(() => title.trim().length > 0, [title]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function reset() {
    setTitle("");
    setPriority(3);
    setStatus("todo");
  }

  function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onCreate?.({ title: title.trim(), priority: Number(priority), status });
    reset();
  }

  if (!open) return null;

  return (
    <div style={styles.overlay} onMouseDown={onClose} role="dialog" aria-modal="true">
      <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.top}>
          <div>
            <div style={styles.title}>New Task</div>
            <div style={styles.sub}>Title, priority (0–5), and status.</div>
          </div>

          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={submit} style={styles.form}>
          <label style={styles.label}>
            Title
            <StyledInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Update dashboard"
              autoFocus
            />
          </label>

          <label style={styles.label}>
            Priority
            <div style={styles.priorityRow}>
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={styles.range}
              />
              <div style={styles.badge}>{priority}</div>
            </div>
          </label>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Status</div>
            <div style={styles.statusGrid}>
              {STATUS.map((s) => {
                const selected = s.value === status;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    style={{ ...styles.statusCard, ...(selected ? styles.statusCardSelected : null) }}
                  >
                    <div style={styles.statusLabel}>{s.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={() => {
                reset();
                onClose?.();
              }}
              style={styles.ghost}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              style={{ ...styles.primary, ...(canSubmit ? null : styles.primaryDisabled) }}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const c = {
  base: "#E5E7EB",
  surface: "#FFFFFF",
  surface2: "#F9FAFB",
  text: "#111827",
  muted: "#6B7280",
  accent: "#4F46E5",
  accentSoft: "rgba(79, 70, 229, 0.12)",
  focusRing: "rgba(79, 70, 229, 0.28)",
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
    zIndex: 50,
  },
  modal: {
    width: "min(640px, 100%)",
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

  form: { padding: 16, display: "grid", gap: 12 },
  label: { display: "grid", gap: 7, fontSize: 12, fontWeight: 900, color: c.text },

  priorityRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    border: `1px solid ${c.base}`,
    background: c.surface2,
  },
  range: { width: "100%" },
  badge: {
    minWidth: 32,
    height: 32,
    borderRadius: 12,
    border: `1px solid ${c.base}`,
    background: "#fff",
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
  },

  section: { display: "grid", gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: 950 },
  statusGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 },
  statusCard: {
    textAlign: "center",
    borderRadius: 16,
    border: `1px solid ${c.base}`,
    background: c.surface2,
    padding: 12,
    cursor: "pointer",
    boxShadow: c.shadowSoft,
  },
  statusCardSelected: {
    border: `1px solid ${c.accent}`,
    background: `linear-gradient(180deg, ${c.surface} 0%, rgba(79,70,229,0.06) 100%)`,
    boxShadow: "0 12px 30px rgba(79, 70, 229, 0.12)",
  },
  statusLabel: { fontWeight: 950, fontSize: 13 },

  actions: { marginTop: 4, display: "flex", justifyContent: "flex-end", gap: 10 },
  ghost: {
    padding: "10px 14px",
    borderRadius: 14,
    border: `1px solid ${c.base}`,
    background: c.surface,
    cursor: "pointer",
    fontWeight: 950,
    color: c.text,
  },
  primary: {
    padding: "10px 14px",
    borderRadius: 14,
    border: `1px solid ${c.accentSoft}`,
    background: c.accent,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 950,
    boxShadow: "0 10px 22px rgba(79,70,229,0.18)",
  },
  primaryDisabled: { opacity: 0.55, cursor: "not-allowed", boxShadow: "none" },

  fieldBase: {
    height: 42,
    borderRadius: 14,
    border: `1px solid ${c.base}`,
    background: c.surface2,
    padding: "0 12px",
    outline: "none",
    fontSize: 14,
    color: c.text,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
  },
  fieldFocus: {
    border: `1px solid ${c.accent}`,
    boxShadow: `0 0 0 4px ${c.focusRing}`,
    background: c.surface,
  },
};

function StyledInput(props) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={{
        ...styles.fieldBase,
        ...(focused ? styles.fieldFocus : null),
        ...(props.style || null),
      }}
    />
  );
}
