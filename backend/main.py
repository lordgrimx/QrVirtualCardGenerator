from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
import uvicorn
import json
from datetime import datetime
import random
import os
from dotenv import load_dotenv
import ssl
import time
import asyncio

# Import database components
from database import (
    get_db, init_db, 
    Member as DBMember, 
    User as DBUser, 
    Business as DBBusiness, 
    BusinessEvent as DBBusinessEvent, 
    BusinessContract as DBBusinessContract,
    NfcReadingHistory as DBNfcReadingHistory,
    DBApiCallLog, DBDashboardStats,
    hash_password, 
    verify_password,
    cleanup_old_logs,
    calculate_daily_stats
)

# Import crypto utilities
from crypto_utils import (
    generate_secure_member_qr, 
    verify_member_qr, 
    get_public_key_pem
)
from crypto_utils import secure_qr

# Import NFC service

# Load environment variables
load_dotenv()

app = FastAPI(
    title="QR Virtual Card API",
    description="QR Virtual Card Backend API",
    version="1.0.0"
)

# CORS middleware
# Production için Vercel frontend domainini ve local geliştirme hostlarını izinli tut
frontend_url = os.getenv("FRONTEND_URL", "https://qr-virtual-card-generator.vercel.app")
allowed_origins = [
    frontend_url,
    "http://localhost:3000",
    "https://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# API Logging Middleware
@app.middleware("http")
async def log_api_calls(request: Request, call_next):
    """API çağrılarını logla"""
    start_time = time.time()
    
    # Request bilgilerini al
    method = request.method
    url = str(request.url)
    endpoint = request.url.path
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    
    # Request body'yi al (sadece POST/PUT için)
    request_payload = None
    if method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if body:
                request_payload = body.decode('utf-8')
        except:
            request_payload = None
    
    # Response'u işle
    response = await call_next(request)
    
    # Response süresini hesapla
    response_time_ms = (time.time() - start_time) * 1000
    
    # Response body'yi al (sadece hata durumlarında)
    response_payload = None
    if response.status_code >= 400:
        try:
            # Response body'yi okumak için stream'i tekrar oluştur
            if hasattr(response, 'body') and response.body:
                response_payload = response.body.decode('utf-8')
        except:
            response_payload = None
    
    # API kategorisini belirle
    api_category = "other"
    if "/api/nfc" in endpoint:
        api_category = "nfc"
    elif "/api/qr" in endpoint:
        api_category = "qr"
    elif "/auth" in endpoint:
        api_category = "auth"
    elif "/api/members" in endpoint:
        api_category = "member"
    elif "/api/dashboard" in endpoint:
        api_category = "dashboard"
    elif "/api/businesses" in endpoint:
        api_category = "business"
    
    # Error message'ı belirle
    error_message = None
    if response.status_code >= 400:
        if response.status_code == 404:
            error_message = "Not Found"
        elif response.status_code == 401:
            error_message = "Unauthorized"
        elif response.status_code == 403:
            error_message = "Forbidden"
        elif response.status_code >= 500:
            error_message = "Internal Server Error"
        else:
            error_message = f"HTTP {response.status_code}"
    
    # Log'u asenkron olarak kaydet (performans için)
    asyncio.create_task(save_api_log(
        endpoint=endpoint,
        method=method,
        status_code=response.status_code,
        response_time_ms=response_time_ms,
        ip_address=ip_address,
        user_agent=user_agent,
        request_payload=request_payload,
        response_payload=response_payload,
        error_message=error_message,
        api_category=api_category
    ))
    
    return response

async def save_api_log(endpoint: str, method: str, status_code: int, 
                      response_time_ms: float, ip_address: str = None,
                      user_agent: str = None, request_payload: str = None,
                      response_payload: str = None, error_message: str = None,
                      api_category: str = "other", member_id: int = None,
                      device_info: str = None):
    """API log'unu database'e kaydet"""
    try:
        db = next(get_db())
        
        # Request/response payload'ları çok uzunsa kısalt
        if request_payload and len(request_payload) > 10000:
            request_payload = request_payload[:10000] + "... [truncated]"
        if response_payload and len(response_payload) > 10000:
            response_payload = response_payload[:10000] + "... [truncated]"
        
        api_log = DBApiCallLog(
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time_ms=response_time_ms,
            ip_address=ip_address,
            user_agent=user_agent,
            request_payload=request_payload,
            response_payload=response_payload,
            error_message=error_message,
            api_category=api_category,
            member_id=member_id,
            device_info=device_info
        )
        
        db.add(api_log)
        db.commit()
        
    except Exception as e:
        print(f"⚠️ API log kaydetme hatası: {e}")
    finally:
        db.close()

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/")
async def read_root():
    return {"message": "QR Virtual Card API'sine hoş geldiniz!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API çalışıyor"}

# Pydantic Models
class MemberCreate(BaseModel):
    fullName: str
    phoneNumber: str
    email: str
    address: str
    dateOfBirth: str
    emergencyContact: str
    membershipType: str
    role: str
    status: str = "active"

class MemberUpdate(BaseModel):
    fullName: Optional[str] = None
    phoneNumber: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    dateOfBirth: Optional[str] = None
    emergencyContact: Optional[str] = None
    membershipType: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

# Authentication Models
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    user: UserResponse
    message: str
    success: bool = True

class UpdateProfileRequest(BaseModel):
    email: Optional[str] = None
    currentPassword: Optional[str] = None
    newPassword: Optional[str] = None

# Business Models
class BusinessCreate(BaseModel):
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    business_type: Optional[str] = None
    logo_url: Optional[str] = None

class BusinessEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str  # discount, campaign, free_shipping, etc.
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    min_purchase_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    terms_conditions: Optional[str] = None
    start_date: str  # ISO format
    end_date: str    # ISO format
    business_id: int

class BusinessContractCreate(BaseModel):
    contract_title: str
    contract_amount: float
    currency: str = "TRY"
    contract_type: str  # monthly, yearly, one_time, etc.
    commission_percentage: Optional[float] = None
    payment_terms: Optional[str] = None
    start_date: str  # ISO format
    end_date: Optional[str] = None  # ISO format, optional
    notes: Optional[str] = None

class BusinessResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    website: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    business_type: Optional[str]
    logo_url: Optional[str]
    is_active: bool
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class BusinessEventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    event_type: str
    discount_percentage: Optional[float]
    discount_amount: Optional[float]
    min_purchase_amount: Optional[float]
    max_discount_amount: Optional[float]
    terms_conditions: Optional[str]
    start_date: datetime
    end_date: datetime
    is_active: bool
    business_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class MemberResponse(BaseModel):
    id: int
    fullName: str
    membershipId: str
    cardNumber: str
    phoneNumber: str
    email: str
    address: str
    dateOfBirth: str
    emergencyContact: str
    membershipType: str
    role: str
    status: str
    createdAt: datetime
    updatedAt: datetime
    secureQrCode: Optional[str] = None  # Standart QR kod
    nfcQrCode: Optional[str] = None     # NFC kompakt veri

    success: bool = True

    class Config:
        from_attributes = True

@app.get("/api/test")
async def test_endpoint():
    return {"data": "Test verisi", "success": True}

# Authentication Endpoints

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """User login endpoint"""
    try:
        # Find user by email
        user = db.query(DBUser).filter(DBUser.email == credentials.email).first()
        
        if not user:
            raise HTTPException(status_code=401, detail="Geçersiz email veya şifre")
        
        if not user.is_active:
            raise HTTPException(status_code=401, detail="Hesap deaktif edilmiş")
        
        # Verify password
        if not verify_password(credentials.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Geçersiz email veya şifre")
        
        # Create user response
        user_response = UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at
        )
        
        return LoginResponse(
            user=user_response,
            message="Giriş başarılı",
            success=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Giriş sırasında hata oluştu")

# Registration endpoint removed - Admin only system

@app.get("/api/auth/me")
async def get_current_user(user_id: int, db: Session = Depends(get_db)):
    """Get current user information - requires user_id for now"""
    try:
        user = db.query(DBUser).filter(DBUser.id == user_id, DBUser.is_active == True).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        user_response = UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at
        )
        
        return {
            "user": user_response,
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get user error: {e}")
        raise HTTPException(status_code=500, detail="Kullanıcı bilgileri alınırken hata oluştu")

@app.put("/api/auth/update-profile")
async def update_profile(update_data: UpdateProfileRequest, db: Session = Depends(get_db)):
    """Update admin profile (email and/or password)"""
    try:
        # Admin kullanıcısını bul (hardcoded email ile)
        admin_email = "admin@qrvirtualcard.com"
        user = db.query(DBUser).filter(DBUser.email == admin_email).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="Admin kullanıcı bulunamadı")
        
        # Email güncelleme
        if update_data.email and update_data.email != user.email:
            # Email çakışma kontrolü
            existing_user = db.query(DBUser).filter(DBUser.email == update_data.email).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Bu email adresi zaten kullanılıyor")
            
            user.email = update_data.email
        
        # Şifre güncelleme
        if update_data.newPassword:
            if not update_data.currentPassword:
                raise HTTPException(status_code=400, detail="Mevcut şifre gerekli")
            
            # Mevcut şifre doğrulama
            if not verify_password(update_data.currentPassword, user.password_hash):
                raise HTTPException(status_code=400, detail="Mevcut şifre yanlış")
            
            if len(update_data.newPassword) < 6:
                raise HTTPException(status_code=400, detail="Şifre en az 6 karakter olmalıdır")
            
            # Şifreyi güncelle
            user.password_hash = hash_password(update_data.newPassword)
        
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        
        return {
            "message": "Profil başarıyla güncellendi",
            "success": True,
            "user": UserResponse(
                id=user.id,
                name=user.name,
                email=user.email,
                role=user.role,
                is_active=user.is_active,
                created_at=user.created_at
            )
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update profile error: {e}")
        raise HTTPException(status_code=500, detail="Profil güncellenirken hata oluştu")

# Business Management Endpoints

@app.post("/api/businesses", response_model=BusinessResponse)
async def create_business(business: BusinessCreate, owner_id: int, db: Session = Depends(get_db)):
    """Create a new business - requires owner_id"""
    try:
        # Verify owner exists and is active
        owner = db.query(DBUser).filter(DBUser.id == owner_id, DBUser.is_active == True).first()
        if not owner:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Create new business
        new_business = DBBusiness(
            name=business.name,
            description=business.description,
            website=business.website,
            phone=business.phone,
            email=business.email,
            address=business.address,
            business_type=business.business_type,
            logo_url=business.logo_url,
            owner_id=owner_id,
            is_active=True
        )
        
        db.add(new_business)
        db.commit()
        db.refresh(new_business)
        
        return BusinessResponse(
            id=new_business.id,
            name=new_business.name,
            description=new_business.description,
            website=new_business.website,
            phone=new_business.phone,
            email=new_business.email,
            address=new_business.address,
            business_type=new_business.business_type,
            logo_url=new_business.logo_url,
            is_active=new_business.is_active,
            owner_id=new_business.owner_id,
            created_at=new_business.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Create business error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="İşletme oluşturulurken hata oluştu")

@app.get("/api/businesses")
async def get_businesses(owner_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all businesses or businesses by owner"""
    try:
        query = db.query(DBBusiness).filter(DBBusiness.is_active == True)
        
        if owner_id:
            query = query.filter(DBBusiness.owner_id == owner_id)
        
        businesses = query.all()
        
        business_list = []
        for business in businesses:
            business_list.append(BusinessResponse(
                id=business.id,
                name=business.name,
                description=business.description,
                website=business.website,
                phone=business.phone,
                email=business.email,
                address=business.address,
                business_type=business.business_type,
                logo_url=business.logo_url,
                is_active=business.is_active,
                owner_id=business.owner_id,
                created_at=business.created_at
            ))
        
        return {
            "businesses": business_list,
            "count": len(business_list),
            "success": True
        }
        
    except Exception as e:
        print(f"Get businesses error: {e}")
        raise HTTPException(status_code=500, detail="İşletmeler alınırken hata oluştu")

# Business Events Endpoints
@app.post("/api/business-events", response_model=BusinessEventResponse)
async def create_business_event(event: BusinessEventCreate, db: Session = Depends(get_db)):
    """Create a new business event"""
    try:
        # Verify business exists
        business = db.query(DBBusiness).filter(
            DBBusiness.id == event.business_id,
            DBBusiness.is_active == True
        ).first()
        
        if not business:
            raise HTTPException(status_code=404, detail="İşletme bulunamadı")
        
        # Parse date strings to datetime
        from datetime import datetime as dt
        start_date = dt.fromisoformat(event.start_date.replace('Z', '+00:00'))
        end_date = dt.fromisoformat(event.end_date.replace('Z', '+00:00'))
        
        # Create business event
        db_event = DBBusinessEvent(
            title=event.title,
            description=event.description,
            event_type=event.event_type,
            discount_percentage=event.discount_percentage,
            discount_amount=event.discount_amount,
            min_purchase_amount=event.min_purchase_amount,
            max_discount_amount=event.max_discount_amount,
            terms_conditions=event.terms_conditions,
            start_date=start_date,
            end_date=end_date,
            business_id=event.business_id,
            is_active=True
        )
        
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        
        return BusinessEventResponse(
            id=db_event.id,
            title=db_event.title,
            description=db_event.description,
            event_type=db_event.event_type,
            discount_percentage=db_event.discount_percentage,
            discount_amount=db_event.discount_amount,
            min_purchase_amount=db_event.min_purchase_amount,
            max_discount_amount=db_event.max_discount_amount,
            terms_conditions=db_event.terms_conditions,
            start_date=db_event.start_date,
            end_date=db_event.end_date,
            is_active=db_event.is_active,
            business_id=db_event.business_id,
            created_at=db_event.created_at
        )
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Geçersiz tarih formatı: {str(ve)}")
    except Exception as e:
        print(f"Create business event error: {e}")
        raise HTTPException(status_code=500, detail="Event oluşturulurken hata oluştu")

@app.get("/api/business-events")
async def get_business_events(business_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all business events or events by business"""
    try:
        query = db.query(DBBusinessEvent).filter(DBBusinessEvent.is_active == True)
        
        if business_id:
            query = query.filter(DBBusinessEvent.business_id == business_id)
        
        events = query.all()
        
        event_list = []
        for event in events:
            event_list.append(BusinessEventResponse(
                id=event.id,
                title=event.title,
                description=event.description,
                event_type=event.event_type,
                discount_percentage=event.discount_percentage,
                discount_amount=event.discount_amount,
                min_purchase_amount=event.min_purchase_amount,
                max_discount_amount=event.max_discount_amount,
                terms_conditions=event.terms_conditions,
                start_date=event.start_date,
                end_date=event.end_date,
                is_active=event.is_active,
                business_id=event.business_id,
                created_at=event.created_at
            ))
        
        return {
            "events": event_list,
            "count": len(event_list),
            "success": True
        }
        
    except Exception as e:
        print(f"Get business events error: {e}")
        raise HTTPException(status_code=500, detail="Eventler alınırken hata oluştu")

def generate_membership_id(db: Session):
    """Otomatik membership ID oluştur"""
    year = datetime.now().year
    # Get count from database
    member_count = db.query(DBMember).count() + 1
    return f"CC-{year}-{str(member_count).zfill(6)}"

def generate_card_number():
    """Otomatik 16 haneli kart numarası oluştur"""
    return ''.join([str(random.randint(0, 9)) for _ in range(16)])

def ensure_unique_membership_id(db: Session, membership_id: str) -> str:
    """Ensure membership ID is unique"""
    original_id = membership_id
    counter = 1
    while db.query(DBMember).filter(DBMember.membership_id == membership_id).first():
        membership_id = f"{original_id[:-3]}{str(counter).zfill(3)}"
        counter += 1
    return membership_id

@app.post("/api/members", response_model=MemberResponse)
async def create_member(member: MemberCreate, db: Session = Depends(get_db)):
    """Yeni üye kaydı oluştur"""
    try:
        # Check if email already exists
        if db.query(DBMember).filter(DBMember.email == member.email).first():
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Auto-generate membership ID and card number
        membership_id = generate_membership_id(db)
        membership_id = ensure_unique_membership_id(db, membership_id)
        card_number = generate_card_number()
        
        # Ensure unique card number
        while db.query(DBMember).filter(DBMember.card_number == card_number).first():
            card_number = generate_card_number()
        
        # Create new member
        db_member = DBMember(
            full_name=member.fullName,
            membership_id=membership_id,
            card_number=card_number,
            phone_number=member.phoneNumber,
            email=member.email,
            address=member.address,
            date_of_birth=member.dateOfBirth,
            emergency_contact=member.emergencyContact,
            membership_type=member.membershipType,
            role=member.role,
            status=member.status
        )
        
        db.add(db_member)
        db.commit()
        db.refresh(db_member)
        
        # Convert to response format
        response_data = {
            "id": db_member.id,
            "fullName": db_member.full_name,
            "membershipId": db_member.membership_id,
            "cardNumber": db_member.card_number,
            "phoneNumber": db_member.phone_number,
            "email": db_member.email,
            "address": db_member.address,
            "dateOfBirth": db_member.date_of_birth,
            "emergencyContact": db_member.emergency_contact,
            "membershipType": db_member.membership_type,
            "role": db_member.role,
            "status": db_member.status,
            "createdAt": db_member.created_at,
            "updatedAt": db_member.updated_at
        }
        
        # Güvenli QR kod oluştur (standart) ve NFC kompakt veri üret
        try:
            secure_qr_data = generate_secure_member_qr(response_data)
            response_data["secureQrCode"] = secure_qr_data
            # NFC kompakt (NTAG215 uyumlu) payload
            response_data["nfcQrCode"] = secure_qr.create_compact_nfc_payload(response_data)
        except Exception as e:
            print(f"QR kod oluşturma hatası: {e}")
            response_data["secureQrCode"] = None
            response_data["nfcQrCode"] = None
        
        return MemberResponse(**response_data)
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Üye kaydı sırasında hata oluştu: {str(e)}")

@app.get("/api/members")
async def get_all_members(db: Session = Depends(get_db)):
    """Tüm üyeleri listele"""
    members = db.query(DBMember).all()
    member_list = []
    
    for member in members:
        member_data = {
            "id": member.id,
            "fullName": member.full_name,
            "membershipId": member.membership_id,
            "cardNumber": member.card_number,
            "phoneNumber": member.phone_number,
            "email": member.email,
            "address": member.address,
            "dateOfBirth": member.date_of_birth,
            "emergencyContact": member.emergency_contact,
            "membershipType": member.membership_type,
            "role": member.role,
            "status": member.status,
            "createdAt": member.created_at,
            "updatedAt": member.updated_at,
            "secureQrCode": None,
            "nfcQrCode": None
        }
        member_list.append(member_data)
    
    return {
        "members": member_list,
        "count": len(member_list),
        "success": True
    }

# Model for member list dropdown
class MemberInfo(BaseModel):
    id: int
    fullName: str

@app.get("/api/members/list", response_model=List[MemberInfo])
async def get_members_list(db: Session = Depends(get_db)):
    """Dropdown için sadece üye ID ve isimlerini döndürür"""
    try:
        members = db.query(DBMember).order_by(DBMember.full_name).all()
        if not members:
            return []
        return [MemberInfo(id=member.id, fullName=member.full_name) for member in members]
    except Exception as e:
        print(f"Database error in get_members_list: {e}")
        raise HTTPException(status_code=500, detail="Database connection error")

@app.get("/api/members/{member_id}")
async def get_member(member_id: int, db: Session = Depends(get_db)):
    """Belirli bir üyeyi getir"""
    member = db.query(DBMember).filter(DBMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Üye bulunamadı")
    
    member_data = {
        "id": member.id,
        "fullName": member.full_name,
        "membershipId": member.membership_id,
        "cardNumber": member.card_number,
        "phoneNumber": member.phone_number,
        "email": member.email,
        "address": member.address,
        "dateOfBirth": member.date_of_birth,
        "emergencyContact": member.emergency_contact,
        "membershipType": member.membership_type,
        "role": member.role,
        "status": member.status,
        "createdAt": member.created_at,
        "updatedAt": member.updated_at
    }
    
    # Güvenli QR kod oluştur (hem standart hem NFC)
    try:
        secure_qr_data = generate_secure_member_qr(member_data)
        member_data["secureQrCode"] = secure_qr_data
        member_data["nfcQrCode"] = secure_qr.create_compact_nfc_payload(member_data)
        print(f"✅ Standart QR kod oluşturuldu - Member ID: {member.id}, Data length: {len(secure_qr_data)}")
    except Exception as e:
        print(f"❌ Standart QR kod oluşturma hatası: {e}")
        member_data["secureQrCode"] = None
        member_data["nfcQrCode"] = None
    
    return {
        "member": member_data,
        "success": True
    }

@app.get("/api/members/membership/{membership_id}")
async def get_member_by_membership_id(membership_id: str, db: Session = Depends(get_db)):
    """Üyelik ID'si ile üye bilgilerini getir"""
    member = db.query(DBMember).filter(DBMember.membership_id == membership_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Üye bulunamadı")
    
    member_data = {
        "id": member.id,
        "fullName": member.full_name,
        "membershipId": member.membership_id,
        "cardNumber": member.card_number,
        "phoneNumber": member.phone_number,
        "email": member.email,
        "address": member.address,
        "dateOfBirth": member.date_of_birth,
        "emergencyContact": member.emergency_contact,
        "membershipType": member.membership_type,
        "role": member.role,
        "status": member.status,
        "createdAt": member.created_at,
        "updatedAt": member.updated_at
    }
    
    return {
        "member": member_data,
        "success": True
    }

@app.delete("/api/members/{member_id}")
async def delete_member(member_id: int, db: Session = Depends(get_db)):
    """Üyeyi sil"""
    member = db.query(DBMember).filter(DBMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Üye bulunamadı")
    
    db.delete(member)
    db.commit()
    
    return {
        "message": "Üye başarıyla silindi",
        "success": True
    }

@app.put("/api/members/{member_id}")
async def update_member(member_id: int, member: MemberUpdate, db: Session = Depends(get_db)):
    """Üye bilgilerini güncelle"""
    db_member = db.query(DBMember).filter(DBMember.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Üye bulunamadı")
    
    # Update only provided fields (keep existing membershipId and cardNumber)
    update_data = member.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        if field == "fullName":
            db_member.full_name = value
        elif field == "phoneNumber":
            db_member.phone_number = value
        elif field == "email":
            # Check if email is unique (if being updated)
            if value != db_member.email:
                existing = db.query(DBMember).filter(DBMember.email == value).first()
                if existing:
                    raise HTTPException(status_code=400, detail="Email already exists")
            db_member.email = value
        elif field == "address":
            db_member.address = value
        elif field == "dateOfBirth":
            db_member.date_of_birth = value
        elif field == "emergencyContact":
            db_member.emergency_contact = value
        elif field == "membershipType":
            db_member.membership_type = value
        elif field == "role":
            db_member.role = value
        elif field == "status":
            db_member.status = value
    
    db_member.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_member)
    
    # Convert to response format
    member_data = {
        "id": db_member.id,
        "fullName": db_member.full_name,
        "membershipId": db_member.membership_id,
        "cardNumber": db_member.card_number,
        "phoneNumber": db_member.phone_number,
        "email": db_member.email,
        "address": db_member.address,
        "dateOfBirth": db_member.date_of_birth,
        "emergencyContact": db_member.emergency_contact,
        "membershipType": db_member.membership_type,
        "role": db_member.role,
        "status": db_member.status,
        "createdAt": db_member.created_at,
        "updatedAt": db_member.updated_at
    }
    
    return {
        "member": member_data,
        "message": "Üye bilgileri başarıyla güncellendi",
        "success": True
    }

# Güvenlik endpoint'leri

@app.post("/api/qr/verify")
async def verify_qr_code(qr_data: dict):
    """
    QR kod doğrulama endpoint'i - Mağazalar için
    ISO 20248 benzeri dijital imza doğrulaması
    """
    try:
        qr_string = qr_data.get("qr_code", "")
        if not qr_string:
            raise HTTPException(status_code=400, detail="QR kod verisi gerekli")
        
        is_valid, decoded_data, error_msg = verify_member_qr(qr_string)
        
        if not is_valid:
            return {
                "valid": False,
                "error": error_msg or "Geçersiz QR kod",
                "success": False
            }
        
        return {
            "valid": True,
            "member_data": {
                "member_id": decoded_data.get("member_id"),
                "membership_id": decoded_data.get("membership_id"), 
                "name": decoded_data.get("name"),
                "status": decoded_data.get("status"),
                "organization": decoded_data.get("org"),
                "issued_at": decoded_data.get("issued_at"),
                "expires_at": decoded_data.get("expires_at")
            },
            "verification_time": datetime.utcnow().isoformat(),
            "success": True
        }
        
    except Exception as e:
        return {
            "valid": False,
            "error": f"Doğrulama hatası: {str(e)}",
            "success": False
        }

@app.get("/api/qr/public-key")
async def get_public_key():
    """
    Public key endpoint'i - Mağaza sistemleri için
    Offline doğrulama yapmak isteyen mağazalar bu key'i kullanabilir
    """
    try:
        public_key_pem = get_public_key_pem()
        return {
            "public_key": public_key_pem,
            "algorithm": "RSA-PSS-SHA256",
            "key_format": "PEM",
            "usage": "QR code signature verification",
            "organization": "Community Connect",
            "success": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Public key alınamadı: {str(e)}")

@app.get("/download-cert", response_class=HTMLResponse)
async def download_certificate():
    """
    iOS cihazlarda sertifika kurulumu için
    """
    try:
        with open("cert.pem", "r") as f:
            cert_content = f.read()
        
        return HTMLResponse(
            content=f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>SSL Sertifika İndirme</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body>
                <h2>QR Virtual Card - SSL Sertifika</h2>
                <p>iOS cihazınızda bu uygulamanın HTTPS bağlantısı için sertifikayı yükleyin:</p>
                <a href="data:application/x-pem-file;base64,{cert_content.encode('base64').decode()}" 
                   download="qr-virtual-card.pem" 
                   style="background: #007AFF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
                   📲 Sertifikayı İndir
                </a>
                <h3>Kurulum Adımları:</h3>
                <ol>
                    <li>Yukarıdaki butona tıklayın</li>
                    <li>iOS Ayarlar > Genel > VPN ve Cihaz Yönetimi</li>
                    <li>İndirilen profili seçin ve "Yükle" deyin</li>
                    <li>Ayarlar > Genel > Hakkında > Sertifika Güveni</li>
                    <li>QR Virtual Card sertifikasını aktif edin</li>
                </ol>
            </body>
            </html>
            """,
            headers={"Content-Type": "text/html"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sertifika okunamadı: {str(e)}")

# NFC Reading History API
@app.get("/api/nfc/reading-history")
async def get_nfc_reading_history(
    days: int = 7,
    device_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    NFC okuma geçmişini getir - Dashboard için
    """
    try:
        from datetime import date, timedelta
        from sqlalchemy import func, and_, case
        
        # Son X günün tarih aralığını hesapla
        end_date = date.today()
        start_date = end_date - timedelta(days=days-1)
        
        # Günlük okuma istatistiklerini getir
        query = db.query(
            func.date(DBNfcReadingHistory.created_at).label('date'),
            func.sum(case((DBNfcReadingHistory.read_success == True, 1), else_=0)).label('successful'),
            func.sum(case((DBNfcReadingHistory.read_success == False, 1), else_=0)).label('failed')
        ).filter(
            func.date(DBNfcReadingHistory.created_at) >= start_date,
            func.date(DBNfcReadingHistory.created_at) <= end_date
        )
        
        # Device filter ekleme
        if device_id:
            query = query.filter(DBNfcReadingHistory.device_id == device_id)
        
        # Tarihe göre grupla
        results = query.group_by(func.date(DBNfcReadingHistory.created_at)).all()
        
        # Eksik günleri 0 değerle doldur
        date_dict = {r.date: {"successful": int(r.successful), "failed": int(r.failed)} for r in results}
        
        readings = []
        current_date = start_date
        while current_date <= end_date:
            if current_date in date_dict:
                readings.append({
                    "date": current_date.isoformat(),
                    "successful": date_dict[current_date]["successful"],
                    "failed": date_dict[current_date]["failed"]
                })
            else:
                readings.append({
                    "date": current_date.isoformat(),
                    "successful": 0,
                    "failed": 0
                })
            current_date += timedelta(days=1)
        
        return {
            "success": True,
            "readings": readings,
            "total_days": days,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            }
        }
        
    except Exception as e:
        print(f"NFC reading history error: {e}")
        raise HTTPException(status_code=500, detail=f"Okuma geçmişi alınamadı: {str(e)}")

# Helper function to log NFC reading
def log_nfc_reading(
    db: Session,
    device_id: str = None,
    device_info: str = None,
    card_uid: str = None,
    read_success: bool = True,
    member_id: int = None,
    error_message: str = None,
    reader_name: str = None,
    verification_type: str = None,
    ip_address: str = None,
    user_agent: str = None
):
    """Log NFC reading to history"""
    try:
        nfc_log = DBNfcReadingHistory(
            device_id=device_id,
            device_info=device_info,
            card_uid=card_uid,
            read_success=read_success,
            member_id=member_id,
            error_message=error_message,
            reader_name=reader_name,
            verification_type=verification_type,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(nfc_log)
        db.commit()
    except Exception as e:
        print(f"NFC logging error: {e}")
        db.rollback()

# NFC Decryption API for MAUI
class NfcDecryptRequest(BaseModel):
    encryptedData: str
    deviceInfo: Optional[str] = None

@app.post("/api/nfc/decrypt")
async def decrypt_nfc_data(request: NfcDecryptRequest, db: Session = Depends(get_db)):
    """
    Şifrelenmiş NFC verisini çözüp doğrula
    MAUI uygulaması için backend doğrulama endpoint'i
    """
    device_info = request.deviceInfo or "Unknown Device"
    card_uid = None
    member_id = None
    
    try:
        encrypted_data = request.encryptedData.strip()
        print(f"🔍 Received encrypted data length: {len(encrypted_data)}")
        print(f"🔍 First 50 chars: {encrypted_data[:50]}")
        
        # İlk olarak çift şifrelemeyi çöz
        decrypted_json = secure_qr._decrypt_nfc_data(encrypted_data)
        print(f"🔍 Decrypted result: {decrypted_json[:100] if decrypted_json else 'None'}")
        
        if not decrypted_json:
            # Başarısız okuma kaydını log'la
            log_nfc_reading(
                db=db,
                device_info=device_info,
                read_success=False,
                error_message="Veri çözülemedi - geçersiz şifreleme",
                verification_type="online",
                reader_name="MAUI App"
            )
            print("❌ Decryption failed - invalid encryption")
            raise HTTPException(status_code=400, detail="Veri çözülemedi - geçersiz şifreleme")
        
        # JSON parse et
        try:
            nfc_data = json.loads(decrypted_json)
        except json.JSONDecodeError:
            # Başarısız okuma kaydını log'la
            log_nfc_reading(
                db=db,
                device_info=device_info,
                read_success=False,
                error_message="Geçersiz JSON formatı",
                verification_type="online",
                reader_name="MAUI App"
            )
            raise HTTPException(status_code=400, detail="Geçersiz JSON formatı")
        
        # Gerekli alanları kontrol et
        required_fields = ['v', 'mid', 'name', 'exp', 'sig']
        for field in required_fields:
            if field not in nfc_data:
                # Başarısız okuma kaydını log'la
                log_nfc_reading(
                    db=db,
                    device_info=device_info,
                    read_success=False,
                    error_message=f"Eksik alan: {field}",
                    verification_type="online",
                    reader_name="MAUI App"
                )
                raise HTTPException(status_code=400, detail=f"Eksik alan: {field}")
        
        # UID'yi JSON'dan al (varsa)
        card_uid = nfc_data.get('uid') or nfc_data.get('card_uid')
        
        # Version kontrolü
        if nfc_data['v'] != 1:
            raise HTTPException(status_code=400, detail="Desteklenmeyen veri versiyonu")
        
        # Expiration date kontrolü
        exp_date_str = nfc_data['exp']
        try:
            exp_date = datetime.strptime(exp_date_str, '%Y%m%d')
            if exp_date < datetime.utcnow():
                return {
                    "success": False,
                    "error": "EXPIRED",
                    "message": "NFC kartının süresi dolmuş",
                    "expiration_date": exp_date.strftime('%Y-%m-%d'),
                    "current_date": datetime.utcnow().strftime('%Y-%m-%d')
                }
        except ValueError:
            raise HTTPException(status_code=400, detail="Geçersiz expiration date formatı")
        
        # İmza doğrulaması (ECDSA P-256)
        signature_valid = secure_qr._verify_nfc_signature(nfc_data)
        
        if not signature_valid:
            return {
                "success": False,
                "error": "INVALID_SIGNATURE",
                "message": "Dijital imza doğrulanamadı - sahte kart olabilir"
            }
        
        # Üye bilgilerini database'den getir
        membership_id = nfc_data['mid']
        member = db.query(DBMember).filter(DBMember.membership_id == membership_id).first()
        
        member_info = {
            "membershipId": membership_id,
            "name": nfc_data['name'],
            "expirationDate": exp_date.strftime('%Y-%m-%d'),
            "signatureValid": True,
            "fromDatabase": False
        }
        
        # Database'de üye varsa tam bilgileri ekle
        if member:
            member_id = member.id  # Log için member ID'yi al
            member_info.update({
                "fullName": member.full_name,
                "email": member.email,
                "phoneNumber": member.phone_number,
                "role": member.role,
                "status": member.status,
                "membershipType": member.membership_type,
                "joinDate": member.created_at.strftime('%Y-%m-%d'),
                "fromDatabase": True
            })
        
        # Başarılı okuma kaydını log'la
        log_nfc_reading(
            db=db,
            device_info=device_info,
            card_uid=card_uid,
            read_success=True,
            member_id=member_id,
            verification_type="online",
            reader_name="MAUI App"
        )
        
        return {
            "success": True,
            "valid": True,
            "member": member_info,
            "decryptedData": nfc_data,
            "verificationTime": datetime.utcnow().isoformat(),
            "deviceInfo": request.deviceInfo or "Unknown"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Genel sunucu hatası log'la
        log_nfc_reading(
            db=db,
            device_info=device_info,
            card_uid=card_uid,
            read_success=False,
            error_message=f"Sunucu hatası: {str(e)}",
            verification_type="online",
            reader_name="MAUI App"
        )
        print(f"NFC decrypt error: {e}")
        raise HTTPException(status_code=500, detail=f"Sunucu hatası: {str(e)}")

## Dashboard API Endpoints
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Dashboard için gerçek istatistikleri getir"""
    try:
        # Son 30 günlük istatistikleri al
        end_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        start_date = end_date - timedelta(days=30)
        
        # Günlük istatistikleri getir
        daily_stats = db.query(DBDashboardStats).filter(
            DBDashboardStats.stat_date >= start_date,
            DBDashboardStats.stat_date <= end_date
        ).order_by(DBDashboardStats.stat_date.desc()).all()
        
        # Eğer istatistik yoksa bugün için hesapla
        if not daily_stats:
            calculate_daily_stats()
            daily_stats = db.query(DBDashboardStats).filter(
                DBDashboardStats.stat_date >= start_date,
                DBDashboardStats.stat_date <= end_date
            ).order_by(DBDashboardStats.stat_date.desc()).all()
        
        # Son 30 günün toplamları
        total_stats = {
            "total_nfc_scans": sum(stat.total_nfc_scans for stat in daily_stats),
            "successful_nfc_scans": sum(stat.successful_nfc_scans for stat in daily_stats),
            "total_qr_verifications": sum(stat.total_qr_verifications for stat in daily_stats),
            "successful_qr_verifications": sum(stat.successful_qr_verifications for stat in daily_stats),
            "total_api_calls": sum(stat.total_api_calls for stat in daily_stats),
            "successful_api_calls": sum(stat.successful_api_calls for stat in daily_stats),
        }
        
        # Bu ayın istatistikleri
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_stats = db.query(DBDashboardStats).filter(
            DBDashboardStats.stat_date >= month_start
        ).all()
        
        monthly_totals = {
            "nfc_scans": sum(stat.total_nfc_scans for stat in month_stats),
            "qr_verifications": sum(stat.total_qr_verifications for stat in month_stats),
            "new_members": sum(stat.new_members_count for stat in month_stats),
        }
        
        # Genel sistem istatistikleri
        total_members = db.query(DBMember).count()
        active_members = db.query(DBMember).filter(DBMember.status == 'active').count()
        total_businesses = db.query(DBBusiness).count()
        active_campaigns = db.query(DBBusinessEvent).filter(
            DBBusinessEvent.is_active == True,
            DBBusinessEvent.start_date <= datetime.utcnow(),
            DBBusinessEvent.end_date >= datetime.utcnow()
        ).count()
        
        # Günlük grafik verisi (son 7 gün)
        last_7_days = daily_stats[:7] if len(daily_stats) >= 7 else daily_stats
        chart_data = {
            "dates": [stat.stat_date.strftime('%Y-%m-%d') for stat in reversed(last_7_days)],
            "nfc_scans": [stat.total_nfc_scans for stat in reversed(last_7_days)],
            "qr_verifications": [stat.total_qr_verifications for stat in reversed(last_7_days)],
            "api_calls": [stat.total_api_calls for stat in reversed(last_7_days)]
        }
        
        return {
            "success": True,
            "data": {
                "monthly": {
                    "revenue": 12450,  # Bu sabit kalabilir - finans sistemi yok
                    "nfc_scans": monthly_totals["nfc_scans"],
                    "qr_verifications": monthly_totals["qr_verifications"],
                    "new_members": monthly_totals["new_members"],
                    "growth_rate": 15  # Bu hesaplanabilir
                },
                "totals": {
                    "members": total_members,
                    "active_members": active_members,
                    "businesses": total_businesses,
                    "active_campaigns": active_campaigns
                },
                "last_30_days": total_stats,
                "chart_data": chart_data,
                "last_updated": datetime.utcnow().isoformat()
            }
        }
        
    except Exception as e:
        print(f"Dashboard stats error: {e}")
        # Hata durumunda varsayılan değerler döndür
        return {
            "success": False,
            "data": {
                "monthly": {"revenue": 0, "nfc_scans": 0, "qr_verifications": 0, "new_members": 0, "growth_rate": 0},
                "totals": {"members": 0, "active_members": 0, "businesses": 0, "active_campaigns": 0},
                "last_30_days": {"total_nfc_scans": 0, "successful_nfc_scans": 0, "total_qr_verifications": 0, "successful_qr_verifications": 0, "total_api_calls": 0, "successful_api_calls": 0},
                "chart_data": {"dates": [], "nfc_scans": [], "qr_verifications": [], "api_calls": []},
                "last_updated": datetime.utcnow().isoformat()
            },
            "error": str(e)
        }

@app.post("/api/admin/calculate-stats")
async def trigger_stats_calculation(db: Session = Depends(get_db)):
    """Manuel istatistik hesaplama tetikle (admin endpoint)"""
    try:
        # Dün için istatistikleri hesapla
        yesterday = datetime.utcnow() - timedelta(days=1)
        result = calculate_daily_stats(yesterday.replace(hour=0, minute=0, second=0, microsecond=0))
        
        return {
            "success": True,
            "message": "İstatistikler başarıyla hesaplandı",
            "data": result
        }
        
    except Exception as e:
        print(f"Stats calculation error: {e}")
        return {
            "success": False,
            "message": "İstatistik hesaplama hatası",
            "error": str(e)
        }

@app.post("/api/admin/cleanup-logs")
async def trigger_log_cleanup(retention_days: int = 30):
    """Manuel log temizleme tetikle (admin endpoint)"""
    try:
        result = cleanup_old_logs(retention_days)
        
        return {
            "success": True,
            "message": f"{retention_days} günden eski loglar temizlendi",
            "data": result
        }
        
    except Exception as e:
        print(f"Log cleanup error: {e}")
        return {
            "success": False,
            "message": "Log temizleme hatası",
            "error": str(e)
        }

## NFC işlemleri artık MAUI uygulaması tarafından yapılacak. Backend bu amaçla ek NFC endpointlerini içermemektedir.







if __name__ == "__main__":
    # SSL sertifikalarının varlığını kontrol et
    ssl_keyfile = "./key.pem"
    ssl_certfile = "./cert.pem"
    
    use_ssl = os.path.exists(ssl_keyfile) and os.path.exists(ssl_certfile)
    
    if use_ssl:
        print("🔒 HTTPS modunda başlatılıyor...")
        print(f"🌐 API URL: https://localhost:8000")
        print(f"🌐 Network API URL: https://192.168.1.104:8000")
        print(f"📝 API Docs: https://localhost:8000/docs")
        print(f"🔐 SSL Certificate: {ssl_certfile}")
        print("📱 Mobil cihazlardan erişim: Tarayıcıda SSL uyarısını kabul edin")
        
        # HTTPS ile çalıştır
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            ssl_keyfile=ssl_keyfile,
            ssl_certfile=ssl_certfile
        )
    else:
        print("⚠️  HTTP modunda başlatılıyor (SSL sertifikaları bulunamadı)")
        print(f"🌐 API URL: http://localhost:8000")
        print(f"📝 API Docs: http://localhost:8000/docs")
        print("💡 HTTPS için: openssl komutu ile cert.pem ve key.pem oluşturun")
        
        # HTTP ile çalıştır
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True
        )