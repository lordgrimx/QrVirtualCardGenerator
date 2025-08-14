# TestFlight Dağıtım Rehberi (Windows Kullanıcıları İçin)

Aşağıdaki rehber, macOS sahibi olmadan GitHub Actions CI ile iOS uygulamanızı imzalı IPA olarak üretip TestFlight'a yüklemenizi sağlar. NFC özelliği (Tag Reading) için gerekli Apple yetenekleri ve profil ayarları da dahildir.

## 1) Apple Geliştirici Hesabı ve Uygulama Kaydı

- Apple Developer Program'a kayıt olun.
- App Store Connect'te yeni bir "App" kaydı oluşturun:
  - **Platforms**: iOS
  - **Bundle ID**: `com.yourcompany.qrvirtualcard` (repo'da `MauiNfcReader/MauiNfcReader.csproj` içindeki ApplicationId ile birebir aynı olmalı)
  - **SKU**: benzersiz bir kısa kod
  - **User Access**: erişmesi gereken kişiler

- Apple Developer (developer.apple.com) > Certificates, Identifiers & Profiles:
  - **Identifiers** → `com.yourcompany.qrvirtualcard` için App ID oluşturun/varsa seçin.
  - **Capabilities** içinde NFC özelliğini açın:
    - Near Field Communication Tag Reading

## 2) iOS İmzalama: Sertifika ve Profil Oluşturma

Windows'tan da yapılabilir. İki yol gösteriyorum: OpenSSL (Windows) veya macOS (Keychain). Mac'iniz yoksa 2A'yı uygulayın.

### 2A) Windows/OpenSSL ile (Mac yoksa)

1) CSR ve anahtar üretin:
```bash
# Private key oluştur
openssl genrsa -out private_key.key 2048

# CSR oluştur
openssl req -new -key private_key.key -out certificate.csr
```

2) Apple Developer > Certificates > iOS Distribution (Apple Distribution) → CSR yükleyerek sertifikayı (.cer) indirin.

3) .cer ve private key'i birleştirerek .p12 üretin:
```bash
# .cer'i .pem'e çevir
openssl x509 -inform DER -outform PEM -in certificate.cer -out certificate.pem

# .p12 oluştur
openssl pkcs12 -export -out certificate.p12 -inkey private_key.key -in certificate.pem
```

### 2B) macOS/Keychain ile (Mac varsa)

- Keychain Access → Certificate Assistant → "Request a Certificate From a Certificate Authority…"
- CSR oluşturun; Apple Developer'da iOS Distribution (Apple Distribution) sertifikası üretin ve Keychain'e yükleyin.
- Keychain Access'te ilgili sertifikayı sağ tık → "Export…" → .p12 alın; parola belirleyin.

### 2C) Provisioning Profile (App Store veya Ad Hoc)

- Apple Developer > Profiles:
  - **App Store** tipi provisioning profile oluşturun (bundle id: `com.yourcompany.qrvirtualcard`).
  - NFC capability açık App ID ile eşleştiğinden emin olun.
  - Profile indirildiğinde adı `your_profile.mobileprovision` olur.

**Önemli**: Profilin "UUID" bilgisini not alın (dosyayı bir metin editörü ile açıp UUID alanını görebilirsiniz). Build'te isim yerine UUID kullanmak daha kararlı olur.

## 3) NFC İzinleri ve Ayarları (Projede)

`MauiNfcReader/Platforms/iOS/Info.plist` içine kullanıcı izni açıklaması ekleyin:

```xml
<key>NFCReaderUsageDescription</key>
<string>Bu uygulama NFC kartları okumak için NFC özelliğini kullanır.</string>
```

**Entitlements (gerekirse)**: `Platforms/iOS` altında bir `Entitlements.plist` oluşturup NFC formats ekleyebilirsiniz. Çoğu durumda yalnızca App ID capability ve doğru profil yeterlidir; ancak entitlements gerekiyorsa:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.nfc.readersession.formats</key>
    <array>
        <string>NDEF</string>
        <string>TAG</string>
    </array>
</dict>
</plist>
```

Eğer entitlements dosyası kullanacaksanız iOS build'ine tanıtın:
MSBuild ile: `/p:CodesignEntitlements=Platforms/iOS/Entitlements.plist` (workflow içinde sertifikalı derleme yoluna eklenebilir).

## 4) Sürüm ve Build Numarası

`MauiNfcReader/MauiNfcReader.csproj` içinde:
- `ApplicationDisplayVersion` (ör. 1.0.1)
- `ApplicationVersion` (iOS'ta CFBundleVersion'a gider, her yüklemede artırılmalı)

Her yeni TestFlight yüklemesinde en az `ApplicationVersion`'ı artırın.

## 5) GitHub Secrets Hazırlığı

Aşağıdaki sırları repo Settings → Secrets and variables → Actions altında oluşturun:

### Sertifika/profil ve anahtarlar:
- **BUILD_CERTIFICATE_BASE64**: `certificate.p12` dosyanızı Base64'e çevirip içerik
- **P12_PASSWORD**: p12 export ederken belirlediğiniz parola
- **BUILD_PROVISION_PROFILE_BASE64**: `.mobileprovision` dosyanızın Base64 içeriği
- **KEYCHAIN_PASSWORD**: Keychain için rastgele bir parola (CI'de temporary keychain'de kullanılıyor)

### App Store Connect API anahtarları:
- **APP_STORE_CONNECT_API_KEY**: App Store Connect → Users and Access → "Keys" → "Generate API Key" ile alınan .p8 dosyasının TAM içeriği (başlık/son satırlar dahil)
- **APP_STORE_CONNECT_API_KEY_ID**: Key ID (ör. ABCDE12345)
- **APP_STORE_CONNECT_ISSUER_ID**: Issuer ID (UUID gibi)

### Base64 dönüştürme (Windows PowerShell):

```powershell
# Sertifika için
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.p12")) | Out-File -FilePath "certificate_base64.txt"

# Provisioning profile için
[Convert]::ToBase64String([IO.File]::ReadAllBytes("profile.mobileprovision")) | Out-File -FilePath "profile_base64.txt"
```

Oluşan .txt dosyalarının içeriğini ilgili GitHub secret'larına yapıştırın.

**Notlar:**
- `APP_STORE_CONNECT_API_KEY` için Base64 değil, .p8 dosyasının düz metin içeriğini kullanıyoruz (workflow direkt dosya oluşturuyor).

## 6) Workflow Ayarları (Bu Repo İçin Hazır)

Mevcut dosya: `.github/workflows/ios-build.yml`
- macOS runner ve Xcode 16.2 ayarlı.
- Sertifika/profil varsa "signed" iOS cihaz (ios-arm64) için IPA üretir ve TestFlight'a yüklemeye çalışır.
- Sertifika/profil yoksa simülatör (iossimulator-arm64) için imzasız build alır (sadece CI doğrulaması).

### İmza ile cihaz için derleme kısmında iki kritik alan:

**CodesignKey:**
Yeni sertifikalarda genelde başlık "Apple Distribution: Company Name (TEAMID)" şeklindedir.
Mevcut workflow'ta "iPhone Distribution" yer alıyor. Eğer imza hatası alırsanız bunu, anahtar zincirindeki tam sertifika başlığıyla eşleyecek şekilde değiştirin. Örnek:
```
/p:CodesignKey="Apple Distribution: YOUR COMPANY (TEAMID)"
```

**CodesignProvision:**
Profil "Name" yerine "UUID" kullanmanız daha sağlamdır. Öneri:
```
/p:CodesignProvision="YOUR-PROFILE-UUID"
```

Bunları değiştirmek gerekirse, `.github/workflows/ios-build.yml` içindeki "Build iOS app" adımında "signed build" komutuna ekleyin/değiştirin.

## 7) TestFlight Yükleme ve Onay Süreci

CI bittiğinde "Upload to TestFlight" adımı:
- IPA bulunduysa `xcrun altool --upload-app` ile yüklemeyi dener.
- Secrets eksikse veya IPA yoksa bu adımı atlar.

### App Store Connect'te:
- "My Apps" → Uygulamanız → "TestFlight" sekmesi:
  - "Builds" altında yeni build görünür.
  - İlk defa yükleme yaptıysanız, "Compliance" (encryption) sorularını cevaplayın:
    - Çoğu uygulamada "Export Compliance" için "Uses encryption" → "No" veya "Exempt" senaryosu. Eğer kriptografi kullanıyorsanız doğru şekilde işaretleyin.
  - **Internal Testing**: Organizasyon kullanıcılarını anında dahil edebilirsiniz (developer, admin vb.).
  - **External Testing**: Apple incelemesi gerekir. Testere e-posta ile davet giderek TestFlight'tan yükler.

## 8) iPhone'da Kurulum ve Test

- iPhone'a "TestFlight" uygulamasını yükleyin.
- Dahil edildiğiniz (veya davet edildiğiniz) uygulama altında build'i görün.
- NFC fonksiyonlarını gerçek cihazda test edin.

**Not**: NFC testleri simülatörde çalışmaz; gerçek cihaz gerekir.

### Çalışmayan bir özellik olursa:
- App ID Capability'lerde NFC açık mı?
- Info.plist içinde `NFCReaderUsageDescription` var mı?
- Doğru (NFC açık) provisioning profile ile imzalandı mı?

## 9) Sık Karşılaşılan Sorunlar ve Çözümler

- **"No valid iOS code signing keys found"**: Sertifika/profil secrets eksik veya CodesignKey uyuşmuyor.
- **Xcode sürüm hataları**: Runner'da Xcode 16.1/16.2 seçildi; halen hata varsa CI log'unda seçilen Xcode versiyonunu kontrol edin.
- **"ld: framework 'PCSC' not found"**: iOS hedefinde PCSC kullanılamaz. Bu repo'da PCSC paketleri iOS/MacCatalyst dışı hedeflere koşullu taşındı.
- **"ITMS-90161" vs. metadata/asset hataları**: App Store Connect tarafında App kaydı bilgilerinizi (ikon, kategori, gizlilik, yaş derecelendirme) tamamlayın.

## 10) Yeni Build Çıkarken Yapılacaklar (Checklist)

### MauiNfcReader.csproj:
- `ApplicationDisplayVersion` ve özellikle `ApplicationVersion` artırıldı mı?
- `ApplicationId` doğru mu (App ID ile eşleşiyor mu)?

### Secrets:
- Değiştiyse güncellendi mi?

### Workflow:
- `CodesignKey` sertifika başlığı ile eşleşiyor mu?
- `CodesignProvision` profil UUID'i ile eşleşiyor mu?

### App Store Connect:
- Testerlere erişim verildi mi?
- Export compliance soruları tamamlandı mı?

---

Bu adımları takip ederek Windows'tan, macOS olmaksızın CI üzerinden signed IPA üretip TestFlight dağıtımını sürdürebilirsiniz. Yardımcı olmamı istediğiniz noktaları (entitlements ekleme, workflow'ta CodesignKey/Provision ayarlarını UUID'ye çevirme vb.) belirtin, ilgili düzenlemeleri yapayım.
