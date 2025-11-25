"use client";

import { useState, ChangeEvent, KeyboardEvent, useEffect, useRef } from "react";

interface Message {
  sender: "user" | "bot";
  text: string;
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text: input }]);

    try {
     //const res = await fetch("http://localhost:8000/api/chat", {
     const res = await fetch("http://127.0.0.1:8000/api/chat", {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();

      setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
    } catch (err) {
      console.error("Error:", err);
    }

    setInput("");
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value);

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
              }}
            >
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
            placeholder="Type your message..."
            style={{
              flex: 1,
              padding: 10,
              fontSize: 16,
              border: "1px solid #ccc",
              borderRadius: 5,
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#0070f3")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#ccc")}
          />
          <button
            onClick={sendMessage}
            style={{
              padding: "10px 20px",
              fontSize: 16,
              marginLeft: 5,
              backgroundColor: "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#005bb5")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0070f3")}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
