using MauiNfcApp.ViewModels;

namespace MauiNfcApp.Views;

public partial class MainPage : ContentPage
{
    public MainPage(MainViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();
        
        // Sayfa göründüğünde NFC durumunu kontrol et
        if (BindingContext is MainViewModel viewModel)
        {
            viewModel.CheckNfcStatusCommand.Execute(null);
        }
    }

    protected override void OnDisappearing()
    {
        base.OnDisappearing();
        
        // Sayfa gizlendiğinde NFC okumayı durdur
        if (BindingContext is MainViewModel viewModel && viewModel.IsReading)
        {
            viewModel.StopReadingCommand.Execute(null);
        }
    }
}
