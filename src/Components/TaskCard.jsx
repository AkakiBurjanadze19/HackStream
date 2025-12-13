import React from "react";

const STATUS = {
  ready: {
    label: "Ready",
    stripe: "#16A34A",
    badgeBg: "#DCFCE7",
    badgeText: "#166534",
  },
  blocked: {
    label: "Blocked",
    stripe: "#DC2626",
    badgeBg: "#FEE2E2",
    badgeText: "#991B1B",
  },
  in_progress: {
    label: "In progress",
    stripe: "#D97706",
    badgeBg: "#FEF3C7",
    badgeText: "#92400E",
  },
  review: {
    label: "Review",
    stripe: "#2563EB",
    badgeBg: "#DBEAFE",
    badgeText: "#1D4ED8",
  },
  backlog: {
    label: "Backlog",
    stripe: "#9CA3AF",
    badgeBg: "#F3F4F6",
    badgeText: "#374151",
  },
  overdue: {
    label: "Overdue",
    stripe: "#DC2626",
    badgeBg: "#FEE2E2",
    badgeText: "#991B1B",
  },
};

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  }
  return String(value);
}

function urgencyBadge(hoursLeft) {
  if (hoursLeft === null || hoursLeft === undefined || Number.isNaN(hoursLeft)) return { text: "No deadline info", bg: "#F3F4F6", color: "#374151" };
  if (hoursLeft <= 0) return { text: "Overdue", bg: "#FEE2E2", color: "#991B1B" };
  if (hoursLeft <= 6) return { text: "Due soon", bg: "#FEF3C7", color: "#92400E" };
  if (hoursLeft <= 24) return { text: "Due today", bg: "#DBEAFE", color: "#1D4ED8" };
  return { text: "Plenty of time", bg: "#DCFCE7", color: "#166534" };
}

export default function TaskCard({ task, status = "backlog" }) {
  const s = STATUS[status] ?? STATUS.backlog;
  const u = urgencyBadge(task?.hours_left_until_deadline);

  return (
    <article style={styles.card}>
      {/* Left status stripe */}
      <div style={{ ...styles.stripe, background: s.stripe }} />

      <div style={styles.content}>
        {/* Header row */}
        <div style={styles.topRow}>
          <h3 style={styles.title} title={task?.title}>
            {task?.title ?? "Untitled task"}
          </h3>

          <div style={styles.badges}>
            {/* Status badge */}
            <span style={{ ...styles.badge, background: s.badgeBg, color: s.badgeText }}>
              {s.label}
            </span>

            {/* Urgency badge */}
            <span style={{ ...styles.badge, background: u.bg, color: u.color }}>
              {u.text}
            </span>
          </div>
        </div>

        {/* Description */}
        <p style={styles.desc}>{task?.description ?? "No description."}</p>

        {/* Dependencies */}
        {task?.dependencies && task.dependencies.length > 0 && (
          <div style={styles.dependenciesSection}>
            <div style={styles.dependenciesLabel}>Depends on:</div>
            <div style={styles.dependenciesList}>
              {task.dependencies.map((dep, index) => (
                <span key={index} style={styles.dependencyTag}>
                  {dep}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Meta grid */}
        <div style={styles.metaGrid}>
          <div style={styles.metaItem}>
            <div style={styles.metaLabel}>Deadline</div>
            <div style={styles.metaValue}>{formatDate(task?.deadline)}</div>
          </div>

          <div style={styles.metaItem}>
            <div style={styles.metaLabel}>Hours left</div>
            <div style={styles.metaValue}>
              {task?.hours_left_until_deadline ?? "—"}
            </div>
          </div>

          <div style={styles.metaItem}>
            <div style={styles.metaLabel}>Created</div>
            <div style={styles.metaValue}>{formatDate(task?.creation_date)}</div>
          </div>

          <div style={styles.metaItem}>
            <div style={styles.metaLabel}>Importance</div>
            <div style={styles.metaValue}>{task?.importance ?? "—"}</div>
          </div>

          <div style={styles.metaItem}>
            <div style={styles.metaLabel}>Effort</div>
            <div style={styles.metaValue}>{task?.effort ?? "—"}</div>
          </div>
        </div>
      </div>
    </article>
  );
}

const styles = {
  card: {
    display: "flex",
    background: "#FFFFFF",     
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
    transition: "box-shadow 0.2s ease",
    fontFamily: "inherit",
  },
  stripe: {
    width: 6,
    flexShrink: 0,
  },
  content: {
    padding: 14,
    width: "100%",
    minWidth: 0,
  },
  topRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  title: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.3,
    fontWeight: 700,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    letterSpacing: "-0.01em",
  },
  badges: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.08)",
    whiteSpace: "nowrap",
    letterSpacing: "0.01em",
  },
  desc: {
    margin: "0 0 12px 0",
    fontSize: 13,
    lineHeight: 1.5,
    color: "#4B5563",
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden",
  },
  dependenciesSection: {
    marginBottom: 12,
    padding: "8px 10px",
    background: "#FEF3C7",
    border: "1px solid #FCD34D",
    borderRadius: 10,
  },
  dependenciesLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#92400E",
    marginBottom: 6,
    letterSpacing: "0.01em",
  },
  dependenciesList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  dependencyTag: {
    fontSize: 11,
    fontWeight: 500,
    padding: "3px 8px",
    background: "#FFFFFF",
    border: "1px solid #FCD34D",
    borderRadius: 5,
    color: "#92400E",
    whiteSpace: "nowrap",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 10,
  },
  metaItem: {
    background: "#F9FAFB",
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    padding: "8px 10px",
    minWidth: 0,
    transition: "background-color 0.2s ease",
  },
  metaLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
    fontWeight: 500,
    letterSpacing: "0.01em",
  },
  metaValue: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};

