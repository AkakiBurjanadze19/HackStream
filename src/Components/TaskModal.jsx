import { useEffect, useMemo, useState } from "react";

export default function TaskModal({ open, onClose, onCreate, onUpdate, initialTask = null }) {
  const isEditMode = !!initialTask;
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [importance, setImportance] = useState(3);
  const [effort, setEffort] = useState(3);
  const [deadline, setDeadline] = useState("");
  const [dependencies, setDependencies] = useState("");

  const [btnHover, setBtnHover] = useState({ primary: false, ghost: false, close: false });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") {
        reset();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Load initial task data when editing
  useEffect(() => {
    if (open && initialTask) {
      setTitle(initialTask.title || "");
      setDescription(initialTask.description || "");
      setImportance(initialTask.importance ?? 3);
      setEffort(initialTask.effort ?? 3);
      // Convert ISO date to datetime-local format
      if (initialTask.deadline) {
        const date = new Date(initialTask.deadline);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        setDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setDeadline("");
      }
      setDependencies(
        Array.isArray(initialTask.dependencies)
          ? initialTask.dependencies.join(", ")
          : initialTask.dependencies || ""
      );
      setErrors({});
      setTouched({});
    }
  }, [open, initialTask]);

  // Reset form when modal closes (only if not editing)
  useEffect(() => {
    if (!open && !initialTask) {
      setTitle("");
      setDescription("");
      setImportance(3);
      setEffort(3);
      setDeadline("");
      setDependencies("");
      setErrors({});
      setTouched({});
    }
  }, [open, initialTask]);

  const hoursLeft = useMemo(() => {
    if (!deadline) return 0;
    const ms = new Date(deadline).getTime() - Date.now();
    const hrs = Math.ceil(ms / (1000 * 60 * 60));
    return Number.isFinite(hrs) ? Math.max(0, hrs) : 0;
  }, [deadline]);

  function reset() {
    if (!isEditMode) {
      setTitle("");
      setDescription("");
      setImportance(3);
      setEffort(3);
      setDeadline("");
      setDependencies("");
    }
    setErrors({});
    setTouched({});
  }

  function validate() {
    const newErrors = {};

    // Title validation
    if (!title.trim()) {
      newErrors.title = "Task title is required";
    } else if (title.trim().length < 3) {
      newErrors.title = "Task title must be at least 3 characters";
    } else if (title.trim().length > 100) {
      newErrors.title = "Task title must be less than 100 characters";
    }

    // Description validation (optional but has max length)
    if (description.trim().length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    // Importance validation
    const importanceNum = Number(importance);
    if (isNaN(importanceNum) || importanceNum < 0 || importanceNum > 5) {
      newErrors.importance = "Importance must be a number between 0 and 5";
    }

    // Effort validation
    const effortNum = Number(effort);
    if (isNaN(effortNum) || effortNum < 0 || effortNum > 5) {
      newErrors.effort = "Effort must be a number between 0 and 5";
    }

    // Deadline validation (optional but if provided, must be valid)
    if (deadline) {
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        newErrors.deadline = "Please enter a valid date and time";
      } else if (deadlineDate < new Date()) {
        newErrors.deadline = "Deadline cannot be in the past";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      title: true,
      description: true,
      importance: true,
      effort: true,
      deadline: true,
    });

    // Validate all fields
    if (!validate()) {
      return;
    }

    // Parse dependencies: split by comma, trim each, filter out empty strings
    const dependenciesArray = dependencies
      .split(",")
      .map((dep) => dep.trim())
      .filter((dep) => dep.length > 0);

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      importance: Number(importance),
      effort: Number(effort),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      hoursLeft,
      dependencies: dependenciesArray,
    };

    if (isEditMode && onUpdate) {
      onUpdate(initialTask.id, taskData);
    } else if (onCreate) {
      taskData.createdAt = new Date().toISOString();
      onCreate(taskData);
    }

    reset();
  }

  function handleBlur(fieldName) {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    validate();
  }

  function handleChange(fieldName, value, setter) {
    setter(value);
    // Clear error for this field when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
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
            <div style={styles.title}>{isEditMode ? "Edit Task" : "New Task"}</div>
            <div style={styles.sub}>{isEditMode ? "Update the details and save." : "Fill the details and save."}</div>
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
              onChange={(e) => handleChange("title", e.target.value, setTitle)}
              onBlur={() => handleBlur("title")}
              placeholder="e.g. Finish database ERD"
              autoFocus
              hasError={touched.title && errors.title}
            />
            {touched.title && errors.title && (
              <div style={styles.errorText}>{errors.title}</div>
            )}
          </label>

          <label style={styles.label}>
            Description (optional)
            <StyledTextarea
              value={description}
              onChange={(e) => handleChange("description", e.target.value, setDescription)}
              onBlur={() => handleBlur("description")}
              placeholder="Any notes, links, or steps..."
              rows={4}
              hasError={touched.description && errors.description}
            />
            {touched.description && errors.description && (
              <div style={styles.errorText}>{errors.description}</div>
            )}
          </label>

          <div style={styles.grid}>
            <label style={styles.label}>
              Importance (0–5)
              <StyledInput
                type="number"
                min={0}
                max={5}
                value={importance}
                onChange={(e) => handleChange("importance", e.target.value, setImportance)}
                onBlur={() => handleBlur("importance")}
                hasError={touched.importance && errors.importance}
              />
              {touched.importance && errors.importance && (
                <div style={styles.errorText}>{errors.importance}</div>
              )}
            </label>

            <label style={styles.label}>
              Effort (0–5)
              <StyledInput
                type="number"
                min={0}
                max={5}
                value={effort}
                onChange={(e) => handleChange("effort", e.target.value, setEffort)}
                onBlur={() => handleBlur("effort")}
                hasError={touched.effort && errors.effort}
              />
              {touched.effort && errors.effort && (
                <div style={styles.errorText}>{errors.effort}</div>
              )}
            </label>
          </div>

          <div style={styles.grid}>
            <label style={styles.label}>
              Deadline
              <StyledInput
                type="datetime-local"
                value={deadline}
                onChange={(e) => handleChange("deadline", e.target.value, setDeadline)}
                onBlur={() => handleBlur("deadline")}
                hasError={touched.deadline && errors.deadline}
              />
              {touched.deadline && errors.deadline && (
                <div style={styles.errorText}>{errors.deadline}</div>
              )}
            </label>

            <div style={styles.readonlyBox}>
              <div style={styles.readonlyLabel}>Hours left</div>
              <div style={styles.readonlyValue}>{deadline ? hoursLeft : "—"}</div>
            </div>
          </div>

          <label style={styles.label}>
            Dependencies (optional)
            <StyledInput
              value={dependencies}
              onChange={(e) => setDependencies(e.target.value)}
              placeholder="e.g. Task 1, Task 2, Task 3 (comma-separated)"
            />
            <div style={styles.helperText}>
              Enter task names separated by commas. This task will depend on the completion of these tasks.
            </div>
          </label>

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
              {isEditMode ? "Update task" : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Dark theme palette */
const c = {
  base: "#334155",
  bg: "#0F172A",
  surface: "#1E293B",
  surface2: "#334155",
  border: "#475569",
  text: "#F1F5F9",
  muted: "#94A3B8",
  accent: "#6366F1",
  accentHover: "#818CF8",
  accentSoft: "rgba(99, 102, 241, 0.20)",
  focusRing: "rgba(99, 102, 241, 0.35)",
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
    border: `1px solid ${c.accent}`,
    background: c.accent,
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: 950,
    boxShadow: "0 10px 22px rgba(99, 102, 241, 0.35)",
    transition: "all 0.2s ease",
  },
  primaryHover: {
    background: c.accentHover,
    boxShadow: "0 12px 26px rgba(129, 140, 248, 0.40)",
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
    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.10)",
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
    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.10)",
  },
  textareaFocus: {
    border: `1px solid ${c.accent}`,
    boxShadow: `0 0 0 4px ${c.focusRing}`,
    background: c.surface,
  },

  helperText: {
    fontSize: 11,
    color: c.muted,
    marginTop: 4,
    lineHeight: 1.4,
  },

  errorText: {
    fontSize: 11,
    color: "#F87171",
    marginTop: 4,
    lineHeight: 1.4,
    fontWeight: 600,
  },

  fieldError: {
    border: `1px solid #EF4444`,
    background: "rgba(239, 68, 68, 0.15)",
  },
};

function StyledInput(props) {
  const [focused, setFocused] = useState(false);
  const { hasError, ...inputProps } = props;
  return (
    <input
      {...inputProps}
      onFocus={(e) => {
        setFocused(true);
        inputProps.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        inputProps.onBlur?.(e);
      }}
      style={{
        ...styles.fieldBase,
        ...(focused ? styles.fieldFocus : null),
        ...(hasError ? styles.fieldError : null),
        ...(inputProps.style || null),
      }}
    />
  );
}

function StyledTextarea(props) {
  const [focused, setFocused] = useState(false);
  const { hasError, ...textareaProps } = props;
  return (
    <textarea
      {...textareaProps}
      onFocus={(e) => {
        setFocused(true);
        textareaProps.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        textareaProps.onBlur?.(e);
      }}
      style={{
        ...styles.textareaBase,
        ...(focused ? styles.textareaFocus : null),
        ...(hasError ? styles.fieldError : null),
        ...(textareaProps.style || null),
      }}
    />
  );
}

