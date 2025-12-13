import { useMemo, useState } from "react";
import WorkspaceModal from "./WorkspaceModal";
import WorkspaceSettingsModal from "./WorkspaceSettingsModal";

export default function WorkspaceLanding({
  workspaces = [],
  onSelectWorkspace,
  onCreateWorkspace,
  onUpdateWorkspace,
  onDeleteWorkspace,
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeWs, setActiveWs] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const sorted = useMemo(() => {
    return [...workspaces].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [workspaces]);

  return (
    <div style={styles.page}>
      <div style={styles.centerWrap}>
        {/* Big eye-catching title */}
        <div style={styles.titleSection}>
          <h1 style={styles.mainTitle}>HackStream</h1>
          <p style={styles.mainSubtitle}>Your workspace hub</p>
        </div>
        
        <div style={styles.card}>
          <div style={styles.header}>
            <div>
              <h2 style={styles.h2}>Choose a workspace</h2>
              <p style={styles.sub}>Select an existing workspace or create a new one.</p>
            </div>

            <button type="button" onClick={() => setCreateOpen(true)} style={styles.primary}>
              + Add workspace
            </button>
          </div>

          {sorted.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyTitle}>No workspaces yet</div>
              <div style={styles.emptyText}>Create your first workspace to get started.</div>
            </div>
          ) : (
            <div style={styles.grid}>
              {sorted.map((ws) => {
                const isHover = hoveredId === ws.id;
                const stripe = ws.color || c.accent;

                return (
                  <div
                    key={ws.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") onSelectWorkspace?.(ws);
                    }}
                    onClick={() => onSelectWorkspace?.(ws)}
                    onMouseEnter={() => setHoveredId(ws.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      ...styles.wsWrap,
                      ...(isHover ? styles.wsWrapHover : null),
                    }}
                  >
                    <div style={{ ...styles.wsStripe, background: stripe }} />

                    <div style={styles.wsInner}>
                      <div style={styles.wsTop}>
                        <div style={styles.wsName} title={ws.name}>
                          {ws.name}
                        </div>
                        <span style={styles.pill}>{formatType(ws.type)}</span>
                      </div>

                      <div style={styles.wsDescMuted}>Click to open this workspace</div>

                      <div style={styles.wsBottom}>
                        <button
                          type="button"
                          title="Workspace settings"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveWs(ws);
                            setSettingsOpen(true);
                          }}
                          style={{
                            ...styles.cfgBtn,
                            ...(isHover ? styles.cfgBtnHover : null),
                          }}
                        >
                          ⋯
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <WorkspaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(payload) => {
          onCreateWorkspace?.(payload);
          setCreateOpen(false);
        }}
      />

      <WorkspaceSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        workspace={activeWs}
        onSave={(id, patch) => {
          onUpdateWorkspace?.(id, patch);
          setSettingsOpen(false);
        }}
        onDelete={(id) => {
          onDeleteWorkspace?.(id);
          setSettingsOpen(false);
        }}
      />
    </div>
  );
}

function formatType(t) {
  const v = String(t || "normal").toLowerCase();
  if (v === "company") return "Company";
  if (v === "personal") return "Personal";
  return "Normal";
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
  page: { minHeight: "100vh", background: c.bg, color: c.text },
  centerWrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 32,
  },
  titleSection: {
    textAlign: "center",
    marginBottom: 8,
  },
  mainTitle: {
    margin: 0,
    fontSize: "clamp(48px, 8vw, 96px)",
    fontWeight: 950,
    letterSpacing: "-0.04em",
    background: `linear-gradient(135deg, ${c.accent} 0%, #7C3AED 50%, #EC4899 100%)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    lineHeight: 1.1,
    marginBottom: 12,
  },
  mainSubtitle: {
    margin: 0,
    fontSize: "clamp(18px, 2.5vw, 24px)",
    color: c.muted,
    fontWeight: 500,
    letterSpacing: "0.02em",
  },
  card: {
    width: "min(980px, 100%)",
    background: c.surface,
    border: `1px solid ${c.base}`,
    borderRadius: 20,
    boxShadow: c.shadow,
    padding: 18,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  h2: { margin: 0, fontSize: 18, fontWeight: 950, letterSpacing: 0.2 },
  sub: { margin: "6px 0 0", color: c.muted, fontSize: 13, lineHeight: 1.4 },

  primary: {
    padding: "10px 14px",
    borderRadius: 14,
    border: `1px solid ${c.accentSoft}`,
    background: c.accent,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 950,
    boxShadow: "0 10px 22px rgba(79, 70, 229, 0.16)",
  },

  empty: {
    borderRadius: 16,
    border: `1px dashed ${c.base}`,
    background: c.surface2,
    padding: 18,
  },
  emptyTitle: { fontWeight: 900 },
  emptyText: { marginTop: 6, color: c.muted, fontSize: 13 },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
  },

  // CARD
  wsWrap: {
    position: "relative",
    borderRadius: 18,
    border: `1px solid ${c.base}`,
    background: c.surface2,
    boxShadow: c.shadowSoft,
    overflow: "hidden",
    cursor: "pointer",
  },
  wsWrapHover: { border: `1px solid ${c.border}`, background: "#FFFFFF" },
  wsStripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 8 },

  // Inner layout fixes alignment (no overlap, consistent bottom button)
  wsInner: {
    padding: 12,
    paddingLeft: 18, // gives breathing room away from stripe
    minHeight: 92,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  wsTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  wsName: {
    fontWeight: 950,
    fontSize: 16,
    lineHeight: "18px",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    maxWidth: "70%",
  },
  pill: {
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${c.base}`,
    background: "#fff",
    color: c.text,
    whiteSpace: "nowrap",
    fontWeight: 800,
    lineHeight: "12px",
  },

  wsDescMuted: {
    fontSize: 13,
    color: c.muted,
    lineHeight: 1.4,
  },

  wsBottom: {
    marginTop: "auto",
    display: "flex",
    justifyContent: "flex-end",
  },

  cfgBtn: {
    width: 38,
    height: 30,
    borderRadius: 12,
    border: `1px solid ${c.base}`,
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    color: c.text,
    display: "grid",
    placeItems: "center",
  },
  cfgBtnHover: { border: `1px solid ${c.border}`, boxShadow: c.shadowSoft },
};
