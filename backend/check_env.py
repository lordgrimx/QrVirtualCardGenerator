"""
.env dosyasindaki degiskenleri kontrol et
"""
import os
from dotenv import load_dotenv

load_dotenv()

print("=" * 60)
print("Environment Variables Kontrolu")
print("=" * 60)

# DATABASE_URL varsa onu kullanir
database_url = os.getenv("DATABASE_URL")
print(f"\nDATABASE_URL: {database_url if database_url else 'TANIMLANMAMIS'}")

# Bireysel degiskenler
print(f"\nDB_USER: {os.getenv('DB_USER', 'TANIMLANMAMIS')}")
print(f"DB_PASSWORD: {'*' * len(os.getenv('DB_PASSWORD', '')) if os.getenv('DB_PASSWORD') else 'TANIMLANMAMIS'}")
print(f"DB_HOST: {os.getenv('DB_HOST', 'TANIMLANMAMIS')}")
print(f"DB_PORT: {os.getenv('DB_PORT', 'TANIMLANMAMIS')}")
print(f"DB_NAME: {os.getenv('DB_NAME', 'TANIMLANMAMIS')}")

print("\n" + "=" * 60)
print("SONUC:")
print("=" * 60)

if database_url:
    print("\nDATABASE_URL kullaniliyor (diger degiskenler ignore ediliyor)")
    print(f"Connection string: {database_url}")
    
    # Database_url'den kullanici adini cikar
    if "@" in database_url and ":" in database_url:
        user_part = database_url.split("://")[1].split("@")[0]
        username = user_part.split(":")[0]
        print(f"\nKullanici adi (DATABASE_URL'den): {username}")
else:
    print("\nBireysel degiskenler kullaniliyor:")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "qrvirtualcard")
    
    constructed_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    print(f"Olusturulan URL: {constructed_url}")

print("\n" + "=" * 60)

