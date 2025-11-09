using Microsoft.Extensions.Logging;
using MauiNfcReader.ViewModels;
using System.Timers;

namespace MauiNfcReader.Views;

public partial class NfcReaderPage : ContentPage
{
    private readonly ILogger<NfcReaderPage>? _logger;
    private readonly NfcReaderViewModel? _viewModel;
    private System.Timers.Timer? _usbDetectionTimer;

    public NfcReaderPage()
    {
        InitializeComponent();
        try
        {
            var serviceProvider = (Application.Current as App)?.Handler?.MauiContext?.Services;
            _logger = serviceProvider?.GetService(typeof(ILogger<NfcReaderPage>)) as ILogger<NfcReaderPage>;
            _viewModel = serviceProvider?.GetService(typeof(NfcReaderViewModel)) as NfcReaderViewModel;
            
            if (_viewModel != null)
            {
                BindingContext = _viewModel;
                
                // StatusMessage değişikliklerini dinle
                _viewModel.PropertyChanged += OnViewModelPropertyChanged;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "NfcReaderPage initialization error");
        }
    }

    public NfcReaderPage(ILogger<NfcReaderPage> logger, NfcReaderViewModel viewModel) : this()
    {
        _logger = logger;
        _viewModel = viewModel;
        BindingContext = _viewModel;
        _viewModel.PropertyChanged += OnViewModelPropertyChanged;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        
        _logger?.LogInformation("NFC Reader sayfası açıldı");
        
        // Sayfa yüklendiğinde okuyucuları tara
        if (_viewModel != null)
        {
            await _viewModel.RefreshReadersCommand.ExecuteAsync(null);
            
            // USB otomatik algılamayı başlat
            StartUsbDetection();
        }
    }

    protected override void OnDisappearing()
    {
        base.OnDisappearing();
        
        // Otomatik algılamayı durdur
        StopUsbDetection();
        
        _logger?.LogInformation("NFC Reader sayfasından çıkıldı");
    }

    private void OnViewModelPropertyChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(NfcReaderViewModel.StatusMessage))
        {
            UpdateReaderStatusUI();
        }
        else if (e.PropertyName == nameof(NfcReaderViewModel.IsConnected))
        {
            UpdateConnectionStatusUI();
        }
    }

    private void UpdateReaderStatusUI()
    {
        if (_viewModel == null) return;

        // StatusIndicator already updated via UpdateConnectionStatusUI
        // This method is kept for compatibility but functionality moved to UpdateConnectionStatusUI
    }

    private void UpdateConnectionStatusUI()
    {
        if (_viewModel == null) return;

        MainThread.BeginInvokeOnMainThread(() =>
        {
            if (_viewModel.IsConnected)
            {
                StatusIndicator.Fill = new SolidColorBrush(Color.FromArgb("#10B981")); // Green
            }
            else
            {
                StatusIndicator.Fill = new SolidColorBrush(Color.FromArgb("#EF4444")); // Red
            }
        });
    }

    private void OnReaderSelected(object? sender, EventArgs e)
    {
        // Simplified UI: ReaderPicker no longer exists in simplified UI
        // Auto-detection and connection is now handled automatically in ViewModel
        // This method is kept for compatibility but is no longer used
    }

    private void StartUsbDetection()
    {
        // 2 saniyede bir USB cihazlarını kontrol et
        _usbDetectionTimer = new System.Timers.Timer(2000);
        _usbDetectionTimer.Elapsed += OnUsbDetectionTimerElapsed;
        _usbDetectionTimer.AutoReset = true;
        _usbDetectionTimer.Start();
        
        MainThread.BeginInvokeOnMainThread(() =>
        {
            AutoDetectStatus.IsVisible = true;
        });
        
        _logger?.LogInformation("USB otomatik algılama başlatıldı");
    }

    private void StopUsbDetection()
    {
        if (_usbDetectionTimer != null)
        {
            _usbDetectionTimer.Stop();
            _usbDetectionTimer.Dispose();
            _usbDetectionTimer = null;
        }
        
        MainThread.BeginInvokeOnMainThread(() =>
        {
            AutoDetectStatus.IsVisible = false;
        });
        
        _logger?.LogInformation("USB otomatik algılama durduruldu");
    }

    private async void OnUsbDetectionTimerElapsed(object? sender, ElapsedEventArgs e)
    {
        if (_viewModel == null) return;

        try
        {
            var currentReaderCount = _viewModel.AvailableReaders.Count;
            
            // Okuyucuları yenile
            await MainThread.InvokeOnMainThreadAsync(async () =>
            {
                await _viewModel.RefreshReadersCommand.ExecuteAsync(null);
            });
            
            var newReaderCount = _viewModel.AvailableReaders.Count;
            
            // Yeni okuyucu eklendiyse bildir
            if (newReaderCount > currentReaderCount)
            {
                _logger?.LogInformation($"Yeni NFC okuyucu algılandı! Toplam: {newReaderCount}");
                
                await MainThread.InvokeOnMainThreadAsync(async () =>
                {
                    // Son eklenen okuyucuyu otomatik seç
                    if (_viewModel.AvailableReaders.Count > 0 && string.IsNullOrEmpty(_viewModel.SelectedReader))
                    {
                        _viewModel.SelectedReader = _viewModel.AvailableReaders.Last();
                        
                        bool autoConnect = await DisplayAlert(
                            "🔌 Yeni Cihaz Algılandı!", 
                            $"'{_viewModel.SelectedReader}' okuyucusu algılandı. Bağlanmak ister misiniz?", 
                            "Bağlan", 
                            "İptal"
                        );
                        
                        if (autoConnect && _viewModel.ConnectCommand.CanExecute(null))
                        {
                            await _viewModel.ConnectCommand.ExecuteAsync(null);
                        }
                    }
                });
            }
            // Okuyucu çıkarıldıysa bildir
            else if (newReaderCount < currentReaderCount)
            {
                _logger?.LogWarning($"NFC okuyucu çıkarıldı! Toplam: {newReaderCount}");
                
                await MainThread.InvokeOnMainThreadAsync(async () =>
                {
                    if (_viewModel.IsConnected)
                    {
                        await DisplayAlert(
                            "⚠️ Cihaz Çıkarıldı", 
                            "NFC okuyucu bağlantısı kesildi. Cihaz çıkarılmış olabilir.", 
                            "Tamam"
                        );
                    }
                });
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "USB detection error");
        }
    }

    private async void OnBackClicked(object? sender, EventArgs e)
    {
        _logger?.LogInformation("Geri butonu tıklandı");
        
        // Bağlantı varsa önce kes
        if (_viewModel?.IsConnected == true)
        {
            bool disconnect = await DisplayAlert(
                "Bağlantıyı Kes?", 
                "NFC okuyucu bağlantısını kesmek istiyor musunuz?", 
                "Evet", 
                "İptal"
            );
            
            if (disconnect && _viewModel.DisconnectCommand.CanExecute(null))
            {
                await _viewModel.DisconnectCommand.ExecuteAsync(null);
            }
        }
        
        await Navigation.PopAsync();
    }

    // Mode Toggle Functions - Removed (simplified UI)
    // private void OnReadModeClicked(object sender, EventArgs e)
    // {
    // #if WINDOWS
    //     // Update UI
    //     ReadModeFrame.BackgroundColor = Color.FromArgb("#7C2D12");
    //     WriteModeFrame.BackgroundColor = Colors.Transparent;
    //
    //     var readButton = (Button)ReadModeFrame.Content;
    //     readButton.TextColor = Colors.White;
    //
    //     var writeButton = (Button)WriteModeFrame.Content;
    //     writeButton.TextColor = Color.FromArgb("#6B7280");
    //
    //     // Show/Hide sections
    //     ReadingSection.IsVisible = true;
    //     WritingSection.IsVisible = false;
    //
    //     _logger?.LogInformation("Okuma moduna geçildi");
    // #endif
    // }

    // private void OnWriteModeClicked(object sender, EventArgs e)
    // {
    // #if WINDOWS
    //     // Update UI
    //     ReadModeFrame.BackgroundColor = Colors.Transparent;
    //     WriteModeFrame.BackgroundColor = Color.FromArgb("#7C2D12");
    //
    //     var readButton = (Button)ReadModeFrame.Content;
    //     readButton.TextColor = Color.FromArgb("#6B7280");
    //
    //     var writeButton = (Button)WriteModeFrame.Content;
    //     writeButton.TextColor = Colors.White;
    //
    //     // Show/Hide sections
    //     ReadingSection.IsVisible = false;
    //     WritingSection.IsVisible = true;
    //
    //     _logger?.LogInformation("Yazma moduna geçildi");
    // #endif
    // }

    // private async void OnWriteCardClicked(object sender, EventArgs e)
    // {
    // #if WINDOWS
    //     try
    //     {
    //         // Validate inputs
    //         if (string.IsNullOrWhiteSpace(MemberIdEntry.Text))
    //         {
    //             await DisplayAlert("Hata", "Lütfen üye numarasını girin.", "Tamam");
    //             return;
    //         }

    //         if (string.IsNullOrWhiteSpace(MemberNameEntry.Text))
    //         {
    //             await DisplayAlert("Hata", "Lütfen üye adını girin.", "Tamam");
    //             return;
    //         }

    //         // Prepare data
    //         var memberData = new
    //         {
    //             MemberId = MemberIdEntry.Text,
    //             MemberName = MemberNameEntry.Text,
    //             Email = EmailEntry.Text,
    //             Phone = PhoneEntry.Text
    //         };

    //         _logger?.LogInformation($"Karta yazılacak veri: {System.Text.Json.JsonSerializer.Serialize(memberData)}");

    //         // Show animation
    //         WritePulseCircle.IsVisible = true;
    //         WriteCardBtn.IsEnabled = false;
    //         WriteCardBtn.Text = "✍️ Yazılıyor...";

    //         // TODO: Implement actual NFC write functionality
    //         // For now, simulate a write operation
    //         await Task.Delay(2000);

    //         // Show success
    //         LastWriteStatusFrame.IsVisible = true;
    //         WriteStatusLabel.Text = "✅ Yazma Başarılı";
    //         WriteStatusMessage.Text = $"Üye {MemberNameEntry.Text} ({MemberIdEntry.Text}) kartına başarıyla yazıldı!";

    //         // Clear form
    //         MemberIdEntry.Text = string.Empty;
    //         MemberNameEntry.Text = string.Empty;
    //         EmailEntry.Text = string.Empty;
    //         PhoneEntry.Text = string.Empty;

    //         await DisplayAlert("Başarılı", "Veri başarıyla karta yazıldı!", "Tamam");
    //     }
    //     catch (Exception ex)
    //     {
    //         _logger?.LogError(ex, "Kart yazma hatası");
    //         await DisplayAlert("Hata", $"Kart yazılırken hata oluştu: {ex.Message}", "Tamam");
            
    //         LastWriteStatusFrame.IsVisible = true;
    //         WriteStatusLabel.Text = "❌ Yazma Başarısız";
    //         WriteStatusMessage.Text = $"Hata: {ex.Message}";
    //     }
    //     finally
    //     {
    //         WritePulseCircle.IsVisible = false;
    //         WriteCardBtn.IsEnabled = true;
    //         WriteCardBtn.Text = "✍️ Karta Yaz";
    //     }
    // #endif
    // }
}
