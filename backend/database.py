from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean, Float, ForeignKey
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import hashlib
import time

# Load environment variables
load_dotenv()

# Database URL configuration
DATABASE_URL = os.getenv("DATABASE_URL")

# If DATABASE_URL is not set, build it from individual components
if not DATABASE_URL:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "qrvirtualcard")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
    
    # PostgreSQL connection string with psycopg2 driver
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create SQLAlchemy engine
# Pool ayarları: optimize edilmiş havuz, pre_ping ile bağlantı sağlığı kontrolü, recycle ile uzun bağlantıları yenile

# Database türüne göre connect_args ayarla
connect_args = {}
if DATABASE_URL and 'postgresql' in DATABASE_URL:
    # PostgreSQL için
    connect_args = {
        'connect_timeout': 10,  # 10 saniye connection timeout
    }
elif DATABASE_URL and 'mysql' in DATABASE_URL:
    # MySQL için (geriye dönük durumda)
    connect_args = {
        'connect_timeout': 10,  # 10 saniye connection timeout
        'read_timeout': 10,     # 10 saniye read timeout
        'write_timeout': 10     # 10 saniye write timeout
    }

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,  # Her bağlantıdan önce ping at
    pool_size=10,  # Arttırıldı: 5 -> 10
    max_overflow=20,  # Arttırıldı: 10 -> 20
    pool_recycle=300,  # 5 dakikada bir bağlantıları yenile
    connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# User model for authentication (NextAuth uyumlu)
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    email_verified = Column(DateTime, nullable=True)
    image = Column(Text, nullable=True)
    password_hash = Column(String(255), nullable=True)  # Hashed password için
    role = Column(String(50), default="user")  # admin, user
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    businesses = relationship("Business", back_populates="owner")

# Business model
class Business(Base):
    __tablename__ = "businesses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    website = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    business_type = Column(String(100), nullable=True)  # restaurant, retail, service, etc.
    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship("User", back_populates="businesses")
    events = relationship("BusinessEvent", back_populates="business")
    contracts = relationship("BusinessContract", back_populates="business")

# Business Event model (indirimleri, kampanyaları vs. tutacak)
class BusinessEvent(Base):
    __tablename__ = "business_events"
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String(100), nullable=False)  # discount, campaign, free_shipping, etc.
    discount_percentage = Column(Float, nullable=True)  # İndirim yüzdesi
    discount_amount = Column(Float, nullable=True)  # Sabit indirim tutarı
    min_purchase_amount = Column(Float, nullable=True)  # Minimum alışveriş tutarı
    max_discount_amount = Column(Float, nullable=True)  # Maksimum indirim tutarı
    terms_conditions = Column(Text, nullable=True)  # Şartlar ve koşullar
    is_active = Column(Boolean, default=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    business = relationship("Business", back_populates="events")

# Business Contract model (anlaşma detayları)
class BusinessContract(Base):
    __tablename__ = "business_contracts"
    
    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    contract_title = Column(String(255), nullable=False)
    contract_amount = Column(Float, nullable=False)  # Anlaşma tutarı
    currency = Column(String(10), default="TRY")  # TRY, USD, EUR, etc.
    contract_type = Column(String(100), nullable=False)  # monthly, yearly, one_time, etc.
    commission_percentage = Column(Float, nullable=True)  # Komisyon yüzdesi
    payment_terms = Column(Text, nullable=True)  # Ödeme şartları
    contract_status = Column(String(50), default="active")  # active, inactive, expired
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)  # null ise süresiz
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    business = relationship("Business", back_populates="contracts")

# Member model (mevcut üye sistemi - korunuyor)
class Member(Base):
    __tablename__ = "members"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    membership_id = Column(String(50), unique=True, nullable=False, index=True)
    card_number = Column(String(16), unique=True, nullable=False)
    phone_number = Column(String(20), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    address = Column(Text, nullable=False)
    date_of_birth = Column(String(10), nullable=False)  # YYYY-MM-DD format
    emergency_contact = Column(String(20), nullable=False)
    association = Column(String(100), nullable=False)  # Member's association/dernek
    status = Column(String(20), default="active")
    profile_photo = Column(Text, nullable=True)  # Base64 encoded profile photo
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# NFC Reading History model
class NfcReadingHistory(Base):
    __tablename__ = "nfc_reading_history"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(255), nullable=True)  # Device identifier
    device_info = Column(Text, nullable=True)  # Device information
    card_uid = Column(String(50), nullable=True)  # NFC card UID
    read_success = Column(Boolean, nullable=False)  # Reading success status
    member_id = Column(Integer, ForeignKey("members.id"), nullable=True)  # Related member if found
    error_message = Column(Text, nullable=True)  # Error details if failed
    reader_name = Column(String(255), nullable=True)  # NFC reader name
    verification_type = Column(String(50), nullable=True)  # online, offline
    ip_address = Column(String(45), nullable=True)  # Client IP address
    user_agent = Column(Text, nullable=True)  # Client user agent
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    member = relationship("Member", backref="nfc_readings")

# API Call Logs model - NFC ve diğer API çağrılarının logları
class ApiCallLog(Base):
    __tablename__ = "api_call_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(String(255), nullable=False, index=True)  # API endpoint
    method = Column(String(10), nullable=False)  # GET, POST, PUT, DELETE
    status_code = Column(Integer, nullable=False, index=True)  # HTTP status code
    response_time_ms = Column(Float, nullable=True)  # Response time in milliseconds
    ip_address = Column(String(45), nullable=True)  # Client IP address
    user_agent = Column(Text, nullable=True)  # Client user agent
    request_payload = Column(Text, nullable=True)  # Request body (JSON)
    response_payload = Column(Text, nullable=True)  # Response body (JSON)
    error_message = Column(Text, nullable=True)  # Error details if failed
    member_id = Column(Integer, ForeignKey("members.id"), nullable=True)  # Related member if applicable
    device_info = Column(Text, nullable=True)  # Device information for NFC calls
    
    # API kategorisi - NFC, QR, Auth, Dashboard vs.
    api_category = Column(String(50), nullable=False, index=True)  # nfc, qr, auth, dashboard, member
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship
    member = relationship("Member", backref="api_logs")

# Dashboard Statistics model - Dashboard için önceden hesaplanmış istatistikler
class DashboardStats(Base):
    __tablename__ = "dashboard_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    stat_date = Column(DateTime, nullable=False, index=True)  # İstatistik tarihi (günlük)
    
    # NFC ve QR istatistikleri
    total_nfc_scans = Column(Integer, default=0)  # Günlük toplam NFC tarama
    successful_nfc_scans = Column(Integer, default=0)  # Başarılı NFC tarama
    failed_nfc_scans = Column(Integer, default=0)  # Başarısız NFC tarama
    total_qr_verifications = Column(Integer, default=0)  # Toplam QR doğrulama
    successful_qr_verifications = Column(Integer, default=0)  # Başarılı QR doğrulama
    
    # API istatistikleri
    total_api_calls = Column(Integer, default=0)  # Toplam API çağrısı
    successful_api_calls = Column(Integer, default=0)  # Başarılı API çağrısı (2xx)
    failed_api_calls = Column(Integer, default=0)  # Başarısız API çağrısı (4xx, 5xx)
    avg_response_time_ms = Column(Float, default=0)  # Ortalama yanıt süresi
    
    # Üye istatistikleri
    new_members_count = Column(Integer, default=0)  # Yeni üye sayısı
    active_members_count = Column(Integer, default=0)  # Aktif üye sayısı
    
    # İşletme istatistikleri
    new_businesses_count = Column(Integer, default=0)  # Yeni işletme sayısı
    active_campaigns_count = Column(Integer, default=0)  # Aktif kampanya sayısı
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Import alias for main.py
DBApiCallLog = ApiCallLog
DBDashboardStats = DashboardStats

# Dependency to get database session
def get_db():
    start_time = time.time()
    request_id = f"db_{int(time.time() * 1000)}"
    
    # Sadece authentication endpoint'leri için detaylı logging
    import inspect
    frame = inspect.currentframe()
    caller_name = ""
    try:
        if frame and frame.f_back and frame.f_back.f_back:
            caller_name = frame.f_back.f_back.f_code.co_name
    except:
        pass
    
    # Authentication related calls için özel logging
    is_auth_call = caller_name in ['login', 'get_current_user'] or 'auth' in caller_name.lower()
    
    if is_auth_call:
        print(f"🗄️ [{request_id}] Database session oluşturuluyor... (caller: {caller_name})")
    
    session_start = time.time()
    db = SessionLocal()
    session_time = (time.time() - session_start) * 1000
    
    if is_auth_call:
        print(f"🗄️ [{request_id}] Database session oluşturuldu: {session_time:.2f}ms")
    
    try:
        yield db
    finally:
        close_start = time.time()
        db.close()
        close_time = (time.time() - close_start) * 1000
        total_time = (time.time() - start_time) * 1000
        
        if is_auth_call:
            print(f"🗄️ [{request_id}] Database session kapatıldı: {close_time:.2f}ms")
            print(f"🗄️ [{request_id}] Total DB session time: {total_time:.2f}ms")

# Utility functions for password hashing
def hash_password(password: str) -> str:
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash with timing logs"""
    start_time = time.time()
    request_id = f"pwd_{int(time.time() * 1000)}"
    
    print(f"🔑 [{request_id}] Password verification başlıyor...")
    print(f"🔑 [{request_id}] Input password length: {len(password)} chars")
    print(f"🔑 [{request_id}] Stored hash length: {len(hashed_password)} chars")
    
    try:
        # Hash the input password
        hash_start = time.time()
        input_hash = hash_password(password)
        hash_time = (time.time() - hash_start) * 1000
        print(f"🔑 [{request_id}] Password hashing tamamlandı: {hash_time:.2f}ms")
        
        # Compare hashes
        compare_start = time.time()
        is_match = input_hash == hashed_password
        compare_time = (time.time() - compare_start) * 1000
        
        total_time = (time.time() - start_time) * 1000
        
        print(f"🔑 [{request_id}] Hash comparison tamamlandı: {compare_time:.2f}ms")
        print(f"🔑 [{request_id}] Password verification result: {'✅ MATCH' if is_match else '❌ NO MATCH'}")
        print(f"🔑 [{request_id}] TOTAL PASSWORD VERIFY TIME: {total_time:.2f}ms")
        
        # Timing breakdown
        print(f"🔑 [{request_id}] BREAKDOWN: Hash={hash_time:.1f}ms, Compare={compare_time:.1f}ms")
        
        return is_match
        
    except Exception as e:
        total_time = (time.time() - start_time) * 1000
        print(f"🚨 [{request_id}] Password verification error: {str(e)} - Time: {total_time:.2f}ms")
        return False

def create_default_admin():
    """Create default admin user if it doesn't exist"""
    db = SessionLocal()
    try:
        # Check if admin user already exists
        admin_user = db.query(User).filter(User.email == "admin@anef.org.tr").first()
        
        if not admin_user:
            # Create default admin user for ANEF
            admin_user = User(
                name="ANEF Admin",
                email="admin@anef.org.tr",
                password_hash=hash_password("anef2025"),  # ANEF password
                role="admin",
                is_active=True,
                email_verified=datetime.utcnow()
            )
            db.add(admin_user)
            print("✅ ANEF admin user created successfully!")
            print("📧 Email: admin@anef.org.tr")
            print("🔑 Password: anef2025")
        else:
            print("ℹ️  ANEF admin user already exists")
            
        db.commit()
        
    except Exception as e:
        print(f"❌ Error creating default admin user: {e}")
        db.rollback()
    finally:
        db.close()

# Data cleanup functions
def cleanup_old_logs(retention_days: int = 30):
    """1 aylık eski API loglarını ve NFC reading history'sini temizle"""
    db = SessionLocal()
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        # API call logs temizleme
        deleted_api_logs = db.query(ApiCallLog).filter(
            ApiCallLog.created_at < cutoff_date
        ).delete()
        
        # NFC reading history temizleme
        deleted_nfc_logs = db.query(NfcReadingHistory).filter(
            NfcReadingHistory.created_at < cutoff_date
        ).delete()
        
        # Dashboard stats temizleme (90 günden eski)
        stats_cutoff_date = datetime.utcnow() - timedelta(days=90)
        deleted_stats = db.query(DashboardStats).filter(
            DashboardStats.stat_date < stats_cutoff_date
        ).delete()
        
        db.commit()
        
        print(f"✅ Cleanup completed:")
        print(f"   - API logs deleted: {deleted_api_logs}")
        print(f"   - NFC reading logs deleted: {deleted_nfc_logs}")
        print(f"   - Dashboard stats deleted: {deleted_stats}")
        
        return {
            "api_logs_deleted": deleted_api_logs,
            "nfc_logs_deleted": deleted_nfc_logs,
            "stats_deleted": deleted_stats
        }
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

def calculate_daily_stats(target_date: datetime = None):
    """Belirtilen tarih için günlük istatistikleri hesapla ve kaydet"""
    if target_date is None:
        target_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    db = SessionLocal()
    try:
        start_date = target_date
        end_date = start_date + timedelta(days=1)
        
        # API call istatistikleri
        api_logs = db.query(ApiCallLog).filter(
            ApiCallLog.created_at >= start_date,
            ApiCallLog.created_at < end_date
        ).all()
        
        total_api_calls = len(api_logs)
        successful_api_calls = len([log for log in api_logs if 200 <= log.status_code < 300])
        failed_api_calls = total_api_calls - successful_api_calls
        
        # Ortalama yanıt süresi hesapla
        response_times = [log.response_time_ms for log in api_logs if log.response_time_ms is not None]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # NFC ve QR istatistikleri
        nfc_logs = [log for log in api_logs if log.api_category == 'nfc']
        qr_logs = [log for log in api_logs if log.api_category == 'qr']
        
        total_nfc_scans = len(nfc_logs)
        successful_nfc_scans = len([log for log in nfc_logs if 200 <= log.status_code < 300])
        failed_nfc_scans = total_nfc_scans - successful_nfc_scans
        
        total_qr_verifications = len(qr_logs)
        successful_qr_verifications = len([log for log in qr_logs if 200 <= log.status_code < 300])
        
        # Üye istatistikleri
        new_members_count = db.query(Member).filter(
            Member.created_at >= start_date,
            Member.created_at < end_date
        ).count()
        
        active_members_count = db.query(Member).filter(
            Member.status == 'active'
        ).count()
        
        # İşletme istatistikleri
        new_businesses_count = db.query(Business).filter(
            Business.created_at >= start_date,
            Business.created_at < end_date
        ).count()
        
        active_campaigns_count = db.query(BusinessEvent).filter(
            BusinessEvent.is_active == True,
            BusinessEvent.start_date <= datetime.utcnow(),
            BusinessEvent.end_date >= datetime.utcnow()
        ).count()
        
        # Mevcut istatistiği kontrol et
        existing_stat = db.query(DashboardStats).filter(
            DashboardStats.stat_date == start_date
        ).first()
        
        if existing_stat:
            # Güncelle
            existing_stat.total_api_calls = total_api_calls
            existing_stat.successful_api_calls = successful_api_calls
            existing_stat.failed_api_calls = failed_api_calls
            existing_stat.avg_response_time_ms = avg_response_time
            existing_stat.total_nfc_scans = total_nfc_scans
            existing_stat.successful_nfc_scans = successful_nfc_scans
            existing_stat.failed_nfc_scans = failed_nfc_scans
            existing_stat.total_qr_verifications = total_qr_verifications
            existing_stat.successful_qr_verifications = successful_qr_verifications
            existing_stat.new_members_count = new_members_count
            existing_stat.active_members_count = active_members_count
            existing_stat.new_businesses_count = new_businesses_count
            existing_stat.active_campaigns_count = active_campaigns_count
            existing_stat.updated_at = datetime.utcnow()
        else:
            # Yeni kayıt oluştur
            new_stat = DashboardStats(
                stat_date=start_date,
                total_api_calls=total_api_calls,
                successful_api_calls=successful_api_calls,
                failed_api_calls=failed_api_calls,
                avg_response_time_ms=avg_response_time,
                total_nfc_scans=total_nfc_scans,
                successful_nfc_scans=successful_nfc_scans,
                failed_nfc_scans=failed_nfc_scans,
                total_qr_verifications=total_qr_verifications,
                successful_qr_verifications=successful_qr_verifications,
                new_members_count=new_members_count,
                active_members_count=active_members_count,
                new_businesses_count=new_businesses_count,
                active_campaigns_count=active_campaigns_count
            )
            db.add(new_stat)
        
        db.commit()
        print(f"✅ Daily stats calculated for {start_date.strftime('%Y-%m-%d')}")
        
        return {
            "date": start_date.strftime('%Y-%m-%d'),
            "total_api_calls": total_api_calls,
            "successful_api_calls": successful_api_calls,
            "total_nfc_scans": total_nfc_scans,
            "total_qr_verifications": total_qr_verifications,
            "new_members_count": new_members_count,
            "active_campaigns_count": active_campaigns_count
        }
        
    except Exception as e:
        print(f"❌ Error calculating daily stats: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

# Initialize database
def init_db():
    create_tables()
    print("✅ Database tables created successfully!")
    create_default_admin()

if __name__ == "__main__":
    init_db() 