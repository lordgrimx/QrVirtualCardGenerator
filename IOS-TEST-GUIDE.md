# 🧪 iOS Test Rehberi - Apple Developer Hesabı Olmadan

## 🎯 Test Seçenekleri

### 1. 🤖 GitHub Actions ile Otomatik Build (Önerilen)

**Nasıl Çalışır:**
- Her commit'te otomatik iOS Simulator build alır
- Apple Developer hesabı gerektirmez
- Cloud'da Mac makinesinde build yapar
- Artifacts olarak build dosyalarını indirebilirsiniz

**Başlatmak için:**
1. Kodunuzu GitHub'a push edin
2. Actions sekmesinde build'in başladığını göreceksiniz
3. Build tamamlandığında Artifacts bölümünden dosyaları indirin

### 2. 💻 Mac Erişimi ile Simulator Testi

**Gereksinimler:**
- Mac bilgisayar veya Mac'e erişim
- Xcode (App Store'dan ücretsiz)
- .NET 8 SDK

**Adımlar:**
```bash
# Mac'te proje dizininde
cd MauiNfcReader

# iOS Simulator için build
dotnet build -f net8.0-ios -c Debug \
  -p:RuntimeIdentifier=iossimulator-arm64 \
  -p:CodesignRequired=false

# Simulator başlat
xcrun simctl boot "iPhone 15 Pro"

# Uygulamayı simulator'a yükle
xcrun simctl install booted \
  bin/Debug/net8.0-ios/iossimulator-arm64/MauiNfcReader.app

# Uygulamayı başlat
xcrun simctl launch booted com.yourcompany.qrvirtualcard
```

### 3. 🌐 Online Mac Services (Ücretli)

**Seçenekler:**
- MacStadium
- MacinCloud
- AWS EC2 Mac instances
- GitHub Codespaces (Mac runner)

## 🚀 Hızlı Test - GitHub Actions

Şu anda workflow'unuz hazır! İşte nasıl kullanacağınız:

### Otomatik Build Başlatma:
```bash
# Değişiklik yapın ve push edin
git add .
git commit -m "iOS test build"
git push origin main
```

### Manuel Build Başlatma:
1. GitHub repository'nize gidin
2. **Actions** sekmesine tıklayın
3. **iOS Test Build** workflow'unu seçin
4. **Run workflow** butonuna tıklayın

## 📱 Test Senaryoları

### Temel Fonksiyon Testleri:

#### 1. Uygulama Başlatma Testi
```
✓ Uygulama başlıyor mu?
✓ Ana sayfa yükleniyor mu?
✓ UI elementleri görünüyor mu?
```

#### 2. NFC Fonksiyonu Testi (Simulator'da Mock)
```
✓ NFC okuma ekranı açılıyor mu?
✓ Mock NFC verisi okunuyor mu?
✓ Hata mesajları doğru görünüyor mu?
```

#### 3. Backend Bağlantı Testi
```
✓ API çağrıları çalışıyor mu?
✓ Hata durumları handle ediliyor mu?
✓ Timeout durumları test ediliyor mu?
```

#### 4. UI/UX Testi
```
✓ Responsive tasarım çalışıyor mu?
✓ Navigasyon sorunsuz mu?
✓ Loading durumları gösteriliyor mu?
```

## 🐛 Debug İpuçları

### Simulator'da NFC Testi:
iOS Simulator gerçek NFC desteklemez, ancak:
- Mock NFC service'inizi test edebilirsiniz
- UI flow'ları kontrol edebilirsiniz
- Backend integration'ları test edebilirsiniz

### Log İnceleme:
```bash
# Simulator loglarını izleme
xcrun simctl spawn booted log stream --predicate 'subsystem == "com.yourcompany.qrvirtualcard"'
```

### Build Hataları:
```bash
# Detaylı build log
dotnet build -v detailed
```

## 📊 Test Raporu Şablonu

### Build Test Raporu:
```
□ iOS Simulator build başarılı
□ Uygulama simulator'da açılıyor
□ Ana sayfalar yükleniyor
□ NFC mock fonksiyonu çalışıyor
□ Backend API bağlantıları test edildi
□ Hata durumları kontrol edildi
□ UI responsive davranış sergiledi
```

## 🎯 Sonraki Adımlar

### Test Başarılı Olduktan Sonra:

1. **Apple Developer Hesabı Açın** (99$/yıl)
2. **Code Signing Setup** yapın
3. **TestFlight** için build alın
4. **App Store** submission yapın

### Alternatif Test Yöntemleri:

1. **Mac arkadaş/iş arkadaşından yardım**
2. **Development certificate** alın (ücretsiz, Apple ID yeterli)
3. **Xcode Cloud** kullanın (sınırlı ücretsiz)

## 🔧 Troubleshooting

### GitHub Actions Build Başarısız:
- Repository Settings → Actions → General → "Allow all actions" olduğunu kontrol edin
- Workflow dosyasının doğru branch'te olduğunu kontrol edin

### Simulator Hatası:
- Xcode Command Line Tools yüklü olduğunu kontrol edin: `xcode-select --install`
- Simulator'ın güncel olduğunu kontrol edin

### .NET MAUI Hatası:
- MAUI workload yüklü olduğunu kontrol edin: `dotnet workload list`
- Gerekirse güncelleme yapın: `dotnet workload update`
