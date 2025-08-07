namespace MauiNfcApp.Services;

public interface ITestConfigurationService
{
    bool IsMockMode { get; }
    bool IsDebugMode { get; }
    string BackendBaseUrl { get; }
    TimeSpan HttpTimeout { get; }
    void EnableMockMode(bool enable);
    void SetBackendUrl(string url);
}

public class TestConfigurationService : ITestConfigurationService
{
    private bool _isMockMode;
    private string _backendBaseUrl;

    public bool IsMockMode => _isMockMode;
    public bool IsDebugMode =>
#if DEBUG
        true;
#else
        false;
#endif

    public string BackendBaseUrl => _backendBaseUrl;
    public TimeSpan HttpTimeout => TimeSpan.FromSeconds(30);

    public TestConfigurationService()
    {
        // Default konfigürasyon
        _isMockMode = false;
        _backendBaseUrl = "https://localhost:8000";

        // Debug modda test senaryolarını kontrol et
        if (IsDebugMode)
        {
            LoadDebugConfiguration();
        }
    }

    public void EnableMockMode(bool enable)
    {
        _isMockMode = enable;
    }

    public void SetBackendUrl(string url)
    {
        if (!string.IsNullOrEmpty(url))
        {
            _backendBaseUrl = url;
        }
    }

    private void LoadDebugConfiguration()
    {
        try
        {
            // Preferences'tan test ayarlarını yükle
            _isMockMode = Preferences.Get("test_mock_mode", false);
            _backendBaseUrl = Preferences.Get("test_backend_url", "https://localhost:8000");

            // Environment variables kontrol et
            var envMockMode = Environment.GetEnvironmentVariable("MAUI_NFC_MOCK_MODE");
            if (bool.TryParse(envMockMode, out var mockMode))
            {
                _isMockMode = mockMode;
            }

            var envBackendUrl = Environment.GetEnvironmentVariable("MAUI_NFC_BACKEND_URL");
            if (!string.IsNullOrEmpty(envBackendUrl))
            {
                _backendBaseUrl = envBackendUrl;
            }
        }
        catch (Exception ex)
        {
            // Konfigürasyon yüklenirken hata olursa varsayılan değerleri kullan
            System.Diagnostics.Debug.WriteLine($"Test konfigürasyonu yükleme hatası: {ex.Message}");
        }
    }

    public void SaveTestConfiguration()
    {
        try
        {
            if (IsDebugMode)
            {
                Preferences.Set("test_mock_mode", _isMockMode);
                Preferences.Set("test_backend_url", _backendBaseUrl);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Test konfigürasyonu kaydetme hatası: {ex.Message}");
        }
    }

    public Dictionary<string, object> GetDiagnosticInfo()
    {
        return new Dictionary<string, object>
        {
            ["IsMockMode"] = IsMockMode,
            ["IsDebugMode"] = IsDebugMode,
            ["BackendBaseUrl"] = BackendBaseUrl,
            ["HttpTimeout"] = HttpTimeout.TotalSeconds,
            ["Platform"] = DeviceInfo.Platform.ToString(),
            ["DeviceModel"] = DeviceInfo.Model,
            ["AppVersion"] = AppInfo.VersionString,
            ["BuildVersion"] = AppInfo.BuildString
        };
    }
}
