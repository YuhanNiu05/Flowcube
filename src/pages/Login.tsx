import { motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { signIn, signUp } from "../lib/supabase";

export default function Login({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Convert username to email format for Supabase
      // Users can use any string as username, we append @flowcube.local
      const email = username.includes('@') ? username : `${username}@flowcube.local`;
      
      const result = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (result.success) {
        onLogin();
        navigate("/");
      } else {
        setError(result.error || "Authentication failed");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg-deep overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-blue/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[420px] z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="inline-block p-4 rounded-3xl elegant-glass mb-6"
          >
            <div className="w-12 h-12 bg-accent-blue rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)]">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">
            {isLogin ? "PORTAL LOGIN" : "CREATE ACCOUNT"}
          </h1>
          <p className="text-text-secondary text-xs uppercase tracking-widest opacity-60">
            "Regenerating planetary ecosystem"
          </p>
        </div>

        <div className="elegant-glass p-8 rounded-[2rem] space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300 text-sm">{error}</span>
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary/50 group-focus-within:text-accent-blue transition-colors" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="OPERATOR NAME"
                disabled={loading}
                className="w-full bg-black/20 border border-white/5 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-accent-blue/50 focus:bg-white/5 transition-all font-mono text-xs tracking-wider disabled:opacity-50"
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary/50 group-focus-within:text-accent-blue transition-colors" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ACCESS KEY"
                disabled={loading}
                className="w-full bg-black/20 border border-white/5 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-accent-blue/50 focus:bg-white/5 transition-all font-mono text-xs tracking-wider disabled:opacity-50"
              />
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={loading || !username || !password}
            className="w-full bg-accent-blue hover:bg-blue-400 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all group shadow-[0_0_20px_rgba(59,130,246,0.2)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AUTHENTICATING...
              </>
            ) : isLogin ? (
              <>
                INITIALIZE AUTH
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            ) : (
              <>
                REGISTER OPERATOR
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <div className="text-center text-xs text-text-secondary/60">
            {isLogin ? (
              <p>Don't have an account? </p>
            ) : (
              <p>Already have an account? </p>
            )}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              disabled={loading}
              className="text-accent-blue hover:text-accent-blue/80 font-semibold mt-1 disabled:opacity-50"
            >
              {isLogin ? "Create Account" : "Login"}
            </button>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-text-secondary/40 text-[10px] uppercase tracking-widest">
            Secured by Supabase Authentication
          </p>
        </div>
      </motion.div>
    </div>
  );
}
