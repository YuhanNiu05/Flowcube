import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Settings as SettingsIcon, Clock, Sparkles, Database, RotateCcw, AlertTriangle, Music } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const [demoMode, setDemoMode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    // Load demo mode setting from localStorage
    const savedDemoMode = localStorage.getItem("demo_mode");
    if (savedDemoMode) {
      setDemoMode(savedDemoMode === "true");
    }
  }, []);

  const toggleDemoMode = (enabled: boolean) => {
    setDemoMode(enabled);
    localStorage.setItem("demo_mode", enabled.toString());
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent("demo-mode-changed", { detail: { enabled } }));
  };

  const handleReset = async () => {
    // Clear all local storage
    localStorage.clear();
    
    // Dispatch reset event
    window.dispatchEvent(new CustomEvent("app-reset"));
    
    // Navigate to login
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-bg-deep overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-blue/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full h-[60px] px-10 flex items-center elegant-glass z-50">
        <button 
          onClick={() => navigate("/")}
          className="hover:text-accent-blue transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="ml-4 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-accent-blue" />
          <span className="text-white font-bold tracking-widest text-sm">SETTINGS</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-[100px] px-6 pb-10 max-w-2xl mx-auto">
        {/* Demo Mode Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="elegant-glass rounded-[2rem] p-8 mb-6"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-accent-blue/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-accent-blue" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-2">Demo Mode</h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                Enable accelerated time flow (30x speed) for demonstration purposes.
                All timers, planet growth, and session durations will be multiplied by 30.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center justify-between bg-black/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Clock className={`w-5 h-5 ${demoMode ? "text-accent-blue" : "text-text-secondary"}`} />
              <span className={`font-medium ${demoMode ? "text-white" : "text-text-secondary"}`}>
                {demoMode ? "Enabled (30x Speed)" : "Disabled (Normal Speed)"}
              </span>
            </div>
            <button
              onClick={() => toggleDemoMode(!demoMode)}
              className={`relative w-16 h-8 rounded-full transition-all ${
                demoMode ? "bg-accent-blue" : "bg-white/10"
              }`}
            >
              <motion.div
                initial={false}
                animate={{ x: demoMode ? 36 : 4 }}
                className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
              />
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-4 p-4 bg-accent-blue/10 border border-accent-blue/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-accent-blue mt-0.5 flex-shrink-0" />
            <div className="text-xs text-text-secondary leading-relaxed">
              <strong className="text-white block mb-1">Note:</strong>
              When Demo Mode is enabled, all time-related activities are accelerated 30x.
              For example, 1 minute of real time = 30 minutes of recorded focus time.
            </div>
          </div>
        </motion.div>

        {/* Data Management Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="elegant-glass rounded-[2rem] p-8 mb-6"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Database className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-2">Data Management</h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                Manage your local and server data. This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            Reset All Data
          </button>
        </motion.div>

        {/* Music Library Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="elegant-glass rounded-[2rem] p-8 mb-6"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-accent-blue/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Music className="w-6 h-6 text-accent-blue" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-2">Music Library</h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                View your collected music discs and unlocked songs. 
                Use discs to unlock new tracks for your focus sessions.
              </p>
            </div>
          </div>

          {/* Navigate to Library Button */}
          <button
            onClick={() => navigate("/music-library")}
            className="w-full bg-accent-blue/20 hover:bg-accent-blue/30 border border-accent-blue/30 text-accent-blue font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Music className="w-5 h-5" />
            Open Music Library
          </button>
        </motion.div>

        {/* System Info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="elegant-glass rounded-[2rem] p-8"
        >
          <h2 className="text-xl font-bold text-white mb-4">System Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-text-secondary">Version</span>
              <span className="text-white font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-text-secondary">Demo Mode</span>
              <span className={`font-mono ${demoMode ? "text-accent-blue" : "text-text-secondary"}`}>
                {demoMode ? "30x Speed" : "Normal"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-text-secondary">Storage</span>
              <span className="text-white font-mono">Local + Supabase</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="elegant-glass p-8 rounded-[2rem] max-w-sm w-full"
          >
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Reset All Data?</h3>
            <p className="text-text-secondary text-sm mb-8 leading-relaxed">
              This will permanently delete all local data and reset your settings. 
              Server data will also be cleared. This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="bg-white/10 hover:bg-white/20 text-white font-medium py-4 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-all"
              >
                Reset Everything
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
