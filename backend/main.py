from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.get("/api/hello")
def read_root():
    return {"message": "Hello from Python Backend!"}

@app.post("/api/chat")
def chat_endpoint(request: ChatRequest):
    user_msg = request.message.lower()

    if "hi" in user_msg or "hello" in user_msg:
        reply = "Hello! How can I help you?"
    elif "how are you" in user_msg:
        reply = "I'm just a backend, but I'm doing fine 😄"
    elif user_msg.strip() == "":
        reply = "Say something!"
    else:
        reply = f"You said: {request.message[::-1]}"

    return {"reply": reply}
