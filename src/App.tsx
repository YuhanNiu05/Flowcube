/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Focus from "./pages/Focus";
import GalaxyReconstruction from "./pages/GalaxyReconstruction";
import CosmicUniverse from "./pages/CosmicUniverse";
import SettingsPage from "./pages/Settings";
import MusicLibrary from "./pages/MusicLibrary";
import SpiritOverlay from "./components/SpiritOverlay";
import { getCurrentUser, signOut } from "./lib/supabase";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async () => {
    const user = await getCurrentUser();
    if (user) {
      setIsAuthenticated(true);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm uppercase tracking-widest">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#050505] text-[#f5f5f5] font-sans selection:bg-[#F27D26]/30">
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />} />
          <Route 
            path="/" 
            element={isAuthenticated ? <Home onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/focus" 
            element={isAuthenticated ? <Focus /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/planet" 
            element={isAuthenticated ? <GalaxyReconstruction /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/universe" 
            element={isAuthenticated ? <CosmicUniverse /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/settings" 
            element={isAuthenticated ? <SettingsPage /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/music-library" 
            element={isAuthenticated ? <MusicLibrary /> : <Navigate to="/login" replace />} 
          />
        </Routes>
        <SpiritOverlay />
      </div>
    </BrowserRouter>
  );
}

