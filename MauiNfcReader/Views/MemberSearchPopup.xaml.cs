using CommunityToolkit.Maui.Views;
using MauiNfcReader.Models;
using MauiNfcReader.Services;
using Microsoft.Extensions.Logging;

namespace MauiNfcReader.Views;

public partial class MemberSearchPopup : Popup
{
    private readonly IBackendApiService _backend;
    private readonly ILogger _logger;
    private MemberInfo? _selected;

    public MemberSearchPopup(IBackendApiService backend, ILogger logger)
    {
        InitializeComponent();
        _backend = backend;
        _logger = logger;
        _ = LoadAsync(string.Empty);
    }

    private async Task LoadAsync(string query)
    {
        try
        {
            var (ok, members, error) = await _backend.SearchMembersAsync(query);
            if (!ok)
            {
                _logger.LogWarning("Üye arama başarısız: {error}", error);
                MembersList.ItemsSource = Array.Empty<MemberInfo>();
                return;
            }
            MembersList.ItemsSource = members;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Üye arama hatası");
            MembersList.ItemsSource = Array.Empty<MemberInfo>();
        }
    }

    private async void OnSearch(object? sender, EventArgs e)
    {
        await LoadAsync(SearchBar.Text ?? string.Empty);
    }

    private void OnSelected(object? sender, SelectionChangedEventArgs e)
    {
        _selected = e.CurrentSelection?.FirstOrDefault() as MemberInfo;
    }

    private void OnConfirm(object? sender, EventArgs e)
    {
        Close(_selected);
    }

    private void OnClose(object? sender, EventArgs e)
    {
        Close(null);
    }
}


