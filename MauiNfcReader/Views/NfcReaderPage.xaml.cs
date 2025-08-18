using Microsoft.Extensions.Logging;

namespace MauiNfcReader.Views;

public partial class NfcReaderPage : ContentPage
{
    private readonly ILogger<NfcReaderPage>? _logger;

    public NfcReaderPage()
    {
        InitializeComponent();
        try
        {
            var serviceProvider = (Application.Current as App)?.Handler?.MauiContext?.Services;
            _logger = serviceProvider?.GetService(typeof(ILogger<NfcReaderPage>)) as ILogger<NfcReaderPage>;
        }
        catch { }
    }

    public NfcReaderPage(ILogger<NfcReaderPage> logger) : this()
    {
        _logger = logger;
    }

    private async void OnBackClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Geri butonu tıklandı");
        await Navigation.PopAsync();
    }

    private async void OnStartReadingClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("NFC okuma başlatıldı");
        
        // NFC okuma işlemini burada başlat
        NfcStatusLabel.Text = "NFC Okuma Aktif";
        NfcSubStatusLabel.Text = "Kartınızı okuyucuya yaklaştırın...";
        
        StartReadingBtn.IsVisible = false;
        StopReadingBtn.IsVisible = true;
        
        // Pulse animasyonu başlat (gelecekte implementasyon)
        await DisplayAlert("NFC", "NFC okuma başlatıldı", "Tamam");
    }

    private async void OnStopReadingClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("NFC okuma durduruldu");
        
        NfcStatusLabel.Text = "NFC Okuyucu Hazır";
        NfcSubStatusLabel.Text = "Kartınızı okuyucuya yaklaştırın";
        
        StartReadingBtn.IsVisible = true;
        StopReadingBtn.IsVisible = false;
        
        await DisplayAlert("NFC", "NFC okuma durduruldu", "Tamam");
    }

    private async void OnVerifyMemberClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Üye doğrulama butonu tıklandı");
        await DisplayAlert("Üye Doğrulama", "Üye bilgileri görüntüleniyor...", "Tamam");
    }

    private async void OnHomeClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Ana sayfa butonu tıklandı");
        await Navigation.PopToRootAsync();
    }

    private async void OnSearchMemberClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Üye arama butonu tıklandı");
        // MemberSearchPage'e yönlendirme
        await DisplayAlert("Üye Arama", "Üye arama sayfası açılıyor...", "Tamam");
    }

    private async void OnSettingsClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Ayarlar butonu tıklandı");
        await DisplayAlert("Ayarlar", "Ayarlar sayfası yakında gelecek!", "Tamam");
    }

    private void OnAutoReadToggled(object? sender, ToggledEventArgs e)
    {
        _logger?.LogInformation($"Otomatik okuma: {e.Value}");
    }

    private void OnSoundToggled(object? sender, ToggledEventArgs e)
    {
        _logger?.LogInformation($"Ses efektleri: {e.Value}");
    }
}