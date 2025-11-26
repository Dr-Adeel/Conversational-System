"use client";

import { useState, ChangeEvent, KeyboardEvent, useEffect, useRef } from "react";

interface Message {
  sender: "user" | "bot";
  text: string;
  model?: string;
  id?: string; 
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("sbert"); 
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

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

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loaderId ? { sender: "bot", text: data.reply, model } : msg
        )
      );
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
    <div
      style={{
        minHeight: "100vh",
        padding: 20,
        fontFamily: "sans-serif",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 600,
          backgroundColor: "#fff",
          borderRadius: 15,
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            padding: 15,
            margin: 0,
            backgroundColor: "#f5f5f5",
            borderBottom: "1px solid #ddd",
            fontSize: 20,
          }}
        >
          Chat with Bot
        </h1>

        <div style={{ display: "flex", padding: 10, gap: 10 }}>
          <label>
            Select Model:
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ marginLeft: 5, padding: 5 }}
            >
              <option value="sbert">SBERT</option>
              <option value="bert">BERT</option>
              <option value="mistral">Mistral</option>
            </select>
          </label>
        </div>

        <div
          ref={chatContainerRef}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            minHeight: 400,
            maxHeight: 400,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            overflowY: "auto",
            backgroundColor: "#f9f9f9",
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                textAlign: msg.sender === "user" ? "right" : "left",
                backgroundColor: msg.sender === "user" ? "#DCF8C6" : "#F1F0F0",
                padding: "8px 12px",
                borderRadius: 10,
                maxWidth: "70%",
                alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                wordBreak: "break-word",
                fontStyle: msg.sender === "bot" ? "italic" : "normal",
              }}
            >
              {msg.sender === "bot" && msg.model ? `(${msg.model}) ` : ""}
              {msg.text}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            borderTop: "1px solid #ddd",
            padding: 10,
            backgroundColor: "#f5f5f5",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={loading ? "Waiting for reply..." : "Type your message..."}
            disabled={loading}
            style={{
              flex: 1,
              padding: 10,
              fontSize: 16,
              border: "1px solid #ccc",
              borderRadius: 5,
              outline: "none",
              transition: "border-color 0.2s",
              backgroundColor: loading ? "#eee" : "#fff",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            style={{
              padding: "10px 20px",
              fontSize: 16,
              marginLeft: 5,
              backgroundColor: "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
