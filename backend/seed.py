"""Seed database with initial data"""
from database import SessionLocal, engine, Base
import models
from auth_utils import get_password_hash
from datetime import datetime, timezone, timedelta

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Create admin user
admin = db.query(models.User).filter(models.User.email == "admin@digitalheroes.co.in").first()
if not admin:
    admin = models.User(
        email="admin@digitalheroes.co.in",
        hashed_password=get_password_hash("Admin@123"),
        full_name="Digital Heroes Admin",
        is_admin=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    sub = models.Subscription(user_id=admin.id, status="active", plan="yearly")
    db.add(sub)
    db.commit()
    print("Admin created: admin@digitalheroes.co.in / Admin@123")

# Create test user
test_user = db.query(models.User).filter(models.User.email == "test@digitalheroes.co.in").first()
if not test_user:
    test_user = models.User(
        email="test@digitalheroes.co.in",
        hashed_password=get_password_hash("Test@123"),
        full_name="Test User",
        is_admin=False
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    sub = models.Subscription(
        user_id=test_user.id,
        status="active",
        plan="monthly",
        amount_paid=10.0,
        renewal_date=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db.add(sub)
    db.commit()
    print("Test user created: test@digitalheroes.co.in / Test@123")

# Add charities
charities = [
    {"name": "Cancer Research UK", "description": "Fighting cancer through research, influence, and information.", "is_featured": True, "website": "https://www.cancerresearchuk.org", "image_url": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400"},
    {"name": "British Heart Foundation", "description": "Leading the fight against heart and circulatory diseases.", "is_featured": False, "website": "https://www.bhf.org.uk", "image_url": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400"},
    {"name": "Macmillan Cancer Support", "description": "We provide specialist health care, information and financial support.", "is_featured": False, "website": "https://www.macmillan.org.uk", "image_url": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400"},
    {"name": "Age UK", "description": "Working with and for older people across the UK.", "is_featured": False, "website": "https://www.ageuk.org.uk", "image_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"},
    {"name": "RNLI", "description": "Saving lives at sea since 1824.", "is_featured": True, "website": "https://rnli.org", "image_url": "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400"},
]

for c in charities:
    exists = db.query(models.Charity).filter(models.Charity.name == c["name"]).first()
    if not exists:
        charity = models.Charity(**c)
        db.add(charity)

db.commit()
print("Charities seeded")

# Add sample scores for test user
from datetime import date, timedelta
existing_scores = db.query(models.Score).filter(models.Score.user_id == test_user.id).count()
if existing_scores == 0:
    today = date.today()
    sample_scores = [32, 28, 35, 22, 40]
    for i, score_val in enumerate(sample_scores):
        score = models.Score(
            user_id=test_user.id,
            score=score_val,
            date=str(today - timedelta(days=i))
        )
        db.add(score)
    db.commit()
    print("Sample scores added")

db.close()
print("Seed complete!")
