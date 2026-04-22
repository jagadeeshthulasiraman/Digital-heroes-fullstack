from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class SubscriptionPlan(str, enum.Enum):
    monthly = "monthly"
    yearly = "yearly"
    none = "none"


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    cancelled = "cancelled"
    lapsed = "lapsed"


class DrawStatus(str, enum.Enum):
    pending = "pending"
    simulated = "simulated"
    published = "published"


class WinnerStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"
    paid = "paid"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    subscription = relationship("Subscription", back_populates="user", uselist=False)
    scores = relationship("Score", back_populates="user", order_by="Score.date.desc()")
    charity_selection = relationship("CharitySelection", back_populates="user", uselist=False)
    winner_entries = relationship("Winner", back_populates="user")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    plan = Column(String, default=SubscriptionPlan.none)
    status = Column(String, default=SubscriptionStatus.inactive)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    amount_paid = Column(Float, default=0.0)
    renewal_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="subscription")


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    score = Column(Integer, nullable=False)  # 1-45 Stableford
    date = Column(String, nullable=False)  # YYYY-MM-DD
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="scores")


class Charity(Base):
    __tablename__ = "charities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    image_url = Column(String, nullable=True)
    website = Column(String, nullable=True)
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    selections = relationship("CharitySelection", back_populates="charity")


class CharitySelection(Base):
    __tablename__ = "charity_selections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    charity_id = Column(Integer, ForeignKey("charities.id"))
    contribution_percentage = Column(Float, default=10.0)  # min 10%
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="charity_selection")
    charity = relationship("Charity", back_populates="selections")


class Draw(Base):
    __tablename__ = "draws"

    id = Column(Integer, primary_key=True, index=True)
    month = Column(String, nullable=False)  # YYYY-MM
    status = Column(String, default=DrawStatus.pending)
    draw_type = Column(String, default="random")  # random or algorithm
    drawn_numbers = Column(String, nullable=True)  # JSON array of 5 numbers
    total_pool = Column(Float, default=0.0)
    pool_5match = Column(Float, default=0.0)
    pool_4match = Column(Float, default=0.0)
    pool_3match = Column(Float, default=0.0)
    jackpot_rollover = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    published_at = Column(DateTime(timezone=True), nullable=True)

    winners = relationship("Winner", back_populates="draw")


class Winner(Base):
    __tablename__ = "winners"

    id = Column(Integer, primary_key=True, index=True)
    draw_id = Column(Integer, ForeignKey("draws.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    match_type = Column(Integer)  # 3, 4, or 5
    prize_amount = Column(Float, default=0.0)
    status = Column(String, default=WinnerStatus.pending)
    proof_url = Column(String, nullable=True)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    draw = relationship("Draw", back_populates="winners")
    user = relationship("User", back_populates="winner_entries")
