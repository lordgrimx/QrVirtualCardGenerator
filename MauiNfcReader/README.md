# 🔌 Windows .NET MAUI NFC Kart Okuyucu

Bu proje, Windows platformu için USB NFC okuyucular (ACR122U gibi) kullanarak şifrelenmiş NFC kartlarını okumaya yönelik .NET MAUI uygulamasıdır.

## ✨ Özellikler

### 🎴 **NFC Kart Okuma**
- USB NFC okuyucu desteği (ACR122U, ACR38U)
- Otomatik kart algılama
- UID okuma ve kart türü tespiti
- Gerçek zamanlı kart durumu monitoring

### 🔒 **Güvenlik Özellikleri**
- AES-256 şifre çözme
- Rastgele anahtar oluşturma
- SHA-256 hash hesaplama
- Güvenli veri saklama

### 💻 **Modern UI/UX**
- .NET MAUI native Windows UI
- Real-time status updates
- Okuma geçmişi
- Responsive tasarım
- Dark/Light theme desteği

## 🚀 Sistem Gereksinimleri

### Donanım
- **USB NFC Okuyucu**: ACR122U, ACR38U veya uyumlu PCSC cihazları
- **USB Port**: 2.0 veya üstü
- **RAM**: Minimum 4GB
- **Disk**: 100MB boş alan

### Yazılım
- **Windows 10/11** (x64)
- **.NET 9.0** Runtime
- **Smart Card Service** aktif
- **Visual C++ Redistributable** 2015-2022

### Sürücüler
- **PCSC Drivers**: Windows built-in veya ACS sürücüleri
- **USB Drivers**: Cihaz üreticisi sürücüleri

## 🔧 Kurulum

### 1. NFC Okuyucu Kurulumu

#### ACR122U Kurulumu:
```powershell
# Smart Card Service'i başlat
Start-Service SCardSvr

# Service'in otomatik başlatılmasını sağla
Set-Service SCardSvr -StartupType Automatic

# Device Manager'dan kontrol et
# Cihazlar > Akıllı Kart Okuyucuları > ACS ACR122U
```

#### Test Komutu:
```powershell
# Okuyucu listesini kontrol et
Get-PnpDevice -Class SmartCardReader
```

### 2. Uygulama Kurulumu

#### Kaynak Koddan:
```bash
# Repository'yi clone et
git clone https://your-repo/MauiNfcReader.git
cd MauiNfcReader

# Bağımlılıkları restore et
dotnet restore

# Windows için build et
dotnet build -f net9.0-windows10.0.19041.0

# Uygulamayı çalıştır
dotnet run -f net9.0-windows10.0.19041.0

#Android
dotnet build -t:Run -f net9.0-android
```

## 📱 Kullanım

### 1. Uygulama Başlatma
1. **Uygulamayı başlatın**
2. **Ana sayfada** "NFC Okuyucuyu Başlat" butonuna tıklayın
3. **Okuyucu seçin** dropdown menüsünden

### 2. NFC Okuyucu Bağlantısı
1. **"Okuyucu Seçimi"** bölümünden cihazınızı seçin
2. **"Bağlan"** butonuna tıklayın
3. **Durum mesajından** bağlantıyı kontrol edin

### 3. Kart Okuma
- **Otomatik**: Kartı okuyucuya yaklaştırın
- **Manuel**: "Manuel Kart Oku" butonuna tıklayın
- **Sonuç**: UID ve kart bilgileri görüntülenir

### 4. Şifre Çözme
1. **Şifre anahtarı** girin veya "Üret" butonunu kullanın
2. **"Veriyi Şifre Çöz"** butonuna tıklayın
3. **Sonuç** şifre çözülmüş içerik alanında görünür

## 🏗️ Proje Yapısı

```
MauiNfcReader/
├── Services/               # Ana servisler
│   ├── INfcService.cs     # NFC interface
│   ├── ICryptoService.cs  # Kriptografi interface
│   ├── CryptoService.cs   # AES implementasyonu
│   └── Converters.cs      # UI converters
├── Platforms/
│   └── Windows/
│       └── Services/
│           └── WindowsNfcService.cs  # Windows NFC impl.
├── Models/
│   └── NfcCardData.cs     # Kart veri modeli
├── ViewModels/
│   └── NfcReaderViewModel.cs  # MVVM ViewModel
├── Views/
│   ├── NfcReaderPage.xaml    # Ana NFC sayfası
│   └── NfcReaderPage.xaml.cs
└── Resources/
    └── Styles/
        └── Styles.xaml    # UI stilleri
```

## 🔍 Desteklenen Kart Türleri

### MIFARE Serisi
- **MIFARE Classic 1K/4K**: ISO14443 Type A
- **MIFARE Ultralight**: 7-byte UID
- **MIFARE DESFire**: Advanced security

### NTAG Serisi
- **NTAG213/215/216**: NFC Forum Type 2
- **ISO14443 Type A/B**: Standard protokoller

## 🛠️ Geliştirme

### Debug Modu
```csharp
// appsettings.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "MauiNfcReader": "Trace"
    }
  }
}
```

### Test Kartları
- **Test UID**: `04:12:34:56:78:9A:BC`
- **Empty MIFARE**: Boş 1K kart
- **Sample Data**: Test şifrelenmiş veri

## 🚨 Troubleshooting

### Okuyucu Tanınmıyor
```powershell
# Device Manager kontrol
devmgmt.msc

# Smart Card Service restart
Restart-Service SCardSvr

# Sürücü güncelleme
# ACS web sitesinden güncel sürücü
```

### Kart Okunmuyor
- **Kart temizliği**: Alkol ile temizleyin
- **Mesafe**: 1-4cm arası optimal
- **Alternatif kart**: Farklı kart türü deneyin

### Şifre Çözme Hatası
- **Anahtar kontrolü**: Base64 formatında olmalı
- **Veri formatı**: Hex string veya binary
- **Algorithm**: AES-256-CBC

## 🔮 Gelecek Özellikler

### Yakın Gelecek
- **Android NFC desteği**: .NET MAUI Android
- **iOS Core NFC**: iPhone 7+ desteği
- **Kart yazma**: NFC tag programming

### Uzun Vadeli
- **Cloud sync**: Okuma geçmişi senkronizasyonu
- **Multi-reader**: Çoklu okuyucu desteği
- **Advanced crypto**: RSA, ECC desteği

## 📄 Lisans

Bu proje MIT lisansı altında yayınlanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📞 Destek

- **GitHub Issues**: Bug reports ve feature requests
- **Dokümantasyon**: [Wiki sayfası](./wiki)
- **Email**: support@yourcompany.com

---

⚡ **Windows USB NFC** ile güvenli kart okuma deneyimi!
