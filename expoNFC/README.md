# 📱 Expo NFC Okuyucu

React Native ve Expo ile geliştirilmiş, modern ve şık bir NFC kart okuyucu ve QR doğrulama uygulaması.

## ✨ Özellikler

### 🔖 NFC Okuma
- **Android + iOS** desteği
- Otomatik ve manuel kart okuma
- NDEF metin payload çözümleme
- Kart geçmişi
- UID ve kart türü tespiti

### ✅ Doğrulama
- **Online doğrulama**: Backend API ile (öncelikli)
- **Offline doğrulama**: Cihazda embedded public key ile
- NFC_ENC_V1 format desteği (XOR + Base64)
- Dijital imza kontrolü
- Expiration date validasyonu

### 📷 QR Kod Tarama
- Kamera ile QR kod okuma
- Online/offline doğrulama
- Güvenli QR format (payload|signature|meta)

### 🎨 Modern UI
- Tab navigasyon
- Modal dialog'lar
- Durum göstergeleri
- Okuma geçmişi
- React Native Paper bileşenleri

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+ 
- npm veya yarn
- Android Studio (Android için)
- Xcode (iOS için, macOS gerekir)
- Gerçek cihaz (NFC özelliği gerektirir)

### 1. Bağımlılıkları Kur

```bash
cd expoNFC
npm install
```

### 2. Prebuild (İlk Sefer)

NFC özellikleri native modül gerektirdiğinden `expo prebuild` çalıştırılmalı:

```bash
npx expo prebuild
```

Bu komut `android` ve `ios` klasörlerini oluşturur.

### 3. Dev Client Kur (Opsiyonel ama Önerilen)

Expo Go NFC'yi desteklemez. Dev client kullanın:

```bash
npx expo install expo-dev-client
npx expo prebuild --clean
```

## 📱 Çalıştırma

### Android

```bash
npm run android
# veya
npx expo run:android
```

**Not**: Android emulator NFC'yi desteklemez. Gerçek cihaz kullanın.

### iOS

```bash
npm run ios
# veya
npx expo run:ios
```

**Not**: iOS simülatör NFC'yi desteklemez. iPhone 7+ gerçek cihaz kullanın.

### Web (Sınırlı)

```bash
npm run web
```

Web'de NFC ve kamera özellikleri çalışmaz.

## 🧪 Smoke Test Talimatları

### Android Test

1. **NFC Ayarlarını Kontrol Et**
   - Ayarlar > Bağlantılar > NFC ve Ödeme > NFC Açık
   - "Android Beam" kapalı olabilir (gerekli değil)

2. **Uygulamayı Çalıştır**
   ```bash
   npx expo run:android --device
   ```

3. **NFC Sekmesinde Test**
   - "NFC'yi Başlat" butonuna tıkla
   - NFC kartı telefonun arka kısmına yaklaştır (kamera yakınında genelde)
   - Kart bilgilerinin göründüğünü doğrula
   - Manuel okuma butonunu test et

4. **QR Sekmesinde Test**
   - "Kamerayı Aç" butonuna tıkla
   - QR kodu tara
   - Online/offline doğrulamayı test et (Wi-Fi aç/kapa)

### iOS Test

1. **NFC Kontrolü**
   - iPhone 7 veya daha yeni model olduğundan emin ol
   - iOS 15.0+ gerekli

2. **Build ve Çalıştır**
   ```bash
   npx expo run:ios --device
   ```

3. **NFC Test**
   - iOS'ta NFC session bazlı çalışır
   - "NFC'yi Başlat" veya "Manuel Oku" tıkla
   - Kartı iPhone'un üst kısmına yaklaştır (Face ID yakınında)
   - Okuma tamamlandığında session otomatik kapanır

4. **QR Test**
   - Kamera izni ver
   - QR kodu tara
   - Sonucu modal'da görüntüle

### Test Kontrol Listesi

- [ ] NFC desteği kontrol edildi
- [ ] NFC başlatma/durdurma çalışıyor
- [ ] Otomatik kart algılama çalışıyor
- [ ] Manuel okuma çalışıyor
- [ ] Kart geçmişi görüntüleniyor
- [ ] Online doğrulama çalışıyor (internet varken)
- [ ] Offline doğrulama çalışıyor (internet yokken)
- [ ] QR tarama çalışıyor
- [ ] QR doğrulama çalışıyor
- [ ] Modal dialog düzgün görüntüleniyor
- [ ] Hata durumları doğru yönetiliyor

## 🔧 Yapılandırma

### Backend URL'leri

`app.config.ts` dosyasında backend URL'lerini değiştirin:

```typescript
extra: {
  backendBaseUrls: [
    'https://backend.anefuye.com.tr',
    'http://10.0.2.2:8000',        // Android emulator -> host
    'http://localhost:8000',        // iOS/gerçek cihaz
    'http://192.168.1.100:8000'    // LAN IP'niz
  ]
}
```

### Environment Variables

`.env` dosyası oluşturup kullanabilirsiniz:

```bash
BACKEND_BASE_URL=https://backend.anefuye.com.tr
```

## 📂 Proje Yapısı

```
expoNFC/
├── app/                          # Expo Router ekranları
│   ├── _layout.tsx              # Root layout (public key cache)
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab navigasyon
│   │   ├── nfc.tsx              # NFC okuma ekranı
│   │   └── qr.tsx               # QR tarama ekranı
│   └── modals/
│       └── MemberInfoDialog.tsx # Üye bilgisi modal
├── src/
│   ├── services/
│   │   ├── NfcService.ts        # NFC okuma servisi
│   │   ├── BackendApi.ts        # Backend API çağrıları
│   │   ├── QrVerificationService.ts # QR doğrulama
│   │   └── types.ts             # Tip tanımları
│   └── utils/
│       ├── cryptoLite.ts        # XOR+Base64 şifre çözme
│       ├── ndef.ts              # NDEF yardımcıları
│       └── parse.ts             # QR parse yardımcıları
├── app.config.ts                # Expo konfigürasyon
└── package.json
```

## 🐛 Bilinen Sorunlar ve Çözümler

### Android: NFC Okuma Çalışmıyor
- Cihazın NFC'si açık olduğundan emin olun
- Kartı telefonun arka kısmına yaklaştırın
- Bazı cihazlarda NFC sensör konumu farklı olabilir

### iOS: Session Hataları
- iOS'ta her okuma için yeni session başlatılır
- "Session timeout" hatası normaldir, tekrar deneyin
- iPhone'u kartın üzerine 2-3 saniye tutun

### Peer Dependency Uyarıları
- `npm install --legacy-peer-deps` kullanın
- React 19 ve Expo 54 uyumluluğu için gerekli

### Build Hataları
- `npx expo prebuild --clean` ile temiz başlayın
- Android: Gradle cache temizleyin (`./gradlew clean`)
- iOS: Pods'u yeniden kurun (`pod install`)

## 🔮 Gelecek Özellikler

- [ ] RSA/ECDSA gerçek imza doğrulaması (React Native crypto)
- [ ] NFC kart yazma (NDEF write)
- [ ] Çoklu kart okuma (batch mode)
- [ ] Bluetooth Low Energy (BLE) desteği
- [ ] Dark mode
- [ ] Çoklu dil desteği

## 📄 Lisans

MIT

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin
4. Branch'i push edin
5. Pull Request açın

---

**⚡ Modern, şık ve güvenli NFC deneyimi!**

