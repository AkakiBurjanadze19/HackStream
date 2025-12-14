import React from "react";

const STATUS = {
  ready: {
    label: "Ready",
    stripe: "#22C55E",
    badgeBg: "rgba(34, 197, 94, 0.20)",
    badgeText: "#4ADE80",
  },
  blocked: {
    label: "Blocked",
    stripe: "#EF4444",
    badgeBg: "rgba(239, 68, 68, 0.20)",
    badgeText: "#F87171",
  },
  in_progress: {
    label: "In progress",
    stripe: "#F59E0B",
    badgeBg: "rgba(245, 158, 11, 0.20)",
    badgeText: "#FBBF24",
  },
  review: {
    label: "Review",
    stripe: "#3B82F6",
    badgeBg: "rgba(59, 130, 246, 0.20)",
    badgeText: "#60A5FA",
  },
  backlog: {
    label: "Backlog",
    stripe: "#94A3B8",
    badgeBg: "rgba(148, 163, 184, 0.20)",
    badgeText: "#CBD5E1",
  },
  overdue: {
    label: "Overdue",
    stripe: "#F87171",
    badgeBg: "rgba(248, 113, 113, 0.20)",
    badgeText: "#FCA5A5",
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

function urgencyBadge(hoursLeft, deadline) {
  if (hoursLeft === null || hoursLeft === undefined || Number.isNaN(hoursLeft)) return { text: "No deadline info", bg: "rgba(148, 163, 184, 0.20)", color: "#CBD5E1" };
  if (hoursLeft <= 0) return { text: "Overdue", bg: "rgba(239, 68, 68, 0.20)", color: "#F87171" };
  
  // Check calendar days for more accurate "Due today" / "Due tomorrow"
  if (deadline) {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if deadline is today (same calendar day)
    const isToday = deadlineDate.getFullYear() === today.getFullYear() &&
                    deadlineDate.getMonth() === today.getMonth() &&
                    deadlineDate.getDate() === today.getDate();
    
    // Check if deadline is tomorrow (next calendar day)
    const isTomorrow = deadlineDate.getFullYear() === tomorrow.getFullYear() &&
                       deadlineDate.getMonth() === tomorrow.getMonth() &&
                       deadlineDate.getDate() === tomorrow.getDate();
    
    if (isToday) return { text: "Due today", bg: "rgba(59, 130, 246, 0.20)", color: "#60A5FA" };
    if (isTomorrow) return { text: "Due tomorrow", bg: "rgba(59, 130, 246, 0.20)", color: "#60A5FA" };
  }
  
  // Fallback to hours-based logic if no deadline date or not today/tomorrow
  if (hoursLeft <= 6) return { text: "Due soon", bg: "rgba(245, 158, 11, 0.20)", color: "#FBBF24" };
  return { text: "Plenty of time", bg: "rgba(34, 197, 94, 0.20)", color: "#4ADE80" };
}

function normalizeStatus(s) {
  const v = String(s ?? "").toLowerCase().trim();
  if (v === "done") return "done";
  if (v === "ongoing" || v === "on going" || v === "in progress") return "ongoing";
  if (v === "restricted" || v === "blocked") return "restricted";
  return "todo";
}

function mapStatusToCardStatus(status, task, allTasks = []) {
  if (!status) return "backlog";
  const s = String(status).toLowerCase().trim();
  
  // First check if task is blocked by dependencies (only if not already done)
  if (s !== "done") {
    const byId = new Map(allTasks.map((t) => [String(t.id), t]));
    const isDone = (t) => normalizeStatus(t?.status) === "done";
    
    const deps = Array.isArray(task?.dependsOn) 
      ? task.dependsOn.map(String)
      : Array.isArray(task?.dependencies)
      ? task.dependencies.map(String)
      : [];
    
    const unmet = deps.filter((id) => {
      const depTask = byId.get(id);
      return depTask && !isDone(depTask);
    });
    
    if (unmet.length > 0) {
      return "blocked";
    }
  }
  
  // Then check status
  if (s === "done" || s === "completed") return "ready";
  if (s === "blocked" || s === "restricted") return "blocked";
  if (s === "ongoing" || s === "in progress" || s === "in_progress") return "in_progress";
  if (s === "review" || s === "in review") return "review";
  if (s === "todo" || s === "to do") return "backlog";
  // Check if overdue based on hours_left_until_deadline
  if (task?.hours_left_until_deadline !== null && task?.hours_left_until_deadline !== undefined && task?.hours_left_until_deadline <= 0) {
    return "overdue";
  }
  return "backlog";
}

export default function TaskCard({ task, status = "backlog", allTasks = [] }) {
  const mappedStatus = mapStatusToCardStatus(status, task, allTasks);
  const s = STATUS[mappedStatus] ?? STATUS.backlog;
  const u = urgencyBadge(task?.hours_left_until_deadline, task?.deadline);

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
    background: "#1E293B",     
    border: "1px solid #334155",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.15)",
    transition: "all 0.2s ease",
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
    color: "#F1F5F9",
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
    border: "1px solid rgba(255,255,255,0.10)",
    whiteSpace: "nowrap",
    letterSpacing: "0.01em",
  },
  desc: {
    margin: "0 0 12px 0",
    fontSize: 13,
    lineHeight: 1.5,
    color: "#94A3B8",
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden",
  },
  dependenciesSection: {
    marginBottom: 12,
    padding: "8px 10px",
    background: "rgba(251, 191, 36, 0.15)",
    border: "1px solid rgba(251, 191, 36, 0.30)",
    borderRadius: 10,
  },
  dependenciesLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#FBBF24",
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
    background: "rgba(251, 191, 36, 0.20)",
    border: "1px solid rgba(251, 191, 36, 0.40)",
    borderRadius: 5,
    color: "#FCD34D",
    whiteSpace: "nowrap",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 10,
  },
  metaItem: {
    background: "#334155",
    border: "1px solid #475569",
    borderRadius: 10,
    padding: "8px 10px",
    minWidth: 0,
    transition: "all 0.2s ease",
  },
  metaLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginBottom: 4,
    fontWeight: 500,
    letterSpacing: "0.01em",
  },
  metaValue: {
    fontSize: 13,
    fontWeight: 700,
    color: "#F1F5F9",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};

