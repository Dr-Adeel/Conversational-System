from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from models import ModelsInterface
from db import get_products, get_db_user, create_db_user, verify_password, save_conversation, get_user_conversations, delete_conversation
import os
from dotenv import load_dotenv
import re
from typing import List, Dict, Any
from bson import ObjectId

load_dotenv()

app = FastAPI()

origins = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models = ModelsInterface()

class ChatRequest(BaseModel):
    message: str
    model: str = "sbert"  

class SimpleChatRequest(BaseModel):
    message: str

class GreetingRequest(BaseModel):
    username: str
    lastSearch: str = None

class RegisterRequest(BaseModel):
    email: str
    password: str
    username: str

class LoginRequest(BaseModel):
    email: str
    password: str

class SaveConversationRequest(BaseModel):
    user_email: str
    conversation_id: str
    messages: List[Dict[str, Any]]

class GetConversationsRequest(BaseModel):
    user_email: str

class DeleteConversationRequest(BaseModel):
    user_email: str
    conversation_id: str

@app.get("/products")
def products_endpoint():
    """Get all products from MongoDB"""
    products = get_products()
    return {"products": products}

@app.post("/api/chat")
def chat_endpoint(request: ChatRequest):
    msg = request.message

    if request.model == "sbert":
        reply = models.reply_sbert(msg)
    elif request.model == "mistral":
        reply = models.reply_mistral(msg)
    elif request.model == "bert":
        reply = models.reply_bert(msg)
    else:
        return {"reply": "Unknown model selected."}

    # If the model returned a structured response, forward text, products, html, debug
    if isinstance(reply, dict):
        text = reply.get("text") or reply.get("reply") or ""
        products = reply.get("products", [])
        resp = {"reply": text, "products": products}
        if reply.get("html") is not None:
            resp["html"] = reply.get("html")
        if reply.get("debug") is not None:
            resp["debug"] = reply.get("debug")
        return resp

    # If the model returned a plain string, try to find mentioned products and attach cards
    if isinstance(reply, str):
        text = reply
        # Skip attaching product cards for greetings or very short conversational replies.
        # If the user's message is a greeting or the reply itself looks like a greeting,
        # just return the textual reply without product suggestions.
        greeting_pattern = re.compile(r"^\s*(hi|hello|hey|hiya|yo|sup|greetings|good (morning|afternoon|evening))\b", re.I)
        if greeting_pattern.match(msg) or (len(text) < 80 and greeting_pattern.match(text)):
            return {"reply": text}
        prods = get_products()
        lower = text.lower()
        matches = []
        for p in prods:
            name = (p.get('name') or '').lower()
            desc = (p.get('desc') or '').lower()
            if name and name in lower:
                matches.append(p)
        # if none by exact name, try token overlap with product name
        if not matches:
            toks = [t for t in re.split(r"\W+", lower) if t]
            for p in prods:
                combined = (p.get('name','').lower() + ' ' + (p.get('desc') or '').lower())
                score = sum(1 for tok in toks if tok and tok in combined)
                if score > 0:
                    matches.append((score, p))
            matches = [p for _, p in sorted(matches, key=lambda x: x[0], reverse=True)] if matches and isinstance(matches[0], tuple) else matches

        # limit and build html
        if matches:
            sel = matches[:4]
            lines = [text, "", "Suggested product(s):"]
            html_lines = ["<h3>Suggested product(s)</h3><ul>"]
            for p in sel:
                price_val = p.get('price') or ''
                lines.append(f"- {p.get('name')} — {p.get('desc') or ''} ({price_val})")
                html_lines.append(f"<li><strong>{p.get('name')}</strong> — {p.get('desc') or ''} — <em>{price_val}</em></li>")
            html_lines.append("</ul>")
            return {"reply": "\n".join(lines), "html": "\n".join(html_lines), "products": sel}

    return {"reply": reply}

@app.post("/chat")
def simple_chat_endpoint(request: SimpleChatRequest):
    """Simple chat endpoint for the modern frontend"""
    msg = request.message
    
    try:
        # Use mistral model by default, fallback to sbert if error
        reply = models.reply_mistral(msg)
    except Exception:
        try:
            reply = models.reply_sbert(msg)
        except Exception:
            reply = "I'm currently unavailable. Please try again later."
    
    return {"response": reply}

@app.post("/auth/register")
def register_endpoint(request: RegisterRequest):
    """Register a new user"""
    # Check if user already exists
    existing = get_db_user(request.email)
    if existing:
        return {"success": False, "error": "Email already registered"}
    
    # Create new user
    result = create_db_user(request.email, request.password, request.username)
    if result:
        return {"success": True, "message": "Account created successfully", "username": request.username}
    return {"success": False, "error": "Registration failed"}

@app.post("/auth/login")
def login_endpoint(request: LoginRequest):
    """Login a user"""
    user = get_db_user(request.email)
    
    if not user:
        return {"success": False, "error": "Invalid email or password"}
    
    if not verify_password(request.password, user.get("password", "")):
        return {"success": False, "error": "Invalid email or password"}
    
    return {"success": True, "username": user.get("username", ""), "email": request.email}

@app.post("/api/greeting")
def greeting_endpoint(request: GreetingRequest):
    """Generate personalized greeting with product recommendations based on search history"""
    result = models.generate_greeting(request.username, request.lastSearch)
    return result

@app.post("/conversations/save")
def save_conversation_endpoint(request: SaveConversationRequest):
    """Save a conversation for a user"""
    # sanitize messages to ensure JSON-serializable types (convert ObjectId etc.)
    def sanitize(obj: Any) -> Any:
        if isinstance(obj, dict):
            out = {}
            for k, v in obj.items():
                out[k] = sanitize(v)
            return out
        if isinstance(obj, list):
            return [sanitize(v) for v in obj]
        if isinstance(obj, ObjectId):
            return str(obj)
        return obj

    safe_messages = [sanitize(m) for m in request.messages]
    result = save_conversation(request.user_email, request.conversation_id, safe_messages)
    return {"success": result}

@app.post("/conversations/get")
def get_conversations_endpoint(request: GetConversationsRequest):
    """Get all conversations for a user"""
    conversations = get_user_conversations(request.user_email, limit=6)
    # sanitize any ObjectId inside stored messages before returning
    def sanitize(obj: Any) -> Any:
        if isinstance(obj, dict):
            out = {}
            for k, v in obj.items():
                out[k] = sanitize(v)
            return out
        if isinstance(obj, list):
            return [sanitize(v) for v in obj]
        if isinstance(obj, ObjectId):
            return str(obj)
        return obj

    for conv in conversations:
        if isinstance(conv.get('messages'), list):
            conv['messages'] = [sanitize(m) for m in conv['messages']]

    return {"conversations": conversations}

@app.post("/conversations/delete")
def delete_conversation_endpoint(request: DeleteConversationRequest):
    """Delete a conversation"""
    result = delete_conversation(request.user_email, request.conversation_id)
    return {"success": result}

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


