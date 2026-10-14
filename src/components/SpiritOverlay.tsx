import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckSquare, MessageCircle, Send, Sparkles, Square, Trash2, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import {
  getCurrentUser,
  getUserMusicDiscs,
  getUserMusicLibrary,
  getUserSessions,
  getUserStats,
} from "../lib/supabase";

const MESSAGES = [
  "You stayed focused for so long. The bunny was quietly clapping for you!",
  "A new sprout popped up on the planet! I planted it for you, shh...",
  "Your focus turned the clouds into cotton-candy colors. I want a bite!",
  "Take a deep breath. Can you smell it? Fresh grass after the rain!",
  "Every focus session makes the soil a little richer.",
  "Hey, keep going! The stars across the galaxy are watching you.",
  "I'm a little worried about you... time to drink some water?",
  "You were glowing just now! I almost thought the sun rose early.",
  "Listen, the wind through the grass is whispering. So nice...",
  "All done?! The bunny is doing a celebration dance for you!",
  "More and more butterflies on the planet, drawn by your focus. ",
  "Your energy waves reached the next galaxy! The bunnies there say hi.",
  "Almost there, just a bit more. The miracle is coming!",
  "You look best when you're focused! I sketched it for you to see later.",
  "Let your mind settle... like a bunny in a warm, cozy nest.",
  "The planet's oxygen level rose again. That's your doing!",
];

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: number;
}

interface PetContextData {
  userId: string;
  stats: any;
  recentSessions: Array<{ duration: number; mode: string; completed_at: string }>;
  musicDiscsCount: number;
  musicLibraryCount: number;
}

const CHAT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const PET_CHAT_STORAGE_PREFIX = "pet_chat_history_v1";

export default function SpiritOverlay() {
  const [message, setMessage] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [contextData, setContextData] = useState<PetContextData | null>(null);
  const location = useLocation();
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const storageKey = useMemo(() => {
    if (!contextData?.userId) return null;
    return `${PET_CHAT_STORAGE_PREFIX}:${contextData.userId}`;
  }, [contextData?.userId]);

  const createGreeting = (): ChatMessage => ({
    id: `${Date.now()}-assistant-greet`,
    role: "assistant",
    text: "Hi hi! I'm a bunny stationed on this planet. Welcome! What would you like to share with me?",
    createdAt: Date.now(),
  });

  const getPositionClasses = () => {
    if (location.pathname === "/focus" || location.pathname === "/") {
      return "bottom-10 right-[25%] -translate-x-1/2";
    }
    if (location.pathname === "/planet") {
      return "bottom-6 right-6 scale-90";
    }
    return "bottom-10 right-10";
  };

  const pruneMessages = (messages: ChatMessage[]) => {
    const cutoff = Date.now() - CHAT_RETENTION_MS;
    return messages.filter((msg) => msg.createdAt >= cutoff);
  };

  const persistMessages = (messages: ChatMessage[]) => {
    if (!storageKey) return;
    const next = pruneMessages(messages);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const loadMessages = (key: string) => {
    const raw = localStorage.getItem(key);
    if (!raw) return [] as ChatMessage[];
    try {
      const parsed = JSON.parse(raw) as ChatMessage[];
      const next = pruneMessages(parsed);
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    } catch {
      return [] as ChatMessage[];
    }
  };

  const fallbackReply = (prompt: string, mode: "bubble" | "chat") => {
    if (mode === "bubble") {
      if (contextData?.stats) {
        const totalMinutes = Math.floor((Number(contextData.stats.total_duration) || 0) / 60);
        const totalSessions = Number(contextData.stats.total_sessions) || 0;
        return `I remember! You have focused for ${totalMinutes} minutes and completed ${totalSessions} sessions. Keep it up!`;
      }
      return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    }

    return `Got it! (ear wiggle) "${prompt}". Let me think... break the task into a tiny step, finish it, then come back for a reward!`;
  };

  const askPetAI = async (prompt: string, mode: "bubble" | "chat") => {
    const recentMessages = chatMessages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
    const payload = {
      prompt,
      mode,
      context: {
        userId: contextData?.userId,
        stats: contextData?.stats,
        recentSessions: contextData?.recentSessions || [],
        musicDiscsCount: contextData?.musicDiscsCount || 0,
        musicLibraryCount: contextData?.musicLibraryCount || 0,
        recentMessages,
      },
    };

    try {
      const response = await fetch("/api/pet-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return fallbackReply(prompt, mode);
      }

      const data = await response.json();
      if (typeof data?.reply === "string" && data.reply.trim()) {
        return data.reply.trim();
      }
      return fallbackReply(prompt, mode);
    } catch {
      return fallbackReply(prompt, mode);
    }
  };

  const showBubble = async (prompt = "Check in like a cute bunny, use the data, be brief and sweet") => {
    const aiMessage = await askPetAI(prompt, "bubble");
    setMessage(aiMessage);
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }
    bubbleTimerRef.current = setTimeout(() => setMessage(null), 8000);
  };

  const appendAssistant = (text: string) => {
    setChatMessages((prev) => {
      const next = [
        ...prev,
        {
          id: `${Date.now()}-assistant-${Math.random().toString(36).slice(2)}`,
          role: "assistant" as const,
          text,
          createdAt: Date.now(),
        },
      ];
      persistMessages(next);
      return next;
    });
  };

  useEffect(() => {
    const loadContext = async () => {
      const user = await getCurrentUser();
      if (!user) {
        setContextData(null);
        setChatMessages([]);
        return;
      }

      const [stats, sessions, discs, library] = await Promise.all([
        getUserStats(user.id),
        getUserSessions(user.id, 10),
        getUserMusicDiscs(user.id),
        getUserMusicLibrary(user.id),
      ]);

      setContextData({
        userId: user.id,
        stats: stats || {},
        recentSessions: (sessions || []).map((s: any) => ({
          duration: Number(s.duration) || 0,
          mode: s.mode || "study",
          completed_at: s.completed_at || "",
        })),
        musicDiscsCount: (discs || []).length,
        musicLibraryCount: (library || []).length,
      });
    };

    loadContext();
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    const loaded = loadMessages(storageKey);
    if (loaded.length > 0) {
      setChatMessages(loaded);
      return;
    }

    const greet = createGreeting();
    setChatMessages([greet]);
    localStorage.setItem(storageKey, JSON.stringify([greet]));
  }, [storageKey]);

  const toggleSelectMode = () => {
    if (isSelectMode) {
      // Exiting — clear selection
      setSelectedIds(new Set());
    }
    setIsSelectMode((prev) => !prev);
  };

  const toggleSelectMessage = (msgId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const deleteSelected = () => {
    setChatMessages((prev) => {
      const next = prev.filter((m) => !selectedIds.has(m.id));
      persistMessages(next);
      return next;
    });
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const deleteSingleMessage = (msgId: string) => {
    setChatMessages((prev) => {
      const next = prev.filter((m) => m.id !== msgId);
      persistMessages(next);
      return next;
    });
    setPendingDeleteId(null);
  };

  useEffect(() => {
    const handleFocusFinished = async () => {
      await showBubble("The user just finished a focus session! Celebrate like a happy bunny, use their data, be lively and cute.");
    };

    window.addEventListener("focus-session-finished", handleFocusFinished);

    const interval = setInterval(() => {
      if (Math.random() > 0.8 && !message && !isChatOpen) {
        showBubble("Like a cute bunny, give a brief lively reminder. You can care about their health or encourage them to continue.");
      }
    }, 30000);

    return () => {
      window.removeEventListener("focus-session-finished", handleFocusFinished);
      clearInterval(interval);
      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current);
      }
    };
  }, [message, isChatOpen]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chatMessages, isChatOpen]);

  const handlePetClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setIsChatOpen((prev) => !prev);
      setMessage(null);
      return;
    }

    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      if (!isChatOpen) {
        showBubble();
      }
    }, 250);
  };

  const sendChat = async () => {
    const prompt = chatInput.trim();
    if (!prompt || isSending) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user-${Math.random().toString(36).slice(2)}`,
      role: "user",
      text: prompt,
      createdAt: Date.now(),
    };

    setChatInput("");
    setIsSending(true);

    setChatMessages((prev) => {
      const next = [...prev, userMessage];
      persistMessages(next);
      return next;
    });

    const reply = await askPetAI(prompt, "chat");
    appendAssistant(reply);
    setIsSending(false);
  };

  return (
    <div className={`fixed z-[100] transition-all duration-500 pointer-events-none ${getPositionClasses()}`}>
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="absolute bottom-32 right-0 w-[320px] max-w-[calc(100vw-24px)] h-[420px] max-h-[calc(100vh-160px)] rounded-2xl elegant-glass border border-accent-blue/20 pointer-events-auto overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="h-11 px-3 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs text-white/90 font-medium">
                <MessageCircle className="w-4 h-4 text-accent-blue" />
                {isSelectMode ? (
                  <span className="text-accent-blue">Selected {selectedIds.size}</span>
                ) : (
                  "Pet Chat"
                )}
              </div>
              <div className="flex items-center gap-2">
                <AnimatePresence mode="wait">
                  {isSelectMode ? (
                    <motion.div
                      key="select-actions"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="flex items-center gap-1.5"
                    >
                      <button
                        onClick={toggleSelectMode}
                        className="h-7 px-2 rounded-lg border border-white/10 bg-white/5 text-[10px] text-white/70 hover:text-white hover:border-white/20 inline-flex items-center gap-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={deleteSelected}
                        disabled={selectedIds.size === 0}
                        className="h-7 px-2 rounded-lg border border-red-400/30 bg-red-500/15 text-[10px] text-red-400 hover:bg-red-500/25 disabled:opacity-40 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="manage-btn"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      onClick={toggleSelectMode}
                      className="h-7 px-2 rounded-lg border border-white/10 bg-white/5 text-[10px] text-white/70 hover:text-white hover:border-white/20 inline-flex items-center gap-1"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Manage
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Message list */}
            <div
              ref={listRef}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-2 relative"
            >
              <AnimatePresence>
                {chatMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} relative`}
                    onClick={isSelectMode ? () => toggleSelectMessage(msg.id) : undefined}
                  >
                    {/* Checkbox in select mode */}
                    <AnimatePresence>
                      {isSelectMode && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          className={`flex items-center mr-2 shrink-0 ${
                            msg.role === "user" ? "order-first flex-row-reverse ml-0 mr-0" : ""
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors duration-150 cursor-pointer ${
                            selectedIds.has(msg.id)
                              ? "bg-accent-blue/30 border-accent-blue/60"
                              : "bg-transparent border-white/20 hover:border-white/40"
                          }`}>
                            {selectedIds.has(msg.id) && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                <CheckSquare className="w-3 h-3 text-accent-blue" />
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed transition-colors duration-150 ${
                        selectedIds.has(msg.id)
                          ? "bg-accent-blue/15 text-white border border-accent-blue/30"
                          : msg.role === "user"
                            ? "bg-accent-blue/20 text-white border border-accent-blue/20"
                            : "bg-white/5 text-white/90 border border-white/10"
                      } ${isSelectMode ? "cursor-pointer" : ""}`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Single-message delete confirmation overlay (non-select mode) */}
              <AnimatePresence>
                {pendingDeleteId && !isSelectMode && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-2xl"
                    onClick={() => setPendingDeleteId(null)}
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-[#1a1a2e] border border-white/15 rounded-xl p-4 mx-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-xs text-white/90 mb-3">Delete this message?</p>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setPendingDeleteId(null)}
                          className="h-7 px-3 rounded-lg border border-white/10 bg-white/5 text-[11px] text-white/70 hover:text-white hover:border-white/20"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteSingleMessage(pendingDeleteId)}
                          className="h-7 px-3 rounded-lg border border-red-400/30 bg-red-500/15 text-[11px] text-red-400 hover:bg-red-500/25"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input area */}
            <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-white/10 flex flex-col gap-2 shrink-0">
              <div className="text-[10px] text-white/45">Chats are saved per user for 30 days</div>
              <div className="flex items-center gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void sendChat();
                    }
                  }}
                  placeholder="Share your current status or question..."
                  className="flex-1 h-9 rounded-xl bg-black/20 border border-white/10 px-3 text-xs text-white outline-none focus:border-accent-blue/40"
                />
                <button
                  onClick={() => {
                    void sendChat();
                  }}
                  disabled={isSending || !chatInput.trim()}
                  className="h-9 w-9 rounded-xl bg-accent-blue/25 border border-accent-blue/30 flex items-center justify-center text-accent-blue disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-24 right-0 w-64 p-4 elegant-glass rounded-2xl border-accent-blue/30 pointer-events-auto"
          >
            <div className="text-xs text-white leading-relaxed">
              {message}
            </div>
            <div className="absolute -bottom-2 right-6 w-4 h-4 elegant-glass border-t-0 border-l-0 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-auto cursor-pointer group"
        onClick={handlePetClick}
      >
        <div className="relative">
          {/* Rabbit Body (Usagi Style) */}
          <div className="w-14 h-12 bg-white rounded-[2rem] shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center justify-center relative border-2 border-accent-blue/10">
             {/* Ears */}
             <div className="absolute -top-6 left-2 w-4 h-10 bg-white rounded-full border-t-2 border-x-2 border-accent-blue/5 z-[-1]">
                <div className="absolute inset-1 bg-pink-100/50 rounded-full" />
             </div>
             <div className="absolute -top-7 right-3 w-4 h-12 bg-white rounded-full border-t-2 border-x-2 border-accent-blue/5 rotate-12 z-[-1]">
                <div className="absolute inset-1 bg-pink-100/50 rounded-full" />
             </div>

             {/* Face */}
             <div className="flex flex-col items-center justify-center mt-2">
                <div className="flex gap-2.5 mb-1.5">
                    {/* Eyes */}
                    <div className="w-1.5 h-1.5 bg-gray-800 rounded-full" />
                    <div className="w-1.5 h-1.5 bg-gray-800 rounded-full" />
                </div>
                {/* Nose/Mouth (Smile) */}
                <div className="w-1 h-1 bg-pink-400 rounded-full" />
                <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-0.5">
                   <path d="M1 1C2.5 4 9.5 4 11 1" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
             </div>

             {/* Blush */}
             <div className="absolute left-2.5 top-6 w-2 h-1 bg-pink-200 rounded-full blur-[1px]" />
             <div className="absolute right-2.5 top-6 w-2 h-1 bg-pink-200 rounded-full blur-[1px]" />
          </div>

          {/* Tail */}
          <div className="absolute -left-1 bottom-1 w-4 h-4 bg-white rounded-full shadow-sm" />

          {/* Sparkles around */}
          <Sparkles className="absolute -top-4 -right-2 w-4 h-4 text-accent-blue animate-pulse" />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-2 bg-accent-blue/10 rounded-full blur-xl -z-10"
          />
        </div>
      </motion.div>
    </div>
  );
}
