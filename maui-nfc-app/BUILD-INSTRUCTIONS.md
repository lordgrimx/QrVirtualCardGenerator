# .NET MAUI NFC App - Build Instructions

## Hızlı Başlangıç

### 1. Proje Klonlama ve Kurulum

```bash
# Projeyi klonlayın (ana proje içindeyse)
cd /path/to/QrVirtualCard/maui-nfc-app

# Veya yeni proje oluşturun
dotnet new maui -n MauiNfcApp
cd MauiNfcApp

# MAUI workload'ı kontrol edin
dotnet workload list
dotnet workload install maui

# Bağımlılıkları yükleyin
dotnet restore
```

### 2. Backend API'sini Başlatın

```bash
# Python backend'i çalıştırın (ana projede)
cd ../backend
python main.py

# API'nin çalıştığını kontrol edin
curl https://localhost:8000/health
```

### 3. Platform-Specific Build

#### Android Build
```bash
# Debug build
dotnet build -f net8.0-android

# Release build  
dotnet build -f net8.0-android -c Release

# Deploy to device
dotnet build -f net8.0-android -t:Run
```

#### iOS Build (macOS gerekli)
```bash
# Debug build
dotnet build -f net8.0-ios

# Release build
dotnet build -f net8.0-ios -c Release

# Simulator için
dotnet build -f net8.0-ios -p:RuntimeIdentifier=iossimulator-x64
```

#### Windows Build
```bash
# Debug build
dotnet build -f net8.0-windows10.0.19041.0

# Release build
dotnet build -f net8.0-windows10.0.19041.0 -c Release

# Çalıştır
dotnet run -f net8.0-windows10.0.19041.0
```

## Geliştirme Ortamı Kurulumu

### Visual Studio 2022 (Önerilen)

1. **Workloads Yükleyin:**
   - .NET Multi-platform App UI development
   - Mobile development with .NET

2. **Optional Components:**
   - Android SDK Platform 34
   - iOS build tools (macOS için)

3. **Extensions:**
   - XAML Styler
   - NFC Debugger (varsa)

### Visual Studio Code

```bash
# C# extension yükleyin
code --install-extension ms-dotnettools.csharp

# .NET MAUI extension
code --install-extension ms-dotnettools.dotnet-maui

# XAML support
code --install-extension ms-dotnettools.xaml
```

### JetBrains Rider

1. .NET MAUI plugin aktif edin
2. Android SDK path'i ayarlayın
3. iOS simulator configuration (macOS)

## Test ve Debug

### Debug Mode

```bash
# Debug mode ile çalıştır
dotnet run -f net8.0-android --configuration Debug

# Debug panel erişimi: Ana sayfa > Debug buton
```

### Mock Mode Test

```csharp
// MauiProgram.cs içinde test modunu etkinleştirin
#if DEBUG
builder.Services.AddSingleton<INfcService, MockNfcService>();
#endif
```

### Unit Test Project (Opsiyonel)

```bash
# Test projesi oluştur
dotnet new xunit -n MauiNfcApp.Tests
cd MauiNfcApp.Tests

# Test bağımlılıkları
dotnet add package Microsoft.NET.Test.Sdk
dotnet add package Moq
dotnet add package FluentAssertions

# Testleri çalıştır
dotnet test
```

## Production Build

### Android Production

```bash
# Release build
dotnet publish -f net8.0-android -c Release

# APK location: bin/Release/net8.0-android/publish/

# AAB (Android App Bundle) için
dotnet publish -f net8.0-android -c Release -p:AndroidPackageFormat=aab
```

### iOS Production

```bash
# Release build (Archive için)
dotnet build -f net8.0-ios -c Release -p:ArchiveOnBuild=true

# Ad-hoc distribution
dotnet build -f net8.0-ios -c Release -p:CodesignProvision="YourProvisioningProfile"
```

### Windows Production

```bash
# MSIX package
dotnet publish -f net8.0-windows10.0.19041.0 -c Release -p:RuntimeIdentifierOverride=win10-x64

# Self-contained deployment
dotnet publish -f net8.0-windows10.0.19041.0 -c Release --self-contained
```

## Troubleshooting

### Common Build Errors

**Error: NETSDK1147**
```bash
# MAUI workload eksik
dotnet workload install maui
```

**Error: Android SDK not found**
```bash
# Android SDK path ayarlayın
export ANDROID_HOME=/path/to/android-sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

**Error: iOS build failed**
```bash
# Xcode command line tools
sudo xcode-select --install

# iOS simulator list
xcrun simctl list devices
```

**Error: Plugin.NFC not found**
```bash
# NuGet cache temizle
dotnet nuget locals all --clear
dotnet restore
```

### Runtime Issues

**NFC not working**
1. Check platform-specific permissions
2. Verify hardware capability
3. Enable mock mode for testing

**Crypto verification fails**
1. Check backend API connection
2. Verify public key endpoint
3. Test with known good data

**UI not responsive**
1. Check main thread usage
2. Add async/await to long operations
3. Review MVVM bindings

### Performance Optimization

**Build Time**
```xml
<!-- .csproj -->
<PropertyGroup>
  <AndroidLinkMode>SdkOnly</AndroidLinkMode>
  <AndroidLinkTool>r8</AndroidLinkTool>
  <EnableLLVM>true</EnableLLVM>
</PropertyGroup>
```

**Runtime Performance**
```csharp
// Use ConfigureAwait(false) for async calls
await cryptoService.VerifyAsync(data).ConfigureAwait(false);

// Dispose resources properly
using var nfcService = ServiceProvider.GetService<INfcService>();
```

**Memory Usage**
```csharp
// Avoid memory leaks in ViewModels
public void Dispose()
{
    _nfcService.NfcDataReceived -= OnNfcDataReceived;
    GC.SuppressFinalize(this);
}
```

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/build.yml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: windows-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: 8.0.x
        
    - name: Install MAUI Workload
      run: dotnet workload install maui
      
    - name: Restore dependencies
      run: dotnet restore
      
    - name: Build Android
      run: dotnet build -f net8.0-android -c Release
      
    - name: Build Windows
      run: dotnet build -f net8.0-windows10.0.19041.0 -c Release
```

## Monitoring ve Logging

### Application Insights (Production)

```csharp
// MauiProgram.cs
builder.Services.AddApplicationInsightsTelemetry("YOUR_INSTRUMENTATION_KEY");
```

### Local Logging

```csharp
// Debug output
System.Diagnostics.Debug.WriteLine("NFC Status: {0}", isEnabled);

// File logging (production)
var logPath = Path.Combine(FileSystem.AppDataDirectory, "app.log");
File.AppendAllText(logPath, $"{DateTime.Now}: {message}\n");
```

Bu build instructions ile projeyi her platformda başarıyla derleyip çalıştırabilirsiniz. Herhangi bir sorunla karşılaştığınızda troubleshooting bölümünü kontrol edin.
