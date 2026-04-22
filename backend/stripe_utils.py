"""Stripe integration helpers."""
import os
import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

STRIPE_PRICE_MONTHLY = os.getenv("STRIPE_PRICE_MONTHLY", "")
STRIPE_PRICE_YEARLY = os.getenv("STRIPE_PRICE_YEARLY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

PLAN_PRICES = {
    "monthly": STRIPE_PRICE_MONTHLY,
    "yearly": STRIPE_PRICE_YEARLY,
}

PLAN_AMOUNTS = {
    "monthly": 9900,   # paise (₹99)
    "yearly": 79900,   # paise (₹799)
}


def create_checkout_session(
    plan: str, user_email: str, user_id: int
) -> str:
    """
    Create a Stripe Checkout Session and return the redirect URL.
    Falls back to a dummy URL if Stripe keys are not configured (dev mode).
    """
    if not stripe.api_key or stripe.api_key.startswith("sk_test_..."):
        # Dev / demo mode – skip real Stripe
        return f"{FRONTEND_URL}/dashboard?subscribed=demo"

    price_id = PLAN_PRICES.get(plan)
    if not price_id:
        raise ValueError(f"No Stripe price configured for plan: {plan}")

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="subscription",
        customer_email=user_email,
        line_items=[{"price": price_id, "quantity": 1}],
        metadata={"user_id": str(user_id), "plan": plan},
        success_url=f"{FRONTEND_URL}/dashboard?subscribed=1&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{FRONTEND_URL}/dashboard?cancelled=1",
    )
    return session.url


def construct_webhook_event(payload: bytes, sig_header: str):
    """Verify and parse a Stripe webhook payload."""
    return stripe.Webhook.construct_event(
        payload, sig_header, STRIPE_WEBHOOK_SECRET
    )


def cancel_stripe_subscription(stripe_subscription_id: str):
    """Cancel a subscription in Stripe at period end."""
    if not stripe.api_key or stripe.api_key.startswith("sk_test_..."):
        return
    stripe.Subscription.modify(
        stripe_subscription_id,
        cancel_at_period_end=True,
    )
