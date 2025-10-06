# 🔐 VPS'e SSH ile Bağlanma Rehberi

Bu rehber, yeni VPS'inize SSH ile nasıl bağlanacağınızı adım adım anlatır.

## 📋 İhtiyacınız Olanlar

1. **VPS Bilgileri** (Hosting sağlayıcınızdan aldığınız):
   - VPS IP Adresi
   - SSH Kullanıcı Adı (genellikle `root` veya özel kullanıcı)
   - SSH Şifresi veya SSH Key

2. **SSH Client** (İşletim sistemine göre):
   - **Windows**: PowerShell, CMD, veya PuTTY
   - **Mac/Linux**: Terminal (varsayılan olarak yüklü)

## 🪟 Windows'ta SSH Bağlantısı

### Yöntem 1: PowerShell veya CMD (Önerilen)

Windows 10/11'de SSH varsayılan olarak yüklüdür:

```powershell
# PowerShell veya CMD'yi açın
ssh kullaniciadi@VPS_IP_ADRESI

# Örnek:
ssh root@192.168.1.100
# veya
ssh myuser@example.com
```

İlk bağlantıda şu mesajı göreceksiniz:
```
The authenticity of host '192.168.1.100' can't be established.
Are you sure you want to continue connecting (yes/no)?
```
`yes` yazıp Enter'a basın.

Ardından şifrenizi girin (yazarken görünmeyecektir).

### Yöntem 2: PuTTY (Alternatif)

1. [PuTTY'yi indirin](https://www.putty.org/)
2. PuTTY'yi açın
3. **Host Name** alanına VPS IP adresinizi girin
4. **Port**: 22 (varsayılan)
5. **Connection Type**: SSH
6. **Open** butonuna tıklayın
7. Kullanıcı adı ve şifrenizi girin

## 🍎 Mac/Linux'ta SSH Bağlantısı

Terminal'i açın ve şu komutu çalıştırın:

```bash
ssh kullaniciadi@VPS_IP_ADRESI

# Örnek:
ssh root@192.168.1.100
```

## 🔑 SSH Key ile Bağlanma (Daha Güvenli)

### 1. SSH Key Oluşturma

**Windows (PowerShell):**
```powershell
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

**Mac/Linux:**
```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

Enter'a basarak varsayılan konumu kabul edin veya özel bir konum belirtin.

### 2. Public Key'i VPS'e Kopyalama

**Windows:**
```powershell
# Public key'i kopyalayın
type $env:USERPROFILE\.ssh\id_rsa.pub

# Manuel olarak VPS'e yapıştırın (aşağıda anlatılacak)
```

**Mac/Linux:**
```bash
# Otomatik kopyalama
ssh-copy-id kullaniciadi@VPS_IP_ADRESI

# veya manuel
cat ~/.ssh/id_rsa.pub
```

### 3. VPS'te Public Key Ekleme (Manuel Yöntem)

VPS'e şifre ile bağlanın, ardından:

```bash
# .ssh dizini oluştur (yoksa)
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# authorized_keys dosyasını düzenle
nano ~/.ssh/authorized_keys

# Public key'inizi buraya yapıştırın (Ctrl+V)
# Ctrl+X ile çıkın, Y ile kaydedin

# İzinleri ayarla
chmod 600 ~/.ssh/authorized_keys
```

### 4. Key ile Bağlanma

Artık şifre girmeden bağlanabilirsiniz:

```bash
ssh kullaniciadi@VPS_IP_ADRESI
```

## 🚀 Hızlı Test

Bağlantıyı test edin:

```bash
# SSH bağlantısı kur
ssh root@VPS_IP_ADRESI

# Başarılı bağlantı sonrası basit komutlar
whoami          # Kullanıcı adınızı gösterir
hostname -I     # VPS IP adresini gösterir
uname -a        # Sistem bilgilerini gösterir
df -h           # Disk kullanımını gösterir
```

## ⚡ VPS'te İlk Adımlar

Bağlandıktan sonra güvenlik için:

```bash
# 1. Sistem güncellemesi
sudo apt update && sudo apt upgrade -y

# 2. Yeni sudo kullanıcı oluştur (root yerine)
adduser yenikullanici
usermod -aG sudo yenikullanici

# 3. Firewall aktifleştir
sudo apt install ufw
sudo ufw allow OpenSSH
sudo ufw enable

# 4. SSH portunu değiştir (opsiyonel, daha güvenli)
sudo nano /etc/ssh/sshd_config
# Port 22 satırını Port 2222 gibi bir değere değiştirin
sudo systemctl restart sshd
```

## 🔄 Proje Kurulumuna Geçiş

SSH bağlantısı kurduktan sonra proje kurulumuna başlayın:

```bash
# Hızlı kurulum için
curl -o setup-vps.sh https://raw.githubusercontent.com/KULLANICI_ADINIZ/QrVirtualCardGenerator/vps-deployment/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

Veya detaylı adımlar için:
- `QUICK-START-VPS.md` - Hızlı başlangıç
- `VPS-DEPLOYMENT-GUIDE.md` - Detaylı rehber

## 🆘 Sorun Giderme

### "Connection refused" hatası
- VPS'in çalıştığından emin olun
- IP adresini doğru yazdığınızdan emin olun
- Firewall'un SSH'ye (Port 22) izin verdiğinden emin olun

### "Permission denied" hatası
- Kullanıcı adını doğru yazdığınızdan emin olun
- Şifrenizi doğru girdiğinizden emin olun
- SSH key kullanıyorsanız, public key'in doğru eklendiğinden emin olun

### "Host key verification failed" hatası
```bash
# Windows
Remove-Item $env:USERPROFILE\.ssh\known_hosts

# Mac/Linux
rm ~/.ssh/known_hosts

# veya sadece o host için
ssh-keygen -R VPS_IP_ADRESI
```

### Bağlantı çok yavaş
- VPS sağlayıcınızın sunucu lokasyonunu kontrol edin
- VPS kaynaklarının (CPU, RAM) yeterli olduğundan emin olun

## 💡 İpuçları

1. **SSH Config Dosyası**: Sık kullanılan bağlantıları kaydedin

**Windows**: `%USERPROFILE%\.ssh\config`
**Mac/Linux**: `~/.ssh/config`

```
Host myvps
    HostName 192.168.1.100
    User root
    Port 22
    IdentityFile ~/.ssh/id_rsa
```

Artık sadece `ssh myvps` yazarak bağlanabilirsiniz!

2. **Ekranı açık tutma**: Uzun işlemler için `screen` veya `tmux` kullanın

```bash
# Screen kurulumu
sudo apt install screen

# Yeni session başlat
screen -S mysession

# Session'dan çık (arka planda çalışmaya devam eder)
Ctrl+A, sonra D

# Session'a geri dön
screen -r mysession
```

3. **SCP ile Dosya Transferi**:

```bash
# Lokal'den VPS'e
scp dosya.txt kullaniciadi@VPS_IP:/hedef/dizin/

# VPS'ten lokale
scp kullaniciadi@VPS_IP:/kaynak/dosya.txt ./
```

---

## 📞 Sonraki Adımlar

✅ SSH bağlantısı kurdunuz  
⏭️ Şimdi VPS kurulumuna geçin: `QUICK-START-VPS.md`

**İyi çalışmalar! 🚀**

