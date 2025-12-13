import { useEffect, useMemo, useState } from "react";

const TYPES = [
  { value: "personal", label: "Personal", desc: "For your own tasks and notes" },
  { value: "normal", label: "Normal", desc: "General purpose workspace" },
  { value: "company", label: "Company", desc: "Team/company workflows" },
];

const PALETTE = ["#4F46E5", "#0F766E", "#475569", "#6D28D9", "#92400E"];

export default function WorkspaceModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("normal");
  const [color, setColor] = useState(PALETTE[0]);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setColor(PALETTE[0]);
  }, [open]);

  function reset() {
    setName("");
    setType("normal");
    setColor(PALETTE[0]);
  }

  function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onCreate?.({ name: name.trim(), type, color });
    reset();
  }

  if (!open) return null;

  return (
    <div style={styles.overlay} onMouseDown={onClose} role="dialog" aria-modal="true">
      <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.top}>
          <div>
            <div style={styles.title}>New Workspace</div>
            <div style={styles.sub}>Name it and choose a type.</div>
          </div>

          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={submit} style={styles.form}>
          <label style={styles.label}>
            Workspace name
            <StyledInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jellyfish Inc."
              autoFocus
            />
          </label>

          {/* Small color chooser */}
          <div style={styles.colorRow}>
            <div style={styles.colorLabel}>Color</div>
            <div style={styles.colorChips}>
              {PALETTE.map((hex) => {
                const selected = hex === color;
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setColor(hex)}
                    style={{
                      ...styles.colorChip,
                      ...(selected ? styles.colorChipSelected : null),
                    }}
                    title={hex}
                  >
                    <span style={{ ...styles.colorDot, background: hex }} />
                  </button>
                );
              })}
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Workspace type</div>
            <div style={styles.typeGrid}>
              {TYPES.map((t) => {
                const selected = t.value === type;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    style={{ ...styles.typeCard, ...(selected ? styles.typeCardSelected : null) }}
                  >
                    <div style={styles.typeLabel}>{t.label}</div>
                    <div style={styles.typeDesc}>{t.desc}</div>
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
              Create workspace
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
  border: "#D1D5DB",
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
  
  colorRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    border: `1px solid ${c.base}`,
    background: c.surface2,
  },
  colorLabel: { fontSize: 12, fontWeight: 950, color: c.text },
  colorChips: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  colorChip: {
    width: 44,
    height: 34,
    borderRadius: 14,
    border: `1px solid ${c.base}`,
    background: c.surface,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    boxShadow: c.shadowSoft,
  },
  colorChipSelected: {
    border: `1px solid ${c.accent}`,
    boxShadow: `0 0 0 4px ${c.focusRing}`,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
  },

  section: { display: "grid", gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: 950 },
  typeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 },
  typeCard: {
    textAlign: "left",
    borderRadius: 16,
    border: `1px solid ${c.base}`,
    background: c.surface2,
    padding: 12,
    cursor: "pointer",
    boxShadow: c.shadowSoft,
  },
  typeCardSelected: {
    border: `1px solid ${c.accent}`,
    background: `linear-gradient(180deg, ${c.surface} 0%, rgba(79,70,229,0.06) 100%)`,
    boxShadow: "0 12px 30px rgba(79, 70, 229, 0.12)",
  },
  typeLabel: { fontWeight: 950, fontSize: 13 },
  typeDesc: { marginTop: 6, fontSize: 12.5, color: c.muted, lineHeight: 1.35 },

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
    boxShadow: "0 10px 22px rgba(79, 70, 229, 0.18)",
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
