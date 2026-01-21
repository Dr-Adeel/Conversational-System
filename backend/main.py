from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from models import ModelsInterface

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
        reply = "Unknown model selected."

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

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok"}
