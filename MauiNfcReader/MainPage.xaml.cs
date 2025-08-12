using Microsoft.Extensions.Logging;
using MauiNfcReader.Views;
using Microsoft.Maui.Networking;
using MauiNfcReader.Services;

namespace MauiNfcReader;

public partial class MainPage : ContentPage
{
    private readonly ILogger<MainPage>? _logger;
    private readonly IServiceProvider? _serviceProvider;
    private IBackendApiService? _backend;

    public MainPage()
    {
        InitializeComponent();
        // Shell bypass durumunda DI'dan servis sağlayıcıyı manuel çek
        try
        {
            _serviceProvider ??= (Application.Current as App)?.Handler?.MauiContext?.Services;
            _logger ??= _serviceProvider?.GetService(typeof(ILogger<MainPage>)) as ILogger<MainPage>;
            _backend = _serviceProvider?.GetService(typeof(IBackendApiService)) as IBackendApiService;
        }
        catch { }
        // Sayfa yüklenince bağlantıyı kontrol et
        Loaded += async (_, __) => await CheckBackendAsync();
    }

    public MainPage(ILogger<MainPage> logger, IServiceProvider serviceProvider) : this()
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _backend = _serviceProvider?.GetService(typeof(IBackendApiService)) as IBackendApiService;
        
        _logger.LogInformation("Ana sayfa yüklendi");
    }

    private async void OnStartClicked(object? sender, EventArgs e)
    {
        try
        {
            _logger?.LogInformation("NFC okuyucu sayfasına yönlendiriliyor");
            
            var sp = _serviceProvider ?? (Application.Current as App)?.Handler?.MauiContext?.Services;
            if (sp != null)
            {
                var nfcReaderPage = sp.GetRequiredService<NfcReaderPage>();
                await Navigation.PushAsync(nfcReaderPage);
            }
            else
            {
                await DisplayAlert("Hata", "Servis sağlayıcı bulunamadı", "Tamam");
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Sayfa geçiş hatası");
            await DisplayAlert("Hata", $"Sayfa açılırken hata: {ex.Message}", "Tamam");
        }
    }

    private async Task CheckBackendAsync()
    {
        try
        {
            BackendStatusText.Text = "Backend bağlantısı kontrol ediliyor...";
            BackendStatusDot.Color = Color.FromArgb("#9CA3AF");
            StatusLabel.Text = "Status: Checking...";

            if (Connectivity.Current.NetworkAccess != NetworkAccess.Internet)
            {
                BackendStatusText.Text = "📴 İnternet yok - yeniden deneyin";
                BackendStatusDot.Color = Color.FromArgb("#F59E0B");
                StatusLabel.Text = "Status: No Internet";
                _logger?.LogWarning("Network access not available");
                return;
            }

            if (_backend == null)
            {
                BackendStatusText.Text = "❌ Servis bulunamadı";
                BackendStatusDot.Color = Color.FromArgb("#EF4444");
                StatusLabel.Text = "Status: Service Error";
                _logger?.LogError("Backend service is null");
                return;
            }

            _logger?.LogInformation("Backend'e bağlantı deneniyor...");
            // Hafif bir uç nokta ile kontrol: public key endpoint hızlıdır
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30)); // Timeout'u 30 saniyeye çıkardık
            var (ok, publicKey, error) = await _backend.GetPublicKeyAsync(cts.Token);
            
            _logger?.LogInformation($"Backend yanıtı - OK: {ok}, Error: {error}, PublicKey Length: {publicKey?.Length ?? 0}");
            
            if (ok)
            {
                BackendStatusText.Text = "✅ Backend'e bağlanıldı";
                BackendStatusDot.Color = Color.FromArgb("#10B981");
                StatusLabel.Text = "Status: Connected";
                _logger?.LogInformation("Backend bağlantısı başarılı");
            }
            else
            {
                BackendStatusText.Text = $"❌ Backend hatası: {error}";
                BackendStatusDot.Color = Color.FromArgb("#EF4444");
                StatusLabel.Text = "Status: Disconnected";
                _logger?.LogWarning($"Backend bağlantı hatası: {error}");
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Backend kontrol hatası detayı");
            BackendStatusText.Text = $"❌ Hata: {ex.Message}";
            BackendStatusDot.Color = Color.FromArgb("#EF4444");
            StatusLabel.Text = "Status: Error";
            
            // Ek hata detayı göster
            await DisplayAlert("Backend Bağlantı Hatası", 
                $"Hata: {ex.Message}\n\nDetay: {ex.InnerException?.Message}", 
                "Tamam");
        }
    }

    private async void OnRetryBackendClicked(object? sender, EventArgs e)
    {
        await CheckBackendAsync();
    }

    private async void OnRecycleBackendClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Recycle butonu ile backend yeniden bağlantısı başlatılıyor");
        await CheckBackendAsync();
    }

    private async void OnConnectBackendClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Connect to Backend butonu tıklandı");
        await CheckBackendAsync();
    }

    // Alt navigasyon butonları için event handler'lar
    private void OnHomeClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Home butonu tıklandı");
        // Zaten ana sayfadayız, bir şey yapmaya gerek yok
    }

    private async void OnSearchClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Search butonu tıklandı");
        await DisplayAlert("Search", "Arama özelliği yakında gelecek!", "Tamam");
    }

    private async void OnAddClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Add butonu tıklandı");
        await DisplayAlert("Add", "Ekleme özelliği yakında gelecek!", "Tamam");
    }

    private async void OnBookmarkClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Bookmark butonu tıklandı");
        await DisplayAlert("Bookmarks", "Yer işaretleri yakında gelecek!", "Tamam");
    }

    private async void OnUserClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("User butonu tıklandı");
        await DisplayAlert("User", "Kullanıcı profili yakında gelecek!", "Tamam");
    }
}
