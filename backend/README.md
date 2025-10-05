# QR Virtual Card Backend

FastAPI ile geliştirilmiş backend API servisi.

## Kurulum

### 1. Sanal ortam oluşturun
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# veya
venv\Scripts\activate  # Windows
```

### 2. Bağımlılıkları yükleyin
```bash
pip install -r requirements.txt
```

### 3. Environment variables ayarlayın
```bash
cp .env.example .env
# .env dosyasını düzenleyip kendi değerlerinizi ekleyin
```

### 4. Uygulamayı çalıştırın
```bash
python main.py
# veya
uvicorn main:app --reload
```

API şu adreste çalışacak: http://localhost:8000

## Canlı Deployment

- **Production API:** https://qrvirtualcardgenerator.onrender.com
- **Swagger UI:** https://qrvirtualcardgenerator.onrender.com/docs
- **ReDoc:** https://qrvirtualcardgenerator.onrender.com/redoc

## API Dokümantasyonu (Local)

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

- `GET /` - Ana sayfa
- `GET /health` - Sağlık kontrolü
- `GET /api/test` - Test endpoint'i 