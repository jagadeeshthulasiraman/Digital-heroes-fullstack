from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator
from typing import List, Optional
from database import get_db
import models
from auth_utils import get_current_user, get_current_admin

router = APIRouter()


class ScoreCreate(BaseModel):
    score: int
    date: str  # YYYY-MM-DD

    @validator("score")
    def score_range(cls, v):
        if not 1 <= v <= 45:
            raise ValueError("Score must be between 1 and 45")
        return v


class ScoreUpdate(BaseModel):
    score: int

    @validator("score")
    def score_range(cls, v):
        if not 1 <= v <= 45:
            raise ValueError("Score must be between 1 and 45")
        return v


class ScoreResponse(BaseModel):
    id: int
    score: int
    date: str
    user_id: int

    class Config:
        from_attributes = True


def get_user_scores_sorted(db: Session, user_id: int):
    return db.query(models.Score).filter(
        models.Score.user_id == user_id
    ).order_by(models.Score.date.desc()).all()


@router.get("/", response_model=List[ScoreResponse])
def get_scores(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_user_scores_sorted(db, current_user.id)


@router.post("/", response_model=ScoreResponse)
def add_score(
    req: ScoreCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check duplicate date
    existing_date = db.query(models.Score).filter(
        models.Score.user_id == current_user.id,
        models.Score.date == req.date
    ).first()
    if existing_date:
        raise HTTPException(status_code=400, detail="Score already exists for this date")

    # Add new score
    score = models.Score(user_id=current_user.id, score=req.score, date=req.date)
    db.add(score)
    db.commit()
    db.refresh(score)

    # Enforce rolling 5 - remove oldest if > 5
    all_scores = get_user_scores_sorted(db, current_user.id)
    if len(all_scores) > 5:
        oldest = all_scores[-1]
        db.delete(oldest)
        db.commit()

    return score


@router.put("/{score_id}", response_model=ScoreResponse)
def update_score(
    score_id: int,
    req: ScoreUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    score = db.query(models.Score).filter(
        models.Score.id == score_id,
        models.Score.user_id == current_user.id
    ).first()
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")

    score.score = req.score
    db.commit()
    db.refresh(score)
    return score


@router.delete("/{score_id}")
def delete_score(
    score_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    score = db.query(models.Score).filter(
        models.Score.id == score_id,
        models.Score.user_id == current_user.id
    ).first()
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")

    db.delete(score)
    db.commit()
    return {"message": "Score deleted"}


# Admin: edit any user score
@router.put("/admin/{score_id}", response_model=ScoreResponse)
def admin_update_score(
    score_id: int,
    req: ScoreUpdate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    score = db.query(models.Score).filter(models.Score.id == score_id).first()
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")
    score.score = req.score
    db.commit()
    db.refresh(score)
    return score
