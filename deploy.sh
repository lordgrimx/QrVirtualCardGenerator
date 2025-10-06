#!/bin/bash

##############################################################################
# QR Virtual Card Generator - VPS Deployment Script
# Bu script projenizi otomatik olarak günceller ve yeniden başlatır
##############################################################################

set -e  # Hata durumunda dur

echo "🚀 QR Virtual Card Generator - Deployment Script"
echo "=================================================="

# Renkli output için
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Proje dizini
PROJECT_DIR="/var/www/qrvirtualcard"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/front"

echo -e "${YELLOW}📂 Proje dizinine geçiliyor...${NC}"
cd $PROJECT_DIR

# Git güncellemeleri
echo -e "${YELLOW}🔄 Git güncellemeleri çekiliyor...${NC}"
git fetch origin vps-deployment
git pull origin vps-deployment

# Backend güncelleme
echo -e "${YELLOW}🐍 Backend güncelleniyor...${NC}"
cd $BACKEND_DIR

# Virtual environment aktifleştir
source venv/bin/activate

# Dependencies güncelle
echo -e "${YELLOW}📦 Python paketleri güncelleniyor...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

# Database migrations
echo -e "${YELLOW}🗄️  Database migrations çalıştırılıyor...${NC}"
alembic upgrade head

# Backend'i yeniden başlat
echo -e "${YELLOW}🔄 Backend yeniden başlatılıyor...${NC}"
pm2 restart backend

# Frontend güncelleme
echo -e "${YELLOW}⚛️  Frontend güncelleniyor...${NC}"
cd $FRONTEND_DIR

# Dependencies güncelle
echo -e "${YELLOW}📦 NPM paketleri güncelleniyor...${NC}"
npm install

# Build
echo -e "${YELLOW}🏗️  Frontend build ediliyor...${NC}"
npm run build

# Frontend'i yeniden başlat
echo -e "${YELLOW}🔄 Frontend yeniden başlatılıyor...${NC}"
pm2 restart frontend

# Nginx'i yeniden yükle
echo -e "${YELLOW}🌐 Nginx konfig yeniden yükleniyor...${NC}"
sudo nginx -t && sudo systemctl reload nginx

# PM2'yi kaydet
echo -e "${YELLOW}💾 PM2 konfigürasyonu kaydediliyor...${NC}"
pm2 save

# Durum kontrolü
echo -e "${YELLOW}📊 Servis durumları kontrol ediliyor...${NC}"
pm2 status

echo ""
echo -e "${GREEN}✅ Deployment başarıyla tamamlandı!${NC}"
echo ""
echo "📱 Erişim Bilgileri:"
echo "   Frontend: http://$(hostname -I | awk '{print $1}')"
echo "   Backend API: http://$(hostname -I | awk '{print $1}')/api"
echo "   API Docs: http://$(hostname -I | awk '{print $1}')/api/docs"
echo ""
echo "📋 Logları görüntülemek için:"
echo "   Backend: pm2 logs backend"
echo "   Frontend: pm2 logs frontend"
echo "   Nginx: sudo tail -f /var/log/nginx/qrvirtualcard_error.log"
echo ""
echo -e "${GREEN}🎉 Deployment tamamlandı!${NC}"

