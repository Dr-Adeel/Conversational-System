from fastapi import APIRouter
from database.db_operations import insert_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/create")
def create_user(username: str, email: str):
    user_id = insert_user(username, email)
    return {"message": "Utilisateur créé avec succès", "user_id": user_id}
