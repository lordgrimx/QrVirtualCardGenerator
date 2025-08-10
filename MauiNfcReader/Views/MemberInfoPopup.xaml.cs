using CommunityToolkit.Maui.Views;

namespace MauiNfcReader.Views;

public partial class MemberInfoPopup : Popup
{
    public MemberInfoPopup(MemberInfoPopupViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    private void OnCloseClicked(object? sender, EventArgs e)
    {
        Close();
    }
}

public class MemberInfoPopupViewModel
{
    public string? Status { get; set; }
    public string? Name { get; set; }
    public string? MembershipId { get; set; }
    public string? MemberId { get; set; }
    public string? Mode { get; set; }
    public bool Valid { get; set; }
    public string ValidText => Valid ? "Geçerli" : "Geçersiz";
}


