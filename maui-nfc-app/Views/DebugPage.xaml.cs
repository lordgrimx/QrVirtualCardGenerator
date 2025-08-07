using MauiNfcApp.ViewModels;

namespace MauiNfcApp.Views;

public partial class DebugPage : ContentPage
{
    public DebugPage(DebugViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
