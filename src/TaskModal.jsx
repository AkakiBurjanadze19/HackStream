import { useEffect, useMemo, useState } from "react";

export default function TaskModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [importance, setImportance] = useState(3);
  const [effort, setEffort] = useState(3);
  const [deadline, setDeadline] = useState(""); // "YYYY-MM-DDTHH:mm"

  const [btnHover, setBtnHover] = useState({ primary: false, ghost: false, close: false });

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const hoursLeft = useMemo(() => {
    if (!deadline) return 0;
    const ms = new Date(deadline).getTime() - Date.now();
    const hrs = Math.ceil(ms / (1000 * 60 * 60));
    return Number.isFinite(hrs) ? Math.max(0, hrs) : 0;
  }, [deadline]);

  function reset() {
    setTitle("");
    setDescription("");
    setImportance(3);
    setEffort(3);
    setDeadline("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;

    onCreate({
      title: title.trim(),
      description: description.trim(),
      importance: Number(importance),
      effort: Number(effort),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      hoursLeft,
      createdAt: new Date().toISOString(),
    });

    reset();
  }

  if (!open) return null;

  return (
    <div
      style={styles.overlay}
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.top}>
          <div>
            <div style={styles.title}>New Task</div>
            <div style={styles.sub}>Fill the details and save.</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            onMouseEnter={() => setBtnHover((p) => ({ ...p, close: true }))}
            onMouseLeave={() => setBtnHover((p) => ({ ...p, close: false }))}
            style={{
              ...styles.closeBtn,
              ...(btnHover.close ? styles.closeBtnHover : null),
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Task title
            <StyledInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Finish database ERD"
              autoFocus
            />
          </label>

          <label style={styles.label}>
            Description (optional)
            <StyledTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any notes, links, or steps..."
              rows={4}
            />
          </label>

          <div style={styles.grid}>
            <label style={styles.label}>
              Importance (0–5)
              <StyledInput
                type="number"
                min={0}
                max={5}
                value={importance}
                onChange={(e) => setImportance(e.target.value)}
              />
            </label>

            <label style={styles.label}>
              Effort (0–5)
              <StyledInput
                type="number"
                min={0}
                max={5}
                value={effort}
                onChange={(e) => setEffort(e.target.value)}
              />
            </label>
          </div>

          <div style={styles.grid}>
            <label style={styles.label}>
              Deadline
              <StyledInput
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </label>

            <div style={styles.readonlyBox}>
              <div style={styles.readonlyLabel}>Hours left</div>
              <div style={styles.readonlyValue}>{deadline ? hoursLeft : "—"}</div>
            </div>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              onMouseEnter={() => setBtnHover((p) => ({ ...p, ghost: true }))}
              onMouseLeave={() => setBtnHover((p) => ({ ...p, ghost: false }))}
              style={{
                ...styles.ghost,
                ...(btnHover.ghost ? styles.ghostHover : null),
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              onMouseEnter={() => setBtnHover((p) => ({ ...p, primary: true }))}
              onMouseLeave={() => setBtnHover((p) => ({ ...p, primary: false }))}
              style={{
                ...styles.primary,
                ...(btnHover.primary ? styles.primaryHover : null),
              }}
            >
              Create task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Smooth, engaging palette using base color #E5E7EB */
const c = {
  base: "#E5E7EB",
  bg: "#F3F4F6",
  surface: "#FFFFFF",
  surface2: "#F9FAFB",
  border: "#D1D5DB",
  text: "#111827",
  muted: "#6B7280",
  accent: "#4F46E5",
  accentHover: "#4338CA",
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
    width: "min(720px, 100%)",
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
    position: "relative",
  },

  title: { fontSize: 16, fontWeight: 900, letterSpacing: 0.2 },
  sub: { marginTop: 5, fontSize: 12.5, color: c.muted, lineHeight: 1.4 },

  closeBtn: {
    border: `1px solid ${c.base}`,
    background: c.surface,
    borderRadius: 14,
    padding: "6px 10px",
    cursor: "pointer",
    boxShadow: c.shadowSoft,
  },
  closeBtnHover: {
    background: c.surface2,
    border: `1px solid ${c.border}`,
  },

  form: { padding: 16, display: "grid", gap: 12 },
  label: { display: "grid", gap: 7, fontSize: 12, fontWeight: 800, color: c.text },

  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },

  readonlyBox: {
    borderRadius: 14,
    border: `1px solid ${c.base}`,
    background: c.surface2,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  readonlyLabel: { fontSize: 11.5, color: c.muted, fontWeight: 800 },
  readonlyValue: { marginTop: 6, fontSize: 18, fontWeight: 950 },

  actions: {
    marginTop: 2,
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
    fontWeight: 900,
    color: c.text,
  },
  ghostHover: {
    background: c.surface2,
    border: `1px solid ${c.border}`,
  },

  primary: {
    padding: "10px 14px",
    borderRadius: 14,
    border: `1px solid ${c.accentSoft}`,
    background: c.accent,
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: 950,
    boxShadow: "0 10px 22px rgba(79, 70, 229, 0.18)",
  },
  primaryHover: {
    background: c.accentHover,
    boxShadow: "0 12px 26px rgba(67, 56, 202, 0.22)",
  },

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

  textareaBase: {
    borderRadius: 14,
    border: `1px solid ${c.base}`,
    background: c.surface2,
    padding: 12,
    outline: "none",
    fontSize: 14,
    color: c.text,
    resize: "vertical",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
  },
  textareaFocus: {
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

function StyledTextarea(props) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
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
        ...styles.textareaBase,
        ...(focused ? styles.textareaFocus : null),
        ...(props.style || null),
      }}
    />
  );
}
