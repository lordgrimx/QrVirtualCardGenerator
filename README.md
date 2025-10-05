# QR Virtual Card Generator 🎴

Modern, QR kodlu dijital üyelik kartı uygulaması. Community Connect için geliştirilmiş React ve FastAPI tabanlı full-stack uygulama.

## ✨ Özellikler

### 🎴 **Modern Dijital Kart**
- QR kodlu üyelik kartı tasarımı
- Front/Back 3D flip animasyonu
- Gradient tasarım ve modern UI
- Responsive tasarım

### 📱 **QR Kod Özellikleri**
- Kullanıcı bilgilerini içeren QR kod
- Hızlı doğrulama sistemi
- JSON formatında veri depolama

### 👤 **Kullanıcı Yönetimi**
- Profil bilgileri yönetimi
- Üyelik durumu takibi
- İletişim bilgileri

### 🎨 **Modern UI/UX**
- Inter font ailesi
- Smooth animasyonlar
- Hover efektleri
- Figma tasarımından aktarılmış pixel-perfect UI

## 🚀 Teknolojiler

### Frontend
- **Next.js 14** - React framework
- **Tailwind CSS** - Utility-first CSS
- **QRCode.react** - QR kod oluşturma
- **Inter Font** - Modern tipografi

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Production database (Render.com)
- **SQLAlchemy** - ORM for database operations
- **Uvicorn** - ASGI server
- **Python 3.12** - Backend dili

## 📁 Proje Yapısı

```
QrVirtualCard/
├── front/                    # Next.js Frontend
│   ├── app/
│   │   ├── page.js          # Ana sayfa komponenti
│   │   ├── layout.js        # Layout komponenti
│   │   └── globals.css      # Global stiller
│   ├── package.json
│   └── ...
├── backend/                  # FastAPI Backend
│   ├── main.py              # Ana API dosyası
│   ├── requirements.txt     # Python bağımlılıkları
│   └── myenv/              # Python virtual environment
├── .gitignore
└── README.md
```

## 🛠️ Kurulum

### Ön Gereksinimler
- Node.js 18+
- Python 3.12+
- PostgreSQL Database (Render.com veya local)
- npm veya yarn

### 1. PostgreSQL Database Kurulumu

#### Render.com'da PostgreSQL Oluşturun:
1. [Render.com](https://render.com) hesabınıza giriş yapın
2. "New" → "PostgreSQL" seçin
3. Database adını ve planını seçin
4. Database oluşturduktan sonra connection detaylarını kopyalayın

### 2. Backend Kurulumu

```bash
cd backend

# Virtual environment oluşturun
python -m venv myenv
source myenv/bin/activate  # Linux/Mac
# veya
myenv\Scripts\activate     # Windows

# Dependencies kurun
pip install -r requirements.txt

# Environment dosyası oluşturun
cp env_template.txt .env

# .env dosyasını düzenleyin ve PostgreSQL bilgilerinizi girin
# DATABASE_URL="postgresql://username:password@hostname:port/database_name"

# Database tablolarını oluşturun
python database.py

# API'yi başlatın
python main.py
```

Backend `http://localhost:8000` adresinde çalışacak.

### 3. Frontend Kurulumu

```bash
cd front
npm install
npm run dev
```

Frontend `http://localhost:3000` adresinde çalışacak.

## 🌐 Canlı Deployment

- **Frontend (Vercel):** https://qr-virtual-card-generator.vercel.app/
- **Backend (Render):** https://qrvirtualcardgenerator.onrender.com

## 🎯 Kullanım

### Canlı Versiyon
1. https://qr-virtual-card-generator.vercel.app/ adresine gidin
2. Üyelik kartınızı görüntüleyin ve yönetin

### Local Development
1. **Frontend'i başlatın** (`npm run dev`)
2. **Backend'i başlatın** (`python main.py`)
3. **Browser'da** `http://localhost:3000` adresine gidin
4. **Üyelik kartınızı** görüntüleyin ve yönetin

## 🎨 Figma Tasarım Entegrasyonu

Bu proje **TalkToFigmaNoLocal MCP** kullanılarak Figma tasarımından doğrudan aktarılmıştır:

- Pixel-perfect tasarım implementasyonu
- Orijinal renk paleti ve tipografi
- Figma'daki layout ve spacing değerleri
- Modern gradient ve shadow efektleri

## 📱 Ekran Görüntüleri

### Üyelik Kartı (Front)
- QR kod ile hızlı doğrulama
- Kullanıcı bilgileri ve status
- Modern gradient tasarım

### Üyelik Kartı (Back)
- Detaylı iletişim bilgileri
- Acil durum iletişim
- Güvenlik özellikleri

### Profil Yönetimi
- Kullanıcı bilgileri tablosu
- Üyelik durumu gösterimi
- Responsive tasarım

## 🤝 Katkıda Bulunma

1. Projeyi fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Branch'inizi push edin (`git push origin feature/AmazingFeature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje özel bir projedir. Kopyalama ve dağıtım izin gerektirir.

## 👤 İletişim

**Geliştirici:** lordgrimx
**GitHub:** [@lordgrimx](https://github.com/lordgrimx)

---

⚡ **Community Connect** ile dijital üyelik kartınızı deneyimleyin! 