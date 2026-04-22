from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models
from auth_utils import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
)
from email_utils import send_welcome_email

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool

    class Config:
        from_attributes = True


@router.post("/register")
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Default subscription record
    sub = models.Subscription(user_id=user.id)
    db.add(sub)
    db.commit()

    await send_welcome_email(user.email, user.full_name)

    token = create_access_token({"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(user),
    }


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(user),
    }


@router.get("/me")
def me(current_user: models.User = Depends(get_current_user)):
    return UserResponse.from_orm(current_user)
