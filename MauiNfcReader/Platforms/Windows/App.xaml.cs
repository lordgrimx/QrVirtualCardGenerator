using Microsoft.UI.Xaml;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace MauiNfcReader.WinUI;

/// <summary>
/// Provides application-specific behavior to supplement the default Application class.
/// </summary>
public partial class App : MauiWinUIApplication
{
	/// <summary>
	/// Initializes the singleton application object.  This is the first line of authored code
	/// executed, and as such is the logical equivalent of main() or WinMain().
	/// </summary>
	public App()
	{
		this.InitializeComponent();

		// Genel hata yakalayıcı
		this.UnhandledException += (sender, e) =>
        {
            try
            {
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string logFilePath = System.IO.Path.Combine(desktopPath, "MauiNfcReader_CrashLog.txt");
                string errorMessage = $"[{DateTime.Now}] Unhandled Exception:\n{e.Exception}\n\n--- STACK TRACE ---\n{e.Exception.StackTrace}";
                System.IO.File.WriteAllText(logFilePath, errorMessage);
                e.Handled = true;
            }
            catch
            {
                // Loglama başarısız olursa yapacak bir şey yok.
            }
        };
	}

	protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();
}

