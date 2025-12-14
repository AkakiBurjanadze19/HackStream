import { useState, useEffect, useRef, useMemo } from "react";

const STORAGE_KEY = "hackstream_chatbot";

// Load chatbot conversations from localStorage
const loadChatbotMessages = (workspaceId) => {
  if (!workspaceId) return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const allConversations = JSON.parse(stored);
      const workspaceMessages = allConversations[workspaceId];
      if (workspaceMessages && Array.isArray(workspaceMessages)) {
        // Convert timestamp strings back to Date objects
        return workspaceMessages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        }));
      }
    }
  } catch (error) {
    console.error("Error loading chatbot messages:", error);
  }
  return [];
};

// Save chatbot conversations to localStorage
const saveChatbotMessages = (workspaceId, messages) => {
  if (!workspaceId) return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const allConversations = stored ? JSON.parse(stored) : {};
    allConversations[workspaceId] = messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allConversations));
  } catch (error) {
    console.error("Error saving chatbot messages:", error);
  }
};

export default function TaskChatbot({ 
  tasks = [], 
  workspaceId,
  calculateComputedPriority, 
  calculateEffectiveStatus,
  open,
  onClose 
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load saved messages when opened
  useEffect(() => {
    if (open && workspaceId) {
      const savedMessages = loadChatbotMessages(workspaceId);
      if (savedMessages.length > 0) {
        setMessages(savedMessages);
      } else {
        // Initialize with welcome message if no saved messages
        setMessages([{
          id: Date.now(),
          role: "assistant",
          content: "👋 Hi! I'm your task assistant. I can help you:\n\n• Find high-priority tasks\n• Recommend what to work on next\n• Identify urgent or overdue tasks\n• Suggest tasks based on dependencies\n\nWhat would you like to know?",
          timestamp: new Date(),
        }]);
      }
    }
  }, [open, workspaceId]);

  // Save messages whenever they change
  useEffect(() => {
    if (workspaceId && messages.length > 0) {
      saveChatbotMessages(workspaceId, messages);
    }
  }, [messages, workspaceId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open && !showClearConfirm) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, showClearConfirm]);

  // Handle Escape key to close confirmation modal
  useEffect(() => {
    if (!showClearConfirm) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        cancelClearConversation();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showClearConfirm]);

  // Calculate task analysis
  const taskAnalysis = useMemo(() => {
    if (tasks.length === 0) return null;

    const analyzed = tasks.map((task) => {
      const { effectiveStatus } = calculateEffectiveStatus(task, tasks);
      const isBlocked = effectiveStatus === "restricted";
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
      
      return {
        ...task,
        importance,
        effort,
        hoursUntilDeadline,
        urgency,
        computedPriority: Number.isFinite(computedPriority) ? computedPriority : 0,
        isBlocked,
        effectiveStatus,
      };
    });

    const sorted = [...analyzed].sort((a, b) => {
      if (a.isBlocked !== b.isBlocked) return a.isBlocked ? 1 : -1;
      return b.computedPriority - a.computedPriority;
    });

    const available = sorted.filter(t => !t.isBlocked && t.effectiveStatus !== "done");
    const blocked = sorted.filter(t => t.isBlocked);
    const done = sorted.filter(t => t.effectiveStatus === "done");
    const overdue = sorted.filter(t => t.hoursUntilDeadline <= 0 && t.effectiveStatus !== "done");
    const urgent = sorted.filter(t => t.hoursUntilDeadline > 0 && t.hoursUntilDeadline <= 24 && t.effectiveStatus !== "done");

    return {
      all: sorted,
      available,
      blocked,
      done,
      overdue,
      urgent,
      topPriority: available[0],
    };
  }, [tasks, calculateEffectiveStatus]);

  // Generate response based on user input
  const generateResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase().trim();
    const analysis = taskAnalysis;

    if (!analysis || analysis.all.length === 0) {
      return "I don't see any tasks in your workspace yet. Create some tasks first, and I'll help you prioritize them!";
    }

    // Handle different query types
    if (lowerMessage.includes("recommend") || lowerMessage.includes("what should") || lowerMessage.includes("what to do") || lowerMessage.includes("next")) {
      if (analysis.topPriority) {
        const task = analysis.topPriority;
        const reasons = [];
        if (task.computedPriority > 0.5) reasons.push("high priority");
        if (task.hoursUntilDeadline > 0 && task.hoursUntilDeadline <= 24) reasons.push("urgent deadline");
        if (task.hoursUntilDeadline <= 0) reasons.push("overdue");
        if (task.effort <= 2) reasons.push("low effort");
        
        return `🎯 I recommend working on: **${task.title}**\n\n` +
               `Priority: ${task.computedPriority.toFixed(4)}\n` +
               `Importance: ${task.importance}/5 | Effort: ${task.effort}/5\n` +
               (task.hoursUntilDeadline > 0 
                 ? `Deadline: ${Math.round(task.hoursUntilDeadline)} hours\n`
                 : `⚠️ Overdue!\n`) +
               (reasons.length > 0 ? `\nWhy: ${reasons.join(", ")}` : "");
      }
      return "All available tasks are completed! 🎉";
    }

    if (lowerMessage.includes("high priority") || lowerMessage.includes("highest priority")) {
      const top3 = analysis.available.slice(0, 3);
      if (top3.length === 0) {
        return "No high-priority tasks available right now.";
      }
      return `📊 Top ${top3.length} high-priority tasks:\n\n` +
             top3.map((t, i) => 
               `${i + 1}. **${t.title}** (Priority: ${t.computedPriority.toFixed(4)})`
             ).join("\n");
    }

    if (lowerMessage.includes("urgent") || lowerMessage.includes("deadline")) {
      if (analysis.urgent.length === 0 && analysis.overdue.length === 0) {
        return "No urgent tasks right now! ✅";
      }
      let response = "";
      if (analysis.overdue.length > 0) {
        response += `🚨 **Overdue tasks:**\n${analysis.overdue.map(t => `• ${t.title}`).join("\n")}\n\n`;
      }
      if (analysis.urgent.length > 0) {
        response += `⏰ **Urgent (due within 24h):**\n${analysis.urgent.map(t => `• ${t.title} (${Math.round(t.hoursUntilDeadline)}h left)`).join("\n")}`;
      }
      return response;
    }

    if (lowerMessage.includes("blocked") || lowerMessage.includes("dependency")) {
      if (analysis.blocked.length === 0) {
        return "No blocked tasks! All tasks are ready to work on. ✅";
      }
      return `🔒 **Blocked tasks (${analysis.blocked.length}):**\n\n` +
             analysis.blocked.map(t => {
               const deps = Array.isArray(t.dependsOn) ? t.dependsOn : [];
               return `• **${t.title}** - Waiting on ${deps.length} dependency${deps.length !== 1 ? "ies" : ""}`;
             }).join("\n");
    }

    if (lowerMessage.includes("overdue")) {
      if (analysis.overdue.length === 0) {
        return "No overdue tasks! Great job staying on top of deadlines. ✅";
      }
      return `⚠️ **Overdue tasks (${analysis.overdue.length}):**\n\n` +
             analysis.overdue.map(t => `• **${t.title}**`).join("\n");
    }

    if (lowerMessage.includes("summary") || lowerMessage.includes("overview") || lowerMessage.includes("status")) {
      return `📈 **Task Summary:**\n\n` +
             `• Total tasks: ${analysis.all.length}\n` +
             `• Available: ${analysis.available.length}\n` +
             `• Blocked: ${analysis.blocked.length}\n` +
             `• Completed: ${analysis.done.length}\n` +
             (analysis.overdue.length > 0 ? `• ⚠️ Overdue: ${analysis.overdue.length}\n` : "") +
             (analysis.urgent.length > 0 ? `• ⏰ Urgent: ${analysis.urgent.length}` : "");
    }

    if (lowerMessage.includes("help") || lowerMessage.includes("what can")) {
      return `💡 **I can help you with:**\n\n` +
             `• "What should I work on next?" - Get task recommendations\n` +
             `• "Show high priority tasks" - List top priority items\n` +
             `• "What's urgent?" - Find tasks with deadlines\n` +
             `• "Show blocked tasks" - See tasks waiting on dependencies\n` +
             `• "Give me a summary" - Overview of all tasks\n` +
             `• "What's overdue?" - List overdue tasks`;
    }

    // Default response for unrecognized queries
    return `I can help you with task recommendations! Try asking:\n\n` +
           `• "What should I work on next?"\n` +
           `• "Show high priority tasks"\n` +
           `• "What's urgent?"\n` +
           `• "Show blocked tasks"\n` +
           `• "Give me a summary"`;
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message
    const userMsg = {
      id: Date.now(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Simulate typing
    setIsTyping(true);
    
    // Generate response after a short delay
    setTimeout(() => {
      const response = generateResponse(userMessage);
      const assistantMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 500);
  };

  const handleQuickAction = (action) => {
    setInput(action);
    setTimeout(() => {
      const form = inputRef.current?.form;
      if (form) {
        const event = new Event("submit", { bubbles: true, cancelable: true });
        form.dispatchEvent(event);
      }
    }, 100);
  };

  const handleClearConversation = () => {
    setShowClearConfirm(true);
  };

  const confirmClearConversation = () => {
    setMessages([{
      id: Date.now(),
      role: "assistant",
      content: "👋 Hi! I'm your task assistant. I can help you:\n\n• Find high-priority tasks\n• Recommend what to work on next\n• Identify urgent or overdue tasks\n• Suggest tasks based on dependencies\n\nWhat would you like to know?",
      timestamp: new Date(),
    }]);
    if (workspaceId) {
      saveChatbotMessages(workspaceId, []);
    }
    setShowClearConfirm(false);
  };

  const cancelClearConversation = () => {
    setShowClearConfirm(false);
  };

  if (!open) return null;

  return (
    <>
      {/* Clear Conversation Confirmation Modal */}
      {showClearConfirm && (
        <div style={styles.confirmOverlay} onMouseDown={cancelClearConversation} role="dialog" aria-modal="true">
          <div style={styles.confirmModal} onMouseDown={(e) => e.stopPropagation()}>
            <div style={styles.confirmHeader}>
              <div style={styles.confirmTitle}>Clear Conversation?</div>
              <button
                type="button"
                onClick={cancelClearConversation}
                style={styles.confirmCloseBtn}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div style={styles.confirmContent}>
              <div style={styles.confirmMessage}>
                Are you sure you want to clear this conversation? This action cannot be undone.
              </div>
            </div>
            <div style={styles.confirmActions}>
              <button
                type="button"
                onClick={cancelClearConversation}
                style={styles.confirmCancelBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = c.surface2;
                  e.currentTarget.style.borderColor = c.border;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = c.surface;
                  e.currentTarget.style.borderColor = c.base;
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearConversation}
                style={styles.confirmDeleteBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#DC2626";
                  e.currentTarget.style.borderColor = "#DC2626";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(239, 68, 68, 0.40)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#EF4444";
                  e.currentTarget.style.borderColor = "#EF4444";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.30)";
                }}
              >
                Clear Conversation
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.overlay} onMouseDown={onClose} role="dialog" aria-modal="true">
      <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Task Assistant</div>
            <div style={styles.subtitle}>Get recommendations based on priorities</div>
          </div>
          <div style={styles.headerActions}>
            <button
              type="button"
              onClick={handleClearConversation}
              style={styles.clearBtn}
              title="Clear conversation"
              aria-label="Clear conversation"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = c.surface2;
                e.currentTarget.style.borderColor = "#EF4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = c.surface;
                e.currentTarget.style.borderColor = c.base;
              }}
            >
              🗑️
            </button>
            <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        <div style={styles.messagesContainer}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.message,
                ...(msg.role === "user" ? styles.userMessage : styles.assistantMessage),
              }}
            >
              <div style={styles.messageContent}>
                {msg.content.split("\n").map((line, i) => (
                  <div key={i} style={i > 0 ? { marginTop: 6 } : {}}>
                    {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                      if (part.startsWith("**") && part.endsWith("**")) {
                        return <strong key={j}>{part.slice(2, -2)}</strong>;
                      }
                      return <span key={j}>{part}</span>;
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ ...styles.message, ...styles.assistantMessage }}>
              <div style={styles.typingIndicator}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: c.muted,
                  display: "inline-block",
                  animation: "typing 1.4s infinite",
                }}></span>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: c.muted,
                  display: "inline-block",
                  animation: "typing 1.4s infinite 0.2s",
                }}></span>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: c.muted,
                  display: "inline-block",
                  animation: "typing 1.4s infinite 0.4s",
                }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.quickActions}>
          <button
            type="button"
            onClick={() => handleQuickAction("What should I work on next?")}
            style={styles.quickBtn}
          >
            What's next?
          </button>
          <button
            type="button"
            onClick={() => handleQuickAction("Show high priority tasks")}
            style={styles.quickBtn}
          >
            High priority
          </button>
          <button
            type="button"
            onClick={() => handleQuickAction("What's urgent?")}
            style={styles.quickBtn}
          >
            Urgent
          </button>
          <button
            type="button"
            onClick={() => handleQuickAction("Give me a summary")}
            style={styles.quickBtn}
          >
            Summary
          </button>
        </div>

        <form onSubmit={handleSend} style={styles.inputContainer}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me about your tasks..."
            style={styles.input}
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            style={{
              ...styles.sendButton,
              ...((!input.trim() || isTyping) ? styles.sendButtonDisabled : {}),
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
    </>
  );
}

const c = {
  base: "#334155",
  surface: "#1E293B",
  surface2: "#334155",
  text: "#F1F5F9",
  muted: "#94A3B8",
  accent: "#6366F1",
  accentSoft: "rgba(99, 102, 241, 0.20)",
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
    zIndex: 100,
  },
  modal: {
    width: "min(600px, 100%)",
    height: "min(700px, 90vh)",
    background: c.surface,
    color: c.text,
    borderRadius: 20,
    border: `1px solid ${c.base}`,
    boxShadow: c.shadow,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderBottom: `1px solid ${c.base}`,
    background: `linear-gradient(180deg, ${c.surface} 0%, ${c.surface2} 100%)`,
    flexShrink: 0,
  },
  headerActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  clearBtn: {
    border: `1px solid ${c.base}`,
    background: c.surface,
    borderRadius: 14,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 900,
    color: c.text,
    fontSize: 14,
    transition: "all 0.2s ease",
  },
  title: {
    fontSize: 18,
    fontWeight: 950,
    letterSpacing: 0.2,
    color: c.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: c.muted,
    lineHeight: 1.4,
  },
  closeBtn: {
    border: `1px solid ${c.base}`,
    background: c.surface,
    borderRadius: 14,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 900,
    color: c.text,
    fontSize: 14,
  },
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  message: {
    maxWidth: "85%",
    padding: "12px 16px",
    borderRadius: 16,
    fontSize: 14,
    lineHeight: 1.5,
  },
  userMessage: {
    alignSelf: "flex-end",
    background: c.accent,
    color: "#fff",
  },
  assistantMessage: {
    alignSelf: "flex-start",
    background: c.surface2,
    border: `1px solid ${c.base}`,
    color: c.text,
  },
  messageContent: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  typingIndicator: {
    display: "flex",
    gap: 4,
  },
  quickActions: {
    display: "flex",
    gap: 8,
    padding: "12px 16px",
    borderTop: `1px solid ${c.base}`,
    borderBottom: `1px solid ${c.base}`,
    background: c.surface2,
    flexWrap: "wrap",
    flexShrink: 0,
  },
  quickBtn: {
    padding: "6px 12px",
    borderRadius: 12,
    border: `1px solid ${c.base}`,
    background: c.surface,
    color: c.text,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  inputContainer: {
    display: "flex",
    gap: 10,
    padding: 16,
    borderTop: `1px solid ${c.base}`,
    background: c.surface2,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: 14,
    border: `1px solid ${c.base}`,
    background: c.surface,
    color: c.text,
    fontSize: 14,
    outline: "none",
  },
  sendButton: {
    padding: "10px 20px",
    borderRadius: 14,
    border: `1px solid ${c.accent}`,
    background: c.accent,
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  sendButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  // Confirmation Modal Styles
  confirmOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 200,
    backdropFilter: "blur(4px)",
  },
  confirmModal: {
    width: "min(420px, 100%)",
    background: c.surface,
    color: c.text,
    borderRadius: 20,
    border: `1px solid ${c.base}`,
    boxShadow: "0 24px 70px rgba(0, 0, 0, 0.60)",
    overflow: "hidden",
  },
  confirmHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottom: `1px solid ${c.base}`,
    background: `linear-gradient(180deg, ${c.surface} 0%, ${c.surface2} 100%)`,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 950,
    letterSpacing: 0.2,
    color: c.text,
  },
  confirmCloseBtn: {
    border: `1px solid ${c.base}`,
    background: c.surface,
    borderRadius: 14,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 900,
    color: c.text,
    fontSize: 14,
  },
  confirmContent: {
    padding: 20,
  },
  confirmMessage: {
    fontSize: 14,
    lineHeight: 1.6,
    color: c.text,
  },
  confirmActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    padding: 16,
    borderTop: `1px solid ${c.base}`,
    background: c.surface2,
  },
  confirmCancelBtn: {
    padding: "10px 20px",
    borderRadius: 14,
    border: `1px solid ${c.base}`,
    background: c.surface,
    color: c.text,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  confirmDeleteBtn: {
    padding: "10px 20px",
    borderRadius: 14,
    border: `1px solid #EF4444`,
    background: "#EF4444",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.30)",
  },
};
