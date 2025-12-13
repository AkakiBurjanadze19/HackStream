import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

/**
 * tasks: [{ id, title, priority (0..5), status: todo|ongoing|done, dependsOn?: string[] }]
 *
 * Colors based on EFFECTIVE status:
 *  - done -> green
 *  - ongoing -> yellow
 *  - todo -> brown
 *  - restricted -> red (DERIVED: unmet dependencies)
 *
 * Restriction rule (no global chain):
 *  - A task is restricted ONLY if it has dependsOn and any dependency is not done.
 *
 * Links:
 *  - spine lines inside column if multiple nodes
 *  - arrows between adjacent priority columns:
 *      each node in col i connects to ALL nodes in col i+1
 */
export default function TaskPriorityGraphD3({ tasks = [], onNodeClick }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [wrapWidth, setWrapWidth] = useState(800);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries?.[0]?.contentRect?.width;
      if (w) setWrapWidth(w);
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Highest -> lowest (descending)
  const sorted = useMemo(() => {
    const arr = [...tasks].map((t) => ({
      ...t,
      _p: clamp(toNum(t?.priority, 0), 0, 5),
    }));
    arr.sort((a, b) => b._p - a._p);
    return arr;
  }, [tasks]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);

    const padX = 26;
    const padY = 22;
    const nodeSize = 64;
    const gapX = 44;
    const gapY = 24;

    // Map for dependency checks
    const byId = new Map(sorted.map((t) => [String(t.id), t]));
    const isDone = (t) => normalizeStatus(t?.status) === "done";

    // Group by priority (equal priorities parallel)
    const groupsMap = d3.group(sorted, (d) => d._p);
    const priorities = Array.from(groupsMap.keys()).sort((a, b) => b - a);

    const groups = priorities.map((p) => {
      const items = [...(groupsMap.get(p) || [])].sort((a, b) =>
        String(a.title || "").localeCompare(String(b.title || ""))
      );

      const enriched = items.map((t) => {
        const raw = normalizeStatus(t.status);
        const deps = Array.isArray(t.dependsOn) ? t.dependsOn.map(String) : [];
        const unmet = deps.filter((id) => !isDone(byId.get(id)));
        const blockedByDeps = unmet.length > 0;

        let effectiveStatus = raw;
        if (raw !== "done" && blockedByDeps) effectiveStatus = "restricted";

        return {
          ...t,
          _effectiveStatus: effectiveStatus,
          _blockedReason: blockedByDeps
            ? `Blocked by: ${unmet
                .map((id) => byId.get(id)?.title || id)
                .slice(0, 4)
                .join(", ")}${unmet.length > 4 ? "…" : ""}`
            : null,
        };
      });

      return { p, items: enriched };
    });

    const colCount = Math.max(1, groups.length);
    const maxInCol = Math.max(1, d3.max(groups, (g) => g.items.length) || 1);

    const width = Math.max(
      520,
      padX * 2 + colCount * nodeSize + Math.max(0, colCount - 1) * gapX
    );
    const height = padY * 2 + maxInCol * nodeSize + Math.max(0, maxInCol - 1) * gapY + 18;

    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("height", height);

    // defs: gradients per STATUS + arrow marker
    const defs = svg.selectAll("defs").data([null]).join("defs");

    const grads = [
      { id: "grad_done", edge: "rgba(34,197,94,1)" },       // green
      { id: "grad_ongoing", edge: "rgba(250,204,21,1)" },   // yellow
      { id: "grad_todo", edge: "rgba(146,64,14,1)" },       // brown
      { id: "grad_restricted", edge: "rgba(239,68,68,1)" }, // red
    ];

    const gradSel = defs.selectAll("radialGradient.statusGrad").data(grads, (d) => d.id);

    const gradEnter = gradSel
      .enter()
      .append("radialGradient")
      .attr("class", "statusGrad")
      .attr("id", (d) => d.id)
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "70%");

    gradEnter.append("stop").attr("offset", "0%").attr("stop-color", "rgba(255,255,255,0)");
    gradEnter.append("stop").attr("offset", "35%").attr("stop-color", "rgba(255,255,255,0)");
    gradEnter
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", (d) => d.edge)
      .attr("stop-opacity", 0.92);

    gradSel.exit().remove();

    // Arrow marker
    const marker = defs.selectAll("marker#arrow").data([null]).join("marker");
    marker
      .attr("id", "arrow")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 9)
      .attr("refY", 5)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto");
    marker
      .selectAll("path")
      .data([null])
      .join("path")
      .attr("d", "M 0 0 L 10 5 L 0 10 z")
      .attr("fill", "rgba(107,114,128,0.70)");

    // root + zoom layer
    const root = svg.selectAll("g.root").data([null]).join("g").attr("class", "root");
    const zoomLayer = root.selectAll("g.zoomLayer").data([null]).join("g").attr("class", "zoomLayer");

    const zoomBehavior = d3
      .zoom()
      .scaleExtent([0.6, 2.6])
      .on("zoom", (event) => zoomLayer.attr("transform", event.transform));

    svg.call(zoomBehavior);

    const gLinks = zoomLayer.selectAll("g.links").data([null]).join("g").attr("class", "links");
    const gNodes = zoomLayer.selectAll("g.nodes").data([null]).join("g").attr("class", "nodes");

    // Build nodes by columns
    const columns = [];
    const nodes = [];

    groups.forEach((g, colIdx) => {
      const colX = padX + colIdx * (nodeSize + gapX);
      const count = g.items.length;

      const colHeight = count * nodeSize + Math.max(0, count - 1) * gapY;
      const maxHeight = maxInCol * nodeSize + Math.max(0, maxInCol - 1) * gapY;
      const startY = padY + (maxHeight - colHeight) / 2;

      const colNodes = g.items.map((t, i) => {
        const y = startY + i * (nodeSize + gapY);
        const cx = colX + nodeSize / 2;
        const cy = y + nodeSize / 2;

        const n = {
          id: String(t.id),
          task: t,
          effectiveStatus: t._effectiveStatus,
          blockedReason: t._blockedReason,
          x: colX,
          y,
          cx,
          cy,
          colIdx,
          p: g.p,
        };
        nodes.push(n);
        return n;
      });

      columns.push({ colIdx, p: g.p, nodes: colNodes });
    });

    // SPINES for equal-priority columns
    const spines = columns
      .filter((c) => c.nodes.length > 1)
      .map((c) => {
        const ys = c.nodes.map((n) => n.cy);
        return {
          id: `spine_${c.p}`,
          x: c.nodes[0].cx,
          y1: Math.min(...ys),
          y2: Math.max(...ys),
        };
      });

    // ARROW EDGES between adjacent columns:
    // ✅ connect each node in col i to ALL nodes in col i+1
    const edges = [];
    for (let i = 0; i < columns.length - 1; i++) {
      const fromCol = columns[i];
      const toCol = columns[i + 1];
      if (!toCol?.nodes?.length) continue;

      fromCol.nodes.forEach((a) => {
        toCol.nodes.forEach((b) => {
          edges.push({
            id: `${a.id}__to__${b.id}`,
            x1: a.x + nodeSize,
            y1: a.cy,
            x2: b.x,
            y2: b.cy,
          });
        });
      });
    }

    const edgePath = (e) => {
      const dx = Math.max(36, (e.x2 - e.x1) * 0.55);
      return `M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2} ${e.y2}`;
    };

    const t = d3.transition().duration(420).ease(d3.easeCubicOut);

    // Draw spines
    gLinks
      .selectAll("line.spine")
      .data(spines, (d) => d.id)
      .join(
        (enter) =>
          enter
            .append("line")
            .attr("class", "spine")
            .attr("x1", (d) => d.x)
            .attr("x2", (d) => d.x)
            .attr("y1", (d) => d.y1)
            .attr("y2", (d) => d.y2)
            .attr("stroke", "rgba(107,114,128,0.45)")
            .attr("stroke-width", 2)
            .attr("stroke-linecap", "round")
            .attr("opacity", 0)
            .call((sel) => sel.transition(t).attr("opacity", 1)),
        (update) =>
          update.call((sel) =>
            sel
              .transition(t)
              .attr("x1", (d) => d.x)
              .attr("x2", (d) => d.x)
              .attr("y1", (d) => d.y1)
              .attr("y2", (d) => d.y2)
          ),
        (exit) => exit.call((sel) => sel.transition(t).attr("opacity", 0).remove())
      );

    // Draw arrow edges
    gLinks
      .selectAll("path.edge")
      .data(edges, (d) => d.id)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "edge")
            .attr("d", edgePath)
            .attr("fill", "none")
            .attr("stroke", "rgba(107,114,128,0.55)")
            .attr("stroke-width", 2.25)
            .attr("stroke-linecap", "round")
            .attr("marker-end", "url(#arrow)")
            .attr("opacity", 0)
            .call((sel) => sel.transition(t).attr("opacity", 1)),
        (update) => update.call((sel) => sel.transition(t).attr("d", edgePath)),
        (exit) => exit.call((sel) => sel.transition(t).attr("opacity", 0).remove())
      );

    // Nodes
    const nodeJoin = gNodes.selectAll("g.node").data(nodes, (d) => d.id);

    const nodeEnter = nodeJoin
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer");

    nodeEnter
      .append("rect")
      .attr("class", "outer")
      .attr("width", nodeSize)
      .attr("height", nodeSize)
      .attr("rx", 16)
      .attr("fill", (d) => `url(#${gradForStatus(d.effectiveStatus)})`)
      .attr("stroke", "rgba(229,231,235,1)")
      .attr("stroke-width", 2);

    nodeEnter
      .append("rect")
      .attr("class", "inner")
      .attr("x", 6)
      .attr("y", 6)
      .attr("width", nodeSize - 12)
      .attr("height", nodeSize - 12)
      .attr("rx", 10)
      .attr("fill", "rgba(255,255,255,0.82)")
      .attr("stroke", "rgba(229,231,235,0.85)")
      .attr("stroke-width", 1);

    nodeEnter
      .append("text")
      .attr("class", "label")
      .attr("x", nodeSize / 2)
      .attr("y", nodeSize / 2 + 6)
      .attr("text-anchor", "middle")
      .attr("font-size", 16)
      .attr("font-weight", 900)
      .attr("fill", "#111827")
      .style("letter-spacing", "0.8px")
      .text((d) => threeLetters(d.task?.title));

    nodeEnter.append("title").text((d) => tooltipText(d));

    nodeJoin
      .merge(nodeEnter)
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick?.(d.task, d.effectiveStatus, d.blockedReason);
      })
      .call((sel) => sel.transition(t).attr("transform", (d) => `translate(${d.x},${d.y})`));

    nodeJoin
      .merge(nodeEnter)
      .select("rect.outer")
      .attr("fill", (d) => `url(#${gradForStatus(d.effectiveStatus)})`);

    nodeJoin.merge(nodeEnter).select("text.label").text((d) => threeLetters(d.task?.title));
    nodeJoin.merge(nodeEnter).select("title").text((d) => tooltipText(d));

    nodeJoin.exit().call((sel) => sel.transition(t).attr("opacity", 0).remove());
  }, [sorted, wrapWidth, onNodeClick]);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.hTitle}>Status Flow (D3)</div>
          <div style={styles.hSub}>
            Highest → lowest priority. Only tasks with unmet dependencies become <b>Restricted</b>.
          </div>
        </div>
        <Legend />
      </div>

      <div ref={wrapRef} style={styles.graphWrap}>
        <svg ref={svgRef} width="100%" style={styles.svg} />
        {sorted.length === 0 && <div style={styles.empty}>No tasks yet — add tasks to see the flow.</div>}
      </div>
    </div>
  );
}

/* helpers */

function tooltipText(d) {
  const title = d.task?.title ?? "Untitled";
  const p = String(d.task?.priority ?? "-");
  const raw = prettyStatus(normalizeStatus(d.task?.status));
  const eff = prettyStatus(String(d.effectiveStatus ?? ""));
  const extra = eff !== raw ? ` | effective: ${eff}` : "";
  const dep =
    Array.isArray(d.task?.dependsOn) && d.task.dependsOn.length
      ? ` | depends: ${d.task.dependsOn.length}`
      : "";
  const block = d.blockedReason ? ` | ${d.blockedReason}` : "";
  return `${title} (priority: ${p}, status: ${raw}${extra}${dep}${block})`;
}

function normalizeStatus(s) {
  const v = String(s ?? "").toLowerCase().trim();
  if (v === "done") return "done";
  if (v === "ongoing" || v === "on going" || v === "in progress") return "ongoing";
  return "todo";
}

function prettyStatus(s) {
  const v = String(s ?? "").toLowerCase().trim();
  if (v === "todo") return "Yet to be done";
  if (v === "ongoing") return "On going";
  if (v === "done") return "Done";
  return "Restricted";
}

function gradForStatus(status) {
  const s = String(status ?? "").toLowerCase().trim();
  if (s === "done") return "grad_done";
  if (s === "ongoing") return "grad_ongoing";
  if (s === "todo") return "grad_todo";
  return "grad_restricted";
}

function threeLetters(title) {
  const raw = String(title || "").replace(/[^a-zA-Z0-9]/g, "");
  const t = raw.length ? raw : "TASK";
  return t.slice(0, 3).toUpperCase();
}

function toNum(x, fallback) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/* legend */

function Legend() {
  return (
    <div style={styles.legend}>
      <LegendItem color="rgba(34,197,94,0.85)" label="Done" />
      <LegendItem color="rgba(250,204,21,0.90)" label="On going" />
      <LegendItem color="rgba(146,64,14,0.80)" label="Yet to do" />
      <LegendItem color="rgba(239,68,68,0.85)" label="Restricted" />
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div style={styles.legendItem}>
      <span style={{ ...styles.legendDot, background: color }} />
      <span style={styles.legendText}>{label}</span>
    </div>
  );
}

/* styles */

const c = {
  base: "#E5E7EB",
  surface: "#FFFFFF",
  surface2: "#F9FAFB",
  text: "#111827",
  muted: "#6B7280",
  shadowSoft: "0 12px 35px rgba(17, 24, 39, 0.08)",
};

const styles = {
  card: {
    background: c.surface,
    border: `1px solid ${c.base}`,
    borderRadius: 20,
    boxShadow: c.shadowSoft,
    padding: 14,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  hTitle: { fontSize: 14, fontWeight: 950, letterSpacing: 0.2, color: c.text },
  hSub: { marginTop: 6, fontSize: 12.5, color: c.muted, lineHeight: 1.35 },

  legend: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    background: c.surface2,
    border: `1px solid ${c.base}`,
    borderRadius: 999,
    padding: "8px 10px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  legendItem: { display: "flex", gap: 8, alignItems: "center" },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.10)",
  },
  legendText: { fontSize: 12.5, fontWeight: 900, color: c.text },

  graphWrap: {
    borderRadius: 16,
    border: `1px solid ${c.base}`,
    background: c.surface2,
    padding: 10,
    overflow: "hidden",
  },
  svg: { display: "block" },
  empty: { padding: 12, fontSize: 13, color: c.muted },
};
