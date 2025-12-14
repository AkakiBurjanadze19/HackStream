import { useEffect, useMemo, useState } from "react";

const TYPES = [
  { value: "personal", label: "Personal", desc: "For your own tasks and notes" },
  { value: "normal", label: "Normal", desc: "General purpose workspace" },
  { value: "company", label: "Company", desc: "Team/company workflows" },
];

const PALETTE = ["#4F46E5", "#0F766E", "#475569", "#6D28D9", "#92400E"];

export default function WorkspaceSettingsModal({
  open,
  onClose,
  workspace,
  onSave,   // (id, patch) => void
  onDelete, // (id) => void
}) {
  const canShow = open && !!workspace;

  const [name, setName] = useState("");
  const [type, setType] = useState("normal");
  const [color, setColor] = useState(PALETTE[0]);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!canShow) return;
    setName(workspace.name || "");
    setType(String(workspace.type || "normal"));
    setColor(workspace.color || PALETTE[0]);
    setConfirmDel(false);
  }, [canShow, workspace]);

  const okToSave = useMemo(() => name.trim().length > 0, [name]);

  if (!canShow) return null;

  const wsId = workspace.id;

  return (
    <div style={styles.overlay} onMouseDown={onClose} role="dialog" aria-modal="true">
      <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.top}>
          <div>
            <div style={styles.title}>Workspace settings</div>
            <div style={styles.sub}>Rename, change type/color, or delete.</div>
          </div>

          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Close">
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!okToSave) return;
            onSave?.(wsId, { name: name.trim(), type, color });
          }}
          style={styles.form}
        >
          <label style={styles.label}>
            Name
            <StyledInput value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          {/* Compact color chooser (no visible label) */}
          <div style={styles.colorRow}>
            <div style={styles.colorLabel}>Color</div>
            <div style={styles.colorChips} aria-label="Color">
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
                    aria-label={`Choose color ${hex}`}
                  >
                    <span style={{ ...styles.colorDot, background: hex }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* SAME type cards as WorkspaceModal */}
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
                    style={{
                      ...styles.typeCard,
                      ...(selected ? styles.typeCardSelected : null),
                    }}
                  >
                    <div style={styles.typeLabel}>{t.label}</div>
                    <div style={styles.typeDesc}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.ghost}>
              Close
            </button>
            <button
              type="submit"
              disabled={!okToSave}
              style={{ ...styles.primary, ...(okToSave ? null : styles.primaryDisabled) }}
            >
              Save changes
            </button>
          </div>

          <div style={styles.dangerZone}>
            <div style={styles.dangerTitle}>Danger zone</div>
            <div style={styles.dangerText}>Deleting removes it from the list.</div>

            {!confirmDel ? (
              <button type="button" onClick={() => setConfirmDel(true)} style={styles.dangerBtn}>
                Delete workspace
              </button>
            ) : (
              <div style={styles.confirmRow}>
                <button type="button" onClick={() => setConfirmDel(false)} style={styles.ghost}>
                  Cancel
                </button>
                <button type="button" onClick={() => onDelete?.(wsId)} style={styles.dangerBtnConfirm}>
                  Yes, delete
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

const c = {
  base: "#334155",
  surface: "#1E293B",
  surface2: "#334155",
  border: "#475569",
  text: "#F1F5F9",
  muted: "#94A3B8",
  accent: "#6366F1",
  accentSoft: "rgba(99, 102, 241, 0.20)",
  focusRing: "rgba(99, 102, 241, 0.35)",
  shadow: "0 24px 70px rgba(0, 0, 0, 0.50)",
  shadowSoft: "0 12px 35px rgba(0, 0, 0, 0.35)",
  danger: "#EF4444",
  dangerSoft: "rgba(239, 68, 68, 0.20)",
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
    zIndex: 50,
  },
  modal: {
    width: "min(760px, 100%)",
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

  // compact color row (like WorkspaceModal’s section spacing)
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
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)",
  },

  // same type section as WorkspaceModal
  section: { display: "grid", gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: 950, color: c.text },
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
    background: `linear-gradient(180deg, ${c.surface} 0%, rgba(99,102,241,0.15) 100%)`,
    boxShadow: "0 12px 30px rgba(99, 102, 241, 0.30)",
  },
  typeLabel: { fontWeight: 950, fontSize: 13, color: c.text },
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
    border: `1px solid ${c.accent}`,
    background: c.accent,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 950,
    boxShadow: "0 10px 22px rgba(99, 102, 241, 0.35)",
    transition: "all 0.2s ease",
  },
  primaryDisabled: { opacity: 0.55, cursor: "not-allowed", boxShadow: "none" },

  dangerZone: {
    marginTop: 10,
    borderRadius: 16,
    border: `1px solid ${c.base}`,
    background: c.surface2,
    padding: 12,
  },
  dangerTitle: { fontSize: 12, fontWeight: 950, color: c.text },
  dangerText: { marginTop: 6, fontSize: 12.5, color: c.muted, lineHeight: 1.4 },

  dangerBtn: {
    marginTop: 10,
    padding: "10px 14px",
    borderRadius: 14,
    border: `1px solid ${c.dangerSoft}`,
    background: c.dangerSoft,
    color: c.danger,
    cursor: "pointer",
    fontWeight: 950,
  },
  dangerBtnConfirm: {
    padding: "10px 14px",
    borderRadius: 14,
    border: `1px solid ${c.danger}`,
    background: c.danger,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 950,
  },
  confirmRow: { marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 10 },

  fieldBase: {
    height: 42,
    borderRadius: 14,
    border: `1px solid ${c.base}`,
    background: c.surface2,
    padding: "0 12px",
    outline: "none",
    fontSize: 14,
    color: c.text,
    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.10)",
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
