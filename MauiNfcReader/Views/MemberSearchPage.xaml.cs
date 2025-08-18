using Microsoft.Extensions.Logging;

namespace MauiNfcReader.Views;

public partial class MemberSearchPage : ContentPage
{
    private readonly ILogger<MemberSearchPage>? _logger;

    public MemberSearchPage()
    {
        InitializeComponent();
        try
        {
            var serviceProvider = (Application.Current as App)?.Handler?.MauiContext?.Services;
            _logger = serviceProvider?.GetService(typeof(ILogger<MemberSearchPage>)) as ILogger<MemberSearchPage>;
        }
        catch { }
    }

    public MemberSearchPage(ILogger<MemberSearchPage> logger) : this()
    {
        _logger = logger;
    }

    private async void OnBackClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Geri butonu tıklandı");
        await Navigation.PopAsync();
    }

    private void OnSearchTextChanged(object? sender, TextChangedEventArgs e)
    {
        _logger?.LogInformation($"Arama metni değişti: {e.NewTextValue}");
        
        var searchText = e.NewTextValue?.Trim();
        ClearButton.IsVisible = !string.IsNullOrEmpty(searchText);
        
        if (string.IsNullOrEmpty(searchText))
        {
            ResultsCountLabel.Text = "0 sonuç bulundu";
            NoResultsFrame.IsVisible = true;
        }
        else
        {
            SearchLoadingIndicator.IsVisible = true;
            SearchLoadingIndicator.IsRunning = true;
            
            // Simüle arama (gerçek implementasyon için backend entegrasyonu gerekli)
            Dispatcher.StartTimer(TimeSpan.FromMilliseconds(1000), () =>
            {
                SearchLoadingIndicator.IsVisible = false;
                SearchLoadingIndicator.IsRunning = false;
                
                // Mock sonuçlar
                var resultCount = searchText.Length % 5; // Basit simülasyon
                ResultsCountLabel.Text = $"{resultCount} sonuç bulundu";
                NoResultsFrame.IsVisible = resultCount == 0;
                
                return false; // Timer'ı durdur
            });
        }
    }

    private void OnClearSearchClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Arama temizlendi");
        SearchEntry.Text = string.Empty;
        ClearButton.IsVisible = false;
        ResultsCountLabel.Text = "0 sonuç bulundu";
        NoResultsFrame.IsVisible = true;
    }

    private async void OnFilterAllClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Tümü filtresi seçildi");
        
        // Filter button styles
        FilterAllBtn.Background = new LinearGradientBrush
        {
            StartPoint = new Point(0, 0),
            EndPoint = new Point(1, 0),
            GradientStops = new GradientStopCollection
            {
                new GradientStop { Color = Color.FromArgb("#DC2626"), Offset = 0.0f },
                new GradientStop { Color = Color.FromArgb("#EA580C"), Offset = 1.0f }
            }
        };
        FilterAllBtn.TextColor = Colors.White;
        
        FilterActiveBtn.BackgroundColor = Color.FromArgb("#F3F4F6");
        FilterActiveBtn.TextColor = Color.FromArgb("#374151");
        
        FilterInactiveBtn.BackgroundColor = Color.FromArgb("#F3F4F6");
        FilterInactiveBtn.TextColor = Color.FromArgb("#374151");
        
        await DisplayAlert("Filtre", "Tüm üyeler gösteriliyor", "Tamam");
    }

    private async void OnFilterActiveClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Aktif filtresi seçildi");
        
        // Filter button styles
        FilterActiveBtn.Background = new LinearGradientBrush
        {
            StartPoint = new Point(0, 0),
            EndPoint = new Point(1, 0),
            GradientStops = new GradientStopCollection
            {
                new GradientStop { Color = Color.FromArgb("#DC2626"), Offset = 0.0f },
                new GradientStop { Color = Color.FromArgb("#EA580C"), Offset = 1.0f }
            }
        };
        FilterActiveBtn.TextColor = Colors.White;
        
        FilterAllBtn.BackgroundColor = Color.FromArgb("#F3F4F6");
        FilterAllBtn.TextColor = Color.FromArgb("#374151");
        
        FilterInactiveBtn.BackgroundColor = Color.FromArgb("#F3F4F6");
        FilterInactiveBtn.TextColor = Color.FromArgb("#374151");
        
        await DisplayAlert("Filtre", "Sadece aktif üyeler gösteriliyor", "Tamam");
    }

    private async void OnFilterInactiveClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Pasif filtresi seçildi");
        
        // Filter button styles  
        FilterInactiveBtn.Background = new LinearGradientBrush
        {
            StartPoint = new Point(0, 0),
            EndPoint = new Point(1, 0),
            GradientStops = new GradientStopCollection
            {
                new GradientStop { Color = Color.FromArgb("#DC2626"), Offset = 0.0f },
                new GradientStop { Color = Color.FromArgb("#EA580C"), Offset = 1.0f }
            }
        };
        FilterInactiveBtn.TextColor = Colors.White;
        
        FilterAllBtn.BackgroundColor = Color.FromArgb("#F3F4F6");
        FilterAllBtn.TextColor = Color.FromArgb("#374151");
        
        FilterActiveBtn.BackgroundColor = Color.FromArgb("#F3F4F6");
        FilterActiveBtn.TextColor = Color.FromArgb("#374151");
        
        await DisplayAlert("Filtre", "Sadece pasif üyeler gösteriliyor", "Tamam");
    }

    private async void OnScanQrClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("QR kod tarama butonu tıklandı");
        await DisplayAlert("QR Kod Tarama", "QR kod tarayıcı açılıyor...", "Tamam");
    }

    private async void OnManualIdClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Manuel ID girişi butonu tıklandı");
        var result = await DisplayPromptAsync("Manuel ID Girişi", "Üye ID numarasını girin:", "Ara", "İptal", "Örn: 12345");
        
        if (!string.IsNullOrEmpty(result))
        {
            _logger?.LogInformation($"Manuel ID arama: {result}");
            SearchEntry.Text = result;
        }
    }

    private async void OnNfcReadClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("NFC kart okuma butonu tıklandı");
        await DisplayAlert("NFC Okuma", "NFC okuyucu açılıyor...", "Tamam");
    }
}
