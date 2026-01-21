"use client";

import { useState, ChangeEvent, KeyboardEvent, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface Message {
  sender: "user" | "bot";
  text: string;
  model?: string;
  id?: string;
}

export default function Page() {
  const [search, setSearch] = useState("");
  const { isLoggedIn, username, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hover-lift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .product-card:hover {
          transform: translateY(-8px);
        }
      `}</style>

      {/* ===== MODERN HEADER ===== */}
      <header
        style={{
          width: "100%",
          padding: "16px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          boxShadow: "0 10px 30px rgba(102, 126, 234, 0.2)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          animation: "slideDown 0.4s ease-out",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>🛍️</span> MyShop
          </div>
        </div>

        {/* Search bar */}
        <div style={{ flex: 1, maxWidth: "400px", marginLeft: "40px" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              style={{
                width: "100%",
                padding: "12px 16px 12px 40px",
                border: "none",
                borderRadius: "24px",
                outline: "none",
                fontSize: "14px",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = "0 6px 25px rgba(0, 0, 0, 0.15)";
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.1)";
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "14px",
                fontSize: "18px",
                color: "#999",
              }}
            >
              🔍
            </span>
          </div>
        </div>

        {/* User section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginLeft: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#fff",
              fontSize: "14px",
            }}
          >
            <span style={{ fontSize: "20px" }}>👤</span>
            <span style={{ fontWeight: "500" }}>{username}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 20px",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.3s ease",
              backdropFilter: "blur(10px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            }}
          >
            🚪 Logout
          </button>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <div
        style={{
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          padding: "60px 40px",
          textAlign: "center",
          animation: "fadeIn 0.6s ease-out 0.1s both",
        }}
      >
        <h1
          style={{
            fontSize: "48px",
            fontWeight: "700",
            marginBottom: "12px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Welcome Back!
        </h1>
        <p
          style={{
            fontSize: "18px",
            color: "#666",
            marginBottom: "0",
          }}
        >
          Discover our latest amazing products
        </p>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main style={{ padding: "50px 40px", backgroundColor: "#f9fafb" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "40px",
            }}
          >
            <h2
              style={{
                fontSize: "32px",
                fontWeight: "700",
                margin: "0",
                color: "#1a1a2e",
              }}
            >
              Featured Products
            </h2>
            <span
              style={{
                fontSize: "24px",
              }}
            >
              ✨
            </span>
          </div>

          {/* PRODUCT GRID */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "28px",
              animation: "slideUp 0.6s ease-out 0.2s both",
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="product-card"
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "pointer",
                  border: "1px solid rgba(0, 0, 0, 0.05)",
                  height: "340px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Image placeholder */}
                <div
                  style={{
                    width: "100%",
                    height: "200px",
                    background: `linear-gradient(135deg, #667eea${
                      i % 2 === 0 ? "" : "40"
                    } 0%, #764ba2${i % 2 === 0 ? "" : "40"} 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "60px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      fontSize: "80px",
                      opacity: 0.8,
                    }}
                  >
                    {["📱", "⌚", "💻", "🎧", "📷", "🎮"][i % 6]}
                  </div>
                </div>

                {/* Content */}
                <div
                  style={{
                    padding: "20px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        height: "16px",
                        width: "60%",
                        background: "#e0e0e0",
                        borderRadius: "8px",
                        marginBottom: "12px",
                      }}
                    ></div>
                    <div
                      style={{
                        height: "12px",
                        width: "40%",
                        background: "#f0f0f0",
                        borderRadius: "6px",
                      }}
                    ></div>
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#667eea",
                      }}
                    >
                      $99.99
                    </div>
                    <button
                      style={{
                        padding: "8px 16px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* === CHAT FLOATING === */}
      <Chat />
    </>
  );
}

/* ------------------------------------------------------------- */
/* --------------------- TON CHAT ENTIER ----------------------- */
/* ------------------------------------------------------------- */

function Chat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("sbert");
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    { id: string; messages: Message[]; timestamp: number }[]
  >([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    null
  );
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
  };

  const loadConversation = (id: string) => {
    const conversation = conversationHistory.find((c) => c.id === id);
    if (conversation) {
      setMessages(conversation.messages);
      setCurrentConversationId(id);
      setShowHistory(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    let conversationId = currentConversationId;
    
    // If this is the first message in a new conversation, create a conversation ID
    if (messages.length === 0 && !conversationId) {
      conversationId = Date.now().toString();
      setCurrentConversationId(conversationId);
    }

    setMessages((prev) => [...prev, { sender: "user", text: input }]);
    setLoading(true);

    const loaderId = Math.random().toString();
    setMessages((prev) => [
      ...prev,
      { sender: "bot", text: "...", model, id: loaderId },
    ]);

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, model }),
      });

      const data = await res.json();

      setMessages((prev) => {
        const updatedMessages = prev.map((msg) =>
          msg.id === loaderId ? { sender: "bot", text: data.reply, model } : msg
        );

        // Save to history after every message exchange using the consistent conversationId
        setConversationHistory((hist) => {
          const exists = hist.find((c) => c.id === conversationId);
          if (!exists) {
            return [
              {
                id: conversationId,
                messages: updatedMessages,
                timestamp: Date.now(),
              },
              ...hist.slice(0, 4),
            ];
          }
          return hist.map((c) =>
            c.id === conversationId
              ? { ...c, messages: updatedMessages, timestamp: Date.now() }
              : c
          );
        });

        return updatedMessages;
      });
    } catch (err) {
      console.error("Error:", err);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loaderId
            ? { sender: "bot", text: "Error: Failed to fetch reply.", model }
            : msg
        )
      );
    }

    setInput("");
    setLoading(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) =>
    setInput(e.target.value);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  return (
    <>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .chat-bubble-enter { animation: slideInUp 0.3s ease-out; }
      `}</style>

      {/* History integrated into chat popup - removed separate button */}

      {/* FLOATING BUTTON */}

      {/* FLOATING BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          border: "none",
          fontSize: "24px",
          cursor: "pointer",
          boxShadow: "0 8px 25px rgba(102, 126, 234, 0.4)",
          zIndex: 9999,
          transition: "all 0.3s ease",
          animation: open ? "none" : "pulse 2s ease-in-out infinite",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 12px 35px rgba(102, 126, 234, 0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.4)";
        }}
      >
        💬
      </button>

      {/* CHAT POPUP WITH INTEGRATED HISTORY SIDEBAR */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "90px",
            right: "24px",
            width: "700px",
            height: "550px",
            backgroundColor: "#fff",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            zIndex: 9998,
            display: "flex",
            flexDirection: "row",
            overflow: "hidden",
            animation: "slideInUp 0.3s ease-out",
            border: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* LEFT SIDEBAR - HISTORY */}
          <div
            style={{
              width: "200px",
              backgroundColor: "#f8f9fa",
              borderRight: "1px solid #e0e0e0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* History Header */}
            <div
              style={{
                padding: "16px",
                borderBottom: "1px solid #e0e0e0",
                backgroundColor: "#fff",
              }}
            >
              <h4
                style={{
                  margin: "0",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#333",
                }}
              >
                📋 History
              </h4>
            </div>

            {/* New Chat Button */}
            <button
              onClick={startNewConversation}
              style={{
                margin: "12px",
                padding: "10px 12px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "12px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              + New Chat
            </button>

            {/* Conversations List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px",
              }}
            >
              {conversationHistory.length === 0 ? (
                <div
                  style={{
                    padding: "16px 12px",
                    textAlign: "center",
                    color: "#999",
                    fontSize: "12px",
                  }}
                >
                  No chats yet
                </div>
              ) : (
                conversationHistory.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      margin: "4px 0",
                      backgroundColor:
                        currentConversationId === conv.id ? "#e8eaff" : "transparent",
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "11px",
                      color: "#333",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#e8eaff";
                    }}
                    onMouseLeave={(e) => {
                      if (currentConversationId !== conv.id) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <div
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: "500",
                      }}
                    >
                      {conv.messages[0]?.text.substring(0, 15) || "Empty"}...
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#999",
                        marginTop: "2px",
                      }}
                    >
                      {new Date(conv.timestamp).toLocaleTimeString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* RIGHT SIDE - CHAT AREA */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* HEADER */}
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                padding: "16px",
                fontWeight: "600",
                fontSize: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              💬 Chat
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                }}
              >
                ✕
              </button>
            </div>

            {/* MODEL SELECTOR */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e0e0e0" }}>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#666",
                  display: "block",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "13px",
                  backgroundColor: "#f8f9fa",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e0e0e0";
                  e.target.style.boxShadow = "none";
                }}
              >
                <option value="sbert">SBERT</option>
                <option value="bert">BERT</option>
                <option value="mistral">Mistral</option>
              </select>
            </div>

            {/* MESSAGES */}
            <div
              ref={chatContainerRef}
              style={{
                flex: 1,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                overflowY: "auto",
                backgroundColor: "#f8f9fa",
                scrollBehavior: "smooth",
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "#999",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                >
                  Start a conversation! 👋
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className="chat-bubble-enter"
                  style={{
                    display: "flex",
                    justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "10px 14px",
                      borderRadius: "14px",
                      wordBreak: "break-word",
                      fontSize: "14px",
                      lineHeight: "1.4",
                      backgroundColor:
                        msg.sender === "user" ? "#DCF8C6" : "#F1F0F0",
                      color: "#333",
                    }}
                  >
                    {msg.sender === "bot" && msg.model && (
                      <div
                        style={{
                          fontSize: "11px",
                          opacity: 0.7,
                          marginBottom: "4px",
                        }}
                      >
                        {msg.model}
                      </div>
                    )}
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* INPUT */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                padding: "16px",
                backgroundColor: "#f8f9fa",
                borderTop: "1px solid #e0e0e0",
              }}
            >
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={loading ? "Waiting..." : "Type a message..."}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  fontSize: "14px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "10px",
                  outline: "none",
                  backgroundColor: loading ? "#f0f0f0" : "#fff",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e0e0e0";
                  e.target.style.boxShadow = "none";
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                style={{
                  padding: "10px 16px",
                  background: loading
                    ? "#ccc"
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "16px",
                  fontWeight: "600",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
