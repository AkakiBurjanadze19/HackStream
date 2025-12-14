import { useState, useEffect, useMemo, useRef } from "react";

export default function PrioritySimulation({ tasks = [], calculateComputedPriority, calculateEffectiveStatus, onSimulationStateChange }) {
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2000); // milliseconds per step
  
  // Track which tasks were initially blocked (at simulation start)
  const [initiallyBlockedTaskIds, setInitiallyBlockedTaskIds] = useState(new Set());
  
  // Initialize blocked tasks when component mounts or tasks change (only when no tasks are completed)
  useEffect(() => {
    if (tasks.length > 0 && completedTaskIds.size === 0) {
      const blocked = new Set();
      tasks.forEach((task) => {
        const { effectiveStatus } = calculateEffectiveStatus(task, tasks);
        if (effectiveStatus === "restricted") {
          blocked.add(String(task.id));
        }
      });
      setInitiallyBlockedTaskIds(blocked);
    }
  }, [tasks, calculateEffectiveStatus, completedTaskIds.size]);

  // Calculate priority breakdown for each task, considering completed tasks in simulation
  const taskBreakdowns = useMemo(() => {
    // Create a modified tasks array where completed tasks in simulation are marked as "done"
    const tasksWithSimulationStatus = tasks.map((task) => {
      if (completedTaskIds.has(String(task.id))) {
        return { ...task, status: "done" };
      }
      return task;
    });

    return tasks.map((task) => {
      const importance = Number(task.importance ?? 3);
      const effort = Number(task.effort ?? 1);
      const hoursUntilDeadline = Number(task.hours_left_until_deadline ?? 0);
      
      let urgency;
      if (!Number.isFinite(hoursUntilDeadline) || hoursUntilDeadline <= 0) {
        urgency = 0.001;
      } else {
        urgency = 1 / hoursUntilDeadline;
      }
      
      const safeEffort = effort > 0 ? effort : 1;
      const computedPriority = (importance * urgency) / safeEffort;
      
      // Calculate effective status using tasks with simulation status
      const { effectiveStatus } = calculateEffectiveStatus(task, tasksWithSimulationStatus);
      const isBlocked = effectiveStatus === "restricted";
      const isCompletedInSimulation = completedTaskIds.has(String(task.id));
      
      return {
        ...task,
        importance,
        effort,
        hoursUntilDeadline,
        urgency,
        computedPriority: Number.isFinite(computedPriority) ? computedPriority : 0,
        isBlocked,
        effectiveStatus,
        isCompletedInSimulation,
      };
    });
  }, [tasks, calculateEffectiveStatus, completedTaskIds]);

  // Sort tasks by priority (unblocked first, then by computed priority)
  const sortedTasks = useMemo(() => {
    return [...taskBreakdowns].sort((a, b) => {
      if (a.isBlocked !== b.isBlocked) {
        return a.isBlocked ? 1 : -1;
      }
      return b.computedPriority - a.computedPriority;
    });
  }, [taskBreakdowns]);

  // Execution order (only unblocked, not done tasks, not already completed in simulation)
  const executionOrder = useMemo(() => {
    return sortedTasks.filter((t) => 
      !t.isBlocked && 
      t.effectiveStatus !== "done" && 
      !t.isCompletedInSimulation
    );
  }, [sortedTasks]);

  // Notify parent component of state changes
  useEffect(() => {
    if (onSimulationStateChange) {
      onSimulationStateChange(completedTaskIds, isPlaying, executionOrder);
    }
  }, [completedTaskIds, isPlaying, executionOrder, onSimulationStateChange]);

  // Track completion order (to show recommended order)
  const [completionOrder, setCompletionOrder] = useState([]);

  // Get all completed tasks (from the original tasks array, filtered by completedTaskIds)
  const completedTasks = useMemo(() => {
    return taskBreakdowns
      .filter((t) => completedTaskIds.has(String(t.id)))
      .sort((a, b) => {
        // Sort by completion order (preserve the order they were completed)
        const aIndex = completionOrder.findIndex((id) => String(id) === String(a.id));
        const bIndex = completionOrder.findIndex((id) => String(id) === String(b.id));
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return b.computedPriority - a.computedPriority;
      });
  }, [taskBreakdowns, completedTaskIds, completionOrder]);

  // Pending tasks (tasks waiting to be executed - the current execution order)
  const pendingTasks = useMemo(() => {
    return executionOrder;
  }, [executionOrder]);

  // Auto-scroll to completed section when a new task is completed
  const completedSectionRef = useRef(null);
  useEffect(() => {
    if (completedTasks.length > 0 && completedSectionRef.current) {
      completedSectionRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "nearest" 
      });
    }
  }, [completedTasks.length]);

  // Use a ref to track the current execution order so the interval callback always has the latest value
  const executionOrderRef = useRef(executionOrder);
  useEffect(() => {
    executionOrderRef.current = executionOrder;
  }, [executionOrder]);

  // Stop playing if no more tasks are available
  useEffect(() => {
    if (executionOrder.length === 0 && isPlaying) {
      setIsPlaying(false);
    }
  }, [executionOrder.length, isPlaying]);

  // Auto-play simulation
  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    
    if (executionOrder.length === 0) {
      setIsPlaying(false);
      return;
    }
    
    // Start the interval
    const interval = setInterval(() => {
      // Get the current execution order from the ref (always up-to-date)
      const currentExecutionOrder = executionOrderRef.current;
      
      if (currentExecutionOrder.length === 0) {
        // No more tasks available
        setIsPlaying(false);
        return;
      }
      
      // Get the next task to execute (highest priority unblocked task)
      const nextTask = currentExecutionOrder[0];
      
      if (!nextTask) {
        // No more tasks available
        setIsPlaying(false);
        return;
      }
      
      // Mark this task as completed and track the order
      setCompletedTaskIds((prev) => {
        const next = new Set(prev);
        next.add(String(nextTask.id));
        return next;
      });
      setCompletionOrder((prev) => [...prev, nextTask.id]);
    }, speed);

    return () => clearInterval(interval);
  }, [isPlaying, speed]); // Removed executionOrder from dependencies, using ref instead

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Priority & Execution Simulation</h3>
          <p style={styles.subtitle}>
            See how tasks are prioritized and executed based on the formula
          </p>
        </div>
        <div style={styles.controls}>
          <button
            type="button"
            onClick={() => {
              if (executionOrder.length === 0 && completedTaskIds.size === 0) return;
              
              if (isPlaying) {
                // Pause
                setIsPlaying(false);
              } else {
                // Play
                setIsPlaying(true);
              }
            }}
            disabled={executionOrder.length === 0 && completedTaskIds.size === 0}
            style={{
              ...styles.playButton,
              ...(isPlaying ? styles.pauseButton : {}),
              ...(executionOrder.length === 0 && completedTaskIds.size === 0 ? styles.disabledButton : {}),
            }}
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCompletedTaskIds(new Set());
              setCompletionOrder([]);
              setIsPlaying(false);
              // Reset initially blocked tasks
              const blocked = new Set();
              tasks.forEach((task) => {
                const { effectiveStatus } = calculateEffectiveStatus(task, tasks);
                if (effectiveStatus === "restricted") {
                  blocked.add(String(task.id));
                }
              });
              setInitiallyBlockedTaskIds(blocked);
            }}
            disabled={executionOrder.length === 0 && completedTaskIds.size === 0}
            style={{
              ...styles.resetButton,
              ...(executionOrder.length === 0 && completedTaskIds.size === 0 ? styles.disabledButton : {}),
            }}
          >
            ↻ Reset
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {/* Priority Calculation Section */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Priority Calculation</h4>
          <div style={styles.formulaBox}>
            <div style={styles.formula}>
              <span style={styles.formulaLabel}>Formula:</span>
              <span style={styles.formulaText}>
                priority = (importance × urgency) / effort
              </span>
            </div>
            <div style={styles.formula}>
              <span style={styles.formulaLabel}>Where:</span>
              <span style={styles.formulaText}>
                urgency = 1 / hours_until_deadline
              </span>
            </div>
          </div>

          <div style={styles.breakdownList}>
            {sortedTasks.slice(0, 10).map((task, idx) => (
              <div
                key={task.id}
                style={{
                  ...styles.breakdownCard,
                  ...(task.isBlocked ? styles.blockedCard : {}),
                  ...(pendingTasks[0]?.id === task.id && isPlaying ? styles.currentCard : {}),
                }}
              >
                <div style={styles.breakdownHeader}>
                  <div style={styles.taskTitle}>{task.title || "Untitled"}</div>
                  <div style={styles.priorityBadge}>
                    Priority: {task.computedPriority.toFixed(4)}
                  </div>
                </div>
                <div style={styles.breakdownDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Importance:</span>
                    <span style={styles.detailValue}>{task.importance}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Hours until deadline:</span>
                    <span style={styles.detailValue}>
                      {task.hoursUntilDeadline > 0
                        ? task.hoursUntilDeadline
                        : "No deadline"}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Urgency (1/hours):</span>
                    <span style={styles.detailValue}>
                      {task.urgency.toFixed(6)}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Effort:</span>
                    <span style={styles.detailValue}>{task.effort}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Calculation:</span>
                    <span style={styles.detailValue}>
                      ({task.importance} × {task.urgency.toFixed(6)}) / {task.effort} = {task.computedPriority.toFixed(4)}
                    </span>
                  </div>
                  {task.isBlocked && (
                    <div style={styles.blockedBadge}>🔒 Blocked</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Execution Order Section */}
        <div style={styles.section}>
          <div style={styles.executionHeader}>
            <h4 style={styles.sectionTitle}>
              Execution Order
            </h4>
            <div style={styles.progressInfo}>
              <span style={styles.progressText}>
                {completedTaskIds.size} completed • {executionOrder.length} available
              </span>
            </div>
          </div>

          {/* Currently Executing Task */}
          {pendingTasks.length > 0 && isPlaying && (
            <div style={styles.currentSection}>
              <div style={styles.sectionSubtitle}>▶ Currently Executing</div>
              <div style={styles.executionList}>
                <div
                  key={pendingTasks[0].id}
                  style={{
                    ...styles.executionCard,
                    ...styles.executingCard,
                  }}
                >
                  <div style={styles.executionNumber}>
                    {completedTaskIds.size + 1}
                  </div>
                  <div style={styles.executionContent}>
                    <div style={styles.executionTitle}>{pendingTasks[0].title || "Untitled"}</div>
                    <div style={styles.executionMeta}>
                      Priority: {pendingTasks[0].computedPriority.toFixed(4)} • 
                      Status: {pendingTasks[0].effectiveStatus}
                    </div>
                  </div>
                  <div style={styles.executingIndicator}>▶ Executing...</div>
                </div>
              </div>
            </div>
          )}

          {/* Available Tasks */}
          {pendingTasks.length > (isPlaying ? 1 : 0) && (
            <div style={styles.pendingSection}>
              <div style={styles.sectionSubtitle}>
                ⏳ Available ({pendingTasks.length - (isPlaying ? 1 : 0)} tasks)
              </div>
              <div style={styles.executionList}>
                {pendingTasks.slice(isPlaying ? 1 : 0).map((task, idx) => (
                  <div
                    key={task.id}
                    style={styles.executionCard}
                  >
                    <div style={styles.executionNumber}>
                      {completedTaskIds.size + (isPlaying ? 2 : 1) + idx}
                    </div>
                    <div style={styles.executionContent}>
                      <div style={styles.executionTitle}>{task.title || "Untitled"}</div>
                      <div style={styles.executionMeta}>
                        Priority: {task.computedPriority.toFixed(4)} • 
                        Status: {task.effectiveStatus}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div ref={completedSectionRef} style={styles.completedSection}>
              <div style={styles.sectionSubtitle}>
                ✓ Completed ({completedTasks.length} tasks)
              </div>
              <div style={styles.executionList}>
                {completedTasks.map((task, idx) => (
                  <div
                    key={task.id}
                    style={{
                      ...styles.executionCard,
                      ...styles.executedCard,
                    }}
                  >
                    <div style={{
                      ...styles.executionNumber,
                      ...styles.executedNumber,
                    }}>
                      {completedTasks.length - idx}
                    </div>
                    <div style={styles.executionContent}>
                      <div style={styles.executionTitle}>{task.title || "Untitled"}</div>
                      <div style={styles.executionMeta}>
                        Priority: {task.computedPriority.toFixed(4)} • 
                        Status: {task.effectiveStatus}
                      </div>
                    </div>
                    <div style={styles.executedIndicator}>✓ Done</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {executionOrder.length === 0 && completedTaskIds.size === 0 && (
            <div style={styles.emptyMessage}>
              No executable tasks. All tasks are either blocked or done.
            </div>
          )}
        </div>

        {/* Recommended Order Feedback */}
        {(completedTaskIds.size > 0 || executionOrder.length > 0) && (
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>
              📋 Recommended Task Completion Order
            </h4>
            <div style={styles.recommendationBox}>
              <div style={styles.recommendationText}>
                {completedTaskIds.size > 0 
                  ? "Based on the simulation, here's the optimal order to complete your tasks:"
                  : "Start the simulation to see the recommended task completion order based on priority and dependencies."}
              </div>
              <div style={styles.recommendationList}>
                {/* Show completed tasks in order */}
                {completedTasks.map((task, idx) => {
                  const wasInitiallyBlocked = initiallyBlockedTaskIds.has(String(task.id));
                  
                  return (
                    <div key={task.id} style={styles.recommendationItem}>
                      <div style={styles.recommendationNumber}>{idx + 1}</div>
                      <div style={styles.recommendationContent}>
                        <div style={styles.recommendationTitle}>{task.title || "Untitled"}</div>
                        <div style={styles.recommendationMeta}>
                          Priority: {task.computedPriority.toFixed(4)}
                          {wasInitiallyBlocked && (
                            <span style={{ color: c.success, marginLeft: 8 }}>
                              ✓ Unlocked after dependency completion
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Show remaining available tasks */}
                {executionOrder.length > 0 && (
                  <>
                    {executionOrder.map((task, idx) => (
                      <div key={task.id} style={{
                        ...styles.recommendationItem,
                        opacity: 0.7,
                      }}>
                        <div style={{
                          ...styles.recommendationNumber,
                          background: c.muted,
                        }}>
                          {completedTaskIds.size + idx + 1}
                        </div>
                        <div style={styles.recommendationContent}>
                          <div style={styles.recommendationTitle}>{task.title || "Untitled"}</div>
                          <div style={styles.recommendationMeta}>
                            Priority: {task.computedPriority.toFixed(4)} • 
                            <span style={{ color: c.accent, marginLeft: 8 }}>
                              Available now
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                
                {/* Show blocked tasks that will become available */}
                {taskBreakdowns.filter((t) => 
                  t.isBlocked && 
                  !completedTaskIds.has(String(t.id)) &&
                  t.effectiveStatus !== "done"
                ).length > 0 && (
                  <div style={styles.recommendationNote}>
                    <div style={styles.noteIcon}>🔒</div>
                    <div style={styles.noteText}>
                      Some tasks are currently blocked by dependencies. They will appear in this list once their dependencies are completed.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const c = {
  base: "#334155",
  surface: "#1E293B",
  surface2: "#334155",
  text: "#F1F5F9",
  muted: "#94A3B8",
  accent: "#6366F1",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const styles = {
  container: {
    background: c.surface,
    border: `1px solid ${c.base}`,
    borderRadius: 20,
    padding: 20,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 950,
    color: c.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    margin: "6px 0 0",
    fontSize: 13,
    color: c.muted,
    lineHeight: 1.4,
  },
  controls: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  playButton: {
    padding: "8px 14px",
    borderRadius: 12,
    border: `1px solid ${c.accent}`,
    background: c.accent,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  pauseButton: {
    background: "#F59E0B",
    borderColor: "#F59E0B",
  },
  resetButton: {
    padding: "8px 14px",
    borderRadius: 12,
    border: `1px solid ${c.base}`,
    background: c.surface2,
    color: c.text,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  content: {
    flex: 1,
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 950,
    color: c.text,
    letterSpacing: 0.2,
  },
  executionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressInfo: {
    display: "flex",
    alignItems: "center",
  },
  progressText: {
    fontSize: 13,
    fontWeight: 700,
    color: c.muted,
    background: c.surface2,
    padding: "4px 10px",
    borderRadius: 8,
  },
  sectionSubtitle: {
    margin: "0 0 10px 0",
    fontSize: 13,
    fontWeight: 900,
    color: c.muted,
    letterSpacing: 0.1,
  },
  currentSection: {
    marginBottom: 20,
  },
  pendingSection: {
    marginBottom: 20,
  },
  completedSection: {
    marginBottom: 10,
  },
  formulaBox: {
    background: c.surface2,
    border: `1px solid ${c.base}`,
    borderRadius: 16,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  formula: {
    display: "flex",
    gap: 12,
    alignItems: "baseline",
  },
  formulaLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: c.muted,
    minWidth: 60,
  },
  formulaText: {
    fontSize: 14,
    fontWeight: 900,
    color: c.text,
    fontFamily: "monospace",
  },
  breakdownList: {
    display: "flex",
    flexDirection: "column",
    gap: 18, // Increased from 10 to 14, now 18
  },
  breakdownCard: {
    background: c.surface2,
    border: `1px solid ${c.base}`,
    borderRadius: 16,
    padding: 14,
    transition: "all 0.3s ease",
  },
  blockedCard: {
    borderColor: c.danger,
    background: "rgba(239, 68, 68, 0.10)",
    opacity: 0.7,
  },
  currentCard: {
    borderColor: c.accent,
    background: "rgba(99, 102, 241, 0.15)",
    boxShadow: `0 0 0 3px rgba(99, 102, 241, 0.20)`,
  },
  breakdownHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: 950,
    color: c.text,
    flex: 1,
  },
  priorityBadge: {
    fontSize: 12,
    fontWeight: 900,
    color: c.accent,
    background: "rgba(99, 102, 241, 0.15)",
    padding: "4px 10px",
    borderRadius: 8,
  },
  breakdownDetails: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13,
  },
  detailLabel: {
    color: c.muted,
    fontWeight: 700,
  },
  detailValue: {
    color: c.text,
    fontWeight: 900,
    fontFamily: "monospace",
  },
  blockedBadge: {
    marginTop: 8,
    padding: "6px 10px",
    background: "rgba(239, 68, 68, 0.15)",
    border: `1px solid ${c.danger}`,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    color: c.danger,
    textAlign: "center",
  },
  executionList: {
    display: "flex",
    flexDirection: "column",
    gap: 20, // Increased from 10 to 16, now 20
  },
  executionCard: {
    background: c.surface2,
    border: `1px solid ${c.base}`,
    borderRadius: 16,
    padding: 16, // Increased from 14
    display: "flex",
    alignItems: "center",
    gap: 14,
    transition: "all 0.5s ease",
    marginBottom: 4, // Added extra margin
  },
  executingCard: {
    borderColor: c.accent,
    background: "rgba(99, 102, 241, 0.20)",
    boxShadow: `0 0 0 3px rgba(99, 102, 241, 0.30)`,
    transform: "scale(1.02)",
  },
  executedCard: {
    opacity: 0.6,
    borderColor: c.success,
  },
  executionNumber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: c.accent,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    fontSize: 16,
    flexShrink: 0,
  },
  executedNumber: {
    background: c.success,
  },
  executionContent: {
    flex: 1,
    minWidth: 0,
  },
  executionTitle: {
    fontSize: 15,
    fontWeight: 950,
    color: c.text,
    marginBottom: 4,
  },
  executionMeta: {
    fontSize: 12,
    color: c.muted,
  },
  executingIndicator: {
    fontSize: 12,
    fontWeight: 700,
    color: c.accent,
    padding: "4px 10px",
    background: "rgba(99, 102, 241, 0.15)",
    borderRadius: 8,
  },
  executedIndicator: {
    fontSize: 12,
    fontWeight: 700,
    color: c.success,
    padding: "4px 10px",
    background: "rgba(34, 197, 94, 0.15)",
    borderRadius: 8,
  },
  emptyMessage: {
    padding: 20,
    textAlign: "center",
    color: c.muted,
    fontSize: 14,
    background: c.surface2,
    border: `1px dashed ${c.base}`,
    borderRadius: 16,
  },
  disabledButton: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  recommendationBox: {
    background: c.surface2,
    border: `1px solid ${c.accent}`,
    borderRadius: 16,
    padding: 16,
    boxShadow: `0 0 0 2px rgba(99, 102, 241, 0.15)`,
  },
  recommendationText: {
    fontSize: 14,
    fontWeight: 700,
    color: c.text,
    marginBottom: 16,
    lineHeight: 1.5,
  },
  recommendationList: {
    display: "flex",
    flexDirection: "column",
    gap: 20, // Increased from 10 to 16, now 20
  },
  recommendationItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: 16, // Increased from 12
    background: c.surface,
    borderRadius: 12,
    border: `1px solid ${c.base}`,
    marginBottom: 4, // Added extra margin
  },
  recommendationNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: `linear-gradient(135deg, ${c.accent} 0%, #7C3AED 100%)`,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    fontSize: 15,
    flexShrink: 0,
  },
  recommendationContent: {
    flex: 1,
    minWidth: 0,
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: 950,
    color: c.text,
    marginBottom: 4,
  },
  recommendationMeta: {
    fontSize: 12,
    color: c.muted,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  recommendationNote: {
    marginTop: 8,
    padding: 12,
    background: "rgba(99, 102, 241, 0.10)",
    border: `1px solid rgba(99, 102, 241, 0.20)`,
    borderRadius: 12,
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
  noteIcon: {
    fontSize: 18,
    flexShrink: 0,
  },
  noteText: {
    fontSize: 13,
    color: c.muted,
    lineHeight: 1.5,
    flex: 1,
  },
};
