# 🌿 VPS Deployment Branch

Bu branch, QR Virtual Card Generator projesinin VPS sunucusuna deploy edilmesi için özel olarak hazırlanmıştır.

## 📚 Kurulum Rehberleri

Kurulum için aşağıdaki dosyaları sırasıyla takip edin:

### 1. 🔐 SSH Bağlantısı
**Dosya**: `VPS-SSH-BAGLANTI.md`
- VPS'e SSH ile nasıl bağlanılır
- SSH key kurulumu
- Güvenlik ayarları

### 2. ⚡ Hızlı Başlangıç
**Dosya**: `QUICK-START-VPS.md`
- Özet kurulum adımları
- Tek script ile otomatik kurulum
- Hızlı test ve doğrulama

### 3. 📖 Detaylı Deployment Rehberi
**Dosya**: `VPS-DEPLOYMENT-GUIDE.md`
- Adım adım manuel kurulum
- Her adımın detaylı açıklaması
- Sorun giderme ipuçları

## 🚀 En Hızlı Kurulum

VPS'e SSH ile bağlandıktan sonra:

```bash
curl -o setup-vps.sh https://raw.githubusercontent.com/KULLANICI_ADINIZ/QrVirtualCardGenerator/vps-deployment/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

## 📁 Yeni Dosyalar

Bu branch'te main branch'e ek olarak aşağıdaki dosyalar bulunur:

### Konfigürasyon Dosyaları
- `backend/nginx.conf` - Nginx reverse proxy ayarları
- `backend/ecosystem.config.js` - PM2 process manager ayarları
- `backend/env.example` - Environment variables örneği
- `backend/systemd.service` - Systemd service tanımı (alternatif)

### Script Dosyaları
- `setup-vps.sh` - Otomatik VPS kurulum scripti
- `deploy.sh` - Güncelleme/deployment scripti

### Dokümantasyon
- `VPS-DEPLOYMENT-GUIDE.md` - Detaylı deployment rehberi
- `QUICK-START-VPS.md` - Hızlı başlangıç rehberi
- `VPS-SSH-BAGLANTI.md` - SSH bağlantı rehberi
- `VPS-BRANCH-README.md` - Bu dosya

## 🔄 Branch Kullanımı

### Main Branch'e Etki Etmeden Çalışma

Bu branch main branch'ten bağımsızdır:

```bash
# Main branch'e geç
git checkout main

# VPS branch'e geri dön
git checkout vps-deployment

# Main branch'teki değişiklikleri VPS branch'e al
git checkout vps-deployment
git merge main
```

### Güncellemeleri Çekme

VPS'te kurulum yaptıktan sonra güncellemeler için:

```bash
cd /var/www/qrvirtualcard
git pull origin vps-deployment
./deploy.sh
```

## 🎯 Kurulum Sonrası

Kurulum tamamlandıktan sonra:

- ✅ Frontend: `http://VPS_IP_ADRESI` veya `https://domain.com`
- ✅ Backend API: `http://VPS_IP_ADRESI/api` veya `https://domain.com/api`
- ✅ API Docs: `http://VPS_IP_ADRESI/api/docs`

## 🔧 Yönetim Komutları

### PM2 Process Manager
```bash
pm2 status              # Tüm servislerin durumu
pm2 logs backend        # Backend logları
pm2 logs frontend       # Frontend logları
pm2 restart all         # Tüm servisleri yeniden başlat
pm2 monit              # Canlı monitoring
```

### Nginx
```bash
sudo systemctl status nginx        # Nginx durumu
sudo systemctl restart nginx       # Nginx'i yeniden başlat
sudo nginx -t                      # Konfig testi
sudo tail -f /var/log/nginx/error.log  # Hata logları
```

### Database
```bash
sudo systemctl status postgresql   # PostgreSQL durumu
sudo -u postgres psql qrvirtualcard  # Database'e bağlan
```

### Deployment
```bash
cd /var/www/qrvirtualcard
./deploy.sh            # Otomatik deployment
```

## 📊 Monitoring

### Sistem Kaynakları
```bash
htop                   # CPU, RAM kullanımı
df -h                  # Disk kullanımı
free -h                # RAM durumu
```

### Log Dosyaları
```bash
# Backend logs
tail -f /var/www/qrvirtualcard/backend/logs/app.log
pm2 logs backend

# Frontend logs
pm2 logs frontend

# Nginx logs
sudo tail -f /var/log/nginx/qrvirtualcard_error.log
sudo tail -f /var/log/nginx/qrvirtualcard_access.log
```

## 🔒 Güvenlik

### SSL Sertifikası (Domain varsa)
```bash
sudo certbot --nginx -d yourdomain.com
```

### Firewall
```bash
sudo ufw status        # Firewall durumu
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
```

### Database Backup
```bash
sudo -u postgres pg_dump qrvirtualcard > backup_$(date +%Y%m%d).sql
```

## 🆘 Sorun Giderme

### Backend çalışmıyor
```bash
pm2 logs backend
cd /var/www/qrvirtualcard/backend
source venv/bin/activate
python main.py  # Manuel test
```

### Frontend çalışmıyor
```bash
pm2 logs frontend
cd /var/www/qrvirtualcard/front
npm run build
```

### Nginx hatası
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

## 📞 Destek

Sorun yaşıyorsanız:
1. İlgili log dosyalarını kontrol edin
2. `VPS-DEPLOYMENT-GUIDE.md` dosyasındaki "Sorun Giderme" bölümüne bakın
3. Google/Stack Overflow'da hata mesajlarını aratın

## 🎓 Öğrenme Kaynakları

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Başarılar! 🚀**

Herhangi bir sorunuz olursa main README.md dosyasındaki iletişim bilgilerini kullanabilirsiniz.

