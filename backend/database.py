from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv
import hashlib

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
    
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL, echo=True)
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
    membership_type = Column(String(50), nullable=False)
    role = Column(String(50), nullable=False)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utility functions for password hashing
def hash_password(password: str) -> str:
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return hash_password(password) == hashed_password

def create_default_admin():
    """Create default admin user if it doesn't exist"""
    db = SessionLocal()
    try:
        # Check if admin user already exists
        admin_user = db.query(User).filter(User.email == "admin@qrvirtualcard.com").first()
        
        if not admin_user:
            # Create default admin user
            admin_user = User(
                name="Admin User",
                email="admin@qrvirtualcard.com",
                password_hash=hash_password("admin123"),  # Default password
                role="admin",
                is_active=True,
                email_verified=datetime.utcnow()
            )
            db.add(admin_user)
            db.commit()
            print("✅ Default admin user created successfully!")
            print("📧 Email: admin@qrvirtualcard.com")
            print("🔑 Password: admin123")
            print("⚠️  Please change the default password after first login!")
        else:
            print("ℹ️  Default admin user already exists")
    except Exception as e:
        print(f"❌ Error creating default admin user: {e}")
        db.rollback()
    finally:
        db.close()

# Initialize database
def init_db():
    create_tables()
    print("✅ Database tables created successfully!")
    create_default_admin()

if __name__ == "__main__":
    init_db() 