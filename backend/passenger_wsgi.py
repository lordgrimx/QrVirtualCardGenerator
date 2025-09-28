#!/home/sabrialp/virtualenv/api.sabrialperenkaya.com.tr/3.12/bin/python3.12
# -*- coding: utf-8 -*-

"""
cPanel Passenger WSGI Entry Point
Bu dosya cPanel'de Python uygulamanızın entry point'idir.
"""

import sys
import os

# Virtual environment path'ini Python path'e ekle
VIRTUAL_ENV = '/home/sabrialp/virtualenv/api.sabrialperenkaya.com.tr/3.12'
if VIRTUAL_ENV not in sys.path:
    sys.path.insert(0, VIRTUAL_ENV + '/lib/python3.12/site-packages')

# Application directory'yi Python path'e ekle
APP_DIR = os.path.dirname(os.path.abspath(__file__))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

# Environment variables yükle
from dotenv import load_dotenv
env_path = os.path.join(APP_DIR, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
    print(f"✅ Environment variables loaded from {env_path}")

# FastAPI uygulamasını import et
try:
    from main import app
    print("✅ FastAPI app imported successfully")
except ImportError as e:
    print(f"❌ Error importing FastAPI app: {e}")
    raise

# WSGI adapter
def application(environ, start_response):
    """
    WSGI application entry point
    cPanel Passenger bu fonksiyonu çağırır
    """
    try:
        # ASGI-to-WSGI adapter kullan
        from asgiref.wsgi import WsgiToAsgi
        asgi_app = WsgiToAsgi(app)
        return asgi_app(environ, start_response)
    except Exception as e:
        print(f"❌ WSGI application error: {e}")
        import traceback
        traceback.print_exc()
        
        # Hata durumunda 500 response döndür
        status = '500 Internal Server Error'
        response_headers = [('Content-type', 'text/plain')]
        start_response(status, response_headers)
        return [f'Server Error: {str(e)}'.encode('utf-8')]

# Debug bilgileri
if __name__ == "__main__":
    print("🚀 cPanel Passenger WSGI Entry Point")
    print(f"📁 App Directory: {APP_DIR}")
    print(f"🐍 Python Version: {sys.version}")
    print(f"📚 Python Path: {sys.path}")
    print(f"🌍 Environment: {os.environ.get('ENVIRONMENT', 'development')}")
