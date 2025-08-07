using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MauiNfcApp.Services;
using System.Collections.ObjectModel;
using System.Text.Json;

namespace MauiNfcApp.ViewModels;

public partial class DebugViewModel : ObservableObject
{
    private readonly ITestConfigurationService _testConfig;
    private readonly INfcService _nfcService;
    private readonly ICryptoService _cryptoService;
    private readonly IErrorHandlingService _errorHandling;
    private readonly ILogger<DebugViewModel> _logger;

    [ObservableProperty]
    private bool isMockMode;

    [ObservableProperty]
    private string backendUrl = string.Empty;

    [ObservableProperty]
    private string nfcTestResult = string.Empty;

    [ObservableProperty]
    private string cryptoTestResult = string.Empty;

    [ObservableProperty]
    private ObservableCollection<SystemInfoItem> systemInfo = new();

    [ObservableProperty]
    private ObservableCollection<DebugLogEntry> debugLogs = new();

    public DebugViewModel(
        ITestConfigurationService testConfig,
        INfcService nfcService,
        ICryptoService cryptoService,
        IErrorHandlingService errorHandling,
        ILogger<DebugViewModel> logger)
    {
        _testConfig = testConfig;
        _nfcService = nfcService;
        _cryptoService = cryptoService;
        _errorHandling = errorHandling;
        _logger = logger;

        LoadConfiguration();
        LoadSystemInfo();
        AddLog("Debug panel başlatıldı");
    }

    [RelayCommand]
    private async Task EditBackendUrlAsync()
    {
        try
        {
            var result = await Application.Current?.MainPage?.DisplayPromptAsync(
                "Backend URL", 
                "Backend API URL'sini girin:", 
                "Tamam", 
                "İptal", 
                "https://localhost:8000",
                -1,
                Keyboard.Url,
                BackendUrl);

            if (!string.IsNullOrEmpty(result))
            {
                BackendUrl = result;
                _testConfig.SetBackendUrl(result);
                AddLog($"Backend URL güncellendi: {result}");
            }
        }
        catch (Exception ex)
        {
            AddLog($"Backend URL düzenleme hatası: {ex.Message}");
        }
    }

    [RelayCommand]
    private async Task SendMockDataAsync()
    {
        try
        {
            AddLog("Mock NFC verisi gönderiliyor...");
            
            if (_nfcService is MockNfcService mockService)
            {
                await mockService.StartReadingAsync();
                NfcTestResult = "✅ Mock veri gönderildi";
                AddLog("Mock NFC verisi başarıyla gönderildi");
            }
            else
            {
                NfcTestResult = "⚠️ Mock servis aktif değil";
                AddLog("Mock servis bulunamadı - IsMockMode kontrol edin");
            }
        }
        catch (Exception ex)
        {
            NfcTestResult = $"❌ Hata: {ex.Message}";
            AddLog($"Mock veri gönderme hatası: {ex.Message}");
        }
    }

    [RelayCommand]
    private async Task TestNfcAsync()
    {
        try
        {
            AddLog("NFC sistem testi başlatılıyor...");
            
            var isSupported = _nfcService.IsNfcSupported;
            var isEnabled = _nfcService.IsNfcEnabled;
            
            NfcTestResult = $"NFC Desteği: {(isSupported ? "✅" : "❌")}\n" +
                           $"NFC Etkin: {(isEnabled ? "✅" : "❌")}";
            
            AddLog($"NFC Test sonucu - Destekleniyor: {isSupported}, Etkin: {isEnabled}");
        }
        catch (Exception ex)
        {
            NfcTestResult = $"❌ Test hatası: {ex.Message}";
            AddLog($"NFC test hatası: {ex.Message}");
        }
    }

    [RelayCommand]
    private async Task TestPublicKeyAsync()
    {
        try
        {
            AddLog("Public key testi başlatılıyor...");
            
            var publicKey = await _cryptoService.GetPublicKeyFromBackendAsync();
            
            if (!string.IsNullOrEmpty(publicKey))
            {
                var fingerprint = _cryptoService.GetPublicKeyFingerprint(publicKey);
                CryptoTestResult = $"✅ Public Key alındı\nFingerprint: {fingerprint}";
                AddLog($"Public key başarıyla alındı - Fingerprint: {fingerprint}");
            }
            else
            {
                CryptoTestResult = "❌ Public Key alınamadı";
                AddLog("Public key alınamadı");
            }
        }
        catch (Exception ex)
        {
            CryptoTestResult = $"❌ Hata: {ex.Message}";
            AddLog($"Public key test hatası: {ex.Message}");
        }
    }

    [RelayCommand]
    private async Task TestVerificationAsync()
    {
        try
        {
            AddLog("QR kod doğrulama testi başlatılıyor...");
            
            // Mock QR data oluştur
            var mockQrData = GenerateTestQrData();
            
            var (isValid, memberData, errorMessage) = await _cryptoService.VerifyQrSignatureAsync(mockQrData);
            
            CryptoTestResult = $"Doğrulama: {(isValid ? "✅ Başarılı" : "❌ Başarısız")}\n" +
                              $"Hata: {errorMessage ?? "Yok"}";
            
            AddLog($"QR doğrulama test sonucu: {(isValid ? "Başarılı" : "Başarısız")}");
        }
        catch (Exception ex)
        {
            CryptoTestResult = $"❌ Test hatası: {ex.Message}";
            AddLog($"Doğrulama test hatası: {ex.Message}");
        }
    }

    [RelayCommand]
    private void ClearLogs()
    {
        DebugLogs.Clear();
        AddLog("Debug logları temizlendi");
    }

    [RelayCommand]
    private async Task SaveSettingsAsync()
    {
        try
        {
            _testConfig.EnableMockMode(IsMockMode);
            _testConfig.SetBackendUrl(BackendUrl);
            
            AddLog("Ayarlar kaydedildi");
            await _errorHandling.ShowErrorDialogAsync("Başarılı", "Test ayarları kaydedildi");
        }
        catch (Exception ex)
        {
            AddLog($"Ayar kaydetme hatası: {ex.Message}");
        }
    }

    [RelayCommand]
    private async Task ResetSettingsAsync()
    {
        try
        {
            var confirm = await _errorHandling.ShowConfirmDialogAsync(
                "Ayarları Sıfırla", 
                "Tüm test ayarları varsayılan değerlere sıfırlanacak. Devam edilsin mi?");
            
            if (confirm)
            {
                IsMockMode = false;
                BackendUrl = "https://localhost:8000";
                _testConfig.EnableMockMode(false);
                _testConfig.SetBackendUrl(BackendUrl);
                
                AddLog("Ayarlar sıfırlandı");
            }
        }
        catch (Exception ex)
        {
            AddLog($"Ayar sıfırlama hatası: {ex.Message}");
        }
    }

    [RelayCommand]
    private async Task GenerateReportAsync()
    {
        try
        {
            var diagnosticInfo = _testConfig.GetDiagnosticInfo();
            var report = JsonSerializer.Serialize(diagnosticInfo, new JsonSerializerOptions 
            { 
                WriteIndented = true 
            });
            
            await Application.Current?.MainPage?.DisplayAlert(
                "Diagnostik Rapor", 
                report, 
                "Tamam");
            
            AddLog("Diagnostik rapor oluşturuldu");
        }
        catch (Exception ex)
        {
            AddLog($"Rapor oluşturma hatası: {ex.Message}");
        }
    }

    [RelayCommand]
    private async Task GoToMainPageAsync()
    {
        try
        {
            await Shell.Current.GoToAsync("//MainPage");
        }
        catch (Exception ex)
        {
            AddLog($"Sayfa geçiş hatası: {ex.Message}");
        }
    }

    partial void OnIsMockModeChanged(bool value)
    {
        _testConfig.EnableMockMode(value);
        AddLog($"Mock mode: {(value ? "Etkin" : "Devre dışı")}");
    }

    private void LoadConfiguration()
    {
        IsMockMode = _testConfig.IsMockMode;
        BackendUrl = _testConfig.BackendBaseUrl;
    }

    private void LoadSystemInfo()
    {
        try
        {
            SystemInfo.Clear();
            
            var diagnosticInfo = _testConfig.GetDiagnosticInfo();
            
            foreach (var item in diagnosticInfo)
            {
                SystemInfo.Add(new SystemInfoItem
                {
                    Key = item.Key,
                    Value = item.Value?.ToString() ?? "N/A"
                });
            }
        }
        catch (Exception ex)
        {
            AddLog($"Sistem bilgisi yükleme hatası: {ex.Message}");
        }
    }

    private string GenerateTestQrData()
    {
        // Test amaçlı basit mock QR data
        var mockData = "test|mock_signature|mock_metadata";
        return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(mockData));
    }

    private void AddLog(string message)
    {
        MainThread.BeginInvokeOnMainThread(() =>
        {
            DebugLogs.Insert(0, new DebugLogEntry
            {
                Timestamp = DateTime.Now,
                Message = message
            });
            
            // En fazla 50 log tut
            while (DebugLogs.Count > 50)
            {
                DebugLogs.RemoveAt(DebugLogs.Count - 1);
            }
        });
    }
}

public class SystemInfoItem
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public class DebugLogEntry
{
    public DateTime Timestamp { get; set; }
    public string Message { get; set; } = string.Empty;
}
