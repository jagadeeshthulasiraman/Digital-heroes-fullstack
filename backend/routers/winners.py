from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
import models
from auth_utils import get_current_user, get_current_admin

router = APIRouter()


class WinnerResponse(BaseModel):
    id: int
    draw_id: int
    user_id: int
    match_type: int
    prize_amount: float
    status: str
    proof_url: Optional[str]
    admin_notes: Optional[str]

    class Config:
        from_attributes = True


class ProofSubmit(BaseModel):
    proof_url: str


class AdminVerify(BaseModel):
    status: str  # verified, rejected, paid
    admin_notes: Optional[str] = None


@router.get("/me", response_model=List[WinnerResponse])
def my_winnings(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.Winner).filter(
        models.Winner.user_id == current_user.id
    ).order_by(models.Winner.id.desc()).all()


@router.post("/{winner_id}/proof")
def submit_proof(
    winner_id: int,
    req: ProofSubmit,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    winner = db.query(models.Winner).filter(
        models.Winner.id == winner_id,
        models.Winner.user_id == current_user.id
    ).first()
    if not winner:
        raise HTTPException(status_code=404, detail="Winner record not found")

    winner.proof_url = req.proof_url
    db.commit()
    return {"message": "Proof submitted"}


@router.get("/admin/all")
def all_winners(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    winners = db.query(models.Winner).order_by(models.Winner.id.desc()).all()
    result = []
    for w in winners:
        user = db.query(models.User).filter(models.User.id == w.user_id).first()
        result.append({
            "id": w.id,
            "draw_id": w.draw_id,
            "user_id": w.user_id,
            "user_email": user.email if user else None,
            "user_name": user.full_name if user else None,
            "match_type": w.match_type,
            "prize_amount": w.prize_amount,
            "status": w.status,
            "proof_url": w.proof_url,
            "admin_notes": w.admin_notes,
        })
    return result


@router.put("/admin/{winner_id}/verify")
def verify_winner(
    winner_id: int,
    req: AdminVerify,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if req.status not in ["verified", "rejected", "paid"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    winner = db.query(models.Winner).filter(models.Winner.id == winner_id).first()
    if not winner:
        raise HTTPException(status_code=404, detail="Winner not found")

    winner.status = req.status
    if req.admin_notes:
        winner.admin_notes = req.admin_notes
    db.commit()
    return {"message": f"Winner status updated to {req.status}"}
