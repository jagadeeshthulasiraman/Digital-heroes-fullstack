from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from dotenv import load_dotenv

load_dotenv()

from routers import auth, scores, draws, charities, subscriptions, admin, winners
from database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Digital Heroes API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(scores.router, prefix="/api/scores", tags=["scores"])
app.include_router(draws.router, prefix="/api/draws", tags=["draws"])
app.include_router(charities.router, prefix="/api/charities", tags=["charities"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["subscriptions"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(winners.router, prefix="/api/winners", tags=["winners"])

@app.get("/")
def root():
    return {"status": "Digital Heroes API running"}

@app.get("/health")
def health():
    return {"status": "ok"}
