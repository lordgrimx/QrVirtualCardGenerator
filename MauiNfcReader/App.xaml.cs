namespace MauiNfcReader;

public partial class App : Application
{
	public App(MainPage mainPage)
	{
		InitializeComponent();

        // Shell yerine NavigationPage ile başlat (PushAsync için gereklidir)
        MainPage = new NavigationPage(mainPage);
	}
}