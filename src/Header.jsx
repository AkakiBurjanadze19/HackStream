import { useState } from "react";

export default function Header({ brand, rightHint, onAddTask }) {
  const [hover, setHover] = useState(false);

  return (
    <header style={styles.wrap}>
      <div style={styles.inner}>
        <div style={styles.left}>
          <div style={styles.brand}>{brand}</div>
          {rightHint ? <div style={styles.hint}>{rightHint}</div> : null}
        </div>

        <button
          type="button"
          onClick={onAddTask}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{ ...styles.button, ...(hover ? styles.buttonHover : null) }}
        >
          + Add Task
        </button>
      </div>
    </header>
  );
}

const styles = {
  wrap: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    padding: "16px 16px",
    background: "rgba(8, 12, 24, 0.75)",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    backdropFilter: "blur(12px)",
  },
  inner: {
    maxWidth: 980,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  left: { display: "flex", flexDirection: "column", gap: 4 },
  brand: { fontSize: 18, fontWeight: 800, letterSpacing: 0.2 },
  hint: { fontSize: 12, opacity: 0.75 },

  button: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.92)",
    cursor: "pointer",
    fontWeight: 700,
  },
  buttonHover: {
    background: "rgba(99,102,241,0.35)",
    border: "1px solid rgba(99,102,241,0.55)",
  },
};
