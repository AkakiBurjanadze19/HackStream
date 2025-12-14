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
export default function TaskPriorityGraphD3({ 
  tasks = [], 
  onNodeClick, 
  fullscreen = false,
  simulationCompletedTaskIds = new Set(),
  simulationIsPlaying = false,
  simulationExecutionOrder = [],
}) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [wrapWidth, setWrapWidth] = useState(800);
  const [wrapHeight, setWrapHeight] = useState(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries?.[0]?.contentRect;
      if (rect) {
        if (rect.width) setWrapWidth(rect.width);
        if (fullscreen && rect.height) setWrapHeight(rect.height);
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [fullscreen]);

  // Highest -> lowest (descending)
  const sorted = useMemo(() => {
    const arr = [...tasks].map((t) => ({
      ...t,
      // Use computed priority (which is already calculated in normalizeTasks)
      // Clamp to 0-5 range for visualization purposes, but keep original value for sorting
      _p: clamp(toNum(t?.computedPriority ?? t?.priority ?? t?.importance, 0), 0, 5),
      _pOriginal: toNum(t?.computedPriority ?? t?.priority ?? t?.importance, 0),
    }));
    // Sort by original computed priority (not clamped) for accurate ordering
    arr.sort((a, b) => b._pOriginal - a._pOriginal);
    return arr;
  }, [tasks]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);

    // Scale up spacing and node size in fullscreen mode
    const scale = fullscreen && wrapHeight ? Math.min(2.0, Math.max(1.0, (wrapHeight - 40) / 400)) : 1.0;
    const padX = 26 * scale;
    const padY = 22 * scale;
    const nodeSize = 64 * scale;
    const gapX = 80 * scale; // Increased from 44 to 60, now 80
    const gapY = 50 * scale; // Increased from 24 to 36, now 50

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
        // Support both dependsOn (IDs) and dependencies (names/IDs)
        const deps = Array.isArray(t.dependsOn) 
          ? t.dependsOn.map(String)
          : Array.isArray(t.dependencies)
          ? t.dependencies.map(String) // Try dependencies as fallback
          : [];
        const unmet = deps.filter((id) => {
          const depTask = byId.get(id);
          return depTask && !isDone(depTask);
        });
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

    const contentWidth = Math.max(
      520,
      padX * 2 + colCount * nodeSize + Math.max(0, colCount - 1) * gapX
    );
    const contentHeight = padY * 2 + maxInCol * nodeSize + Math.max(0, maxInCol - 1) * gapY + 18;
    
    // Always set viewBox to match content dimensions exactly
    svg.attr("viewBox", `0 0 ${contentWidth} ${contentHeight}`);
    
    // Set SVG dimensions
    // In fullscreen, use 100% height to fill container; otherwise use contentHeight
    if (fullscreen) {
      svg.attr("width", "100%").attr("height", "100%");
    } else {
      svg.attr("width", "100%").attr("height", contentHeight);
    }

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
      .attr("fill", "#FFFFFF");

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
      const dx = Math.max(36 * scale, (e.x2 - e.x1) * 0.55);
      return `M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2} ${e.y2}`;
    };

    const t = d3.transition().duration(420).ease(d3.easeCubicOut);

    // Draw spines
    const spineJoin = gLinks
      .selectAll("line.spine")
      .data(spines, (d) => d.id);
    
    spineJoin
      .join(
        (enter) =>
          enter
            .append("line")
            .attr("class", "spine")
            .attr("x1", (d) => d.x)
            .attr("x2", (d) => d.x)
            .attr("y1", (d) => d.y1)
            .attr("y2", (d) => d.y2)
            .attr("stroke", "#FFFFFF")
            .style("stroke", "#FFFFFF")
            .attr("stroke-width", 3.5)
            .attr("stroke-linecap", "round")
            .attr("opacity", 0)
            .call((sel) => sel.transition(t).attr("opacity", 1)),
        (update) => update,
        (exit) => exit.call((sel) => sel.transition(t).attr("opacity", 0).remove())
      )
      // Always set attributes after join to prevent any resets
      .attr("x1", (d) => d.x)
      .attr("x2", (d) => d.x)
      .attr("y1", (d) => d.y1)
      .attr("y2", (d) => d.y2)
      .attr("stroke", "#FFFFFF")
      .style("stroke", "#FFFFFF")
      .attr("stroke-width", 3.5)
      .attr("stroke-linecap", "round");

    // Draw arrow edges
    const edgeJoin = gLinks
      .selectAll("path.edge")
      .data(edges, (d) => d.id);
    
    edgeJoin
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "edge")
            .attr("d", (d) => edgePath(d))
            .attr("fill", "none")
            .attr("stroke", "#FFFFFF")
            .style("stroke", "#FFFFFF")
            .attr("stroke-width", 4)
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .attr("marker-end", "url(#arrow)")
            .attr("opacity", 0)
            .call((sel) => sel.transition(t).attr("opacity", 1)),
        (update) => update,
        (exit) => exit.call((sel) => sel.transition(t).attr("opacity", 0).remove())
      )
      // Always set attributes after join to prevent any resets
      .attr("d", (d) => edgePath(d))
      .attr("stroke", "#FFFFFF")
      .style("stroke", "#FFFFFF")
      .attr("stroke-width", 4)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("marker-end", "url(#arrow)");

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
      .attr("stroke", "rgba(148,163,184,0.30)")
      .attr("stroke-width", 2);

    // Add simulation indicator overlay (pulsing border for executing task)
    nodeEnter
      .append("rect")
      .attr("class", "simulation-indicator")
      .attr("x", -4)
      .attr("y", -4)
      .attr("width", nodeSize + 8)
      .attr("height", nodeSize + 8)
      .attr("rx", 20)
      .attr("fill", "none")
      .attr("stroke-width", 4)
      .attr("opacity", 0)
      .attr("pointer-events", "none");

    // Add checkmark for completed tasks (positioned in bottom-right corner to avoid overlap)
    nodeEnter
      .append("text")
      .attr("class", "completion-checkmark")
      .attr("x", nodeSize - 8)
      .attr("y", nodeSize - 8)
      .attr("font-size", 22)
      .attr("font-weight", 950)
      .attr("fill", "#22C55E")
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "text-after-edge")
      .attr("stroke", "#15803D")
      .attr("stroke-width", 0.5)
      .attr("stroke-linejoin", "round")
      .attr("paint-order", "stroke fill")
      .attr("opacity", 0)
      .attr("pointer-events", "none")
      .text("✓");

    // Add execution number badge for next tasks (positioned in top-right corner)
    nodeEnter
      .append("circle")
      .attr("class", "execution-badge")
      .attr("cx", nodeSize - 8)
      .attr("cy", 8)
      .attr("r", 9)
      .attr("fill", "#6366F1")
      .attr("opacity", 0)
      .attr("pointer-events", "none");

    nodeEnter
      .append("text")
      .attr("class", "execution-number")
      .attr("x", nodeSize - 8)
      .attr("y", 12)
      .attr("text-anchor", "middle")
      .attr("font-size", 9)
      .attr("font-weight", 950)
      .attr("fill", "#FFFFFF")
      .attr("opacity", 0)
      .attr("pointer-events", "none");

    nodeEnter
      .append("rect")
      .attr("class", "inner")
      .attr("x", 6)
      .attr("y", 6)
      .attr("width", nodeSize - 12)
      .attr("height", nodeSize - 12)
      .attr("rx", 10)
      .attr("fill", "rgba(15,23,42,0.85)")
      .attr("stroke", "rgba(148,163,184,0.25)")
      .attr("stroke-width", 1);

    nodeEnter
      .append("text")
      .attr("class", "label")
      .attr("x", nodeSize / 2)
      .attr("y", nodeSize / 2 + 6)
      .attr("text-anchor", "middle")
      .attr("font-size", 16)
      .attr("font-weight", 900)
      .attr("fill", "#F1F5F9")
      .style("letter-spacing", "0.8px")
      .text((d) => threeLetters(d.task?.title));

    // Create tooltip container if it doesn't exist
    let tooltip = d3.select("body").select(".graph-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body")
        .append("div")
        .attr("class", "graph-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", 1000);
    }

    nodeJoin
      .merge(nodeEnter)
      .on("mouseover", function(event, d) {
        const [mouseX, mouseY] = d3.pointer(event, svgEl);
        const svgRect = svgEl.getBoundingClientRect();
        const tooltipContent = formatTooltipContent(d);
        
        tooltip.html(tooltipContent);
        
        // Position tooltip with smart positioning to avoid viewport edges
        const tooltipNode = tooltip.node();
        if (tooltipNode) {
          // Temporarily show to measure
          tooltip.style("opacity", 0).style("visibility", "hidden");
          const tooltipRect = tooltipNode.getBoundingClientRect();
          const offsetX = 15;
          const offsetY = -10;
          
          let left = svgRect.left + mouseX + offsetX;
          let top = svgRect.top + mouseY + offsetY;
          
          // Adjust if tooltip would go off right edge
          if (left + tooltipRect.width > window.innerWidth - 10) {
            left = svgRect.left + mouseX - tooltipRect.width - offsetX;
          }
          
          // Adjust if tooltip would go off bottom edge
          if (top + tooltipRect.height > window.innerHeight - 10) {
            top = svgRect.top + mouseY - tooltipRect.height - offsetY;
          }
          
          // Ensure tooltip doesn't go off left or top edges
          left = Math.max(10, left);
          top = Math.max(10, top);
          
          tooltip
            .style("left", `${left}px`)
            .style("top", `${top}px`)
            .style("visibility", "visible")
            .transition()
            .duration(200)
            .style("opacity", 1);
        }
      })
      .on("mousemove", function(event, d) {
        const [mouseX, mouseY] = d3.pointer(event, svgEl);
        const svgRect = svgEl.getBoundingClientRect();
        const tooltipNode = tooltip.node();
        
        if (tooltipNode) {
          const tooltipRect = tooltipNode.getBoundingClientRect();
          const offsetX = 15;
          const offsetY = -10;
          
          let left = svgRect.left + mouseX + offsetX;
          let top = svgRect.top + mouseY + offsetY;
          
          // Adjust if tooltip would go off right edge
          if (left + tooltipRect.width > window.innerWidth - 10) {
            left = svgRect.left + mouseX - tooltipRect.width - offsetX;
          }
          
          // Adjust if tooltip would go off bottom edge
          if (top + tooltipRect.height > window.innerHeight - 10) {
            top = svgRect.top + mouseY - tooltipRect.height - offsetY;
          }
          
          // Ensure tooltip doesn't go off left or top edges
          left = Math.max(10, left);
          top = Math.max(10, top);
          
          tooltip
            .style("left", `${left}px`)
            .style("top", `${top}px`);
        }
      })
      .on("mouseout", function() {
        tooltip
          .transition()
          .duration(150)
          .style("opacity", 0)
          .on("end", function() {
            tooltip.style("visibility", "hidden");
          });
      })
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

    // Update simulation indicators
    const currentTaskId = simulationIsPlaying && simulationExecutionOrder.length > 0 
      ? String(simulationExecutionOrder[0]?.id) 
      : null;
    
    const simulationIndicator = nodeJoin
      .merge(nodeEnter)
      .select("rect.simulation-indicator");
    
    simulationIndicator
      .attr("stroke", (d) => {
        const id = String(d.task?.id);
        if (currentTaskId === id) return "#6366F1"; // Currently executing - blue pulsing
        if (simulationExecutionOrder.slice(1, 4).some(t => String(t.id) === id)) return "#F59E0B"; // Next 3 tasks - orange
        return "transparent";
      })
      .attr("opacity", (d) => {
        const id = String(d.task?.id);
        if (currentTaskId === id) return 0.8; // Will be animated
        if (simulationExecutionOrder.slice(1, 4).some(t => String(t.id) === id)) return 0.6; // Dim for next
        return 0;
      })
      .style("stroke-dasharray", (d) => {
        const id = String(d.task?.id);
        return currentTaskId === id ? "8 4" : "none";
      });

    // Add pulsing animation for currently executing task
    if (simulationIsPlaying && currentTaskId) {
      const currentIndicator = simulationIndicator.filter((d) => String(d.task?.id) === currentTaskId);
      if (!currentIndicator.empty()) {
        // Stop any existing animation
        currentIndicator.interrupt();
        // Start pulsing animation
        const pulse = () => {
          currentIndicator
            .transition()
            .duration(1000)
            .ease(d3.easeSinInOut)
            .attr("opacity", 0.3)
            .transition()
            .duration(1000)
            .ease(d3.easeSinInOut)
            .attr("opacity", 0.9)
            .on("end", pulse);
        };
        pulse();
      }
    } else {
      // Stop animation when not playing
      simulationIndicator.interrupt();
    }

    // Update completion checkmark
    nodeJoin
      .merge(nodeEnter)
      .select("text.completion-checkmark")
      .attr("opacity", (d) => {
        const id = String(d.task?.id);
        return simulationCompletedTaskIds.has(id) ? 1 : 0;
      });

    // Update execution number badges for next tasks
    nodeJoin
      .merge(nodeEnter)
      .select("circle.execution-badge")
      .attr("opacity", (d) => {
        const id = String(d.task?.id);
        if (currentTaskId === id) return 0; // Don't show badge on current
        const nextIndex = simulationExecutionOrder.findIndex(t => String(t.id) === id);
        return nextIndex > 0 && nextIndex <= 3 ? 1 : 0; // Show for next 3 tasks
      });

    nodeJoin
      .merge(nodeEnter)
      .select("text.execution-number")
      .attr("opacity", (d) => {
        const id = String(d.task?.id);
        if (currentTaskId === id) return 0;
        const nextIndex = simulationExecutionOrder.findIndex(t => String(t.id) === id);
        return nextIndex > 0 && nextIndex <= 3 ? 1 : 0;
      })
      .text((d) => {
        const id = String(d.task?.id);
        const nextIndex = simulationExecutionOrder.findIndex(t => String(t.id) === id);
        return nextIndex > 0 ? nextIndex : "";
      });

    nodeJoin.exit().call((sel) => sel.transition(t).attr("opacity", 0).remove());
  }, [sorted, wrapWidth, wrapHeight, fullscreen, onNodeClick, simulationCompletedTaskIds, simulationIsPlaying, simulationExecutionOrder]);

  // Separate effect to force edge colors after render - runs after main effect
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    
    // Use requestAnimationFrame to ensure this runs after D3 updates
    requestAnimationFrame(() => {
      const svg = d3.select(svgEl);
      const gLinks = svg.select("g.zoomLayer g.links");
      
      if (gLinks.empty()) return;
      
      // Force white stroke on all edges and spines (don't interrupt opacity transitions)
      gLinks.selectAll("line.spine")
        .attr("stroke", "#FFFFFF")
        .style("stroke", "#FFFFFF");
      gLinks.selectAll("path.edge")
        .attr("stroke", "#FFFFFF")
        .style("stroke", "#FFFFFF");
    });
  }, [sorted, wrapWidth, wrapHeight, fullscreen]);

  return (
    <div style={{ ...styles.card, ...(fullscreen ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } : {}) }}>
      <div style={styles.header}>
        <div>
          <div style={styles.hTitle}>Status Flow (D3)</div>
          <div style={styles.hSub}>
            Highest → lowest priority. Only tasks with unmet dependencies become <b>Restricted</b>.
          </div>
        </div>
        <Legend />
      </div>

      <div ref={wrapRef} style={{ ...styles.graphWrap, ...(fullscreen ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } : {}) }}>
        <svg 
          ref={svgRef} 
          width="100%" 
          style={styles.svg}
          className="task-graph-svg"
          preserveAspectRatio="xMidYMid meet"
        />
        {sorted.length === 0 && <div style={styles.empty}>No tasks yet — add tasks to see the flow.</div>}
      </div>
    </div>
  );
}

/* helpers */

function formatTooltipContent(d) {
  const title = d.task?.title ?? "Untitled";
  const raw = prettyStatus(normalizeStatus(d.task?.status));
  const eff = prettyStatus(String(d.effectiveStatus ?? ""));
  const depCount = Array.isArray(d.task?.dependsOn) ? d.task.dependsOn.length : 0;
  const blockedReason = d.blockedReason;
  
  const statusColor = {
    "Done": "rgba(34,197,94,0.85)",
    "On going": "rgba(250,204,21,0.90)",
    "Yet to be done": "rgba(146,64,14,0.80)",
    "Restricted": "rgba(239,68,68,0.85)"
  }[eff] || "rgba(148,163,184,0.80)";
  
  let html = `
    <div style="padding: 16px; min-width: 280px;">
      <div style="font-size: 16px; font-weight: 950; color: #F1F5F9; margin-bottom: 12px; line-height: 1.3;">
        ${escapeHtml(title)}
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 12px; font-weight: 700; color: #94A3B8; min-width: 70px;">Status:</span>
          <span style="font-size: 13px; font-weight: 900; color: #F1F5F9;">${raw}</span>
        </div>
        ${eff !== raw ? `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 12px; font-weight: 700; color: #94A3B8; min-width: 70px;">Effective:</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 999px; background: ${statusColor}; box-shadow: 0 0 8px ${statusColor}40;"></span>
              <span style="font-size: 13px; font-weight: 900; color: #F1F5F9;">${eff}</span>
            </div>
          </div>
        ` : ""}
        ${depCount > 0 ? `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 12px; font-weight: 700; color: #94A3B8; min-width: 70px;">Dependencies:</span>
            <span style="font-size: 13px; font-weight: 900; color: #F1F5F9;">${depCount}</span>
          </div>
        ` : ""}
        ${blockedReason ? `
          <div style="margin-top: 4px; padding-top: 10px; border-top: 1px solid rgba(148,163,184,0.20);">
            <div style="font-size: 11.5px; font-weight: 700; color: rgba(239,68,68,0.90); margin-bottom: 4px;">⚠️ Blocked</div>
            <div style="font-size: 12px; color: #94A3B8; line-height: 1.4;">${escapeHtml(blockedReason)}</div>
          </div>
        ` : ""}
      </div>
    </div>
  `;
  return html;
}

function escapeHtml(text) {
  if (typeof text !== "string") return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
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
  base: "#334155",
  surface: "#1E293B",
  surface2: "#334155",
  text: "#F1F5F9",
  muted: "#94A3B8",
  shadowSoft: "0 12px 35px rgba(0, 0, 0, 0.30)",
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
    background: "#0F172A",
    padding: 10,
    overflow: "hidden",
  },
  svg: { 
    display: "block",
    // Ensure edge colors are white
    "& line.spine, & path.edge": {
      stroke: "#FFFFFF !important",
    },
  },
  empty: { padding: 12, fontSize: 13, color: c.muted, textAlign: "center" },
};
