using MauiNfcApp.Services;
using MauiNfcApp.ViewModels;
using MauiNfcApp.Views;
using MauiNfcApp.Converters;
using Microsoft.Extensions.Logging;

#if WINDOWS
using MauiNfcApp.Platforms.Windows.Services;
#endif

namespace MauiNfcApp;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            });

        // Logging
        builder.Services.AddLogging(configure =>
        {
            configure.AddConsole();
            configure.AddDebug();
        });

        // HTTP Client - Backend API için
        builder.Services.AddHttpClient<ICryptoService, CryptoService>(client =>
        {
            // Development environment için
            client.BaseAddress = new Uri("https://localhost:8000");
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        // Services
        builder.Services.AddSingleton<INfcService, NfcService>();
        builder.Services.AddTransient<ICryptoService, CryptoService>();

#if WINDOWS
        // Windows-specific USB NFC service
        builder.Services.AddSingleton<IWindowsNfcService, WindowsNfcService>();
#endif

        // ViewModels
        builder.Services.AddTransient<MainViewModel>();

        // Views
        builder.Services.AddTransient<MainPage>();

        // Converters (Global Resources olarak)
        builder.Services.AddSingleton<BoolToYesNoConverter>();
        builder.Services.AddSingleton<BoolToColorConverter>();
        builder.Services.AddSingleton<InverseBoolConverter>();
        builder.Services.AddSingleton<BoolToReadButtonTextConverter>();
        builder.Services.AddSingleton<StringToHasValueConverter>();
        builder.Services.AddSingleton<ObjectToBoolConverter>();
        builder.Services.AddSingleton<BoolToVerificationColorConverter>();
        builder.Services.AddSingleton<BoolToVerificationTextConverter>();

#if DEBUG
        builder.Logging.AddDebug();
#endif

        return builder.Build();
    }
}
