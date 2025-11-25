from fastapi import APIRouter
from database.db_operations import (
    start_conversation,
    add_message,
    get_conversation,
)

router = APIRouter(prefix="/conversation", tags=["Conversation"])

@router.post("/start")
def start_conv(id_user: int):
    id_conv = start_conversation(id_user)
    return {"message": "Conversation démarrée", "conversation_id": id_conv}

@router.post("/message")
def send_message(id_conv: int, sender: str, content: str):
    id_msg = add_message(id_conv, sender, content)
    return {"message": "Message ajouté", "message_id": id_msg}

@router.get("/history/{id_conv}")
def conversation_history(id_conv: int):
    data = get_conversation(id_conv)
    return {"conversation_id": id_conv, "history": data}
