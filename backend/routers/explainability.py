from fastapi import APIRouter
from database.db_operations import add_explanation

router = APIRouter(prefix="/explain", tags=["Explainability"])

@router.post("/add")
def add_exp(id_msg: int, method: str, explanation_text: str):
    id_exp = add_explanation(id_msg, method, explanation_text)
    return {"message": "Explication ajoutée", "explanation_id": id_exp}
