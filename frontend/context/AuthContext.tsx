"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Lottie from "lottie-react";
import connectingAnim from "@/assets/Connecting.json";
import successAnim from "@/assets/login success.json";

interface AuthContextType {
  isLoggedIn: boolean;
  username: string | null;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConnecting, setShowConnecting] = useState(false);
  const [animConfig, setAnimConfig] = useState<null | { data: any; loop: boolean; durationMs?: number }>(null);

  const getAnimDuration = (anim: any) => {
    try {
      const fr = anim.fr || anim.framerate || 60;
      const ip = anim.ip || 0;
      const op = anim.op || anim.endFrame || 0;
      const ms = ((op - ip) / fr) * 1000;
      return Math.max(50, Math.round(ms));
    } catch (e) {
      return 2500;
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      const { isLoggedIn: logged, username: user, email: userEmail } = JSON.parse(stored);
      setIsLoggedIn(logged);
      setUsername(user);
      setEmail(userEmail);
    }
    setIsLoading(false);
  }, []);

  const login = async (userEmail: string, password: string) => {
    const res = await fetch("http://localhost:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, password }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Login failed");
    }

    // Show connecting animation (looping) for 2.5s, blur the page
    const dur = 2500;
    setAnimConfig({ data: connectingAnim, loop: true, durationMs: dur });
    setShowConnecting(true);
    await new Promise((r) => setTimeout(r, dur));
    setShowConnecting(false);
    setAnimConfig(null);

    setIsLoggedIn(true);
    setUsername(data.username);
    setEmail(userEmail);
    localStorage.setItem(
      "auth",
      JSON.stringify({ isLoggedIn: true, username: data.username, email: userEmail })
    );
  };

  const register = async (userEmail: string, password: string, newUsername: string) => {
    const res = await fetch("http://localhost:8000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, password, username: newUsername }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Registration failed");
    }

    // Show success animation and wait until animation finishes (non-looping)
    const dur = getAnimDuration(successAnim) || 2500;
    setAnimConfig({ data: successAnim, loop: false, durationMs: dur });
    setShowConnecting(true);
    await new Promise((r) => setTimeout(r, dur));
    setShowConnecting(false);
    setAnimConfig(null);

    setIsLoggedIn(true);
    setUsername(newUsername);
    setEmail(userEmail);
    localStorage.setItem(
      "auth",
      JSON.stringify({ isLoggedIn: true, username: newUsername, email: userEmail })
    );
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUsername(null);
    setEmail(null);
    localStorage.removeItem("auth");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, username, email, login, register, logout }}>
      {!isLoading && (
        <>
          {children}
          {showConnecting && (
            <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999 }}>
              <style>{`
                @keyframes connectOverlayFade { from { opacity: 0; } to { opacity: 1; } }
                @keyframes connectPop { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .connecting-overlay { animation: connectOverlayFade 260ms ease forwards; }
                .connecting-pop { animation: connectPop 300ms cubic-bezier(.2,.8,.2,1) forwards; }
              `}</style>

              <div className="connecting-overlay" style={{ position: "absolute", inset: 0, backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.15)" }} />
              <div
                className="connecting-pop"
                style={{
                  width: 640,
                  maxWidth: "92%",
                  height: 320,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.02)",
                  padding: 12,
                }}
              >
                <div style={{ flex: "0 0 52%", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
                  <div style={{ width: "100%", height: "100%", maxWidth: 360 }}>
                    <Lottie animationData={animConfig?.data || connectingAnim} loop={animConfig?.loop ?? true} />
                  </div>
                </div>

                <div style={{ flex: 1, paddingLeft: 18, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center" }}>
                  {animConfig?.data === successAnim ? (
                    <>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#10B981" }}>Account created successfully</div>
                      <div style={{ marginTop: 8, color: "#374151", fontSize: 14 }}>You can now log in with your new account.</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Connecting...</div>
                      <div style={{ marginTop: 8, color: "#374151", fontSize: 14 }}>Finalizing your session — please wait.</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
