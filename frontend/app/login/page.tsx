"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
      }}
    >
      {/* Animated background blobs */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          left: "-50%",
          width: "500px",
          height: "500px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%",
          animation: "float 8s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-50%",
          right: "-50%",
          width: "400px",
          height: "400px",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "50%",
          animation: "float 10s ease-in-out infinite 2s",
        }}
      />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shimmer {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.1); }
          50% { box-shadow: 0 0 40px rgba(255, 255, 255, 0.2); }
        }
      `}</style>

      {/* Main container */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "450px",
          padding: "24px",
        }}
      >
        {/* Card */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "24px",
            padding: "48px 40px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            animation: "slideIn 0.6s ease-out",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "60px",
                height: "60px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "16px",
                marginBottom: "16px",
                fontSize: "28px",
                boxShadow: "0 10px 25px rgba(102, 126, 234, 0.4)",
              }}
            >
              🛍️
            </div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: "700",
                color: "#1a1a2e",
                margin: "0 0 8px 0",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              MyShop
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#888",
                margin: "0",
              }}
            >
              Welcome back to your store
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email field */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#333",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  transition: "all 0.3s ease",
                  backgroundColor: "#f8f9fa",
                  color: "#333",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.backgroundColor = "#fff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e0e0e0";
                  e.target.style.backgroundColor = "#f8f9fa";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password field */}
            <div style={{ marginBottom: "28px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#333",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  transition: "all 0.3s ease",
                  backgroundColor: "#f8f9fa",
                  color: "#333",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.backgroundColor = "#fff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e0e0e0";
                  e.target.style.backgroundColor = "#f8f9fa";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Error message */}
            {error && (
              <div
                style={{
                  padding: "12px 16px",
                  marginBottom: "20px",
                  backgroundColor: "#fee",
                  border: "1px solid #fcc",
                  borderRadius: "12px",
                  color: "#c33",
                  fontSize: "14px",
                  animation: "slideIn 0.3s ease-out",
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "14px 16px",
                background: isLoading
                  ? "linear-gradient(135deg, #aaa 0%, #999 100%)"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 10px 25px rgba(102, 126, 234, 0.3)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                opacity: isLoading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 15px 35px rgba(102, 126, 234, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 10px 25px rgba(102, 126, 234, 0.3)";
              }}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Footer */}
          <div
            style={{
              marginTop: "28px",
              paddingTop: "20px",
              borderTop: "1px solid #e0e0e0",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "#999",
                margin: "0",
                lineHeight: "1.6",
              }}
            >
              Demo credentials: Use any email and password to log in
            </p>
          </div>
        </div>

        {/* Bottom text */}
        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.8)",
            fontSize: "13px",
          }}
        >
          <p style={{ margin: "0" }}>🔒 Secure • Fast • Modern</p>
        </div>
      </div>
    </div>
  );
}
