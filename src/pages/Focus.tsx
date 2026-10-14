import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Play, Pause, RotateCcw, Monitor, Dumbbell, Info, Hexagon, Sparkles, Home } from "lucide-react";
import PlanetCanvas from "../components/PlanetCanvas";
import { createFocusSession, getCurrentUser } from "../lib/supabase";

type Mode = "learning" | "sports";
type TimerType = "positive" | "countdown";
type AppStatus = "idle" | "selecting" | "focusing" | "summary";

export default function Focus() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<AppStatus>("selecting");
  const [mode, setMode] = useState<Mode>("learning");
  const [timerType, setTimerType] = useState<TimerType>("positive");
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [finalTime, setFinalTime] = useState(0);
  
  // Refs for resolving stale closures in WebSocket handler
  const stateRef = useRef({ status, mode, timerType, seconds, isActive, demoMode });
  useEffect(() => {
    stateRef.current = { status, mode, timerType, seconds, isActive, demoMode };
  }, [status, mode, timerType, seconds, isActive, demoMode]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket Sync for M5Stack
  const [deviceConnected, setDeviceConnected] = useState(false);

  // Load demo mode setting
  useEffect(() => {
    const savedDemoMode = localStorage.getItem("demo_mode");
    setDemoMode(savedDemoMode === "true");

    const handleDemoModeChange = (event: CustomEvent) => {
      setDemoMode(event.detail.enabled);
    };

    window.addEventListener("demo-mode-changed", handleDemoModeChange as EventListener);
    return () => window.removeEventListener("demo-mode-changed", handleDemoModeChange as EventListener);
  }, []);

  // Calculate time multiplier based on demo mode
  const timeMultiplier = demoMode ? 30 : 1;

  useEffect(() => {
    // Determine WS protocol based on window location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("Connected to FlowCube Server [WS]");
        ws?.send(JSON.stringify({ type: "handshake", client_type: "ui" }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "device_status") {
             setDeviceConnected(data.connected);
          }
          if (data.type === "orientation") {
            const { orientation } = data;
            const currentState = stateRef.current;
            console.log("M5Stack Command:", orientation, "Current Status:", currentState.status);
            
            if (orientation === "study") {
              setMode("learning");
              if (currentState.status !== "focusing") {
                setStatus("focusing");
                setIsActive(true);
                if (currentState.timerType === "countdown" && currentState.seconds === 0) {
                  setSeconds(25 * 60);
                }
              } else {
                setIsActive(true);
              }
            } else if (orientation === "exercise") {
              setMode("sports");
              if (currentState.status !== "focusing") {
                setStatus("focusing");
                setIsActive(true);
                if (currentState.timerType === "countdown" && currentState.seconds === 0) {
                  setSeconds(25 * 60);
                }
              } else {
                setIsActive(true);
              }
            } else if (orientation === "pause") {
              setIsActive(false);
            } else if (orientation === "rest") {
               if (currentState.status === "focusing") {
                 handleFinishSession(currentState);
               }
            }
          }
        } catch (e) {
          console.error("WS Message Error:", e);
        }
      };

      ws.onclose = () => {
        console.log("WS Disconnected. Retrying...");
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("WS Error:", err);
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, []); // Empty dependency array, safe because we rely on stateRef entirely

  const startFocus = () => {
    setStatus("focusing");
    setIsActive(true);
    if (timerType === "countdown" && seconds === 0) {
      setSeconds(25 * 60);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const handleFinishSession = async (fromState?: typeof stateRef.current) => {
    const state = fromState || stateRef.current;
    
    if (state.status === "focusing") {
      // 1. Immediately freeze the timer state so the UI stops ticking
      setIsActive(false);
      
      const focusedSeconds = state.timerType === "positive" 
        ? state.seconds 
        : (25 * 60 - state.seconds);
      
      setFinalTime(focusedSeconds);
      setStatus("summary");
      
      // 2. Local storage updates
      const currentStreak = parseInt(localStorage.getItem("focus_streak") || "0");
      localStorage.setItem("focus_streak", (currentStreak + 1).toString());
      
      const currentTotal = parseInt(localStorage.getItem("total_focus_minutes") || "0");
      const focusedMinutes = Math.floor(Math.max(0, focusedSeconds) / 60);
      localStorage.setItem("total_focus_minutes", (currentTotal + focusedMinutes).toString());
      
      window.dispatchEvent(new CustomEvent("focus-session-finished"));
      
      // 3. Database operation done asynchronously
      try {
        const user = await getCurrentUser();
        if (user && state.seconds > 0) {
          const timeMult = state.demoMode ? 30 : 1;
          const durationToSave = state.demoMode ? state.seconds * timeMult : state.seconds;
          await createFocusSession({
            userId: user.id,
            duration: Math.floor(durationToSave),
            mode: state.mode === "learning" ? "study" : "exercise",
          });
        }
      } catch (err) {
        console.error("Failed to save focus session:", err);
      }
      return;
    }
    
    // For non-focusing states (e.g. clicking 'Try Again' from summary)
    setIsActive(false);
    setSeconds(0);
    setStatus("selecting");
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (timerType === "positive") return prev + timeMultiplier;
          if (prev <= timeMultiplier) {
            // Countdown finished - enqueue finish async to let state settle
            setTimeout(() => {
              handleFinishSession(stateRef.current);
            }, 0);
            return 0;
          }
          return prev - timeMultiplier;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timerType, timeMultiplier]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-deep flex flex-col font-sans">
      {/* Background 3D View */}
      <div className="absolute inset-0 z-0">
        <PlanetCanvas focusSeconds={status === "summary" ? finalTime : seconds} status={status === "focusing" ? "focusing" : "idle"} mode={mode} demoMode={demoMode} />
      </div>

      {/* Top Header Navigation - Elegant Dark Style */}
      <header className="fixed top-0 left-0 w-full h-[60px] px-10 flex justify-between items-center elegant-glass z-50">
        <div className="flex items-center gap-3 font-bold text-lg tracking-tight">
          <button 
            onClick={() => navigate("/")}
            className="hover:text-accent-blue transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent-blue rounded flex items-center justify-center">
               <Hexagon className="w-4 h-4 text-white" />
            </div>
            <span className="text-white tracking-widest text-sm font-black">FLOWCUBE</span>
          </div>
        </div>
        <div className={`status-pill px-3 py-1 flex items-center gap-2 transition-all ${deviceConnected ? "text-accent-green" : "text-text-secondary/50"}`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${deviceConnected ? "bg-accent-green" : "bg-gray-500"}`} />
          {deviceConnected ? "M5STACK CORE2 CONNECTED" : "DEVICE DISCONNECTED"}
        </div>
      </header>

      {/* Elegant Digital Clock Overlay (Top Right) */}
      <AnimatePresence>
        {status !== "summary" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-[100px] right-10 z-10 text-right font-mono pointer-events-none"
          >
            <div className="text-6xl font-bold tracking-tighter text-white opacity-90 transition-all duration-300">
              {formatTime(seconds)}
            </div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-text-secondary mt-1">
              {timerType === "positive" ? "Time Focused" : "Time Remaining"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Info (Bottom Left) */}
      <AnimatePresence>
        {status === "focusing" && (
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="absolute left-10 bottom-10 z-10 flex flex-col gap-2 pointer-events-none"
          >
            <div className="bg-accent-blue text-[10px] font-bold px-3 py-1 rounded text-white w-fit uppercase tracking-widest leading-none">
              Current Session
            </div>
            <h1 className="text-4xl font-light tracking-tight text-white mb-1">
              {mode === "learning" ? "Study Mode" : "Exercise Mode"}
            </h1>
            <p className="text-text-secondary text-sm max-w-[320px] leading-relaxed">
              Repairing Sector 7-G. Your focus energy is regenerating the planetary ecosystem.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 z-10 flex flex-col items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {status === "selecting" && (
            <motion.div 
              key="selection"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.05, opacity: 0 }}
              className="elegant-glass p-10 rounded-[2rem] w-full max-w-sm flex flex-col gap-8 pointer-events-auto"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-1 tracking-tight">Select Mode</h2>
                <p className="text-text-secondary text-sm">Energy will be converted to planetary nutrients</p>
              </div>

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-2 bg-black/20 p-1.5 rounded-xl border border-white/5">
                <button 
                  onClick={() => setMode("learning")}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${mode === "learning" ? "bg-accent-blue text-white font-bold" : "text-text-secondary hover:text-white"}`}
                >
                  <Monitor className="w-4 h-4" /> STUDY
                </button>
                <button 
                  onClick={() => setMode("sports")}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${mode === "sports" ? "bg-accent-blue text-white font-bold" : "text-text-secondary hover:text-white"}`}
                >
                  <Dumbbell className="w-4 h-4" /> SPORTS
                </button>
              </div>

              {/* Timer Type Toggle */}
              <div className="grid grid-cols-2 gap-2 bg-black/20 p-1.5 rounded-xl border border-white/5">
                <button 
                  onClick={() => setTimerType("positive")}
                  className={`py-3 rounded-lg text-xs tracking-widest font-mono transition-all ${timerType === "positive" ? "text-accent-blue border-b-2 border-accent-blue" : "text-text-secondary hover:text-white"}`}
                >
                  UP-TIMER
                </button>
                <button 
                  onClick={() => setTimerType("countdown")}
                  className={`py-3 rounded-lg text-xs tracking-widest font-mono transition-all ${timerType === "countdown" ? "text-accent-blue border-b-2 border-accent-blue" : "text-text-secondary hover:text-white"}`}
                >
                  DOWN-TIMER
                </button>
              </div>

              <button 
                onClick={startFocus}
                className="w-full bg-accent-blue hover:bg-blue-400 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
              >
                INITIALIZE PORTAL
              </button>

              <div className="p-4 bg-white/[0.02] border border-dashed border-white/10 rounded-xl flex items-start gap-3">
                <Info className="w-4 h-4 text-accent-blue mt-0.5" />
                <p className="text-[10px] text-text-secondary leading-normal uppercase tracking-wider">
                  Hardware linked: Flip M5Stack face down to trigger session automatically.
                </p>
              </div>
            </motion.div>
          )}

          {status === "summary" && (
            <motion.div
              key="summary"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.05, opacity: 0 }}
              className="elegant-glass border border-white/10 p-12 rounded-[2rem] w-full max-w-md flex flex-col items-center gap-6 pointer-events-auto shadow-2xl relative overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-accent-green/10 blur-[60px] rounded-full pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center">
                <Sparkles className="w-12 h-12 text-[#FFD700] mb-4 filter drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
                <h2 className="text-2xl font-bold tracking-widest text-[#E0B0FF] mb-2 drop-shadow-[0_0_8px_rgba(224,176,255,0.4)]">Flow Recorded</h2>
                
                <div className="my-8 font-mono text-5xl font-black tracking-tighter text-accent-green drop-shadow-[0_0_20px_rgba(74,222,128,0.6)]">
                  {formatTime(finalTime)}
                </div>

                <p className="text-text-secondary text-sm text-center max-w-[280px] leading-relaxed mb-10">
                  You have worked hard. Let us pause together and feel the calm.
                </p>

                <div className="flex gap-4 w-full">
                  <button 
                    onClick={() => handleFinishSession()}
                    className="flex-1 flex items-center justify-center gap-2 bg-transparent hover:bg-accent-green/10 text-accent-green font-bold py-4 rounded-xl transition-all border border-accent-green/50 hover:border-accent-green shadow-[inset_0_0_15px_rgba(74,222,128,0.1)]"
                  >
                    <RotateCcw className="w-4 h-4" /> Try Again
                  </button>
                  <button 
                    onClick={() => navigate("/")}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all border border-white/10 hover:border-white/20"
                  >
                    <Home className="w-4 h-4" /> Back to Home
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Action Overlay during focusing */}
      <AnimatePresence>
        {status === "focusing" && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute right-10 bottom-10 z-10 flex gap-4 pointer-events-auto"
          >
            <button 
              onClick={toggleTimer}
              className="action-card w-16 h-16 flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-white group"
            >
              {isActive ? <Pause className="w-6 h-6 group-hover:text-accent-blue" /> : <Play className="w-6 h-6 group-hover:text-accent-blue" />}
            </button>
            <button 
              onClick={() => handleFinishSession()}
              className="action-card w-16 h-16 flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-accent-green group"
              title="Finish focus and return"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Grids or lines can go here */}
    </div>
  );
}
