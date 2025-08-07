using MauiNfcApp.Views;

namespace MauiNfcApp;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();

        // Ana sayfa olarak MainPage'i ayarla
        MainPage = new AppShell();
    }

    protected override Window CreateWindow(IActivationState activationState)
    {
        var window = base.CreateWindow(activationState);
        
        // Window özellikleri (Windows için)
        if (window != null)
        {
            window.Title = "QR NFC Card Reader";
            
#if WINDOWS
            // Windows için pencere boyutları
            window.MinimumWidth = 400;
            window.MinimumHeight = 600;
            window.Width = 500;
            window.Height = 800;
#endif
        }

        return window;
    }
}
