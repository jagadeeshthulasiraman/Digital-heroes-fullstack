from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
import models
from auth_utils import get_current_user, get_current_admin

router = APIRouter()


class CharityCreate(BaseModel):
    name: str
    description: str
    image_url: Optional[str] = None
    website: Optional[str] = None
    is_featured: bool = False


class CharityResponse(BaseModel):
    id: int
    name: str
    description: str
    image_url: Optional[str]
    website: Optional[str]
    is_featured: bool
    is_active: bool

    class Config:
        from_attributes = True


class CharitySelectRequest(BaseModel):
    charity_id: int
    contribution_percentage: float = 10.0


@router.get("/", response_model=List[CharityResponse])
def list_charities(db: Session = Depends(get_db)):
    return db.query(models.Charity).filter(models.Charity.is_active == True).all()


@router.get("/{charity_id}", response_model=CharityResponse)
def get_charity(charity_id: int, db: Session = Depends(get_db)):
    charity = db.query(models.Charity).filter(models.Charity.id == charity_id).first()
    if not charity:
        raise HTTPException(status_code=404, detail="Charity not found")
    return charity


@router.post("/select")
def select_charity(
    req: CharitySelectRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if req.contribution_percentage < 10:
        raise HTTPException(status_code=400, detail="Minimum contribution is 10%")

    charity = db.query(models.Charity).filter(models.Charity.id == req.charity_id).first()
    if not charity:
        raise HTTPException(status_code=404, detail="Charity not found")

    selection = db.query(models.CharitySelection).filter(
        models.CharitySelection.user_id == current_user.id
    ).first()

    if selection:
        selection.charity_id = req.charity_id
        selection.contribution_percentage = req.contribution_percentage
    else:
        selection = models.CharitySelection(
            user_id=current_user.id,
            charity_id=req.charity_id,
            contribution_percentage=req.contribution_percentage
        )
        db.add(selection)

    db.commit()
    return {"message": "Charity selection updated", "charity_id": req.charity_id}


@router.get("/me/selection")
def my_charity(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    selection = db.query(models.CharitySelection).filter(
        models.CharitySelection.user_id == current_user.id
    ).first()
    if not selection:
        return None
    charity = db.query(models.Charity).filter(models.Charity.id == selection.charity_id).first()
    return {
        "charity": CharityResponse.from_orm(charity),
        "contribution_percentage": selection.contribution_percentage
    }


# Admin routes
@router.post("/admin", response_model=CharityResponse)
def create_charity(
    req: CharityCreate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    charity = models.Charity(**req.dict())
    db.add(charity)
    db.commit()
    db.refresh(charity)
    return charity


@router.put("/admin/{charity_id}", response_model=CharityResponse)
def update_charity(
    charity_id: int,
    req: CharityCreate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    charity = db.query(models.Charity).filter(models.Charity.id == charity_id).first()
    if not charity:
        raise HTTPException(status_code=404, detail="Charity not found")
    for k, v in req.dict().items():
        setattr(charity, k, v)
    db.commit()
    db.refresh(charity)
    return charity


@router.delete("/admin/{charity_id}")
def delete_charity(
    charity_id: int,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    charity = db.query(models.Charity).filter(models.Charity.id == charity_id).first()
    if not charity:
        raise HTTPException(status_code=404, detail="Charity not found")
    charity.is_active = False
    db.commit()
    return {"message": "Charity deactivated"}
