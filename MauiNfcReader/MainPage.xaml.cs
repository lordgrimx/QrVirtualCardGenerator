using Microsoft.Extensions.Logging;
using MauiNfcReader.Views;

namespace MauiNfcReader;

public partial class MainPage : ContentPage
{
	private readonly ILogger<MainPage>? _logger;
	private readonly IServiceProvider? _serviceProvider;

	public MainPage()
	{
		InitializeComponent();
        // Shell bypass durumunda DI'dan servis sağlayıcıyı manuel çek
        try
        {
            _serviceProvider ??= (Application.Current as App)?.Handler?.MauiContext?.Services;
            _logger ??= _serviceProvider?.GetService(typeof(ILogger<MainPage>)) as ILogger<MainPage>;
        }
        catch { }
	}

	public MainPage(ILogger<MainPage> logger, IServiceProvider serviceProvider) : this()
	{
		_logger = logger;
		_serviceProvider = serviceProvider;
		
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
}
