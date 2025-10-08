namespace MauiNfcReader;

public partial class App : Application
{
	public App(MainPage mainPage)
	{
		try
		{
			InitializeComponent();

			// Shell yerine NavigationPage ile başlat (PushAsync için gereklidir)
			MainPage = new NavigationPage(mainPage);
		}
		catch (Exception ex)
		{
			// Eğer başlatma hatası olursa, basit bir hata sayfası göster
			System.Diagnostics.Debug.WriteLine($"App başlatma hatası: {ex}");
			MainPage = new ContentPage 
			{
				Content = new StackLayout
				{
					Padding = 20,
					Children =
					{
						new Label 
						{ 
							Text = "Uygulama Başlatma Hatası",
							FontSize = 20,
							FontAttributes = FontAttributes.Bold,
							TextColor = Colors.Red
						},
						new Label 
						{ 
							Text = ex.Message,
							FontSize = 14,
							TextColor = Colors.Gray
						},
						new Label 
						{ 
							Text = ex.StackTrace,
							FontSize = 10,
							TextColor = Colors.LightGray
						}
					}
				}
			};
		}
	}
}