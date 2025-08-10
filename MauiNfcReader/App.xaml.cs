namespace MauiNfcReader;

public partial class App : Application
{
	public App()
	{
		InitializeComponent();
	}

	protected override Window CreateWindow(IActivationState? activationState)
	{
        // Shell yerine NavigationPage ile başlat (PushAsync için gereklidir)
        var root = new Microsoft.Maui.Controls.NavigationPage(new MainPage());
        return new Window(root);
	}
}