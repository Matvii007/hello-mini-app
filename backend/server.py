from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hashlib
import hmac
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'nosmoke_secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 720  # 30 days

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Subscription Plans
SUBSCRIPTION_PLANS = {
    "premium_monthly": {"price": 4.99, "name": "Premium Monthly", "period": "monthly"},
    "premium_yearly": {"price": 39.99, "name": "Premium Yearly", "period": "yearly"}
}

# Create the main app
app = FastAPI(title="NoSmoke API", version="1.0.0")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
events_router = APIRouter(prefix="/events", tags=["Events"])
triggers_router = APIRouter(prefix="/triggers", tags=["Triggers"])
progress_router = APIRouter(prefix="/progress", tags=["Progress"])
profile_router = APIRouter(prefix="/profile", tags=["Profile"])
subscription_router = APIRouter(prefix="/subscription", tags=["Subscription"])
insights_router = APIRouter(prefix="/insights", tags=["Insights"])

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    cigarettes_per_day: int = 10
    cost_per_pack: float = 10.0
    cigarettes_per_pack: int = 20
    quit_date: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TelegramAuth(BaseModel):
    init_data: str
    telegram_id: int
    first_name: str
    last_name: Optional[str] = ""
    username: Optional[str] = ""

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: Optional[str] = None
    name: str
    telegram_id: Optional[int] = None
    cigarettes_per_day: int = 10
    cost_per_pack: float = 10.0
    cigarettes_per_pack: int = 20
    quit_date: Optional[str] = None
    subscription_status: str = "free"
    subscription_end: Optional[str] = None
    created_at: str

class EventCreate(BaseModel):
    event_type: str  # "urge", "cigarette", "resisted"
    context: Optional[str] = ""
    intensity: Optional[int] = 5  # 1-10 scale for urges

class EventResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    event_type: str
    context: str
    intensity: int
    created_at: str

class TriggerCreate(BaseModel):
    trigger_type: str  # "stress", "boredom", "social", "habit", "other"
    description: Optional[str] = ""
    location: Optional[str] = ""

class TriggerResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    trigger_type: str
    description: str
    location: str
    created_at: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    cigarettes_per_day: Optional[int] = None
    cost_per_pack: Optional[float] = None
    cigarettes_per_pack: Optional[int] = None
    quit_date: Optional[str] = None

class CheckoutCreate(BaseModel):
    plan_id: str
    origin_url: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ===================== HELPER FUNCTIONS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def user_to_response(user: dict) -> UserResponse:
    return UserResponse(
        id=user["id"],
        email=user.get("email"),
        name=user["name"],
        telegram_id=user.get("telegram_id"),
        cigarettes_per_day=user.get("cigarettes_per_day", 10),
        cost_per_pack=user.get("cost_per_pack", 10.0),
        cigarettes_per_pack=user.get("cigarettes_per_pack", 20),
        quit_date=user.get("quit_date"),
        subscription_status=user.get("subscription_status", "free"),
        subscription_end=user.get("subscription_end"),
        created_at=user["created_at"]
    )

# ===================== AUTH ROUTES =====================

@auth_router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "cigarettes_per_day": user_data.cigarettes_per_day,
        "cost_per_pack": user_data.cost_per_pack,
        "cigarettes_per_pack": user_data.cigarettes_per_pack,
        "quit_date": user_data.quit_date or now[:10],
        "subscription_status": "free",
        "subscription_end": None,
        "created_at": now
    }
    
    await db.users.insert_one(user)
    token = create_token(user_id)
    
    return TokenResponse(access_token=token, user=user_to_response(user))

@auth_router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    return TokenResponse(access_token=token, user=user_to_response(user))

@auth_router.post("/telegram", response_model=TokenResponse)
async def telegram_auth(auth_data: TelegramAuth):
    """Authenticate via Telegram Mini App"""
    # In production, verify init_data with Telegram Bot Token
    # For now, we trust the telegram_id from the client
    
    user = await db.users.find_one({"telegram_id": auth_data.telegram_id}, {"_id": 0})
    
    if not user:
        # Create new user for Telegram
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        user = {
            "id": user_id,
            "telegram_id": auth_data.telegram_id,
            "name": f"{auth_data.first_name} {auth_data.last_name}".strip(),
            "username": auth_data.username,
            "cigarettes_per_day": 10,
            "cost_per_pack": 10.0,
            "cigarettes_per_pack": 20,
            "quit_date": now[:10],
            "subscription_status": "free",
            "subscription_end": None,
            "created_at": now
        }
        await db.users.insert_one(user)
    
    token = create_token(user["id"])
    return TokenResponse(access_token=token, user=user_to_response(user))

@auth_router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return user_to_response(user)

# ===================== EVENTS ROUTES =====================

@events_router.post("", response_model=EventResponse)
async def create_event(event_data: EventCreate, user: dict = Depends(get_current_user)):
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    event = {
        "id": event_id,
        "user_id": user["id"],
        "event_type": event_data.event_type,
        "context": event_data.context or "",
        "intensity": event_data.intensity or 5,
        "created_at": now
    }
    
    await db.events.insert_one(event)
    return EventResponse(**event)

@events_router.get("", response_model=List[EventResponse])
async def get_events(
    event_type: Optional[str] = None,
    days: int = 7,
    user: dict = Depends(get_current_user)
):
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    query = {"user_id": user["id"], "created_at": {"$gte": start_date}}
    if event_type:
        query["event_type"] = event_type
    
    events = await db.events.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [EventResponse(**e) for e in events]

@events_router.get("/today", response_model=Dict[str, Any])
async def get_today_stats(user: dict = Depends(get_current_user)):
    """Get today's statistics"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    events = await db.events.find(
        {"user_id": user["id"], "created_at": {"$gte": today_start}},
        {"_id": 0}
    ).to_list(1000)
    
    cigarettes = sum(1 for e in events if e["event_type"] == "cigarette")
    urges = sum(1 for e in events if e["event_type"] == "urge")
    resisted = sum(1 for e in events if e["event_type"] == "resisted")
    
    # Get last cigarette time
    last_cigarette = await db.events.find_one(
        {"user_id": user["id"], "event_type": "cigarette"},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    last_cigarette_time = last_cigarette["created_at"] if last_cigarette else user.get("quit_date")
    
    return {
        "cigarettes_today": cigarettes,
        "urges_today": urges,
        "resisted_today": resisted,
        "last_cigarette": last_cigarette_time,
        "events": events[-10:]  # Last 10 events
    }

# ===================== TRIGGERS ROUTES =====================

@triggers_router.post("", response_model=TriggerResponse)
async def create_trigger(trigger_data: TriggerCreate, user: dict = Depends(get_current_user)):
    trigger_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    trigger = {
        "id": trigger_id,
        "user_id": user["id"],
        "trigger_type": trigger_data.trigger_type,
        "description": trigger_data.description or "",
        "location": trigger_data.location or "",
        "created_at": now
    }
    
    await db.triggers.insert_one(trigger)
    return TriggerResponse(**trigger)

@triggers_router.get("", response_model=List[TriggerResponse])
async def get_triggers(days: int = 30, user: dict = Depends(get_current_user)):
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    triggers = await db.triggers.find(
        {"user_id": user["id"], "created_at": {"$gte": start_date}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return [TriggerResponse(**t) for t in triggers]

@triggers_router.get("/patterns", response_model=Dict[str, Any])
async def get_trigger_patterns(user: dict = Depends(get_current_user)):
    """Analyze trigger patterns"""
    triggers = await db.triggers.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    # Count by type
    type_counts = {}
    for t in triggers:
        type_counts[t["trigger_type"]] = type_counts.get(t["trigger_type"], 0) + 1
    
    # Get most common
    sorted_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)
    
    return {
        "total_triggers": len(triggers),
        "by_type": type_counts,
        "most_common": sorted_types[0][0] if sorted_types else None,
        "top_triggers": sorted_types[:5]
    }

# ===================== PROGRESS ROUTES =====================

@progress_router.get("/summary", response_model=Dict[str, Any])
async def get_progress_summary(user: dict = Depends(get_current_user)):
    """Get overall progress summary"""
    quit_date = user.get("quit_date")
    if quit_date:
        quit_datetime = datetime.fromisoformat(quit_date.replace("Z", "+00:00") if "Z" in quit_date else quit_date)
        if quit_datetime.tzinfo is None:
            quit_datetime = quit_datetime.replace(tzinfo=timezone.utc)
        days_smoke_free = (datetime.now(timezone.utc) - quit_datetime).days
    else:
        days_smoke_free = 0
    
    # Count cigarettes avoided (based on daily average)
    cigarettes_avoided = days_smoke_free * user.get("cigarettes_per_day", 10)
    
    # Money saved
    cost_per_cigarette = user.get("cost_per_pack", 10.0) / user.get("cigarettes_per_pack", 20)
    money_saved = cigarettes_avoided * cost_per_cigarette
    
    # Calculate streak (consecutive days without smoking)
    events = await db.events.find(
        {"user_id": user["id"], "event_type": "cigarette"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    current_streak = days_smoke_free
    if events:
        last_smoke = datetime.fromisoformat(events[0]["created_at"].replace("Z", "+00:00"))
        if last_smoke.tzinfo is None:
            last_smoke = last_smoke.replace(tzinfo=timezone.utc)
        current_streak = (datetime.now(timezone.utc) - last_smoke).days
    
    return {
        "days_smoke_free": max(0, days_smoke_free),
        "current_streak": max(0, current_streak),
        "cigarettes_avoided": max(0, cigarettes_avoided),
        "money_saved": round(max(0, money_saved), 2),
        "quit_date": quit_date
    }

@progress_router.get("/weekly", response_model=Dict[str, Any])
async def get_weekly_progress(user: dict = Depends(get_current_user)):
    """Get weekly progress data for charts"""
    now = datetime.now(timezone.utc)
    days = []
    
    for i in range(7):
        day = now - timedelta(days=6-i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
        
        events = await db.events.find({
            "user_id": user["id"],
            "created_at": {"$gte": day_start, "$lte": day_end}
        }, {"_id": 0}).to_list(1000)
        
        days.append({
            "date": day.strftime("%Y-%m-%d"),
            "day_name": day.strftime("%a"),
            "cigarettes": sum(1 for e in events if e["event_type"] == "cigarette"),
            "urges": sum(1 for e in events if e["event_type"] == "urge"),
            "resisted": sum(1 for e in events if e["event_type"] == "resisted")
        })
    
    return {"days": days}

@progress_router.get("/monthly", response_model=Dict[str, Any])
async def get_monthly_progress(user: dict = Depends(get_current_user)):
    """Get monthly progress data"""
    now = datetime.now(timezone.utc)
    weeks = []
    
    for i in range(4):
        week_end = now - timedelta(weeks=i)
        week_start = week_end - timedelta(days=7)
        
        events = await db.events.find({
            "user_id": user["id"],
            "created_at": {"$gte": week_start.isoformat(), "$lte": week_end.isoformat()}
        }, {"_id": 0}).to_list(1000)
        
        weeks.append({
            "week": f"Week {4-i}",
            "start_date": week_start.strftime("%m/%d"),
            "end_date": week_end.strftime("%m/%d"),
            "cigarettes": sum(1 for e in events if e["event_type"] == "cigarette"),
            "urges": sum(1 for e in events if e["event_type"] == "urge"),
            "resisted": sum(1 for e in events if e["event_type"] == "resisted")
        })
    
    return {"weeks": list(reversed(weeks))}

# ===================== PROFILE ROUTES =====================

@profile_router.put("", response_model=UserResponse)
async def update_profile(profile_data: ProfileUpdate, user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.users.update_one({"id": user["id"]}, {"$set": update_dict})
        user.update(update_dict)
    
    return user_to_response(user)

@profile_router.get("/stats", response_model=Dict[str, Any])
async def get_profile_stats(user: dict = Depends(get_current_user)):
    """Get detailed profile statistics"""
    total_events = await db.events.count_documents({"user_id": user["id"]})
    total_triggers = await db.triggers.count_documents({"user_id": user["id"]})
    
    return {
        "total_events_logged": total_events,
        "total_triggers_logged": total_triggers,
        "subscription_status": user.get("subscription_status", "free"),
        "subscription_end": user.get("subscription_end"),
        "member_since": user.get("created_at")
    }

# ===================== SUBSCRIPTION ROUTES =====================

@subscription_router.get("/plans", response_model=Dict[str, Any])
async def get_subscription_plans():
    """Get available subscription plans"""
    return {"plans": SUBSCRIPTION_PLANS}

@subscription_router.post("/checkout", response_model=Dict[str, Any])
async def create_checkout(checkout_data: CheckoutCreate, request: Request, user: dict = Depends(get_current_user)):
    """Create Stripe checkout session"""
    if checkout_data.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    plan = SUBSCRIPTION_PLANS[checkout_data.plan_id]
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{checkout_data.origin_url}/profile?session_id={{CHECKOUT_SESSION_ID}}&status=success"
    cancel_url = f"{checkout_data.origin_url}/profile?status=cancelled"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(plan["price"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["id"],
            "plan_id": checkout_data.plan_id,
            "plan_name": plan["name"]
        }
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "plan_id": checkout_data.plan_id,
        "amount": plan["price"],
        "currency": "usd",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    return {"checkout_url": session.url, "session_id": session.session_id}

@subscription_router.get("/status/{session_id}", response_model=Dict[str, Any])
async def get_checkout_status(session_id: str, user: dict = Depends(get_current_user)):
    """Check checkout session status and update subscription"""
    host_url = "https://example.com"  # Placeholder, not needed for status check
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction
        transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        
        if transaction and transaction.get("payment_status") != "paid" and status.payment_status == "paid":
            # Update transaction status
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            # Update user subscription
            plan_id = transaction.get("plan_id", "premium_monthly")
            period_days = 365 if "yearly" in plan_id else 30
            subscription_end = (datetime.now(timezone.utc) + timedelta(days=period_days)).isoformat()
            
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"subscription_status": "premium", "subscription_end": subscription_end}}
            )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount": status.amount_total / 100,  # Convert cents to dollars
            "currency": status.currency
        }
    except Exception as e:
        logger.error(f"Error checking checkout status: {e}")
        raise HTTPException(status_code=400, detail="Could not fetch payment status")

# ===================== INSIGHTS ROUTES (MOCKED) =====================

MOCKED_INSIGHTS = [
    {
        "id": "1",
        "title": "Your Most Vulnerable Time",
        "content": "Based on your logging patterns, you experience the most cravings in the afternoon between 2-4 PM. Consider scheduling a short walk or activity during this time.",
        "category": "pattern",
        "premium": False
    },
    {
        "id": "2", 
        "title": "Stress is Your Top Trigger",
        "content": "70% of your logged triggers are stress-related. Try deep breathing exercises or the 4-7-8 technique when feeling stressed.",
        "category": "trigger",
        "premium": False
    },
    {
        "id": "3",
        "title": "You're Getting Stronger",
        "content": "Your resistance rate has improved by 15% this week compared to last week. Keep up the great work!",
        "category": "motivation",
        "premium": False
    },
    {
        "id": "4",
        "title": "Advanced Craving Analysis",
        "content": "Your cravings peak on Mondays and decrease through the week. This pattern suggests work-related stress. Consider implementing Monday morning rituals.",
        "category": "analysis",
        "premium": True
    },
    {
        "id": "5",
        "title": "Personalized Quit Strategy",
        "content": "Based on your data, a gradual reduction approach might work better for you. We recommend reducing by 2 cigarettes per week.",
        "category": "strategy",
        "premium": True
    }
]

MOCKED_TIPS = [
    "Drink a glass of water when you feel an urge - it helps reduce cravings",
    "Take 5 deep breaths: inhale for 4 seconds, hold for 4, exhale for 4",
    "Chew sugar-free gum or eat a healthy snack to keep your mouth busy",
    "Call or text a supportive friend when cravings hit",
    "Remember: cravings typically last only 3-5 minutes",
    "Go for a short walk - physical activity reduces cravings",
    "Brush your teeth when you feel the urge to smoke"
]

@insights_router.get("", response_model=Dict[str, Any])
async def get_insights(user: dict = Depends(get_current_user)):
    """Get AI-powered insights (mocked)"""
    is_premium = user.get("subscription_status") == "premium"
    
    insights = [i for i in MOCKED_INSIGHTS if not i["premium"] or is_premium]
    
    import random
    tip = random.choice(MOCKED_TIPS)
    
    return {
        "insights": insights,
        "daily_tip": tip,
        "is_premium": is_premium
    }

@insights_router.get("/education", response_model=Dict[str, Any])
async def get_educational_content():
    """Get educational content about quitting"""
    return {
        "articles": [
            {
                "id": "1",
                "title": "Why Nicotine is Addictive",
                "summary": "Nicotine activates reward pathways in your brain, creating a cycle of craving and relief.",
                "read_time": "3 min"
            },
            {
                "id": "2",
                "title": "Health Benefits Timeline",
                "summary": "Your body starts healing within 20 minutes of your last cigarette.",
                "read_time": "4 min"
            },
            {
                "id": "3",
                "title": "Managing Withdrawal",
                "summary": "Learn strategies to cope with common withdrawal symptoms.",
                "read_time": "5 min"
            }
        ],
        "milestones": [
            {"time": "20 min", "benefit": "Heart rate drops to normal"},
            {"time": "12 hours", "benefit": "Carbon monoxide levels normalize"},
            {"time": "24 hours", "benefit": "Anxiety peaks then decreases"},
            {"time": "48 hours", "benefit": "Taste and smell improve"},
            {"time": "72 hours", "benefit": "Breathing becomes easier"},
            {"time": "1 week", "benefit": "Risk of heart attack decreases"},
            {"time": "2 weeks", "benefit": "Circulation improves"},
            {"time": "1 month", "benefit": "Lung function improves up to 30%"},
            {"time": "1 year", "benefit": "Heart disease risk drops by 50%"}
        ]
    }

# ===================== WEBHOOK ROUTE =====================

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        # Process webhook (simplified)
        logger.info("Received Stripe webhook")
        return {"status": "received"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ===================== ROOT ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "NoSmoke API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(events_router)
api_router.include_router(triggers_router)
api_router.include_router(progress_router)
api_router.include_router(profile_router)
api_router.include_router(subscription_router)
api_router.include_router(insights_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
