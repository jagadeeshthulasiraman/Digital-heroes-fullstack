from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
import json
import random
from datetime import datetime, timezone
from database import get_db
import models
from auth_utils import get_current_user, get_current_admin

router = APIRouter()

MONTHLY_SUBSCRIPTION_AMOUNT = 10.0  # £10/month base


class DrawResponse(BaseModel):
    id: int
    month: str
    status: str
    draw_type: str
    drawn_numbers: Optional[str]
    total_pool: float
    pool_5match: float
    pool_4match: float
    pool_3match: float
    jackpot_rollover: float
    published_at: Optional[datetime]

    class Config:
        from_attributes = True


def calculate_pools(active_subscribers: int, prev_jackpot_rollover: float = 0.0):
    # Each subscriber contributes £1 to prize pool (10% of £10)
    total_pool = active_subscribers * 1.0 + prev_jackpot_rollover
    return {
        "total_pool": total_pool,
        "pool_5match": round(total_pool * 0.40, 2),
        "pool_4match": round(total_pool * 0.35, 2),
        "pool_3match": round(total_pool * 0.25, 2),
    }


def run_draw_algorithm(db: Session, draw_type: str = "random"):
    """Generate 5 numbers 1-45"""
    if draw_type == "algorithm":
        # Weight by most frequent user scores
        all_scores = db.query(models.Score.score).all()
        if all_scores:
            score_list = [s[0] for s in all_scores]
            freq = {}
            for s in score_list:
                freq[s] = freq.get(s, 0) + 1
            numbers = list(range(1, 46))
            weights = [freq.get(n, 0) + 1 for n in numbers]
            drawn = random.choices(numbers, weights=weights, k=5)
            # Ensure unique
            seen = set()
            unique_drawn = []
            for n in drawn:
                while n in seen:
                    n = random.randint(1, 45)
                seen.add(n)
                unique_drawn.append(n)
            return sorted(unique_drawn)
    # Default random
    return sorted(random.sample(range(1, 46), 5))


def check_matches(user_scores: List[int], drawn_numbers: List[int]) -> int:
    """Return number of matches (3, 4, 5 or 0)"""
    matches = len(set(user_scores) & set(drawn_numbers))
    if matches >= 3:
        return matches
    return 0


@router.get("/", response_model=List[DrawResponse])
def list_draws(db: Session = Depends(get_db)):
    draws = db.query(models.Draw).order_by(models.Draw.id.desc()).all()
    return draws


@router.get("/latest", response_model=Optional[DrawResponse])
def latest_draw(db: Session = Depends(get_db)):
    draw = db.query(models.Draw).filter(
        models.Draw.status == "published"
    ).order_by(models.Draw.id.desc()).first()
    return draw


@router.post("/simulate")
def simulate_draw(
    draw_type: str = "random",
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: simulate draw without publishing"""
    month = datetime.now().strftime("%Y-%m")

    # Get previous jackpot rollover
    last_draw = db.query(models.Draw).order_by(models.Draw.id.desc()).first()
    rollover = 0.0
    if last_draw and last_draw.status == "published":
        # Check if jackpot (5-match) was won
        jackpot_winner = db.query(models.Winner).filter(
            models.Winner.draw_id == last_draw.id,
            models.Winner.match_type == 5
        ).first()
        if not jackpot_winner:
            rollover = last_draw.pool_5match

    active_subs = db.query(models.Subscription).filter(
        models.Subscription.status == "active"
    ).count()

    pools = calculate_pools(active_subs, rollover)
    drawn = run_draw_algorithm(db, draw_type)

    return {
        "month": month,
        "draw_type": draw_type,
        "drawn_numbers": drawn,
        "total_pool": pools["total_pool"],
        "pool_5match": pools["pool_5match"],
        "pool_4match": pools["pool_4match"],
        "pool_3match": pools["pool_3match"],
        "jackpot_rollover": rollover,
        "active_subscribers": active_subs,
        "simulation": True
    }


@router.post("/publish")
def publish_draw(
    draw_type: str = "random",
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: run and publish official monthly draw"""
    month = datetime.now().strftime("%Y-%m")

    existing = db.query(models.Draw).filter(models.Draw.month == month).first()
    if existing and existing.status == "published":
        raise HTTPException(status_code=400, detail="Draw already published for this month")

    # Rollover check
    last_draw = db.query(models.Draw).filter(
        models.Draw.status == "published"
    ).order_by(models.Draw.id.desc()).first()
    rollover = 0.0
    if last_draw:
        jackpot_winner = db.query(models.Winner).filter(
            models.Winner.draw_id == last_draw.id,
            models.Winner.match_type == 5
        ).first()
        if not jackpot_winner:
            rollover = last_draw.pool_5match

    active_subs = db.query(models.Subscription).filter(
        models.Subscription.status == "active"
    ).count()

    pools = calculate_pools(active_subs, rollover)
    drawn_numbers = run_draw_algorithm(db, draw_type)

    if existing:
        draw = existing
    else:
        draw = models.Draw(month=month)
        db.add(draw)

    draw.status = "published"
    draw.draw_type = draw_type
    draw.drawn_numbers = json.dumps(drawn_numbers)
    draw.total_pool = pools["total_pool"]
    draw.pool_5match = pools["pool_5match"]
    draw.pool_4match = pools["pool_4match"]
    draw.pool_3match = pools["pool_3match"]
    draw.jackpot_rollover = rollover
    draw.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(draw)

    # Determine winners from active subscribers with scores
    active_users = db.query(models.User).join(models.Subscription).filter(
        models.Subscription.status == "active"
    ).all()

    winners_by_tier = {3: [], 4: [], 5: []}
    for user in active_users:
        user_scores = [s.score for s in user.scores]
        if len(user_scores) == 0:
            continue
        matches = check_matches(user_scores, drawn_numbers)
        if matches in winners_by_tier:
            winners_by_tier[matches].append(user)

    # Create winner records
    for match_type, users in winners_by_tier.items():
        if not users:
            continue
        pool_key = f"pool_{match_type}match"
        pool_amount = getattr(draw, pool_key)
        prize_each = round(pool_amount / len(users), 2) if users else 0

        for user in users:
            winner = models.Winner(
                draw_id=draw.id,
                user_id=user.id,
                match_type=match_type,
                prize_amount=prize_each
            )
            db.add(winner)

    db.commit()

    return {
        "draw_id": draw.id,
        "month": month,
        "drawn_numbers": drawn_numbers,
        "pools": pools,
        "winners_count": {
            "5match": len(winners_by_tier[5]),
            "4match": len(winners_by_tier[4]),
            "3match": len(winners_by_tier[3]),
        }
    }
