from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
import json

from database import get_db
import models
from auth_utils import get_current_user, get_current_admin
from email_utils import send_subscription_confirmation, send_cancellation_email
from stripe_utils import (
    create_checkout_session,
    construct_webhook_event,
    cancel_stripe_subscription,
    PLAN_AMOUNTS,
)

router = APIRouter()


class SubscribeRequest(BaseModel):
    plan: str  # "monthly" or "yearly"


class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    plan: str
    status: str
    amount_paid: float
    renewal_date: Optional[datetime]

    class Config:
        from_attributes = True


# ── User endpoints ────────────────────────────────────────────────

@router.get("/me", response_model=Optional[SubscriptionResponse])
def my_subscription(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Subscription)
        .filter(models.Subscription.user_id == current_user.id)
        .first()
    )


@router.post("/checkout")
def create_checkout(
    req: SubscribeRequest,
    current_user: models.User = Depends(get_current_user),
):
    """
    Create a Stripe Checkout session and return the redirect URL.
    In dev mode (no real Stripe keys) this immediately activates the
    subscription without going through Stripe.
    """
    if req.plan not in ["monthly", "yearly"]:
        raise HTTPException(status_code=400, detail="Invalid plan")

    url = create_checkout_session(req.plan, current_user.email, current_user.id)
    return {"checkout_url": url}


@router.post("/subscribe")
async def subscribe_direct(
    req: SubscribeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Direct subscribe (dev/demo mode – no real payment).
    In production use /checkout + Stripe webhook.
    """
    if req.plan not in ["monthly", "yearly"]:
        raise HTTPException(status_code=400, detail="Invalid plan")

    amount_paise = PLAN_AMOUNTS.get(req.plan, 9900)
    amount = amount_paise / 100
    renewal_days = 30 if req.plan == "monthly" else 365

    sub = (
        db.query(models.Subscription)
        .filter(models.Subscription.user_id == current_user.id)
        .first()
    )
    if not sub:
        sub = models.Subscription(user_id=current_user.id)
        db.add(sub)

    sub.plan = req.plan
    sub.status = "active"
    sub.amount_paid = amount
    renewal = datetime.now(timezone.utc) + timedelta(days=renewal_days)
    sub.renewal_date = renewal
    db.commit()
    db.refresh(sub)

    await send_subscription_confirmation(
        current_user.email,
        current_user.full_name,
        req.plan,
        amount,
        renewal.strftime("%d %b %Y"),
    )

    return {
        "message": f"Subscribed to {req.plan} plan",
        "subscription": SubscriptionResponse.from_orm(sub),
    }


@router.post("/cancel")
async def cancel_subscription(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(models.Subscription)
        .filter(models.Subscription.user_id == current_user.id)
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found")

    if sub.stripe_subscription_id:
        cancel_stripe_subscription(sub.stripe_subscription_id)

    sub.status = "cancelled"
    db.commit()

    await send_cancellation_email(current_user.email, current_user.full_name)

    return {"message": "Subscription cancelled"}


# ── Stripe Webhook ────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: Session = Depends(get_db),
):
    payload = await request.body()

    try:
        event = construct_webhook_event(payload, stripe_signature or "")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        user_id = int(data.get("metadata", {}).get("user_id", 0))
        plan = data.get("metadata", {}).get("plan", "monthly")
        stripe_customer = data.get("customer")
        stripe_sub_id = data.get("subscription")

        if user_id:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            sub = (
                db.query(models.Subscription)
                .filter(models.Subscription.user_id == user_id)
                .first()
            )
            if not sub:
                sub = models.Subscription(user_id=user_id)
                db.add(sub)

            amount_paise = PLAN_AMOUNTS.get(plan, 9900)
            amount = amount_paise / 100
            renewal_days = 30 if plan == "monthly" else 365
            renewal = datetime.now(timezone.utc) + timedelta(days=renewal_days)

            sub.plan = plan
            sub.status = "active"
            sub.amount_paid = amount
            sub.renewal_date = renewal
            sub.stripe_customer_id = stripe_customer
            sub.stripe_subscription_id = stripe_sub_id
            db.commit()

            if user:
                await send_subscription_confirmation(
                    user.email,
                    user.full_name,
                    plan,
                    amount,
                    renewal.strftime("%d %b %Y"),
                )

    elif event_type in ("customer.subscription.deleted", "invoice.payment_failed"):
        stripe_sub_id = data.get("id")
        sub = (
            db.query(models.Subscription)
            .filter(models.Subscription.stripe_subscription_id == stripe_sub_id)
            .first()
        )
        if sub:
            sub.status = "lapsed" if event_type == "invoice.payment_failed" else "cancelled"
            db.commit()
            user = db.query(models.User).filter(models.User.id == sub.user_id).first()
            if user:
                await send_cancellation_email(user.email, user.full_name)

    return {"received": True}


# ── Admin endpoints ───────────────────────────────────────────────

@router.get("/admin/all")
def all_subscriptions(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.Subscription).all()


@router.put("/admin/{user_id}")
def admin_update_subscription(
    user_id: int,
    status: str,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(models.Subscription)
        .filter(models.Subscription.user_id == user_id)
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    sub.status = status
    db.commit()
    return {"message": "Updated"}
