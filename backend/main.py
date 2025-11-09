from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
import uvicorn
import json
from datetime import datetime, timedelta
import random
import os
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor
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
# Production için kendi domain ve local geliştirme hostlarını izinli tut
frontend_url = os.getenv("FRONTEND_URL", "https://qr-virtual-card-generator.vercel.app")
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else []

allowed_origins = [
    frontend_url,
    # Vercel deployment URL
    "https://qr-virtual-card-generator.vercel.app",
    # ANEF domain'leri (yeni production domain)
    "https://anefuye.com.tr",
    "https://www.anefuye.com.tr",
    "http://anefuye.com.tr",
    "http://www.anefuye.com.tr",
    # Eski domain'ler (backward compatibility)
    "https://sabrialperenkaya.com.tr",
    "https://www.sabrialperenkaya.com.tr",
    "https://qr.sabrialperenkaya.com.tr",
    "https://api.sabrialperenkaya.com.tr",
    # Local development için
    "http://localhost:3000",
    "https://localhost:3000",
    "http://127.0.0.1:3000",
    "https://127.0.0.1:3000",
    # cPanel subdomain (varsa)
    "https://cpanel.sabrialperenkaya.com.tr",
] + allowed_origins_env

print(f"🌐 CORS Allowed Origins: {allowed_origins}")
print(f"🌐 Frontend URL from env: {frontend_url}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

log_executor = ThreadPoolExecutor(max_workers=2)

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
    
    # Authentication endpoint için özel debug
    if endpoint == "/api/auth/login":
        print(f"🔐 AUTH LOGIN REQUEST BAŞLADI - {datetime.now()}")
        print(f"🔐 Method: {method}, IP: {ip_address}")
        print(f"🔐 User-Agent: {user_agent}")
        print(f"🔐 Full URL: {url}")
        print(f"🔐 Headers: {dict(request.headers)}")
    
    # NFC decrypt endpoint için özel debug
    if endpoint == "/api/nfc/decrypt":
        print(f"🚀 NFC DECRYPT BAŞLADI - {datetime.now()}")
        print(f"🚀 Method: {method}, IP: {ip_address}")
        print(f"🚀 User-Agent: {user_agent}")
    
    # Request body'yi middleware'de OKUMA - FastAPI'de body sadece bir kez okunabilir!
    # Body okumayı tamamen atlıyoruz, sadece endpoint'e verilen parametreleri logluyoruz
    request_payload = f"[{method}_REQUEST]"
    
    # Response'u işle
    response = await call_next(request)
    
    # Response süresini hesapla
    response_time_ms = (time.time() - start_time) * 1000
    
    # Authentication endpoint için özel debug
    if endpoint == "/api/auth/login":
        print(f"🔐 AUTH LOGIN RESPONSE - {datetime.now()}")
        print(f"🔐 Total middleware time: {response_time_ms:.2f}ms")
        print(f"🔐 Status code: {response.status_code}")
        if response.status_code >= 400:
            print(f"🔐 ❌ AUTH LOGIN FAILED - Status: {response.status_code}")
        else:
            print(f"🔐 ✅ AUTH LOGIN SUCCESS - Status: {response.status_code}")
    
    # NFC decrypt endpoint için özel debug
    if endpoint == "/api/nfc/decrypt":
        print(f"🚀 NFC DECRYPT BİTTİ - {datetime.now()}")
        print(f"🚀 Response time: {response_time_ms:.2f}ms")
        print(f"🚀 Status code: {response.status_code}")
    
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
    
    # Log'u thread havuzunda kaydet (event loop'u bloklamadan)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(
        log_executor,
        save_api_log_sync,
        endpoint,
        method,
        response.status_code,
        response_time_ms,
        ip_address,
        user_agent,
        request_payload,
        response_payload,
        error_message,
        api_category,
    )
    
    return response

def save_api_log_sync(endpoint: str, method: str, status_code: int,
                      response_time_ms: float, ip_address: str = None,
                      user_agent: str = None, request_payload: str = None,
                      response_payload: str = None, error_message: str = None,
                      api_category: str = "other", member_id: int = None,
                      device_info: str = None):
    """API log'unu database'e kaydet (senkron)"""
    db = None
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
            device_info=device_info,
        )

        db.add(api_log)
        db.commit()

    except Exception as e:
        print(f"⚠️ API log kaydetme hatası: {e}")
        if db is not None:
            try:
                db.rollback()
            except Exception:
                pass
    finally:
        if db is not None:
            try:
                db.close()
            except Exception:
                pass

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    startup_start = time.time()
    print(f"🚀 SERVER STARTUP BAŞLADI - {datetime.utcnow()}")
    
    try:
        init_db()
        startup_time = (time.time() - startup_start) * 1000
        print(f"✅ DATABASE INITIALIZATION TAMAMLANDI - {startup_time:.2f}ms")
        print(f"🚀 Server hazır - Backend authentication endpoint: /api/auth/login")
    except Exception as e:
        startup_time = (time.time() - startup_start) * 1000
        print(f"❌ STARTUP HATASI - {startup_time:.2f}ms: {str(e)}")
        raise

@app.get("/")
async def read_root():
    return {"message": "QR Virtual Card API'sine hoş geldiniz!"}

@app.get("/health")
async def health_check():
    start_time = time.time()
    health_id = f"health_{int(time.time() * 1000)}"
    
    print(f"❤️ [{health_id}] Health check başlıyor...")
    
    health_data = {
        "status": "healthy", 
        "message": "API çalışıyor",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    # Database connectivity test
    try:
        db_start = time.time()
        db = next(get_db())
        
        # Simple query to test database
        from sqlalchemy import text
        test_query = db.execute(text("SELECT 1 as test")).fetchone()
        db.close()
        
        db_time = (time.time() - db_start) * 1000
        health_data["checks"]["database"] = {
            "status": "ok",
            "response_time_ms": round(db_time, 2),
            "test_result": test_query[0] if test_query else None
        }
        print(f"❤️ [{health_id}] Database check: ✅ OK ({db_time:.2f}ms)")
        
    except Exception as e:
        db_time = (time.time() - db_start if 'db_start' in locals() else start_time) * 1000
        health_data["checks"]["database"] = {
            "status": "error",
            "response_time_ms": round(db_time, 2),
            "error": str(e)
        }
        health_data["status"] = "degraded"
        print(f"❤️ [{health_id}] Database check: ❌ ERROR ({db_time:.2f}ms) - {str(e)}")
    
    total_time = (time.time() - start_time) * 1000
    health_data["total_response_time_ms"] = round(total_time, 2)
    
    print(f"❤️ [{health_id}] Health check tamamlandı: {total_time:.2f}ms - Status: {health_data['status']}")
    
    return health_data

# Pydantic Models
class MemberCreate(BaseModel):
    fullName: str
    phoneNumber: str
    email: str
    address: str
    dateOfBirth: str
    emergencyContact: str
    association: str
    status: str = "active"
    profilePhoto: Optional[str] = None  # Base64 encoded image

class MemberUpdate(BaseModel):
    fullName: Optional[str] = None
    phoneNumber: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    dateOfBirth: Optional[str] = None
    emergencyContact: Optional[str] = None
    association: Optional[str] = None
    status: Optional[str] = None
    profilePhoto: Optional[str] = None  # Base64 encoded image

# Profile Photo Models
class ProfilePhotoUpload(BaseModel):
    profile_photo: str  # Base64 encoded image data
    
class ProfilePhotoResponse(BaseModel):
    success: bool
    message: str
    profile_photo_url: Optional[str] = None

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
    image: Optional[str] = None  # Base64 encoded profile photo

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
    profilePhoto: Optional[str] = None  # Base64 encoded image

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
    association: str
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

@app.post("/api/debug/auth-raw")
async def debug_auth_raw(request: Request):
    """Raw auth request debugging"""
    debug_id = f"debug_auth_{int(time.time() * 1000)}"
    
    try:
        print(f"🐛 [{debug_id}] RAW AUTH DEBUG BAŞLADI")
        print(f"🐛 [{debug_id}] Method: {request.method}")
        print(f"🐛 [{debug_id}] Headers: {dict(request.headers)}")
        
        # Raw body okuma
        body = await request.body()
        print(f"🐛 [{debug_id}] Raw body length: {len(body)}")
        print(f"🐛 [{debug_id}] Raw body bytes: {body}")
        
        body_str = body.decode('utf-8') if body else ""
        print(f"🐛 [{debug_id}] Body string: '{body_str}'")
        
        # JSON parse test
        import json
        try:
            if body_str:
                parsed = json.loads(body_str)
                print(f"🐛 [{debug_id}] Parsed JSON: {parsed}")
                print(f"🐛 [{debug_id}] JSON keys: {list(parsed.keys())}")
                return {
                    "success": True,
                    "debug_id": debug_id,
                    "raw_body": body_str,
                    "parsed_json": parsed,
                    "json_keys": list(parsed.keys())
                }
            else:
                print(f"🐛 [{debug_id}] EMPTY BODY")
                return {
                    "success": False,
                    "debug_id": debug_id,
                    "error": "Empty body",
                    "raw_body": ""
                }
        except json.JSONDecodeError as e:
            print(f"🐛 [{debug_id}] JSON ERROR: {e}")
            return {
                "success": False,
                "debug_id": debug_id,
                "error": f"JSON decode error: {e}",
                "raw_body": body_str
            }
            
    except Exception as e:
        print(f"🐛 [{debug_id}] EXCEPTION: {e}")
        return {
            "success": False,
            "debug_id": debug_id,
            "error": f"Exception: {e}"
        }

@app.get("/api/debug/timing")
async def debug_timing_test():
    """Frontend'ten timing test için debug endpoint"""
    start_time = time.time()
    debug_id = f"debug_{int(time.time() * 1000)}"
    
    print(f"🐛 [{debug_id}] DEBUG TIMING TEST BAŞLADI")
    
    timing_data = {
        "test_id": debug_id,
        "timestamp": datetime.utcnow().isoformat(),
        "tests": {}
    }
    
    # Test 1: Simple response
    simple_start = time.time()
    simple_result = {"message": "Hello World"}
    simple_time = (time.time() - simple_start) * 1000
    timing_data["tests"]["simple_response"] = {
        "time_ms": round(simple_time, 2),
        "result": simple_result
    }
    
    # Test 2: Database query
    try:
        db_start = time.time()
        db = next(get_db())
        from sqlalchemy import text
        count_query = db.execute(text("SELECT COUNT(*) as count FROM users")).fetchone()
        db.close()
        db_time = (time.time() - db_start) * 1000
        
        timing_data["tests"]["database_query"] = {
            "time_ms": round(db_time, 2),
            "result": {"user_count": count_query[0] if count_query else 0},
            "status": "success"
        }
    except Exception as e:
        db_time = (time.time() - db_start if 'db_start' in locals() else start_time) * 1000
        timing_data["tests"]["database_query"] = {
            "time_ms": round(db_time, 2),
            "error": str(e),
            "status": "error"
        }
    
    # Test 3: Password hashing test
    hash_start = time.time()
    test_hash = hash_password("test123")
    hash_time = (time.time() - hash_start) * 1000
    
    timing_data["tests"]["password_hashing"] = {
        "time_ms": round(hash_time, 2),
        "result": {"hash_length": len(test_hash)},
        "status": "success"
    }
    
    total_time = (time.time() - start_time) * 1000
    timing_data["total_time_ms"] = round(total_time, 2)
    
    print(f"🐛 [{debug_id}] DEBUG TEST TAMAMLANDI - {total_time:.2f}ms")
    
    return timing_data

# Authentication Endpoints

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """User login endpoint with detailed timing logs"""
    start_time = time.time()
    request_id = f"auth_{int(time.time() * 1000)}"
    
    print(f"\n🔐 [{request_id}] ===== AUTH LOGIN ENDPOINT BAŞLADI =====")
    print(f"🔐 [{request_id}] Timestamp: {datetime.utcnow()}")
    print(f"🔐 [{request_id}] Credentials type: {type(credentials)}")
    print(f"🔐 [{request_id}] Email received: {credentials.email}")
    print(f"🔐 [{request_id}] Password length: {len(credentials.password) if credentials.password else 0}")
    print(f"🔐 [{request_id}] Client IP: {request.client.host if request.client else 'Unknown'}")
    print(f"🔐 [{request_id}] User-Agent: {request.headers.get('user-agent', 'Unknown')}")
    
    # Request validation
    if not credentials.email:
        print(f"❌ [{request_id}] MISSING EMAIL")
        raise HTTPException(status_code=400, detail="Email gerekli")
    
    if not credentials.password:
        print(f"❌ [{request_id}] MISSING PASSWORD")
        raise HTTPException(status_code=400, detail="Password gerekli")
    
    print(f"✅ [{request_id}] Credentials validation passed")
    
    try:
        # Step 1: Database user lookup
        db_lookup_start = time.time()
        print(f"🔍 [{request_id}] Database user lookup başlıyor...")
        
        user = db.query(DBUser).filter(DBUser.email == credentials.email).first()
        
        db_lookup_time = (time.time() - db_lookup_start) * 1000
        print(f"🔍 [{request_id}] Database lookup tamamlandı: {db_lookup_time:.2f}ms")
        
        if not user:
            total_time = (time.time() - start_time) * 1000
            print(f"❌ [{request_id}] User bulunamadı - Toplam süre: {total_time:.2f}ms")
            raise HTTPException(status_code=401, detail="Geçersiz email veya şifre")
        
        print(f"✅ [{request_id}] User bulundu: {user.name} (ID: {user.id})")
        
        # Step 2: Active user check
        if not user.is_active:
            total_time = (time.time() - start_time) * 1000
            print(f"❌ [{request_id}] User deaktif - Toplam süre: {total_time:.2f}ms")
            raise HTTPException(status_code=401, detail="Hesap deaktif edilmiş")
        
        print(f"✅ [{request_id}] User aktif durumda")
        
        # Step 3: Password verification
        password_start = time.time()
        print(f"🔑 [{request_id}] Password verification başlıyor...")
        
        password_valid = verify_password(credentials.password, user.password_hash)
        
        password_time = (time.time() - password_start) * 1000
        print(f"🔑 [{request_id}] Password verification tamamlandı: {password_time:.2f}ms")
        
        if not password_valid:
            total_time = (time.time() - start_time) * 1000
            print(f"❌ [{request_id}] Password yanlış - Toplam süre: {total_time:.2f}ms")
            raise HTTPException(status_code=401, detail="Geçersiz email veya şifre")
        
        print(f"✅ [{request_id}] Password doğru")
        
        # Step 4: Response preparation
        response_start = time.time()
        print(f"📦 [{request_id}] Response hazırlanıyor...")
        
        user_response = UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            image=user.image
        )
        
        login_response = LoginResponse(
            user=user_response,
            message="Giriş başarılı",
            success=True
        )
        
        response_time = (time.time() - response_start) * 1000
        total_time = (time.time() - start_time) * 1000
        
        print(f"📦 [{request_id}] Response hazırlandı: {response_time:.2f}ms")
        print(f"✅ [{request_id}] LOGIN BAŞARILI - Toplam süre: {total_time:.2f}ms")
        
        # Detaylı timing breakdown
        print(f"📊 [{request_id}] TIMING BREAKDOWN:")
        print(f"📊   - Database lookup: {db_lookup_time:.2f}ms ({(db_lookup_time/total_time)*100:.1f}%)")
        print(f"📊   - Password verify: {password_time:.2f}ms ({(password_time/total_time)*100:.1f}%)")
        print(f"📊   - Response prep:   {response_time:.2f}ms ({(response_time/total_time)*100:.1f}%)")
        print(f"📊   - TOPLAM:          {total_time:.2f}ms")
        
        return login_response
        
    except HTTPException as he:
        total_time = (time.time() - start_time) * 1000
        print(f"❌ [{request_id}] HTTP Exception: {he.detail} - Süre: {total_time:.2f}ms")
        raise
    except Exception as e:
        total_time = (time.time() - start_time) * 1000
        print(f"🚨 [{request_id}] Unexpected error: {str(e)} - Süre: {total_time:.2f}ms")
        print(f"🚨 [{request_id}] Error type: {type(e).__name__}")
        import traceback
        print(f"🚨 [{request_id}] Traceback: {traceback.format_exc()}")
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
            created_at=user.created_at,
            image=user.image
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
        admin_email = "admin@anef.org.tr"
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
        
        # Profil resmi güncelleme
        if update_data.profilePhoto:
            profile_photo = update_data.profilePhoto
            # Data URL prefix varsa kaldır
            if profile_photo.startswith('data:image'):
                profile_photo = profile_photo.split(',')[1] if ',' in profile_photo else profile_photo
            
            # Base64 validation
            try:
                import base64
                base64.b64decode(profile_photo)
                user.image = profile_photo
            except Exception:
                raise HTTPException(status_code=400, detail="Geçersiz resim formatı")
        
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

@app.get("/api/businesses/test")
async def test_business_endpoint(db: Session = Depends(get_db)):
    """Test endpoint to check if database and endpoint are working"""
    try:
        # Test 1: Check if users table exists and has data
        user_count = db.query(DBUser).count()
        
        # Test 2: Check if business table exists
        business_count = db.query(DBBusiness).count()
        
        # Test 3: Get first user if exists
        first_user = db.query(DBUser).first()
        
        return {
            "status": "OK",
            "database": "connected",
            "user_count": user_count,
            "business_count": business_count,
            "first_user_id": first_user.id if first_user else None,
            "first_user_email": first_user.email if first_user else None
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "error": str(e),
            "error_type": type(e).__name__
        }

@app.post("/api/businesses", response_model=BusinessResponse)
async def create_business(business: BusinessCreate, owner_id: int, db: Session = Depends(get_db)):
    """Create a new business - requires owner_id"""
    print(f"🏢 [CREATE BUSINESS] Request alındı - owner_id: {owner_id}")
    print(f"🏢 [CREATE BUSINESS] Business data: {business.dict()}")
    start_time = time.time()
    try:
        # Verify owner exists and is active
        print(f"🏢 [CREATE BUSINESS] Owner kontrolü yapılıyor...")
        owner = db.query(DBUser).filter(DBUser.id == owner_id, DBUser.is_active == True).first()
        if not owner:
            print(f"❌ [CREATE BUSINESS] Owner bulunamadı: {owner_id}")
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        print(f"✅ [CREATE BUSINESS] Owner bulundu: {owner.email}")
        
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
        
        print(f"🏢 [CREATE BUSINESS] Database'e ekleniyor...")
        db.add(new_business)
        db.commit()
        db.refresh(new_business)
        
        elapsed = (time.time() - start_time) * 1000
        print(f"✅ [CREATE BUSINESS] Başarılı! Süre: {elapsed:.2f}ms - Business ID: {new_business.id}")
        
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
    start_time = time.time()
    try:
        print(f"🏢 [BUSINESSES] Query başladı - owner_id: {owner_id}")
        query_start = time.time()
        
        # Query oluştur - sadece gerekli alanları seç (relationship'leri atla)
        query = db.query(
            DBBusiness.id,
            DBBusiness.name,
            DBBusiness.description,
            DBBusiness.website,
            DBBusiness.phone,
            DBBusiness.email,
            DBBusiness.address,
            DBBusiness.business_type,
            DBBusiness.logo_url,
            DBBusiness.is_active,
            DBBusiness.owner_id,
            DBBusiness.created_at
        ).filter(DBBusiness.is_active == True)
        
        if owner_id:
            query = query.filter(DBBusiness.owner_id == owner_id)
        
        businesses = query.all()
        query_time = (time.time() - query_start) * 1000
        print(f"🏢 [BUSINESSES] Query tamamlandı: {query_time:.2f}ms - {len(businesses)} kayıt")
        
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
        
        total_time = (time.time() - start_time) * 1000
        print(f"🏢 [BUSINESSES] Total süre: {total_time:.2f}ms")
        
        return {
            "businesses": business_list,
            "count": len(business_list),
            "success": True
        }
        
    except Exception as e:
        print(f"❌ Get businesses error: {e}")
        import traceback
        traceback.print_exc()
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
        
        # Process profile photo if provided
        profile_photo = None
        if member.profilePhoto:
            profile_photo = member.profilePhoto
            # Data URL prefix varsa kaldır
            if profile_photo.startswith('data:image'):
                profile_photo = profile_photo.split(',')[1] if ',' in profile_photo else profile_photo
            
            # Base64 validation
            try:
                import base64
                base64.b64decode(profile_photo)
            except Exception:
                raise HTTPException(status_code=400, detail="Geçersiz resim formatı")
        
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
            association=member.association,
            status=member.status,
            profile_photo=profile_photo
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
            "association": db_member.association,
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
    try:
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
                "association": member.association,
                "status": member.status,
                "profilePhoto": member.profile_photo,  # Profil fotoğrafını ekle
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
    except Exception as e:
        import traceback
        print(f"Error in /api/members: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal server error while fetching members.")

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
        "association": member.association,
        "status": member.status,
        "profilePhoto": member.profile_photo,  # Profil fotoğrafını ekle
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
        "association": member.association,
        "status": member.status,
        "profilePhoto": member.profile_photo,  # Profil fotoğrafını ekle
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
        elif field == "association":
            db_member.association = value
        elif field == "status":
            db_member.status = value
        elif field == "profilePhoto":
            # Process profile photo
            profile_photo = value
            # Data URL prefix varsa kaldır
            if profile_photo and profile_photo.startswith('data:image'):
                profile_photo = profile_photo.split(',')[1] if ',' in profile_photo else profile_photo
            
            # Base64 validation
            if profile_photo:
                try:
                    import base64
                    base64.b64decode(profile_photo)
                    db_member.profile_photo = profile_photo
                except Exception:
                    raise HTTPException(status_code=400, detail="Geçersiz resim formatı")
    
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
        "association": db_member.association,
        "status": db_member.status,
        "createdAt": db_member.created_at,
        "updatedAt": db_member.updated_at
    }
    
    return {
        "member": member_data,
        "message": "Üye bilgileri başarıyla güncellendi",
        "success": True
    }

# Profile Photo Endpoints

@app.post("/api/members/{member_id}/profile-photo", response_model=ProfilePhotoResponse)
async def upload_profile_photo(member_id: int, photo_data: ProfilePhotoUpload, db: Session = Depends(get_db)):
    """Üye profil fotoğrafını yükle (Base64 format)"""
    try:
        # Üyenin varlığını kontrol et
        db_member = db.query(DBMember).filter(DBMember.id == member_id).first()
        if not db_member:
            raise HTTPException(status_code=404, detail="Üye bulunamadı")
        
        # Base64 formatı kontrol et
        profile_photo = photo_data.profile_photo
        if not profile_photo:
            raise HTTPException(status_code=400, detail="Profil fotoğrafı verisi gerekli")
        
        # Base64 başlığını kontrol et ve temizle
        if profile_photo.startswith('data:image'):
            # data:image/jpeg;base64, kısmını kaldır
            profile_photo = profile_photo.split(',')[1] if ',' in profile_photo else profile_photo
        
        # Base64 geçerliliğini kontrol et
        try:
            import base64
            base64.b64decode(profile_photo)
        except Exception:
            raise HTTPException(status_code=400, detail="Geçersiz Base64 formatı")
        
        # Profil fotoğrafını veritabanında güncelle
        db_member.profile_photo = profile_photo
        db_member.updated_at = datetime.utcnow()
        db.commit()
        
        return ProfilePhotoResponse(
            success=True,
            message="Profil fotoğrafı başarıyla yüklendi",
            profile_photo_url=f"/api/members/{member_id}/profile-photo"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Profile photo upload error: {e}")
        raise HTTPException(status_code=500, detail="Profil fotoğrafı yüklenirken hata oluştu")

@app.get("/api/members/{member_id}/profile-photo")
async def get_profile_photo(member_id: int, db: Session = Depends(get_db)):
    """Üye profil fotoğrafını al"""
    try:
        # Üyenin varlığını kontrol et
        db_member = db.query(DBMember).filter(DBMember.id == member_id).first()
        if not db_member:
            raise HTTPException(status_code=404, detail="Üye bulunamadı")
        
        # Profil fotoğrafı varsa döndür
        if db_member.profile_photo:
            return {
                "success": True,
                "profile_photo": db_member.profile_photo,
                "has_photo": True
            }
        else:
            return {
                "success": True,
                "profile_photo": None,
                "has_photo": False,
                "message": "Profil fotoğrafı bulunamadı"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Get profile photo error: {e}")
        raise HTTPException(status_code=500, detail="Profil fotoğrafı alınırken hata oluştu")

@app.delete("/api/members/{member_id}/profile-photo")
async def delete_profile_photo(member_id: int, db: Session = Depends(get_db)):
    """Üye profil fotoğrafını sil"""
    try:
        # Üyenin varlığını kontrol et
        db_member = db.query(DBMember).filter(DBMember.id == member_id).first()
        if not db_member:
            raise HTTPException(status_code=404, detail="Üye bulunamadı")
        
        # Profil fotoğrafını sil
        db_member.profile_photo = None
        db_member.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "success": True,
            "message": "Profil fotoğrafı başarıyla silindi"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Delete profile photo error: {e}")
        raise HTTPException(status_code=500, detail="Profil fotoğrafı silinirken hata oluştu")

# Güvenlik endpoint'leri

@app.post("/api/qr/verify")
async def verify_qr_code(qr_data: dict, db: Session = Depends(get_db)):
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
        
        # Temel QR bilgileri
        member_info = {
            "memberId": decoded_data.get("member_id"),
            "membershipId": decoded_data.get("membership_id"), 
            "name": decoded_data.get("name"),
            "status": decoded_data.get("status"),
            "organization": decoded_data.get("org"),
            "issuedAt": decoded_data.get("issued_at"),
            "expiresAt": decoded_data.get("expires_at"),
            "fromDatabase": False
        }
        
        # Database'den üye bilgilerini getir (varsa)
        membership_id = decoded_data.get("membership_id")
        if membership_id:
            member = db.query(DBMember).filter(DBMember.membership_id == membership_id).first()
            
            if member:
                # DB'den tam bilgileri ekle
                member_info.update({
                    "fullName": member.full_name,
                    "email": member.email,
                    "phoneNumber": member.phone_number,
                    "role": getattr(member, 'role', 'member'),  # Default: 'member'
                    "status": member.status,
                    "membershipType": getattr(member, 'membership_type', 'standard'),  # Default: 'standard'
                    "joinDate": member.created_at.strftime('%Y-%m-%d'),
                    "fromDatabase": True,
                    "profilePhoto": member.profile_photo,  # Base64 encoded profil fotoğrafı
                    "associationName": member.association,  # Dernek adı
                })
            else:
                # Üye DB'de bulunamadı
                return {
                    "valid": False,
                    "error": "USER_NOT_FOUND",
                    "message": f"QR kod geçerli ancak üyelik numarası '{membership_id}' ile kayıtlı bir kullanıcı bulunamadı.",
                    "membershipId": membership_id,
                    "success": False
                }
        
        return {
            "valid": True,
            "member": member_info,
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
        print(f"🔍 Decrypted result length: {len(decrypted_json) if decrypted_json else 0}")
        print(f"🔍 Full decrypted result: {decrypted_json}")
        print(f"🔍 Decrypted preview: {decrypted_json[:100] if decrypted_json else 'None'}")
        
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
                "role": getattr(member, 'role', 'member'),  # Default: 'member'
                "status": member.status,
                "membershipType": getattr(member, 'membership_type', 'standard'),  # Default: 'standard'
                "joinDate": member.created_at.strftime('%Y-%m-%d'),
                "fromDatabase": True,
                "profilePhoto": member.profile_photo,  # Base64 encoded profil fotoğrafı
                "associationName": member.association,  # Dernek adı
            })
        else:
            # Üye DB'de bulunamadı
            log_nfc_reading(
                db=db,
                device_info=device_info,
                card_uid=card_uid,
                read_success=False,
                error_message=f"Üye bulunamadı: {membership_id}",
                verification_type="online",
                reader_name="MAUI App"
            )
            return {
                "success": False,
                "valid": False,
                "error": "USER_NOT_FOUND",
                "message": f"Kart başarıyla okundu ancak üyelik numarası '{membership_id}' ile kayıtlı bir kullanıcı bulunamadı.",
                "membershipId": membership_id
            }
        
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






# Offline Verification API
class OfflineVerifyRequest(BaseModel):
    encryptedData: str
    deviceInfo: Optional[str] = None

@app.post("/api/nfc/verify-offline")
async def verify_offline_nfc(request: OfflineVerifyRequest, db: Session = Depends(get_db)):
    """
    Offline NFC doğrulama - internet bağlantısı olmadığında kullanılır
    Embedded public key ile basit imza doğrulaması yapar
    """
    device_info = request.deviceInfo or "Offline Device"
    
    try:
        encrypted_data = request.encryptedData.strip()
        print(f"🔍 Offline verification - encrypted data length: {len(encrypted_data)}")
        
        # 1) Çift şifrelemeyi çöz (XOR + Base64)
        decrypted_json = _decrypt_nfc_data_offline(encrypted_data)
        if not decrypted_json:
            return {
                "success": False,
                "error": "DECRYPTION_FAILED",
                "message": "Veri çözülemedi - geçersiz şifreleme"
            }
        
        # 2) JSON parse et
        try:
            nfc_data = json.loads(decrypted_json)
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "INVALID_JSON",
                "message": "Geçersiz JSON formatı"
            }
        
        # 3) Gerekli alanları kontrol et
        required_fields = ['v', 'mid', 'name', 'exp', 'sig']
        for field in required_fields:
            if field not in nfc_data:
                return {
                    "success": False,
                    "error": "MISSING_FIELD",
                    "message": f"Eksik alan: {field}"
                }
        
        # 4) Version kontrolü
        if nfc_data['v'] != 1:
            return {
                "success": False,
                "error": "UNSUPPORTED_VERSION",
                "message": "Desteklenmeyen veri versiyonu"
            }
        
        # 5) Expiration date kontrolü
        exp_date_str = nfc_data['exp']
        try:
            exp_date = datetime.strptime(exp_date_str, '%Y%m%d')
            if exp_date < datetime.utcnow():
                return {
                    "success": False,
                    "error": "EXPIRED",
                    "message": f"NFC kartının süresi dolmuş (Son geçerlilik: {exp_date.strftime('%Y-%m-%d')})"
                }
        except ValueError:
            return {
                "success": False,
                "error": "INVALID_DATE",
                "message": "Geçersiz expiration date formatı"
            }
        
        # 6) Basit offline imza doğrulaması
        signature_valid = _verify_nfc_signature_offline(nfc_data)
        if not signature_valid:
            return {
                "success": False,
                "error": "INVALID_SIGNATURE",
                "message": "Dijital imza doğrulanamadı - sahte kart olabilir"
            }
        
        # 7) Başarılı - offline doğrulama tamamlandı
        membership_id = nfc_data['mid']
        member_name = nfc_data['name']
        
        # Offline başarılı doğrulama kaydını log'la
        log_nfc_reading(
            db=db,
            device_info=device_info,
            read_success=True,
            verification_type="offline",
            member_id=membership_id,
            reader_name="Offline Verification"
        )
        
        return {
            "success": True,
            "valid": True,
            "member": {
                "membershipId": membership_id,
                "name": member_name,
                "status": "Active (Offline)",
                "fromDatabase": False,
                "role": "Member",
                "expirationDate": exp_date.strftime('%Y-%m-%d')
            },
            "verificationTime": datetime.utcnow().isoformat(),
            "verificationMode": "offline"
        }
        
    except Exception as e:
        print(f"❌ Offline verification error: {e}")
        return {
            "success": False,
            "error": "VERIFICATION_ERROR",
            "message": f"Offline doğrulama hatası: {str(e)}"
        }

def _decrypt_nfc_data_offline(encrypted_data: str) -> Optional[str]:
    """
    Offline NFC veri şifresini çöz (XOR + Base64)
    MauiNfcReader'daki DecryptNfcData fonksiyonunun Python karşılığı
    """
    try:
        if not encrypted_data.startswith("NFC_ENC_V1:"):
            return encrypted_data  # Şifrelenmiş değil
        
        # Prefix'i kaldır
        encrypted_b64 = encrypted_data[11:]
        
        # Base64 decode
        import base64
        encrypted_bytes = base64.b64decode(encrypted_b64)
        
        # XOR ile çöz
        key = "NFC_SECURE_2024_CRYPTO_KEY_ADVANCED".encode('utf-8')
        decrypted_bytes = bytearray()
        
        for i in range(len(encrypted_bytes)):
            decrypted_bytes.append(encrypted_bytes[i] ^ key[i % len(key)])
        
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        print(f"❌ Offline decryption error: {e}")
        return None

def _verify_nfc_signature_offline(nfc_data: dict) -> bool:
    """
    Offline NFC imza doğrulaması - crypto_utils'daki fonksiyonu kullanır
    """
    return secure_qr.verify_nfc_signature_offline(nfc_data)


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