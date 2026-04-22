from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models
from auth_utils import get_current_admin

router = APIRouter()


@router.get("/dashboard")
def admin_dashboard(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_users = db.query(models.User).count()
    active_subs = db.query(models.Subscription).filter(
        models.Subscription.status == "active"
    ).count()
    total_subs = db.query(models.Subscription).count()

    total_pool = db.query(func.sum(models.Draw.total_pool)).scalar() or 0
    total_charity = db.query(
        func.sum(models.Subscription.amount_paid * 0.1)
    ).filter(models.Subscription.status == "active").scalar() or 0

    draws_count = db.query(models.Draw).filter(
        models.Draw.status == "published"
    ).count()

    winners_pending = db.query(models.Winner).filter(
        models.Winner.status == "pending"
    ).count()

    return {
        "total_users": total_users,
        "active_subscribers": active_subs,
        "total_subscriptions": total_subs,
        "total_prize_pool_distributed": round(total_pool, 2),
        "total_charity_contributions": round(total_charity, 2),
        "draws_published": draws_count,
        "winners_pending_verification": winners_pending,
    }


@router.get("/users")
def list_users(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    users = db.query(models.User).all()
    result = []
    for u in users:
        sub = db.query(models.Subscription).filter(
            models.Subscription.user_id == u.id
        ).first()
        scores = db.query(models.Score).filter(
            models.Score.user_id == u.id
        ).order_by(models.Score.date.desc()).all()
        result.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "is_admin": u.is_admin,
            "subscription_status": sub.status if sub else "none",
            "subscription_plan": sub.plan if sub else "none",
            "scores_count": len(scores),
            "scores": [{"id": s.id, "score": s.score, "date": s.date} for s in scores],
        })
    return result


@router.get("/reports")
def reports(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    draws = db.query(models.Draw).filter(
        models.Draw.status == "published"
    ).order_by(models.Draw.id.desc()).limit(10).all()

    draw_stats = []
    for d in draws:
        winners = db.query(models.Winner).filter(models.Winner.draw_id == d.id).all()
        draw_stats.append({
            "month": d.month,
            "total_pool": d.total_pool,
            "winners_5match": len([w for w in winners if w.match_type == 5]),
            "winners_4match": len([w for w in winners if w.match_type == 4]),
            "winners_3match": len([w for w in winners if w.match_type == 3]),
        })

    charity_stats = db.query(
        models.Charity.name,
        func.count(models.CharitySelection.id).label("supporters")
    ).join(models.CharitySelection).group_by(models.Charity.name).all()

    return {
        "draw_statistics": draw_stats,
        "charity_support": [{"name": c[0], "supporters": c[1]} for c in charity_stats],
    }
