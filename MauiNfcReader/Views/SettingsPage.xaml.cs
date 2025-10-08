using Microsoft.Extensions.Logging;
using Microsoft.Maui.Networking;
using MauiNfcReader.Services;

namespace MauiNfcReader.Views;

public partial class SettingsPage : ContentPage
{
    private readonly ILogger<SettingsPage> _logger;
    private readonly IBackendApiService _backendApiService;

    public SettingsPage(ILogger<SettingsPage> logger, IBackendApiService backendApiService)
    {
        InitializeComponent();
        _logger = logger;
        _backendApiService = backendApiService;
        
        LoadSettings();
        PlatformLabel.Text = DeviceInfo.Platform.ToString();
    }

    private void LoadSettings()
    {
        // Kaydedilmiş ayarları yükle
        var backendUrl = Preferences.Default.Get("BackendBaseUrl", "https://backend.anefuye.com.tr");
        BackendUrlEntry.Text = backendUrl;
        
        AutoReadSwitch.IsToggled = Preferences.Default.Get("AutoRead", true);
        SoundSwitch.IsToggled = Preferences.Default.Get("SoundEnabled", true);
        OfflineModeSwitch.IsToggled = Preferences.Default.Get("OfflineMode", true);
    }

    private async void OnTestConnectionClicked(object sender, EventArgs e)
    {
        try
        {
            ConnectionStatusLabel.Text = "Bağlantı test ediliyor...";
            ConnectionStatusDot.Color = Color.FromArgb("#F59E0B");

            if (Connectivity.Current.NetworkAccess != NetworkAccess.Internet)
            {
                ConnectionStatusLabel.Text = "İnternet bağlantısı yok";
                ConnectionStatusDot.Color = Color.FromArgb("#EF4444");
                return;
            }

            // Backend URL'yi kaydet
            var newUrl = BackendUrlEntry.Text?.Trim();
            if (!string.IsNullOrEmpty(newUrl))
            {
                Preferences.Default.Set("BackendBaseUrl", newUrl);
            }

            var (ok, _, error) = await _backendApiService.GetPublicKeyAsync();
            
            if (ok)
            {
                ConnectionStatusLabel.Text = "✅ Bağlantı başarılı!";
                ConnectionStatusDot.Color = Color.FromArgb("#10B981");
                await DisplayAlert("Başarılı", "Backend'e başarıyla bağlanıldı!", "Tamam");
            }
            else
            {
                ConnectionStatusLabel.Text = $"❌ Bağlantı hatası";
                ConnectionStatusDot.Color = Color.FromArgb("#EF4444");
                await DisplayAlert("Hata", $"Bağlantı hatası: {error}", "Tamam");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Backend test hatası");
            ConnectionStatusLabel.Text = "❌ Test başarısız";
            ConnectionStatusDot.Color = Color.FromArgb("#EF4444");
            await DisplayAlert("Hata", $"Test hatası: {ex.Message}", "Tamam");
        }
    }

    private async void OnClearCacheClicked(object sender, EventArgs e)
    {
        bool answer = await DisplayAlert("Onay", "Tüm önbellek temizlenecek. Devam edilsin mi?", "Evet", "Hayır");
        if (answer)
        {
            // Önbelleği temizle
            Preferences.Default.Remove("CachedPublicKeyPem");
            
            await DisplayAlert("Başarılı", "Önbellek temizlendi!", "Tamam");
            _logger.LogInformation("Cache cleared");
        }
    }

    private async void OnResetSettingsClicked(object sender, EventArgs e)
    {
        bool answer = await DisplayAlert("Onay", "Tüm ayarlar varsayılana sıfırlanacak. Devam edilsin mi?", "Evet", "Hayır");
        if (answer)
        {
            // Ayarları sıfırla
            Preferences.Default.Clear();
            LoadSettings();
            
            await DisplayAlert("Başarılı", "Ayarlar sıfırlandı!", "Tamam");
            _logger.LogInformation("Settings reset");
        }
    }

    protected override void OnDisappearing()
    {
        base.OnDisappearing();
        
        // Ayarları kaydet
        Preferences.Default.Set("AutoRead", AutoReadSwitch.IsToggled);
        Preferences.Default.Set("SoundEnabled", SoundSwitch.IsToggled);
        Preferences.Default.Set("OfflineMode", OfflineModeSwitch.IsToggled);
    }
}

