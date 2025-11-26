from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from models import ModelsInterface

app = FastAPI()

origins = ["http://localhost:3000"]

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
