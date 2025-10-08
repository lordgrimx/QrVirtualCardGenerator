using Microsoft.Extensions.Logging;

namespace MauiNfcReader.Views;

public partial class ProfilePage : ContentPage
{
    private readonly ILogger<ProfilePage> _logger;

    public ProfilePage(ILogger<ProfilePage> logger)
    {
        InitializeComponent();
        _logger = logger;
        
        LoadProfile();
        LoadStats();
    }

    private void LoadProfile()
    {
        // Kaydedilmiş profil bilgilerini yükle
        var username = Preferences.Default.Get("Username", "Kullanıcı");
        var email = Preferences.Default.Get("Email", "");
        var phone = Preferences.Default.Get("Phone", "");

        UsernameEntry.Text = username;
        EmailEntry.Text = email;
        PhoneEntry.Text = phone;
        
        UserNameLabel.Text = username;
    }

    private void LoadStats()
    {
        // İstatistikleri yükle
        var totalScans = Preferences.Default.Get("TotalScans", 0);
        var todayScans = Preferences.Default.Get("TodayScans", 0);
        
        TotalScansLabel.Text = totalScans.ToString();
        TodayScansLabel.Text = todayScans.ToString();
        
        // Başarı oranı hesapla
        var successRate = totalScans > 0 ? 100 : 0;
        SuccessRateLabel.Text = $"{successRate}%";
    }

    private async void OnUpdateProfileClicked(object sender, EventArgs e)
    {
        try
        {
            // Profil bilgilerini kaydet
            var username = UsernameEntry.Text?.Trim();
            var email = EmailEntry.Text?.Trim();
            var phone = PhoneEntry.Text?.Trim();

            if (string.IsNullOrEmpty(username))
            {
                await DisplayAlert("Hata", "Kullanıcı adı boş olamaz!", "Tamam");
                return;
            }

            Preferences.Default.Set("Username", username);
            Preferences.Default.Set("Email", email ?? "");
            Preferences.Default.Set("Phone", phone ?? "");

            UserNameLabel.Text = username;

            await DisplayAlert("Başarılı", "Profil bilgileri güncellendi!", "Tamam");
            _logger.LogInformation($"Profile updated for user: {username}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Profile update error");
            await DisplayAlert("Hata", $"Profil güncellenemedi: {ex.Message}", "Tamam");
        }
    }

    private async void OnViewHistoryClicked(object sender, EventArgs e)
    {
        await DisplayAlert("Geçmiş", "Detaylı geçmiş görüntüleme özelliği yakında eklenecek!", "Tamam");
    }

    private async void OnLogoutClicked(object sender, EventArgs e)
    {
        bool answer = await DisplayAlert("Çıkış", "Çıkış yapmak istediğinize emin misiniz?", "Evet", "Hayır");
        if (answer)
        {
            // Oturum bilgilerini temizle (isteğe bağlı)
            // Preferences.Default.Clear();
            
            await DisplayAlert("Çıkış", "Başarıyla çıkış yapıldı!", "Tamam");
            _logger.LogInformation("User logged out");
            
            // Ana sayfaya dön
            await Navigation.PopToRootAsync();
        }
    }
}

