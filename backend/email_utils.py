"""
Simple email helper using aiosmtplib / fastapi-mail.

If MAIL_USERNAME is not set (local dev), emails are just printed to stdout.
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM", "noreply@digitalheroes.com")
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Digital Heroes Golf")
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", "465"))
MAIL_SSL_TLS = os.getenv("MAIL_SSL_TLS", "true").lower() == "true"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


async def send_email(to: str, subject: str, html_body: str):
    """Send an email. Falls back to logging if SMTP is not configured."""
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        logger.info(f"[EMAIL] To: {to} | Subject: {subject}")
        logger.debug(html_body)
        return

    try:
        import aiosmtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{MAIL_FROM_NAME} <{MAIL_FROM}>"
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html"))

        await aiosmtplib.send(
            msg,
            hostname=MAIL_SERVER,
            port=MAIL_PORT,
            username=MAIL_USERNAME,
            password=MAIL_PASSWORD,
            use_tls=MAIL_SSL_TLS,
        )
    except Exception as exc:
        logger.error(f"Failed to send email to {to}: {exc}")


# ── Template helpers ──────────────────────────────────────────────


def _wrap(content: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
      <h2 style="color:#166534">Digital Heroes Golf</h2>
      {content}
      <hr style="margin-top:32px">
      <p style="font-size:12px;color:#6b7280">© Digital Heroes Golf. All rights reserved.</p>
    </div>
    """


async def send_welcome_email(to: str, full_name: str):
    html = _wrap(f"""
        <p>Hi {full_name},</p>
        <p>Welcome to <strong>Digital Heroes Golf</strong>! Your account is ready.</p>
        <p>
          <a href="{FRONTEND_URL}/dashboard"
             style="background:#166534;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
            Go to Dashboard
          </a>
        </p>
    """)
    await send_email(to, "Welcome to Digital Heroes Golf!", html)


async def send_subscription_confirmation(
    to: str, full_name: str, plan: str, amount: float, renewal_date: str
):
    html = _wrap(f"""
        <p>Hi {full_name},</p>
        <p>Your <strong>{plan}</strong> subscription is now active.</p>
        <ul>
          <li>Amount paid: <strong>₹{amount:.0f}</strong></li>
          <li>Next renewal: <strong>{renewal_date}</strong></li>
        </ul>
        <p>You now have full access to enter draws and submit your golf scores.</p>
    """)
    await send_email(to, "Subscription Confirmed – Digital Heroes Golf", html)


async def send_cancellation_email(to: str, full_name: str):
    html = _wrap(f"""
        <p>Hi {full_name},</p>
        <p>Your Digital Heroes Golf subscription has been <strong>cancelled</strong>.</p>
        <p>You can re-subscribe at any time from your dashboard.</p>
    """)
    await send_email(to, "Subscription Cancelled – Digital Heroes Golf", html)


async def send_winner_notification(
    to: str, full_name: str, match_type: int, prize_amount: float
):
    html = _wrap(f"""
        <p>Congratulations {full_name}! 🎉</p>
        <p>You matched <strong>{match_type} numbers</strong> in this month's draw!</p>
        <p>Your prize: <strong>₹{prize_amount:.0f}</strong></p>
        <p>Our team will be in touch to verify and process your prize payment.</p>
    """)
    await send_email(to, "🏆 You Won in Digital Heroes Golf!", html)
