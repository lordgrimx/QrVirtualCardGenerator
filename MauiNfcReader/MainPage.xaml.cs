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

            if (Connectivity.Current.NetworkAccess != NetworkAccess.Internet)
            {
                BackendStatusText.Text = "📴 İnternet yok - yeniden deneyin";
                BackendStatusDot.Color = Color.FromArgb("#F59E0B");
                return;
            }

            if (_backend == null)
            {
                BackendStatusText.Text = "❌ Servis bulunamadı";
                BackendStatusDot.Color = Color.FromArgb("#EF4444");
                return;
            }

            // Hafif bir uç nokta ile kontrol: public key endpoint hızlıdır
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            var (ok, _, _) = await _backend.GetPublicKeyAsync(cts.Token);
            if (ok)
            {
                BackendStatusText.Text = "✅ Backend'e bağlanıldı";
                BackendStatusDot.Color = Color.FromArgb("#10B981");
            }
            else
            {
                BackendStatusText.Text = "❌ Backend'e bağlanılamadı";
                BackendStatusDot.Color = Color.FromArgb("#EF4444");
            }
        }
        catch (Exception ex)
        {
            _logger?.LogDebug(ex, "Backend kontrol hatası");
            BackendStatusText.Text = "❌ Bağlantı hatası";
            BackendStatusDot.Color = Color.FromArgb("#EF4444");
        }
    }

    private async void OnRetryBackendClicked(object? sender, EventArgs e)
    {
        await CheckBackendAsync();
    }
}
