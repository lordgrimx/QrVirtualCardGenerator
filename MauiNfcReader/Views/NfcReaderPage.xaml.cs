using MauiNfcReader.ViewModels;

namespace MauiNfcReader.Views;

/// <summary>
/// NFC Okuyucu ana sayfa code-behind
/// </summary>
public partial class NfcReaderPage : ContentPage
{
    public NfcReaderPage(NfcReaderViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
