import { useMemo, useState } from "react";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import "./App.css";

const initialTasks = [
  {
    id: 1,
    title: "Implement drag",
    description: "Enable moving tasks across columns with keyboard + mouse support.",
    deadline: "2025-12-20T18:00:00Z",
    hours_left_until_deadline: 42,
    creation_date: "2025-12-12",
    importance: 9,
    effort: 4,
    dependencies: ["Design UI mockups", "Set up API endpoints"],
    status: "ready",
  },
  {
    id: 2,
    title: "Deploy to production",
    description: "Deploy the application to the production environment.",
    deadline: "2025-12-25T18:00:00Z",
    hours_left_until_deadline: 120,
    creation_date: "2025-12-15",
    importance: 10,
    effort: 5,
    dependencies: ["Implement drag & drop", "Write unit tests", "Code review"],
    status: "blocked",
  },
  {
    id: 3,
    title: "Implement drag & drop",
    description: "Enable moving tasks across columns with keyboard + mouse support.",
    deadline: "2025-12-20T18:00:00Z",
    hours_left_until_deadline: 42,
    creation_date: "2025-12-12",
    importance: 9,
    effort: 4,
    dependencies: ["Design UI mockups", "Set up API endpoints"],
    status: "in_progress",
  },
  {
    id: 4,
    title: "Implement drag & drop",
    description: "Enable moving tasks across columns with keyboard + mouse support.",
    deadline: "2025-12-20T18:00:00Z",
    hours_left_until_deadline: 42,
    creation_date: "2025-12-12",
    importance: 9,
    effort: 4,
    dependencies: ["Design UI mockups", "Set up API endpoints"],
    status: "overdue",
  },
  {
    id: 5,
    title: "Implement drag & drop",
    description: "Enable moving tasks across columns with keyboard + mouse support.",
    deadline: "2025-12-20T18:00:00Z",
    hours_left_until_deadline: 42,
    creation_date: "2025-12-12",
    importance: 9,
    effort: 4,
    dependencies: ["Design UI mockups", "Set up API endpoints"],
    status: "blocked",
  },
  {
    id: 6,
    title: "Implement drag & drop",
    description: "Enable moving tasks across columns with keyboard + mouse support.",
    deadline: "2025-12-20T18:00:00Z",
    hours_left_until_deadline: 42,
    creation_date: "2025-12-12",
    importance: 9,
    effort: 4,
    dependencies: ["Design UI mockups", "Set up API endpoints"],
    status: "blocked",
  },
];

export default function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ---------------- FILTER STATE (blue toolbar) ----------------
  const [search, setSearch] = useState("");

  const [filterKey, setFilterKey] = useState("status");
  const [filterOp, setFilterOp] = useState("equals");
  const [filterValue, setFilterValue] = useState("");

  const norm = (x) => String(x ?? "").toLowerCase().trim();

  function urgencyFromHours(h) {
    const n = Number(h);
    if (!Number.isFinite(n)) return "unknown";
    if (n <= 0) return "overdue";
    if (n <= 6) return "due_soon";
    if (n <= 24) return "due_today";
    return "plenty";
  }

  function matchesFilter(task) {
    // 1) Search (ONLY title)
    if (search.trim()) {
      const q = norm(search);
      const inTitle = norm(task.title).includes(q);
      if (!inTitle) return false;
    }

    // 2) If filter needs a value and it's empty => don't filter
    const opNeedsValue = !["is_empty", "is_not_empty", "has_any", "has_none"].includes(filterOp);
    if (opNeedsValue && !norm(filterValue)) return true;

    const key = filterKey;

    // --- derived: urgency (from hours_left_until_deadline) ---
    if (key === "urgency") {
      const u = urgencyFromHours(task.hours_left_until_deadline);
      if (filterOp === "equals") return u === filterValue;
      if (filterOp === "not_equals") return u !== filterValue;
      return true;
    }

    // --- text fields ---
    if (key === "title" || key === "description") {
      const v = norm(task[key]);
      const x = norm(filterValue);

      if (filterOp === "contains") return v.includes(x);
      if (filterOp === "equals") return v === x;
      if (filterOp === "starts_with") return v.startsWith(x);
      if (filterOp === "ends_with") return v.endsWith(x);
      if (filterOp === "is_empty") return v.length === 0;
      if (filterOp === "is_not_empty") return v.length > 0;
      return true;
    }

    // --- status enum ---
    if (key === "status") {
      if (filterOp === "equals") return task.status === filterValue;
      if (filterOp === "not_equals") return task.status !== filterValue;
      return true;
    }

    // --- numeric fields ---
    if (key === "importance" || key === "effort" || key === "hours_left_until_deadline") {
      const n = Number(task[key]);
      const x = Number(filterValue);
      if (!Number.isFinite(n) || !Number.isFinite(x)) return false;

      if (filterOp === "=") return n === x;
      if (filterOp === "!=") return n !== x;
      if (filterOp === ">") return n > x;
      if (filterOp === ">=") return n >= x;
      if (filterOp === "<") return n < x;
      if (filterOp === "<=") return n <= x;
      return true;
    }

    // --- date fields: deadline / creation_date ---
    if (key === "deadline" || key === "creation_date") {
      if (filterOp === "is_empty") return !task[key];
      if (filterOp === "is_not_empty") return !!task[key];

      const dv = task[key] ? new Date(task[key]).getTime() : NaN;
      const xv = filterValue ? new Date(filterValue).getTime() : NaN;
      if (!Number.isFinite(dv) || !Number.isFinite(xv)) return false;

      if (filterOp === "before") return dv < xv;
      if (filterOp === "after") return dv > xv;
      if (filterOp === "on") {
        const d1 = new Date(dv);
        const d2 = new Date(xv);
        return (
          d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() === d2.getDate()
        );
      }
      return true;
    }

    // --- dependencies list ---
    if (key === "dependencies") {
      const arr = Array.isArray(task.dependencies) ? task.dependencies : [];

      if (filterOp === "has_any") return arr.length > 0;
      if (filterOp === "has_none") return arr.length === 0;
      if (filterOp === "contains") {
        const q = norm(filterValue);
        return arr.some((d) => norm(d).includes(q));
      }
      return true;
    }

    return true;
  }

  const filteredTasks = useMemo(() => tasks.filter(matchesFilter), [tasks, search, filterKey, filterOp, filterValue]);

  const handleCreateTask = (taskData) => {
    const newTask = {
      id: Date.now(),
      ...taskData,
      hours_left_until_deadline: taskData.hoursLeft || 0,
      creation_date: taskData.createdAt || new Date().toISOString().split("T")[0],
      dependencies: taskData.dependencies || [],
      status: "backlog",
    };
    setTasks([...tasks, newTask]);
    setIsModalOpen(false);
  };

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "flex-end",
        paddingRight: 16,
        boxSizing: "border-box",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "flex-end",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        <div
          className="taskColumn"
          style={{
            paddingTop: 20,
            paddingBottom: 20,
            paddingLeft: 20,
            paddingRight: 8, // small right gap
          }}
        >
          {/* Add Task Button */}
          <button
            classname="addTaskBtn"
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: "#FFFFFF",
              background: "#4F46E5",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)",
              transition: "all 0.2s ease",
              alignSelf: "flex-start",
              marginBottom: 8,
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#4338CA";
              e.target.style.boxShadow = "0 4px 8px rgba(79, 70, 229, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#4F46E5";
              e.target.style.boxShadow = "0 2px 4px rgba(79, 70, 229, 0.2)";
            }}
          >
            + Add Task
          </button>

          {/* FILTER TOOLBAR (blue area) */}
          <div className="filterBar">
            <input
              className="filterSearch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title…"
            />

            <select
              className="filterSelect"
              value={filterKey}
              onChange={(e) => {
                const k = e.target.value;
                setFilterKey(k);
                setFilterValue("");

                // sensible defaults per type
                if (k === "title" || k === "description") setFilterOp("contains");
                else if (k === "status" || k === "urgency") setFilterOp("equals");
                else if (k === "dependencies") setFilterOp("contains");
                else if (k === "deadline" || k === "creation_date") setFilterOp("after");
                else setFilterOp(">=");
              }}
            >
              <option value="status">Status</option>
              <option value="urgency">Urgency</option>
              <option value="deadline">Deadline</option>
              <option value="creation_date">Created</option>
              <option value="hours_left_until_deadline">Hours left</option>
              <option value="importance">Importance</option>
              <option value="effort">Effort</option>
              <option value="dependencies">Dependencies</option>
              <option value="title">Title</option>
              <option value="description">Description</option>
            </select>

            <select className="filterSelect" value={filterOp} onChange={(e) => setFilterOp(e.target.value)}>
              {(filterKey === "title" || filterKey === "description") && (
                <>
                  <option value="contains">contains</option>
                  <option value="equals">equals</option>
                  <option value="starts_with">starts with</option>
                  <option value="ends_with">ends with</option>
                  <option value="is_empty">is empty</option>
                  <option value="is_not_empty">is not empty</option>
                </>
              )}

              {(filterKey === "status" || filterKey === "urgency") && (
                <>
                  <option value="equals">equals</option>
                  <option value="not_equals">not equals</option>
                </>
              )}

              {(filterKey === "importance" || filterKey === "effort" || filterKey === "hours_left_until_deadline") && (
                <>
                  <option value="=">=</option>
                  <option value="!=">!=</option>
                  <option value=">">&gt;</option>
                  <option value=">=">&gt;=</option>
                  <option value="<">&lt;</option>
                  <option value="<=">&lt;=</option>
                </>
              )}

              {(filterKey === "deadline" || filterKey === "creation_date") && (
                <>
                  <option value="on">on</option>
                  <option value="before">before</option>
                  <option value="after">after</option>
                  <option value="is_empty">is empty</option>
                  <option value="is_not_empty">is not empty</option>
                </>
              )}

              {filterKey === "dependencies" && (
                <>
                  <option value="contains">contains</option>
                  <option value="has_any">has any</option>
                  <option value="has_none">has none</option>
                </>
              )}
            </select>

            {/* Value input changes by attribute */}
            {["is_empty", "is_not_empty", "has_any", "has_none"].includes(filterOp) ? (
              <span className="filterNoValue">no value</span>
            ) : filterKey === "status" ? (
              <select className="filterSelect" value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
                <option value="">Choose…</option>
                <option value="ready">ready</option>
                <option value="in_progress">in progress</option>
                <option value="blocked">blocked</option>
                <option value="review">review</option>
                <option value="backlog">backlog</option>
                <option value="overdue">overdue</option>
              </select>
            ) : filterKey === "urgency" ? (
              <select className="filterSelect" value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
                <option value="">Choose…</option>
                <option value="overdue">overdue</option>
                <option value="due_soon">due soon</option>
                <option value="due_today">due today</option>
                <option value="plenty">plenty</option>
                <option value="unknown">unknown</option>
              </select>
            ) : filterKey === "deadline" || filterKey === "creation_date" ? (
              <input
                className="filterInput"
                type="date"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
              />
            ) : filterKey === "importance" || filterKey === "effort" || filterKey === "hours_left_until_deadline" ? (
              <input
                className="filterInput"
                type="number"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="number"
              />
            ) : (
              <input
                className="filterInput"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="value…"
              />
            )}

            <span className="filterCount">{filteredTasks.length} shown</span>
          </div>

          {/* Task Cards */}
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} status={task.status} />
          ))}
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreateTask} />
    </div>
  );
}