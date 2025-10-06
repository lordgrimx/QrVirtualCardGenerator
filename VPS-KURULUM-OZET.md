# ✨ VPS Kurulum Özeti

## 🎉 Tebrikler!

`vps-deployment` branch'i başarıyla oluşturuldu ve GitHub'a pushlandı.

**Branch URL**: https://github.com/lordgrimx/QrVirtualCardGenerator/tree/vps-deployment

---

## 🚀 Şimdi Ne Yapmalısınız?

### Adım 1: VPS'e SSH ile Bağlanın

```bash
ssh root@VPS_IP_ADRESI
# veya
ssh kullaniciadi@VPS_IP_ADRESI
```

> 📘 Detaylı SSH rehberi: `VPS-SSH-BAGLANTI.md`

### Adım 2: Otomatik Kurulum Scripti Çalıştırın

VPS'e bağlandıktan sonra:

```bash
# Setup script'ini indirin
curl -o setup-vps.sh https://raw.githubusercontent.com/lordgrimx/QrVirtualCardGenerator/vps-deployment/setup-vps.sh

# Çalıştırılabilir yapın
chmod +x setup-vps.sh

# Kurulumu başlatın
./setup-vps.sh
```

Script sizden soracak:
- ✅ GitHub kullanıcı adı: `lordgrimx`
- ✅ Database şifresi (kendiniz belirleyin)
- ✅ Domain adı (yoksa boş bırakın)
- ✅ Admin email

### Adım 3: Kurulumu İzleyin

Script otomatik olarak:
- ✅ Tüm gerekli paketleri yükler
- ✅ PostgreSQL veritabanını kurar
- ✅ Backend'i yapılandırır ve başlatır
- ✅ Frontend'i build edip başlatır
- ✅ Nginx reverse proxy'yi yapılandırır
- ✅ Firewall'u güvenli hale getirir

**Tahmini süre**: 10-15 dakika

---

## 📚 Alternatif: Manuel Kurulum

Otomatik script yerine adım adım kurulum yapmak isterseniz:

1. **Hızlı Başlangıç**: `QUICK-START-VPS.md`
2. **Detaylı Rehber**: `VPS-DEPLOYMENT-GUIDE.md`

---

## 📁 Bu Branch'te Neler Var?

### Konfigürasyon Dosyaları
- ✅ `backend/nginx.conf` - Nginx ayarları
- ✅ `backend/ecosystem.config.js` - PM2 ayarları
- ✅ `backend/env.example` - Çevre değişkenleri
- ✅ `backend/systemd.service` - Systemd servisi

### Script Dosyaları
- ✅ `setup-vps.sh` - **Otomatik kurulum** (ÖNERİLEN)
- ✅ `deploy.sh` - Güncelleme scripti

### Rehber Dosyaları
- ✅ `VPS-SSH-BAGLANTI.md` - SSH bağlantı rehberi
- ✅ `QUICK-START-VPS.md` - Hızlı başlangıç
- ✅ `VPS-DEPLOYMENT-GUIDE.md` - Detaylı rehber
- ✅ `VPS-BRANCH-README.md` - Branch dokümantasyonu

---

## 🎯 Kurulum Sonrası Erişim

Kurulum tamamlandığında:

### 🌐 Web Erişimi
```
Frontend: http://VPS_IP_ADRESI
Backend API: http://VPS_IP_ADRESI/api
API Docs: http://VPS_IP_ADRESI/api/docs
```

Domain kullanıyorsanız:
```
Frontend: https://yourdomain.com
Backend API: https://yourdomain.com/api
API Docs: https://yourdomain.com/api/docs
```

### 🔍 Kontrol Komutları

```bash
# Servis durumları
pm2 status

# Backend logları
pm2 logs backend

# Frontend logları
pm2 logs frontend

# Nginx durumu
sudo systemctl status nginx
```

---

## 🔄 Güncelleme ve Yönetim

### Kod Güncellemesi

Local bilgisayarınızda değişiklik yaptığınızda:

```bash
# 1. Değişiklikleri commit edin
git add .
git commit -m "Güncelleme açıklaması"
git push origin vps-deployment

# 2. VPS'te deployment çalıştırın
ssh root@VPS_IP_ADRESI
cd /var/www/qrvirtualcard
./deploy.sh
```

### Servis Yönetimi

```bash
# Servisleri yeniden başlat
pm2 restart all

# Nginx'i yeniden yükle
sudo systemctl reload nginx

# Database backup
sudo -u postgres pg_dump qrvirtualcard > backup_$(date +%Y%m%d).sql
```

---

## 🔒 Güvenlik Önerileri

### 1. SSL Sertifikası (Domain varsa)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 2. SSH Key Kullanımı

```bash
# Lokal bilgisayarınızda
ssh-keygen -t rsa -b 4096
ssh-copy-id root@VPS_IP_ADRESI
```

### 3. SSH Şifre Girişini Kapat (Key zorunlu)

```bash
# VPS'te
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication yes -> PasswordAuthentication no
sudo systemctl restart sshd
```

### 4. Fail2Ban Kurulumu

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 🆘 Sorun mu Yaşıyorsunuz?

### Yaygın Sorunlar ve Çözümleri

#### Backend başlamıyor
```bash
pm2 logs backend
cd /var/www/qrvirtualcard/backend
source venv/bin/activate
python main.py  # Manuel test
```

#### Database bağlantı hatası
```bash
# PostgreSQL durumunu kontrol et
sudo systemctl status postgresql

# Database'e bağlan
sudo -u postgres psql qrvirtualcard

# .env dosyasındaki DATABASE_URL'i kontrol et
nano /var/www/qrvirtualcard/backend/.env
```

#### Nginx hatası
```bash
# Konfig testi
sudo nginx -t

# Hata logları
sudo tail -f /var/log/nginx/qrvirtualcard_error.log
```

#### Port zaten kullanımda
```bash
# Port 8000'i kim kullanıyor?
sudo lsof -i :8000

# Process'i öldür
sudo kill -9 PROCESS_ID
```

---

## 📊 Monitoring

### Sistem Kaynakları

```bash
# CPU ve RAM
htop

# Disk kullanımı
df -h

# PM2 monitoring
pm2 monit
```

### Log Dosyaları

```bash
# Backend logs
tail -f /var/www/qrvirtualcard/backend/logs/app.log

# PM2 logs
pm2 logs

# Nginx access logs
sudo tail -f /var/log/nginx/qrvirtualcard_access.log
```

---

## 🎓 Ek Kaynaklar

### Dokümantasyon
- [FastAPI](https://fastapi.tiangolo.com/)
- [Next.js](https://nextjs.org/docs)
- [PM2](https://pm2.keymetrics.io/)
- [Nginx](https://nginx.org/en/docs/)
- [PostgreSQL](https://www.postgresql.org/docs/)

### Video Tutorial İpuçları
- "VPS server setup for Python"
- "Deploy FastAPI to Ubuntu VPS"
- "Next.js production deployment"
- "Nginx reverse proxy setup"

---

## ✅ Checklist

Kurulum tamamlandı mı? Kontrol edin:

- [ ] VPS'e SSH ile bağlanabiliyorum
- [ ] `setup-vps.sh` script'i başarıyla çalıştı
- [ ] `pm2 status` komutu backend ve frontend'i gösteriyor
- [ ] Web tarayıcıda frontend açılıyor
- [ ] API docs erişilebilir: `/api/docs`
- [ ] Database bağlantısı çalışıyor
- [ ] Nginx çalışıyor
- [ ] Firewall aktif
- [ ] SSL sertifikası kuruldu (domain varsa)

---

## 🎉 Başardınız!

Projeniz artık kendi VPS'inizde çalışıyor! 

### İlk Yapmanız Gerekenler:

1. ✅ Admin paneline giriş yapın
2. ✅ İlk üyeyi ekleyin
3. ✅ QR kod oluşturma testi yapın
4. ✅ NFC okuma test edin
5. ✅ Database backup alın

### Sonraki Adımlar:

- 🔐 SSL sertifikası ekleyin (domain varsa)
- 📊 Monitoring ayarlayın
- 💾 Otomatik backup script'i kurun
- 🔔 Hata bildirimleri ayarlayın

---

## 📞 Destek

Sorularınız için:
- 📧 Email: lordgrimx (GitHub)
- 🐛 Issues: https://github.com/lordgrimx/QrVirtualCardGenerator/issues
- 📚 Dokümantasyon: Repository'deki tüm MD dosyaları

---

**İyi çalışmalar ve başarılar! 🚀**

---

*Not: Bu dosya sadece bilgilendirme amaçlıdır. Gerçek kurulum adımları için yukarıdaki rehberleri takip edin.*

