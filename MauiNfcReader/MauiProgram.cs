using Microsoft.Extensions.Logging;
using MauiNfcReader.Services;
using MauiNfcReader.ViewModels;
using MauiNfcReader.Views;
using CommunityToolkit.Maui;
using Microsoft.Maui.Handlers;
using Microsoft.Maui.Controls;
// Windows PCSC servisi geçici olarak build dışı, bu importu da kaldırıyoruz

namespace MauiNfcReader;

public static class MauiProgram
{
	public static MauiApp CreateMauiApp()
	{
		var builder = MauiApp.CreateBuilder();
		builder
			.UseMauiApp<App>()
			.UseMauiCommunityToolkit()
			.ConfigureFonts(fonts =>
			{
				fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
				fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
			});

		// Services Registration
		builder.Services.AddSingleton<ICryptoService, CryptoService>();
		builder.Services.AddHttpClient();
		builder.Services.AddSingleton<IBackendApiService, BackendApiService>();
		builder.Services.AddSingleton<IQrVerificationService, QrVerificationService>();
		
		// WINDOWS: Gerçek PCSC servisini etkinleştir
#if WINDOWS
        // Windows'ta harici USB NFC okuyucu (PC/SC)
        builder.Services.AddSingleton<INfcService, MauiNfcReader.Platforms.Windows.Services.WindowsNfcService>();
#elif ANDROID
        // Android'de telefonun yerleşik NFC'sini kullan
        builder.Services.AddSingleton<MauiNfcReader.Platforms.Android.Services.AndroidNfcService>();
        builder.Services.AddSingleton<INfcService>(sp => sp.GetRequiredService<MauiNfcReader.Platforms.Android.Services.AndroidNfcService>());
#else
        builder.Services.AddSingleton<INfcService, MockNfcService>();
#endif

		// ViewModels
		builder.Services.AddTransient<NfcReaderViewModel>();
		
		// Pages
		builder.Services.AddTransient<MainPage>();
		builder.Services.AddTransient<NfcReaderPage>();
		builder.Services.AddTransient<Views.MemberSearchPopup>();
		builder.Services.AddTransient<Views.MemberInfoPopup>();

#if DEBUG
		builder.Logging.AddDebug();
		builder.Services.AddLogging(logging =>
		{
			logging.SetMinimumLevel(LogLevel.Debug);
		});
#else
		builder.Services.AddLogging(logging =>
		{
			logging.SetMinimumLevel(LogLevel.Information);
		});
#endif

#if ANDROID
        // MIUI'de toolbar nav content description için resource id erişimi çakışabiliyor.
        // Handler sonrası UI thread'de CharSequence olarak boş değer atayalım.
        ToolbarHandler.Mapper.AppendToMapping("FixNavContentDesc", (handler, view) =>
        {
            try
            {
                handler.PlatformView?.Post(() =>
                {
                    try
                    {
                        handler.PlatformView.NavigationContentDescription = string.Empty;
                        handler.PlatformView.Title = string.Empty;
                        handler.PlatformView.Subtitle = string.Empty;
                    }
                    catch { }
                });
            }
            catch { }
        });

        // Varsayılan mapping MAUI içinde SetNavigationContentDescription(int) çağırıyor ve MIUI'de crash ediyor.
        // Tamamen override ederek resource id kullanımını engelliyoruz.
        ToolbarHandler.Mapper.ModifyMapping(nameof(Toolbar.BackButtonTitle), (handler, view, action) =>
        {
            // action?.Invoke(handler, view); // MIUI'de SetNavigationContentDescription(int) tetiklediği için çağırmıyoruz
            try { handler.PlatformView!.NavigationContentDescription = string.Empty; } catch { }
        });

        ToolbarHandler.Mapper.ModifyMapping(nameof(Toolbar.BackButtonVisible), (handler, view, action) =>
        {
            // action?.Invoke(handler, view); // nav content desc resId çağrısını engelle
            try
            {
                handler.PlatformView!.NavigationIcon = null;
                handler.PlatformView.NavigationContentDescription = string.Empty;
            }
            catch { }
        });
#endif

		return builder.Build();
	}
}
